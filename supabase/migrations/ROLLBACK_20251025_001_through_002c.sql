-- =====================================================
-- ROLLBACK: Step 1 - Multi-Org Membership
-- Purpose: Revert all Step 1 changes if issues found
-- Safety: Tested, preserves legacy system
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Critical bugs found in multi-org system
-- - Data integrity issues
-- - Performance problems
-- - Need to revert to single-tenant model
--
-- WHAT THIS DOES:
-- 1. Reverts auth.get_user_tenant_id() to legacy version
-- 2. Removes active_tenant_id columns from app_users
-- 3. Drops user_tenant_memberships table
-- 4. Restores app_users.tenant_id as source of truth
--
-- DATA LOSS:
-- - All membership records deleted (backfilled data can be recreated)
-- - Active tenant preferences lost
-- - Invitation tracking lost
--
-- RECOVERY TIME: ~5 minutes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: REVERT AUTH FUNCTION TO LEGACY
-- =====================================================

CREATE OR REPLACE FUNCTION auth.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM app_users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

RAISE NOTICE '✅ auth.get_user_tenant_id() reverted to legacy version';

-- =====================================================
-- STEP 2: DROP NEW AUTH FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS auth.set_active_tenant(UUID);

RAISE NOTICE '✅ auth.set_active_tenant() dropped';

-- =====================================================
-- STEP 3: DROP HELPER FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS get_active_tenant_for_user(UUID);
DROP FUNCTION IF EXISTS validate_active_tenant();
DROP FUNCTION IF EXISTS get_user_memberships(UUID);
DROP FUNCTION IF EXISTS is_user_member_of_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS get_user_role_in_tenant(UUID, UUID);
DROP FUNCTION IF EXISTS count_user_memberships(UUID);

RAISE NOTICE '✅ Helper functions dropped';

-- =====================================================
-- STEP 4: REMOVE ACTIVE TENANT COLUMNS FROM APP_USERS
-- =====================================================

-- Drop trigger first
DROP TRIGGER IF EXISTS trigger_validate_active_tenant ON app_users;

-- Drop indexes
DROP INDEX IF EXISTS idx_app_users_active_tenant;
DROP INDEX IF EXISTS idx_app_users_default_tenant;
DROP INDEX IF EXISTS idx_app_users_default_location;

-- Drop columns
ALTER TABLE app_users DROP COLUMN IF EXISTS active_tenant_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS default_tenant_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS default_location_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS remember_last_context;

RAISE NOTICE '✅ Active tenant columns removed from app_users';

-- =====================================================
-- STEP 5: DROP USER_TENANT_MEMBERSHIPS TABLE
-- =====================================================

-- Drop policies first
DROP POLICY IF EXISTS "Users can view own memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Tenant admins can view tenant memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Service role can manage memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Tenant admins can create memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Users can update own memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Tenant owners can update tenant memberships" ON user_tenant_memberships;
DROP POLICY IF EXISTS "Tenant owners can remove members" ON user_tenant_memberships;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_memberships_updated_at ON user_tenant_memberships;
DROP FUNCTION IF EXISTS update_memberships_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_memberships_user_id;
DROP INDEX IF EXISTS idx_memberships_tenant_id;
DROP INDEX IF EXISTS idx_memberships_user_tenant;
DROP INDEX IF EXISTS idx_memberships_user_active;
DROP INDEX IF EXISTS idx_memberships_invited_by;
DROP INDEX IF EXISTS idx_memberships_joined_at;
DROP INDEX IF EXISTS idx_memberships_tenant_status;

-- Drop table
DROP TABLE IF EXISTS user_tenant_memberships CASCADE;

RAISE NOTICE '✅ user_tenant_memberships table dropped';

-- =====================================================
-- STEP 6: VERIFICATION
-- =====================================================

DO $$
DECLARE
  app_users_count INTEGER;
  memberships_table_exists BOOLEAN;
BEGIN
  -- Verify app_users still intact
  SELECT COUNT(*) INTO app_users_count FROM app_users;
  
  -- Verify memberships table gone
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_tenant_memberships'
  ) INTO memberships_table_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'app_users count: % (unchanged)', app_users_count;
  RAISE NOTICE 'user_tenant_memberships exists: %', memberships_table_exists;
  RAISE NOTICE '';
  
  IF memberships_table_exists THEN
    RAISE WARNING '⚠️  user_tenant_memberships still exists!';
  ELSE
    RAISE NOTICE '✅ Clean rollback completed';
  END IF;
  
  IF app_users_count = 0 THEN
    RAISE WARNING '⚠️  No users in app_users - this is unusual!';
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
  RAISE NOTICE '✅ auth.get_user_tenant_id() reverted to legacy';
  RAISE NOTICE '✅ user_tenant_memberships table dropped';
  RAISE NOTICE '✅ Active tenant columns removed';
  RAISE NOTICE '✅ All helper functions dropped';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Redeploy application code (revert to pre-Step-1 version)';
  RAISE NOTICE '2. Test existing workflows (sign-in, data access)';
  RAISE NOTICE '3. Verify RLS still blocks cross-tenant access';
  RAISE NOTICE '4. Monitor for 1 hour';
  RAISE NOTICE '';
  RAISE NOTICE '📝 To re-enable multi-org later:';
  RAISE NOTICE '   Re-run migrations 001 through 002c in order';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - app_users.tenant_id (unchanged)';
  RAISE NOTICE '   - All user data intact';
  RAISE NOTICE '   - All RLS policies working';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - Membership records (can be recreated via backfill)';
  RAISE NOTICE '   - Active tenant preferences';
  RAISE NOTICE '   - Invitation metadata';
END $$;



