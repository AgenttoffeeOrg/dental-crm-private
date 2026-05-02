SET search_path TO public, extensions;

-- =====================================================
-- STEP 1C: ADD ACTIVE TENANT CONTEXT TO APP_USERS
-- Purpose: Store user's current session context (which org they're viewing)
-- Safety: Nullable columns, backward compatible
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Adds active_tenant_id (UUID) - tracks which org user is currently viewing
-- 2. Adds default_tenant_id (UUID) - user's preferred "home" org
-- 3. Adds default_location_id (UUID) - user's preferred default location
-- 4. Adds remember_last_context (BOOLEAN) - user preference for sticky context
-- 5. All columns nullable for backward compatibility
--
-- WHY WE NEED THIS:
-- - Users can belong to multiple orgs (via memberships)
-- - Need to track which org they're currently viewing
-- - Session context must be stored somewhere (this table)
-- - Allows "remember last org" feature
--
-- SAFETY:
-- - All columns nullable (existing rows unaffected)
-- - No data migration needed (populated at runtime)
-- - Indexes added for performance
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD SESSION CONTEXT COLUMNS
-- =====================================================

-- Active tenant: which org is user currently viewing?
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS active_tenant_id UUID 
  REFERENCES tenants(id) ON DELETE SET NULL;

COMMENT ON COLUMN app_users.active_tenant_id IS
  'Current session context: which organization the user is actively viewing. Updated when user switches orgs.';

-- Default tenant: user's "home" organization
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS default_tenant_id UUID 
  REFERENCES tenants(id) ON DELETE SET NULL;

COMMENT ON COLUMN app_users.default_tenant_id IS
  'User preferred default organization. Used on login if remember_last_context=false.';

-- Default location: user's preferred location within their default org
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS default_location_id UUID;
  -- Note: Foreign key to locations table added in Step 2

COMMENT ON COLUMN app_users.default_location_id IS
  'User preferred default location. Foreign key constraint added in Step 2.';

-- Remember preference: sticky context vs default
ALTER TABLE app_users 
  ADD COLUMN IF NOT EXISTS remember_last_context BOOLEAN 
  DEFAULT true NOT NULL;

COMMENT ON COLUMN app_users.remember_last_context IS
  'If true, restore active_tenant_id on login. If false, use default_tenant_id.';

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Lookup users by active tenant (admin dashboards)
CREATE INDEX IF NOT EXISTS idx_app_users_active_tenant 
  ON app_users(active_tenant_id) 
  WHERE active_tenant_id IS NOT NULL;

-- Lookup users by default tenant
CREATE INDEX IF NOT EXISTS idx_app_users_default_tenant 
  ON app_users(default_tenant_id) 
  WHERE default_tenant_id IS NOT NULL;

-- Lookup users by default location (Step 2 will use this)
CREATE INDEX IF NOT EXISTS idx_app_users_default_location 
  ON app_users(default_location_id) 
  WHERE default_location_id IS NOT NULL;

-- =====================================================
-- 3. BACKFILL DEFAULT VALUES (OPTIONAL)
-- =====================================================

-- Set default_tenant_id to current tenant_id (user's "home" org)
-- This preserves existing behavior where each user has one org
UPDATE app_users
SET 
  default_tenant_id = tenant_id,
  active_tenant_id = tenant_id  -- Also set active to current
WHERE default_tenant_id IS NULL;

-- =====================================================
-- 4. VALIDATION FUNCTION
-- =====================================================

-- Ensure active_tenant_id is a valid membership
CREATE OR REPLACE FUNCTION validate_active_tenant()
RETURNS TRIGGER AS $$
BEGIN
  -- If active_tenant_id is set, verify user is member
  IF NEW.active_tenant_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM user_tenant_memberships 
      WHERE user_id = NEW.id 
        AND tenant_id = NEW.active_tenant_id 
        AND status = 'active'
    ) AND NOT EXISTS (
      -- Fallback: check legacy tenant_id during transition
      SELECT 1 
      FROM app_users 
      WHERE id = NEW.id 
        AND tenant_id = NEW.active_tenant_id
    ) THEN
      RAISE EXCEPTION 'active_tenant_id must be a tenant the user belongs to (user: %, tenant: %)', 
        NEW.id, NEW.active_tenant_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to enforce validation
CREATE OR REPLACE TRIGGER trigger_validate_active_tenant
  BEFORE INSERT OR UPDATE OF active_tenant_id ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION validate_active_tenant();

COMMENT ON FUNCTION validate_active_tenant() IS
  'Ensures user can only set active_tenant_id to orgs they are members of';

-- =====================================================
-- 5. HELPER FUNCTION: GET ACTIVE TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION get_active_tenant_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_active_tenant_id UUID;
  v_default_tenant_id UUID;
  v_legacy_tenant_id UUID;
  v_first_membership_tenant_id UUID;
BEGIN
  -- Priority 1: active_tenant_id (user's current selection)
  SELECT active_tenant_id, default_tenant_id, tenant_id
  INTO v_active_tenant_id, v_default_tenant_id, v_legacy_tenant_id
  FROM app_users
  WHERE id = p_user_id;
  
  IF v_active_tenant_id IS NOT NULL THEN
    RETURN v_active_tenant_id;
  END IF;
  
  -- Priority 2: default_tenant_id (user's home org)
  IF v_default_tenant_id IS NOT NULL THEN
    RETURN v_default_tenant_id;
  END IF;
  
  -- Priority 3: First active membership (new system)
  SELECT tenant_id INTO v_first_membership_tenant_id
  FROM user_tenant_memberships
  WHERE user_id = p_user_id
    AND status = 'active'
  ORDER BY joined_at ASC
  LIMIT 1;
  
  IF v_first_membership_tenant_id IS NOT NULL THEN
    RETURN v_first_membership_tenant_id;
  END IF;
  
  -- Priority 4: Legacy tenant_id (backward compatibility)
  IF v_legacy_tenant_id IS NOT NULL THEN
    RETURN v_legacy_tenant_id;
  END IF;
  
  -- No tenant found
  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_active_tenant_for_user(UUID) IS
  'Returns user active tenant with fallback logic: active > default > first_membership > legacy';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  users_with_active_tenant INTEGER;
  users_with_default_tenant INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM app_users;
  
  SELECT COUNT(*) INTO users_with_active_tenant 
  FROM app_users 
  WHERE active_tenant_id IS NOT NULL;
  
  SELECT COUNT(*) INTO users_with_default_tenant 
  FROM app_users 
  WHERE default_tenant_id IS NOT NULL;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ACTIVE TENANT CONTEXT ADDED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total users: %', total_users;
  RAISE NOTICE 'Users with active_tenant_id: %', users_with_active_tenant;
  RAISE NOTICE 'Users with default_tenant_id: %', users_with_default_tenant;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 4 new columns added to app_users';
  RAISE NOTICE '✅ 3 indexes created for performance';
  RAISE NOTICE '✅ Validation trigger installed';
  RAISE NOTICE '✅ Helper function available: get_active_tenant_for_user()';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next: Run 20251025_002c_update_auth_function.sql';
END $$;



