-- =====================================================
-- PHASE 2: ENTERPRISE MULTI-TENANT ARCHITECTURE
-- Organization memberships, roles, and proper tenant model
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL SECURITY FIX
-- 
-- This migration creates the foundation for enterprise-grade
-- multi-tenant security with proper org membership management
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ORGANIZATIONS TABLE (Rename tenants for clarity)
-- =====================================================

-- Note: We'll keep 'tenants' table for now to avoid breaking changes
-- Add enterprise fields to existing tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'starter' CHECK (billing_plan IN ('trial', 'starter', 'professional', 'enterprise'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled', 'past_due'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_locations INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. LOCATIONS TABLE - Already exists, just add indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(tenant_id, is_active) WHERE is_active = true;

-- =====================================================
-- 3. ORG_MEMBERSHIPS TABLE (Multi-org support)
-- =====================================================

-- This allows users to belong to multiple organizations
-- with different roles and location access in each
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'super_admin', 'admin', 'manager', 'staff', 'marketing', 'read_only')),
  location_ids UUID[] DEFAULT '{}', -- Empty array = all locations, specific IDs = scoped access
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_approval', 'invited', 'declined')),
  invited_by_user_id UUID REFERENCES app_users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  approved_by_user_id UUID REFERENCES app_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id) -- One membership per user per org
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_tenant ON org_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON org_memberships(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_active ON org_memberships(user_id, tenant_id) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_org_memberships_updated_at ON org_memberships;
CREATE TRIGGER update_org_memberships_updated_at BEFORE UPDATE ON org_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. BACKFILL ORG_MEMBERSHIPS FROM EXISTING APP_USERS
-- =====================================================

-- Create membership for every existing user
INSERT INTO org_memberships (user_id, tenant_id, role, status, created_at)
SELECT 
  au.id,
  au.tenant_id,
  au.role, -- Use existing role directly (owner, manager, or staff)
  'active',
  au.created_at
FROM app_users au
WHERE NOT EXISTS (
  SELECT 1 FROM org_memberships om 
  WHERE om.user_id = au.id AND om.tenant_id = au.tenant_id
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- =====================================================
-- 5. ENHANCE APP_USERS TABLE
-- =====================================================

-- Add current_org_id for UX (remembers last active org)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES tenants(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';

-- Set current_org_id to their tenant_id for existing users
UPDATE app_users SET current_org_id = tenant_id WHERE current_org_id IS NULL;

-- =====================================================
-- 6. USER INVITATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'super_admin', 'admin', 'manager', 'staff', 'marketing', 'read_only')),
  location_ids UUID[] DEFAULT '{}',
  invited_by_user_id UUID NOT NULL REFERENCES app_users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID REFERENCES app_users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email, status) -- Prevent duplicate pending invites
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status) WHERE status = 'pending';

-- =====================================================
-- 7. HELPER FUNCTIONS (Enhanced)
-- =====================================================

-- Get user's current org_id (from memberships, with fallback)
CREATE OR REPLACE FUNCTION auth.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    -- Try to get from active membership (new model)
    (SELECT tenant_id FROM org_memberships 
     WHERE user_id = auth.uid() AND status = 'active' 
     ORDER BY last_accessed_at DESC LIMIT 1),
    -- Fallback to app_users.tenant_id (old model, for migration period)
    (SELECT tenant_id FROM app_users WHERE id = auth.uid() LIMIT 1)
  );
$$;

-- Check if user has access to specific org
CREATE OR REPLACE FUNCTION auth.user_has_org_access(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = target_org_id
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND tenant_id = target_org_id
  );
$$;

-- Get user's role in specific org
CREATE OR REPLACE FUNCTION auth.get_user_role_in_org(target_org_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM org_memberships 
     WHERE user_id = auth.uid() AND tenant_id = target_org_id AND status = 'active' 
     LIMIT 1),
    (SELECT role FROM app_users WHERE id = auth.uid() AND tenant_id = target_org_id LIMIT 1),
    'none'
  );
$$;

-- Get user's location access in org
CREATE OR REPLACE FUNCTION auth.get_user_locations_in_org(target_org_id UUID)
RETURNS UUID[]
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT location_ids FROM org_memberships 
     WHERE user_id = auth.uid() AND tenant_id = target_org_id AND status = 'active' 
     LIMIT 1),
    '{}'::UUID[] -- Empty array = all locations
  );
$$;

-- =====================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org locations" ON locations;
CREATE POLICY "Users can view org locations"
  ON locations FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org locations" ON locations;
CREATE POLICY "Admins can manage org locations"
  ON locations FOR ALL
  USING (
    tenant_id = auth.get_user_org_id() 
    AND auth.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- Org Memberships
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org memberships" ON org_memberships;
CREATE POLICY "Users can view org memberships"
  ON org_memberships FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org memberships" ON org_memberships;
CREATE POLICY "Admins can manage org memberships"
  ON org_memberships FOR ALL
  USING (
    tenant_id = auth.get_user_org_id() 
    AND auth.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- User Invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org invitations" ON user_invitations;
CREATE POLICY "Users can view org invitations"
  ON user_invitations FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org invitations" ON user_invitations;
CREATE POLICY "Admins can manage org invitations"
  ON user_invitations FOR ALL
  USING (
    tenant_id = auth.get_user_org_id() 
    AND auth.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- Service role bypass for all
CREATE POLICY "Service role bypass locations" ON locations
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass memberships" ON org_memberships
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass invitations" ON user_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 9. AUDIT LOG FOR ORG CONTEXT SWITCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS org_access_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id),
  from_org_id UUID REFERENCES tenants(id),
  to_org_id UUID NOT NULL REFERENCES tenants(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('login', 'switch', 'api_call', 'suspicious')),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_access_log_user ON org_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_access_log_org ON org_access_log(to_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_access_log_suspicious ON org_access_log(created_at DESC) WHERE access_type = 'suspicious';

-- =====================================================
-- 10. ISOLATION VIOLATION LOG (Security Monitoring)
-- =====================================================

CREATE TABLE IF NOT EXISTS isolation_violations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  user_org_id UUID REFERENCES tenants(id),
  attempted_org_id UUID REFERENCES tenants(id),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('cross_org_query', 'cross_org_update', 'cross_org_delete', 'missing_org_filter', 'hardcoded_tenant_id')),
  table_name TEXT,
  record_id UUID,
  query_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isolation_violations_user ON isolation_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isolation_violations_type ON isolation_violations(violation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isolation_violations_org ON isolation_violations(attempted_org_id, created_at DESC);

-- =====================================================
-- SUMMARY
-- =====================================================

-- Created:
-- ✅ Enhanced tenants table with enterprise fields
-- ✅ Locations table (verified/created)
-- ✅ org_memberships table (multi-org support)
-- ✅ user_invitations table (invite flows)
-- ✅ org_access_log (audit trail)
-- ✅ isolation_violations (security monitoring)
-- ✅ Helper functions (org_id lookup, role check, location access)
-- ✅ RLS policies for new tables
-- ✅ Backfilled existing users to org_memberships

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify all tables created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('locations', 'org_memberships', 'user_invitations', 'org_access_log', 'isolation_violations')) = 5,
    'Not all tables were created successfully';
  
  RAISE NOTICE 'Phase 2 Migration Complete: All tables created successfully';
END $$;

