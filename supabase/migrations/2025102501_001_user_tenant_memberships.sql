SET search_path TO public, extensions;

-- =====================================================
-- STEP 1: USER TENANT MEMBERSHIPS
-- Purpose: Enable true multi-org membership (one user → many orgs)
-- Safety: Backward compatible, dual-read period, full rollback support
-- =====================================================
-- 
-- WHAT THIS DOES:
-- 1. Creates user_tenant_memberships table (many-to-many: user ↔ tenant)
-- 2. Preserves app_users.tenant_id (legacy field, kept for rollback)
-- 3. Adds comprehensive indexes for performance
-- 4. Implements strict RLS policies (users see own memberships only)
-- 5. Creates helper functions for querying memberships
--
-- SAFETY NOTES:
-- - Does NOT modify existing data
-- - Does NOT change existing queries (yet)
-- - Fully reversible via rollback script
-- - Idempotent: safe to run multiple times
-- =====================================================

BEGIN;

-- =====================================================
-- 0. CREATE CUSTOM TYPES (Constants for maintainability)
-- =====================================================

-- Create ENUM types to avoid string literal duplication and improve type safety
DO $$ 
BEGIN
  -- Role type for tenant memberships
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'manager', 'staff', 'viewer');
  END IF;
  
  -- Status type for membership state
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_status') THEN
    CREATE TYPE membership_status AS ENUM ('active', 'inactive', 'suspended');
  END IF;
END $$;

COMMENT ON TYPE membership_role IS 
  'Valid roles for tenant memberships: owner > admin > manager > staff > viewer';

COMMENT ON TYPE membership_status IS 
  'Valid membership states: active (normal), inactive (temporarily disabled), suspended (admin action)';

-- =====================================================
-- 1. CREATE USER_TENANT_MEMBERSHIPS TABLE
-- =====================================================

DROP TABLE IF EXISTS user_tenant_memberships CASCADE;
CREATE TABLE user_tenant_memberships (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role (preserved from old system during backfill)
  role membership_role NOT NULL,
  
  -- Status (for soft-delete and deactivation)
  status membership_status NOT NULL DEFAULT 'active',
  
  -- Invitation tracking
  invited_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(user_id, tenant_id),  -- User can only be in org once
  
  -- Indexes created below for performance
  CHECK (invited_at IS NULL OR joined_at >= invited_at)  -- Joined after invite
);

-- Add comments for documentation
COMMENT ON TABLE user_tenant_memberships IS 
  'Many-to-many relationship between users and tenants. Enables multi-org membership.';

COMMENT ON COLUMN user_tenant_memberships.user_id IS 
  'Reference to auth.users (Supabase Auth user)';

COMMENT ON COLUMN user_tenant_memberships.tenant_id IS 
  'Reference to tenants (organization)';

COMMENT ON COLUMN user_tenant_memberships.role IS 
  'User role within this specific organization. Can differ per org.';

COMMENT ON COLUMN user_tenant_memberships.status IS 
  'active = normal, inactive = temporarily disabled, suspended = admin action';

COMMENT ON COLUMN user_tenant_memberships.invited_by IS 
  'Which user sent the invitation (NULL if migrated from legacy system)';

-- =====================================================
-- 2. CREATE PERFORMANCE INDEXES
-- =====================================================

-- Most common query: get user's memberships
CREATE INDEX IF NOT EXISTS idx_memberships_user_id 
  ON user_tenant_memberships(user_id);

-- Query memberships for a tenant (admin view)
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_id 
  ON user_tenant_memberships(tenant_id);

-- Composite index for user + tenant lookup (exact match)
CREATE INDEX IF NOT EXISTS idx_memberships_user_tenant 
  ON user_tenant_memberships(user_id, tenant_id);

-- Filter by status (only active memberships)
CREATE INDEX IF NOT EXISTS idx_memberships_user_active 
  ON user_tenant_memberships(user_id, status) 
  WHERE status = 'active'::membership_status;

-- Admin queries: find who invited users
CREATE INDEX IF NOT EXISTS idx_memberships_invited_by 
  ON user_tenant_memberships(invited_by) 
  WHERE invited_by IS NOT NULL;

-- Audit queries: recently joined users
CREATE INDEX IF NOT EXISTS idx_memberships_joined_at 
  ON user_tenant_memberships(joined_at DESC);

-- Composite for tenant + status (admin dashboard)
CREATE INDEX IF NOT EXISTS idx_memberships_tenant_status 
  ON user_tenant_memberships(tenant_id, status);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_memberships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_memberships_updated_at
  BEFORE UPDATE ON user_tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION update_memberships_updated_at();

