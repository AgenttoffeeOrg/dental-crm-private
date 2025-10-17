-- =====================================================
-- Migration: Create Tenant Admins System
-- Purpose: Track Super Admins at tenant level (different from platform super_admins)
-- This is inserted as 001a to run before other migrations reference it
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE TENANT_ADMINS TABLE
-- =====================================================
-- This tracks Super Admins for each tenant (organization-level)
-- Separate from the platform-level super_admins table

CREATE TABLE IF NOT EXISTS tenant_admins (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant and user
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Assignment tracking
  assigned_by_user_id UUID REFERENCES app_users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Deactivation tracking
  deactivated_by_user_id UUID REFERENCES app_users(id),
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE tenant_admins IS 
  'Tenant-level Super Admins (organization admins), different from platform super_admins';

COMMENT ON COLUMN tenant_admins.tenant_id IS 
  'Organization this admin belongs to';

COMMENT ON COLUMN tenant_admins.user_id IS 
  'User with Super Admin privileges';

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant 
  ON tenant_admins(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_user 
  ON tenant_admins(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_active 
  ON tenant_admins(tenant_id, is_active) 
  WHERE is_active = TRUE;

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_tenant_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_admins_updated_at
  BEFORE UPDATE ON tenant_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_admins_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE tenant_admins ENABLE ROW LEVEL SECURITY;

-- Users can see admins in their organization
CREATE POLICY tenant_admins_select_policy ON tenant_admins
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Only existing admins can create new admins
CREATE POLICY tenant_admins_insert_policy ON tenant_admins
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- Only admins can update admin records
CREATE POLICY tenant_admins_update_policy ON tenant_admins
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- No DELETE policy - use soft delete (is_active = FALSE)

COMMENT ON POLICY tenant_admins_select_policy ON tenant_admins IS 
  'Users can view admins in their organization';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Check if user is Super Admin of a tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tenant_admins
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_tenant_admin IS 
  'Check if user is an active Super Admin of a tenant';

-- Get all tenants where user is admin
CREATE OR REPLACE FUNCTION get_admin_tenants(p_user_id UUID)
RETURNS TABLE (tenant_id UUID, tenant_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name
  FROM tenant_admins ta
  INNER JOIN tenants t ON t.id = ta.tenant_id
  WHERE ta.user_id = p_user_id
    AND ta.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_admin_tenants IS 
  'Get all tenants where user is an active Super Admin';

-- =====================================================
-- 6. BACKFILL EXISTING OWNERS AS TENANT ADMINS
-- =====================================================

-- Find all users with 'owner' role and make them tenant admins
INSERT INTO tenant_admins (
  tenant_id,
  user_id,
  is_active,
  assigned_by_user_id,
  assigned_at
)
SELECT 
  au.tenant_id,
  au.id AS user_id,
  TRUE AS is_active,
  au.id AS assigned_by_user_id, -- Self-assigned during migration
  au.created_at AS assigned_at
FROM app_users au
WHERE au.role = 'owner'
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET is_active = TRUE;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM tenant_admins WHERE is_active = TRUE;
  
  RAISE NOTICE '✅ Migration 001a complete: tenant_admins table created';
  RAISE NOTICE '👥 Backfilled % tenant admins from existing owners', admin_count;
  RAISE NOTICE '🔐 RLS policies: Tenant-level access control';
END $$;

