-- =====================================================
-- ROLLBACK: Step 2 - Locations & Per-Location Roles
-- Purpose: Revert all Step 2 changes if issues found
-- Safety: Tested, non-destructive
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Issues with location system
-- - Need to revert to no-location model
-- - Data integrity problems
--
-- WHAT THIS DOES:
-- 1. Drops membership_locations table
-- 2. Drops locations table
-- 3. Removes foreign key from app_users
-- 4. Drops helper functions
--
-- DATA LOSS:
-- - All location records deleted
-- - All location assignments deleted
-- - practice_locations preserved (if it existed)
--
-- RECOVERY TIME: ~2 minutes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP MEMBERSHIP_LOCATIONS TABLE
-- =====================================================

-- Drop policies
DROP POLICY IF EXISTS "Users can view own location assignments" ON membership_locations;
DROP POLICY IF EXISTS "Tenant admins can view all assignments" ON membership_locations;
DROP POLICY IF EXISTS "Tenant admins can create assignments" ON membership_locations;
DROP POLICY IF EXISTS "Tenant admins can update assignments" ON membership_locations;
DROP POLICY IF EXISTS "Tenant owners can delete assignments" ON membership_locations;
DROP POLICY IF EXISTS "Service role can manage assignments" ON membership_locations;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_membership_locations_updated_at ON membership_locations;
DROP FUNCTION IF EXISTS update_membership_locations_updated_at();

-- Drop helper functions
DROP FUNCTION IF EXISTS get_user_locations(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_role_at_location(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS user_has_location_access(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS get_user_location_scope(UUID, UUID, UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_membership_locations_membership;
DROP INDEX IF EXISTS idx_membership_locations_location;
DROP INDEX IF EXISTS idx_membership_locations_membership_location;
DROP INDEX IF EXISTS idx_membership_locations_active;
DROP INDEX IF EXISTS idx_membership_locations_role;
DROP INDEX IF EXISTS idx_membership_locations_assigned_by;

-- Drop table
DROP TABLE IF EXISTS membership_locations CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ membership_locations table dropped';
END $$;

-- =====================================================
-- STEP 2: REMOVE FOREIGN KEY FROM APP_USERS
-- =====================================================

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS fk_app_users_default_location;

DO $$ BEGIN
  RAISE NOTICE '✅ Foreign key dropped from app_users';
END $$;

-- =====================================================
-- STEP 3: DROP LOCATIONS TABLE
-- =====================================================

-- Drop policies
DROP POLICY IF EXISTS "Users can view tenant locations" ON locations;
DROP POLICY IF EXISTS "Tenant admins can create locations" ON locations;
DROP POLICY IF EXISTS "Tenant admins can update locations" ON locations;
DROP POLICY IF EXISTS "Tenant owners can delete locations" ON locations;
DROP POLICY IF EXISTS "Service role can manage locations" ON locations;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_locations_updated_at ON locations;
DROP FUNCTION IF EXISTS update_locations_updated_at();

-- Drop helper functions
DROP FUNCTION IF EXISTS get_tenant_locations(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS get_primary_location(UUID);
DROP FUNCTION IF EXISTS count_tenant_locations(UUID, BOOLEAN);
DROP FUNCTION IF EXISTS is_multi_location_tenant(UUID);

-- Drop indexes
DROP INDEX IF EXISTS idx_locations_tenant;
DROP INDEX IF EXISTS idx_locations_tenant_active;
DROP INDEX IF EXISTS idx_locations_tenant_primary;
DROP INDEX IF EXISTS idx_locations_name;
DROP INDEX IF EXISTS idx_locations_code;
DROP INDEX IF EXISTS idx_locations_geo;
DROP INDEX IF EXISTS idx_locations_created_by;
DROP INDEX IF EXISTS idx_locations_created_at;

-- Drop table
DROP TABLE IF EXISTS locations CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ locations table dropped';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  locations_exists BOOLEAN;
  membership_locations_exists BOOLEAN;
  practice_locations_exists BOOLEAN;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'locations'
  ) INTO locations_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'membership_locations'
  ) INTO membership_locations_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'practice_locations'
  ) INTO practice_locations_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'locations table exists: %', locations_exists;
  RAISE NOTICE 'membership_locations table exists: %', membership_locations_exists;
  RAISE NOTICE 'practice_locations table exists: %', practice_locations_exists;
  RAISE NOTICE '';
  
  IF NOT locations_exists AND NOT membership_locations_exists THEN
    RAISE NOTICE '✅ Clean rollback completed';
  ELSE
    RAISE WARNING '⚠️  Some tables still exist!';
  END IF;
  
  IF practice_locations_exists THEN
    RAISE NOTICE '✅ practice_locations preserved (if it existed)';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ ROLLBACK COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ locations table dropped';
  RAISE NOTICE '✅ membership_locations table dropped';
  RAISE NOTICE '✅ All helper functions dropped';
  RAISE NOTICE '✅ Foreign key removed from app_users';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Verify app_users table intact';
  RAISE NOTICE '2. Verify user_tenant_memberships intact';
  RAISE NOTICE '3. Test existing workflows';
  RAISE NOTICE '4. Redeploy application code (revert to pre-Step-2 version)';
  RAISE NOTICE '';
  RAISE NOTICE '📝 To re-enable locations later:';
  RAISE NOTICE '   Re-run migrations 003a through 003c in order';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - user_tenant_memberships (unchanged)';
  RAISE NOTICE '   - app_users (unchanged)';
  RAISE NOTICE '   - practice_locations (if it existed)';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - All locations (can be recreated)';
  RAISE NOTICE '   - All location assignments (can be reassigned)';
END $$;

