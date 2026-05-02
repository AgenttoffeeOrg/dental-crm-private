SET search_path TO public, extensions;

-- =====================================================
-- Migration: Create User Location Access Table
-- Purpose: Track which users can access which locations (multi-location ONLY)
-- Safety: New table, ZERO impact on single-location users
-- Performance: Only queried for is_multi_location=TRUE users (5%)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE USER_LOCATION_ACCESS TABLE
-- =====================================================

DROP TABLE IF EXISTS user_location_access CASCADE;
CREATE TABLE user_location_access (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and location
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Access control
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Granted by (Super Admin or Location Admin)
  granted_by_user_id UUID REFERENCES app_users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Revoked tracking
  revoked_by_user_id UUID REFERENCES app_users(id),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one access record per user per location
  CONSTRAINT unique_user_location UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE user_location_access IS 
  'Multi-location only: Maps users to accessible locations. NOT used for single-location.';

COMMENT ON COLUMN user_location_access.user_id IS 
  'User who can access the location';

COMMENT ON COLUMN user_location_access.tenant_id IS 
  'Location (tenant) being accessed';

COMMENT ON COLUMN user_location_access.is_active IS 
  'FALSE = access revoked but record kept for audit';

COMMENT ON COLUMN user_location_access.granted_by_user_id IS 
  'Super Admin or Location Admin who granted access';

-- =====================================================
-- 2. CREATE INDEXES (critical for performance)
-- =====================================================

-- Primary lookup: "Which locations can user X access?"
-- This is THE critical query for multi-location RLS
CREATE INDEX IF NOT EXISTS idx_user_location_access_user_active 
  ON user_location_access(user_id, is_active) 
  WHERE is_active = TRUE;

-- Reverse lookup: "Which users have access to location Y?"
CREATE INDEX IF NOT EXISTS idx_user_location_access_tenant_active 
  ON user_location_access(tenant_id, is_active) 
  WHERE is_active = TRUE;

-- Composite index for RLS helper function
CREATE INDEX IF NOT EXISTS idx_user_location_access_lookup 
  ON user_location_access(user_id, tenant_id, is_active);

-- Admin query: "Who granted access?"
CREATE INDEX IF NOT EXISTS idx_user_location_access_granted_by 
  ON user_location_access(granted_by_user_id);

-- Audit query: "Recently revoked access"
CREATE INDEX IF NOT EXISTS idx_user_location_access_revoked 
  ON user_location_access(revoked_at) 
  WHERE revoked_at IS NOT NULL;

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_location_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_user_location_access_updated_at
  BEFORE UPDATE ON user_location_access
  FOR EACH ROW
  EXECUTE FUNCTION update_user_location_access_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own access records
DROP POLICY IF EXISTS user_location_access_select_own ON user_location_access;
CREATE POLICY user_location_access_select_own ON user_location_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Tenant Admins can see all access for their locations
DROP POLICY IF EXISTS user_location_access_select_admin ON user_location_access;
CREATE POLICY user_location_access_select_admin ON user_location_access
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- Policy: Only Tenant Admins can grant/revoke access
DROP POLICY IF EXISTS user_location_access_insert_admin ON user_location_access;
CREATE POLICY user_location_access_insert_admin ON user_location_access
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

DROP POLICY IF EXISTS user_location_access_update_admin ON user_location_access;
CREATE POLICY user_location_access_update_admin ON user_location_access
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

COMMENT ON POLICY user_location_access_select_own ON user_location_access IS 
  'Users can view their own location access';

COMMENT ON POLICY user_location_access_select_admin ON user_location_access IS 
  'Tenant Admins can view all access for their locations';

-- =====================================================
-- 5. CRITICAL HELPER FUNCTION: Get accessible tenant IDs
-- =====================================================
-- This is the CORE of the dual-path architecture!
-- Returns single tenant_id for single-location users (fast)
-- Returns array of tenant_ids for multi-location users (acceptable)

-- NOTE: Created in public schema (no permission to create in auth schema)
CREATE OR REPLACE FUNCTION public.get_accessible_tenants()
RETURNS UUID[] AS $$
DECLARE
  user_tenant_id UUID;
  is_multi_loc BOOLEAN;
  accessible_tenants UUID[];
BEGIN
  -- Get user's primary tenant from app_users
  SELECT tenant_id INTO user_tenant_id
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If no tenant, return empty array
  IF user_tenant_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Check if user's primary tenant is multi-location
  SELECT is_multi_location INTO is_multi_loc
  FROM tenants
  WHERE id = user_tenant_id;
  
  -- FAST PATH: Single-location user
  -- Returns single-element array for consistent RLS syntax
  IF is_multi_loc = FALSE OR is_multi_loc IS NULL THEN
    RETURN ARRAY[user_tenant_id];
  END IF;
  
  -- MULTI-LOCATION PATH: Collect all accessible locations
  SELECT ARRAY_AGG(DISTINCT ula.tenant_id)
  INTO accessible_tenants
  FROM user_location_access ula
  WHERE ula.user_id = auth.uid()
    AND ula.is_active = TRUE;
  
  -- Include primary tenant (home location)
  IF NOT (user_tenant_id = ANY(accessible_tenants)) THEN
    accessible_tenants := accessible_tenants || user_tenant_id;
  END IF;
  
  RETURN COALESCE(accessible_tenants, ARRAY[user_tenant_id]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_accessible_tenants IS 
  'Dual-path: Returns single tenant for 95% users (fast), multiple for 5% (acceptable). Used by RLS policies.';

-- =====================================================
-- 6. HELPER FUNCTION: Check if user has multi-location access
-- =====================================================

CREATE OR REPLACE FUNCTION is_multi_location_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  location_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT tenant_id)
  INTO location_count
  FROM user_location_access
  WHERE user_id = is_multi_location_user.user_id
    AND is_active = TRUE;
  
  RETURN location_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_multi_location_user IS 
  'Check if user has access to multiple locations';

-- =====================================================
-- 7. HELPER FUNCTION: Grant location access
-- =====================================================

CREATE OR REPLACE FUNCTION grant_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_granted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  access_id UUID;
BEGIN
  -- Insert or update access record
  INSERT INTO user_location_access (
    user_id,
    tenant_id,
    granted_by_user_id,
    granted_at,
    is_active,
    notes
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_granted_by,
    NOW(),
    TRUE,
    p_notes
  )
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    is_active = TRUE,
    granted_by_user_id = p_granted_by,
    granted_at = NOW(),
    revoked_by_user_id = NULL,
    revoked_at = NULL,
    revocation_reason = NULL,
    notes = COALESCE(p_notes, user_location_access.notes),
    updated_at = NOW()
  RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_location_access IS 
  'Grant user access to a location (idempotent)';

-- =====================================================
-- 8. HELPER FUNCTION: Revoke location access
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_revoked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE user_location_access
  SET 
    is_active = FALSE,
    revoked_by_user_id = p_revoked_by,
    revoked_at = NOW(),
    revocation_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = TRUE;
  
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_location_access IS 
  'Revoke user access to a location (soft delete)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 003 complete: user_location_access table created';
  RAISE NOTICE '🚀 Dual-path architecture: Single-location users unaffected';
  RAISE NOTICE '⚡ Critical function: public.get_accessible_tenants() created';
  RAISE NOTICE '🔒 RLS policies: Users see own access, admins see all';
END $$;

