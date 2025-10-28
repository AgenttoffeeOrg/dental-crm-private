-- =====================================================
-- STEP 2B: MEMBERSHIP LOCATIONS (PER-LOCATION ROLES)
-- Purpose: Enable users to have different roles at different locations
-- Safety: Additive only, backward compatible
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Creates membership_locations junction table
-- 2. Links memberships to specific locations with role overrides
-- 3. Enables "Admin at Location A, Viewer at Location B" scenarios
-- 4. Adds comprehensive indexes and RLS
-- 5. Creates helper functions for location-based permissions
--
-- USE CASES:
-- - User is admin at headquarters, viewer at branches
-- - User only has access to specific locations
-- - Per-location role assignments during invites
-- - Location-based data filtering
--
-- SCOPE COLUMN:
-- - 'own': Can only see/edit their own data
-- - 'team': Can see/edit their team's data (same location)
-- - 'location': Can see/edit all data at this location
-- - 'all': Can see/edit across all locations (org-wide)
--
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE MEMBERSHIP_LOCATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS membership_locations (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign keys
  membership_id UUID NOT NULL REFERENCES user_tenant_memberships(id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  
  -- Role override (NULL = inherit from membership)
  -- Note: CHECK constraint not needed - ENUM type already validates values
  role_override membership_role,
  
  -- Scope (how much data can they access at this location)
  scope TEXT NOT NULL DEFAULT 'location' CHECK (
    scope IN ('own', 'team', 'location', 'all')
  ),
  
  -- Status
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  -- Audit
  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE(membership_id, location_id)  -- User can only be assigned to location once
);

-- Add comments
COMMENT ON TABLE membership_locations IS 
  'Per-location role assignments. Enables users to have different roles at different locations.';

COMMENT ON COLUMN membership_locations.membership_id IS 
  'Reference to user_tenant_memberships (which user, which org)';

COMMENT ON COLUMN membership_locations.location_id IS 
  'Reference to locations (which location within the org)';

COMMENT ON COLUMN membership_locations.role_override IS 
  'Overrides the base role from membership. NULL = use membership role.';

COMMENT ON COLUMN membership_locations.scope IS 
  'Data access scope: own (personal), team (same location team), location (all at location), all (org-wide)';

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Primary lookup: get user's location assignments
CREATE INDEX IF NOT EXISTS idx_membership_locations_membership 
  ON membership_locations(membership_id);

-- Reverse lookup: who has access to this location
CREATE INDEX IF NOT EXISTS idx_membership_locations_location 
  ON membership_locations(location_id);

-- Composite for exact lookups
CREATE INDEX IF NOT EXISTS idx_membership_locations_membership_location 
  ON membership_locations(membership_id, location_id);

-- Filter by status
CREATE INDEX IF NOT EXISTS idx_membership_locations_active 
  ON membership_locations(membership_id, is_active) 
  WHERE is_active = true;

-- Find all location admins/owners
CREATE INDEX IF NOT EXISTS idx_membership_locations_role 
  ON membership_locations(location_id, role_override) 
  WHERE role_override IN ('owner'::membership_role, 'admin'::membership_role);

-- Audit: who assigned users
CREATE INDEX IF NOT EXISTS idx_membership_locations_assigned_by 
  ON membership_locations(assigned_by) 
  WHERE assigned_by IS NOT NULL;

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_membership_locations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_membership_locations_updated_at
  BEFORE UPDATE ON membership_locations
  FOR EACH ROW
  EXECUTE FUNCTION update_membership_locations_updated_at();

-- =====================================================
-- 4. HELPER FUNCTIONS
-- =====================================================

-- Get user's locations with effective roles
CREATE OR REPLACE FUNCTION get_user_locations(p_user_id UUID, p_tenant_id UUID)
RETURNS TABLE (
  location_id UUID,
  location_name TEXT,
  base_role membership_role,
  effective_role membership_role,
  scope TEXT,
  is_active BOOLEAN
) AS $$
DECLARE
  status_active CONSTANT membership_status := 'active';
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    m.role AS base_role,
    COALESCE(ml.role_override, m.role) AS effective_role,
    ml.scope,
    ml.is_active
  FROM user_tenant_memberships m
  INNER JOIN membership_locations ml ON ml.membership_id = m.id
  INNER JOIN locations l ON l.id = ml.location_id
  WHERE m.user_id = p_user_id
    AND m.tenant_id = p_tenant_id
    AND m.status = status_active
    AND ml.is_active
    AND l.is_active
  ORDER BY 
    l.is_primary DESC,
    l.name ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_locations(UUID, UUID) IS 
  'Returns all locations a user has access to, with their effective role at each';

-- Get effective role at location
CREATE OR REPLACE FUNCTION get_user_role_at_location(
  p_user_id UUID, 
  p_tenant_id UUID, 
  p_location_id UUID
)
RETURNS membership_role AS $$
DECLARE
  v_role membership_role;
  status_active CONSTANT membership_status := 'active';
BEGIN
  -- Check membership_locations for override
  SELECT COALESCE(ml.role_override, m.role) INTO v_role
  FROM user_tenant_memberships m
  INNER JOIN membership_locations ml ON ml.membership_id = m.id
  WHERE m.user_id = p_user_id
    AND m.tenant_id = p_tenant_id
    AND ml.location_id = p_location_id
    AND m.status = status_active
    AND ml.is_active
  LIMIT 1;
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;
  
  -- No specific location assignment, check base membership
  SELECT role INTO v_role
  FROM user_tenant_memberships
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND status = status_active
  LIMIT 1;
  
  RETURN v_role;  -- May be NULL if not a member
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_user_role_at_location(UUID, UUID, UUID) IS 
  'Returns user effective role at a specific location. Checks override first, then base role.';

-- Check if user has access to location
CREATE OR REPLACE FUNCTION user_has_location_access(
  p_user_id UUID, 
  p_tenant_id UUID, 
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  status_active CONSTANT membership_status := 'active';
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships m
    LEFT JOIN membership_locations ml ON ml.membership_id = m.id
    WHERE m.user_id = p_user_id
      AND m.tenant_id = p_tenant_id
      AND m.status = status_active
      AND (
        ml.location_id = p_location_id 
        OR ml.id IS NULL  -- No location restrictions = access to all
      )
  );
END;
$$;

COMMENT ON FUNCTION user_has_location_access(UUID, UUID, UUID) IS 
  'Returns true if user has access to the specified location';

-- Get location scope for user
CREATE OR REPLACE FUNCTION get_user_location_scope(
  p_user_id UUID, 
  p_tenant_id UUID, 
  p_location_id UUID
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  v_scope TEXT;
  status_active CONSTANT membership_status := 'active';
BEGIN
  SELECT scope INTO v_scope
  FROM user_tenant_memberships m
  INNER JOIN membership_locations ml ON ml.membership_id = m.id
  WHERE m.user_id = p_user_id
    AND m.tenant_id = p_tenant_id
    AND ml.location_id = p_location_id
    AND m.status = status_active
    AND ml.is_active
  LIMIT 1;
  
  RETURN v_scope;
END;
$$;

COMMENT ON FUNCTION get_user_location_scope(UUID, UUID, UUID) IS 
  'Returns user data access scope at a location: own, team, location, or all';

-- Helper function for RLS: Check if user is active admin/owner
CREATE OR REPLACE FUNCTION is_active_admin_for_location(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  role_owner CONSTANT membership_role := 'owner';
  role_admin CONSTANT membership_role := 'admin';
  status_active CONSTANT membership_status := 'active';
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships m
    INNER JOIN locations l ON l.tenant_id = m.tenant_id
    WHERE m.user_id = auth.uid()
      AND m.role IN (role_owner, role_admin)
      AND m.status = status_active
      AND l.id = p_location_id
  );
END;
$$;

-- Helper function for RLS: Check if user is active owner for location
CREATE OR REPLACE FUNCTION is_active_owner_for_location(p_location_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
DECLARE
  role_owner CONSTANT membership_role := 'owner';
  status_active CONSTANT membership_status := 'active';
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_tenant_memberships m
    INNER JOIN locations l ON l.tenant_id = m.tenant_id
    WHERE m.user_id = auth.uid()
      AND m.role = role_owner
      AND m.status = status_active
      AND l.id = p_location_id
  );
END;
$$;

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE membership_locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own location assignments
CREATE POLICY "Users can view own location assignments"
  ON membership_locations
  FOR SELECT
  USING (
    membership_id IN (
      SELECT id 
      FROM user_tenant_memberships 
      WHERE user_id = auth.uid()
    )
  );

COMMENT ON POLICY "Users can view own location assignments" ON membership_locations IS
  'Users can see which locations they have access to';

-- Policy 2: Tenant admins can view all location assignments
CREATE POLICY "Tenant admins can view all assignments"
  ON membership_locations
  FOR SELECT
  USING (is_active_admin_for_location(location_id));

COMMENT ON POLICY "Tenant admins can view all assignments" ON membership_locations IS
  'Admins can see all location assignments in their organization';

-- Policy 3: Tenant admins can create location assignments
CREATE POLICY "Tenant admins can create assignments"
  ON membership_locations
  FOR INSERT
  WITH CHECK (is_active_admin_for_location(location_id));

COMMENT ON POLICY "Tenant admins can create assignments" ON membership_locations IS
  'Admins can assign users to locations';

-- Policy 4: Tenant admins can update location assignments
CREATE POLICY "Tenant admins can update assignments"
  ON membership_locations
  FOR UPDATE
  USING (is_active_admin_for_location(location_id));

COMMENT ON POLICY "Tenant admins can update assignments" ON membership_locations IS
  'Admins can modify location assignments';

-- Policy 5: Only owners can delete location assignments
CREATE POLICY "Tenant owners can delete assignments"
  ON membership_locations
  FOR DELETE
  USING (is_active_owner_for_location(location_id));

COMMENT ON POLICY "Tenant owners can delete assignments" ON membership_locations IS
  'Only owners can remove location assignments';

-- Policy 6: Service role can do anything
CREATE POLICY "Service role can manage assignments"
  ON membership_locations
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  assignment_count INTEGER;
  completion_header CONSTANT TEXT := '========================================';
BEGIN
  SELECT COUNT(*) INTO assignment_count FROM membership_locations;
  
  RAISE NOTICE '%', completion_header;
  RAISE NOTICE '✅ MEMBERSHIP_LOCATIONS TABLE CREATED';
  RAISE NOTICE '%', completion_header;
  RAISE NOTICE 'Current assignments: %', assignment_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Table: membership_locations';
  RAISE NOTICE '✅ Indexes: 6 for performance';
  RAISE NOTICE '✅ RLS Policies: 6 (strict isolation)';
  RAISE NOTICE '✅ Helper Functions: 5';
  RAISE NOTICE '✅ Triggers: updated_at auto-update';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Features Enabled:';
  RAISE NOTICE '   - Per-location role overrides';
  RAISE NOTICE '   - Data access scopes (own/team/location/all)';
  RAISE NOTICE '   - Multi-location user assignments';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next: Run 20251025_003c_migrate_practice_locations.sql';
END $$;


