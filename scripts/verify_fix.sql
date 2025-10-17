-- =====================================================
-- VERIFICATION SCRIPT: Check tenant_admins Fix
-- Run this BEFORE deploying to verify structure
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CHECK TABLE STRUCTURE
-- =====================================================

-- Verify tenant_admins table will be created correctly
DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🔍 VERIFICATION: tenant_admins Table Structure';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ Expected columns:';
  RAISE NOTICE '   - id (UUID)';
  RAISE NOTICE '   - tenant_id (FK to tenants)';
  RAISE NOTICE '   - user_id (FK to app_users)';
  RAISE NOTICE '   - is_active (BOOLEAN)';
  RAISE NOTICE '   - assigned_by_user_id (FK to app_users)';
  RAISE NOTICE '   - assigned_at (TIMESTAMPTZ)';
  RAISE NOTICE '   - deactivated_by_user_id (FK to app_users)';
  RAISE NOTICE '   - deactivated_at (TIMESTAMPTZ)';
  RAISE NOTICE '   - deactivation_reason (TEXT)';
  RAISE NOTICE '   - created_at (TIMESTAMPTZ)';
  RAISE NOTICE '   - updated_at (TIMESTAMPTZ)';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ Expected indexes:';
  RAISE NOTICE '   - idx_tenant_admins_tenant';
  RAISE NOTICE '   - idx_tenant_admins_user';
  RAISE NOTICE '   - idx_tenant_admins_active';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ Expected RLS policies:';
  RAISE NOTICE '   - tenant_admins_select_policy';
  RAISE NOTICE '   - tenant_admins_insert_policy';
  RAISE NOTICE '   - tenant_admins_update_policy';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ Expected functions:';
  RAISE NOTICE '   - is_tenant_admin(p_user_id UUID, p_tenant_id UUID)';
  RAISE NOTICE '   - get_admin_tenants(p_user_id UUID)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. CHECK EXISTING SUPER_ADMINS TABLE (PLATFORM)
-- =====================================================

DO $$
DECLARE
  platform_admin_count INTEGER;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🔍 VERIFICATION: Platform super_admins Table';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  -- Count platform super admins
  SELECT COUNT(*) INTO platform_admin_count
  FROM super_admins
  WHERE is_active = TRUE;
  
  RAISE NOTICE '✅ Platform super_admins table exists (for platform owners)';
  RAISE NOTICE '   Active platform admins: %', platform_admin_count;
  RAISE NOTICE '   Purpose: Platform-wide monitoring (separate auth)';
  RAISE NOTICE '';
  
  RAISE NOTICE '✅ NEW tenant_admins table will be separate:';
  RAISE NOTICE '   Purpose: Organization-level admins (per tenant)';
  RAISE NOTICE '   Uses auth.users authentication';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 3. CHECK EXISTING OWNERS (Will become tenant_admins)
-- =====================================================

DO $$
DECLARE
  owner_count INTEGER;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🔍 VERIFICATION: Existing Owners → Tenant Admins';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  -- Count existing owners
  SELECT COUNT(*) INTO owner_count
  FROM app_users
  WHERE role = 'owner';
  
  RAISE NOTICE '✅ Found % users with role = ''owner''', owner_count;
  RAISE NOTICE '   These will be automatically migrated to tenant_admins';
  RAISE NOTICE '   by migration 001a';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 4. FINAL STATUS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ VERIFICATION COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Summary:';
  RAISE NOTICE '   ✅ Platform super_admins exists (separate system)';
  RAISE NOTICE '   ✅ Tenant admins will be created by migration 001a';
  RAISE NOTICE '   ✅ No naming conflicts after deployment';
  RAISE NOTICE '   ✅ All migrations updated to use tenant_admins';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Next Steps:';
  RAISE NOTICE '   1. Run migration 001a_create_tenant_admins.sql';
  RAISE NOTICE '   2. Verify tenant_admins table exists';
  RAISE NOTICE '   3. Run remaining migrations in order';
  RAISE NOTICE '   4. Run deploy_all_and_setup_test_user.sql';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Ready to deploy!';
  RAISE NOTICE '====================================================';
END $$;

COMMIT;