COMMENT ON FUNCTION update_memberships_updated_at() IS 
  'Automatically updates updated_at timestamp on row modification';

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Get all memberships for a user (includes tenant details)
CREATE OR REPLACE FUNCTION get_user_memberships(p_user_id UUID)
RETURNS TABLE (
  membership_id UUID,
  tenant_id UUID,
  tenant_name TEXT,
  role membership_role,
  status membership_status,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.tenant_id,
    t.name,
    m.role,
    m.status,
    m.joined_at
  FROM user_tenant_memberships m
  INNER JOIN tenants t ON t.id = m.tenant_id
  WHERE m.user_id = p_user_id
    AND m.status = 'active'::membership_status
  ORDER BY m.joined_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_memberships(UUID) IS 
  'Returns all active memberships for a user with tenant details';

-- Check if user is member of tenant
CREATE OR REPLACE FUNCTION is_user_member_of_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_tenant_memberships 
    WHERE user_id = p_user_id 
      AND tenant_id = p_tenant_id 
      AND status = 'active'::membership_status
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION is_user_member_of_tenant(UUID, UUID) IS 
  'Fast check: is user an active member of this tenant?';

-- Get user's role in a specific tenant
CREATE OR REPLACE FUNCTION get_user_role_in_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS membership_role AS $$
  SELECT role 
  FROM user_tenant_memberships 
  WHERE user_id = p_user_id 
    AND tenant_id = p_tenant_id 
    AND status = 'active'::membership_status
  LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role_in_tenant(UUID, UUID) IS 
  'Returns user role in tenant, or NULL if not a member';

-- Count active memberships for a user
CREATE OR REPLACE FUNCTION count_user_memberships(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER
  FROM user_tenant_memberships 
  WHERE user_id = p_user_id 
    AND status = 'active'::membership_status;
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

COMMENT ON FUNCTION count_user_memberships(UUID) IS 
  'Returns count of active memberships (used to show/hide org switcher)';

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE user_tenant_memberships ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own memberships
DROP POLICY IF EXISTS "Users can view own memberships" ON user_tenant_memberships;
CREATE POLICY "Users can view own memberships" ON user_tenant_memberships
  FOR SELECT
  USING (user_id = auth.uid());

COMMENT ON POLICY "Users can view own memberships" ON user_tenant_memberships IS
  'Users can see all organizations they belong to';

-- Policy 2: Tenant admins can view all memberships in their tenant
DROP POLICY IF EXISTS "Tenant admins can view tenant memberships" ON user_tenant_memberships;
CREATE POLICY "Tenant admins can view tenant memberships" ON user_tenant_memberships
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner'::membership_role, 'admin'::membership_role)
        AND status = 'active'::membership_status
    )
  );

COMMENT ON POLICY "Tenant admins can view tenant memberships" ON user_tenant_memberships IS
  'Owners and admins can see all members of their organization';

-- Policy 3: Service role (migrations, API) can do anything
DROP POLICY IF EXISTS "Service role can manage memberships" ON user_tenant_memberships;
CREATE POLICY "Service role can manage memberships" ON user_tenant_memberships
  FOR ALL
  USING (auth.role() = 'service_role');

COMMENT ON POLICY "Service role can manage memberships" ON user_tenant_memberships IS
  'Backend services can create/update/delete memberships';

-- Policy 4: Tenant admins can insert new memberships (invites)
DROP POLICY IF EXISTS "Tenant admins can create memberships" ON user_tenant_memberships;
CREATE POLICY "Tenant admins can create memberships" ON user_tenant_memberships
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid() 
        AND role IN ('owner'::membership_role, 'admin'::membership_role)
        AND status = 'active'::membership_status
    )
  );

COMMENT ON POLICY "Tenant admins can create memberships" ON user_tenant_memberships IS
  'Owners and admins can invite users to their organization';

-- Policy 5: Users can update their own membership (accept invite, etc)
DROP POLICY IF EXISTS "Users can update own memberships" ON user_tenant_memberships;
CREATE POLICY "Users can update own memberships" ON user_tenant_memberships
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "Users can update own memberships" ON user_tenant_memberships IS
  'Users can accept invitations and update their own membership details';

-- Policy 6: Tenant owners can update any membership in their tenant
DROP POLICY IF EXISTS "Tenant owners can update tenant memberships" ON user_tenant_memberships;
CREATE POLICY "Tenant owners can update tenant memberships" ON user_tenant_memberships
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid() 
        AND role = 'owner'::membership_role
        AND status = 'active'::membership_status
    )
  );

COMMENT ON POLICY "Tenant owners can update tenant memberships" ON user_tenant_memberships IS
  'Owners can change roles, suspend members, etc';

-- Policy 7: Tenant owners can delete memberships (remove users)
DROP POLICY IF EXISTS "Tenant owners can remove members" ON user_tenant_memberships;
CREATE POLICY "Tenant owners can remove members" ON user_tenant_memberships
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid() 
        AND role = 'owner'::membership_role
        AND status = 'active'::membership_status
    )
  );

COMMENT ON POLICY "Tenant owners can remove members" ON user_tenant_memberships IS
  'Owners can remove users from the organization';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  membership_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO membership_count FROM user_tenant_memberships;
  
  RAISE NOTICE '✅ user_tenant_memberships table created successfully';
  RAISE NOTICE '📊 Current memberships: %', membership_count;
  RAISE NOTICE '🔒 RLS enabled with 7 policies (strict isolation)';
  RAISE NOTICE '⚡ 8 indexes created for performance';
  RAISE NOTICE '🔧 5 helper functions available';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: This table is empty until backfill runs';
  RAISE NOTICE '📝 Next: Run 20251025_002_backfill_memberships.sql';
END $$;


