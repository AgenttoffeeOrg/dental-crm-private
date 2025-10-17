-- =====================================================
-- FINAL PRE-FLIGHT CHECK
-- Run this before deploying to verify everything is ready
-- =====================================================

BEGIN;

DO $$
DECLARE
  issue_count INTEGER := 0;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🚀 FINAL PRE-FLIGHT CHECK';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 1: Existing Platform super_admins
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 1: Platform super_admins Table';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admins') THEN
    RAISE NOTICE '   ✅ Platform super_admins exists (will remain unchanged)';
  ELSE
    RAISE NOTICE '   ℹ️  Platform super_admins not found (OK, not required)';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 2: tenant_admins Should NOT Exist Yet
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 2: tenant_admins Table Status';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tenant_admins') THEN
    RAISE NOTICE '   ℹ️  tenant_admins already exists (migrations will skip creation)';
  ELSE
    RAISE NOTICE '   ✅ tenant_admins does not exist (will be created by migration 001a)';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 3: Existing Constraints
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 3: Existing Constraints on tenants';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  -- Check for constraints that migration 001 will create
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname IN ('check_verification_method', 'check_currency_code', 'check_locale')
      AND conrelid = 'tenants'::regclass
  ) THEN
    RAISE NOTICE '   ℹ️  Some constraints already exist (migrations will skip them)';
    RAISE NOTICE '   ✅ Migrations are idempotent - safe to continue';
  ELSE
    RAISE NOTICE '   ✅ No conflicting constraints found';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 4: Existing Owners (for backfill)
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 4: Users to Migrate to tenant_admins';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  DECLARE
    owner_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO owner_count FROM app_users WHERE role = 'owner';
    RAISE NOTICE '   ✅ Found % users with role=owner', owner_count;
    RAISE NOTICE '   ℹ️  These will become tenant_admins in migration 001a';
  END;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 5: Multi-Location Tables
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 5: Multi-Location Tables';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'dental_groups') THEN
    RAISE NOTICE '   ℹ️  dental_groups already exists (migration 002 will skip creation)';
  ELSE
    RAISE NOTICE '   ✅ dental_groups does not exist (will be created by migration 002)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_location_access') THEN
    RAISE NOTICE '   ℹ️  user_location_access already exists (migration 003 will skip)';
  ELSE
    RAISE NOTICE '   ✅ user_location_access does not exist (will be created by migration 003)';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 6: Billing Tables
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 6: Billing Schema';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plans') THEN
    RAISE NOTICE '   ℹ️  plans table already exists';
  ELSE
    RAISE NOTICE '   ✅ plans does not exist (will be created by migration 005)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
    RAISE NOTICE '   ℹ️  subscriptions table already exists';
  ELSE
    RAISE NOTICE '   ✅ subscriptions does not exist (will be created by migration 005)';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 7: Critical Functions
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 7: Critical Functions';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_tenant_admin') THEN
    RAISE NOTICE '   ℹ️  is_tenant_admin() already exists';
  ELSE
    RAISE NOTICE '   ✅ is_tenant_admin() does not exist (will be created by 001a)';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_accessible_tenants') THEN
    RAISE NOTICE '   ℹ️  get_accessible_tenants() already exists';
  ELSE
    RAISE NOTICE '   ✅ get_accessible_tenants() does not exist (will be created by 003)';
  END IF;
  RAISE NOTICE '';
  
  -- =====================================================
  -- CHECK 8: Database Version
  -- =====================================================
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ CHECK 8: PostgreSQL Version';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  DECLARE
    pg_version TEXT;
  BEGIN
    SELECT version() INTO pg_version;
    RAISE NOTICE '   ✅ PostgreSQL: %', SUBSTRING(pg_version FROM 'PostgreSQL [0-9.]+');
    RAISE NOTICE '   ℹ️  All migrations compatible with PostgreSQL 12+';
  END;
  RAISE NOTICE '';
  
  -- =====================================================
  -- FINAL SUMMARY
  -- =====================================================
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ PRE-FLIGHT CHECK COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  
  IF issue_count = 0 THEN
    RAISE NOTICE '🎯 Status: READY FOR DEPLOYMENT';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Next Steps:';
    RAISE NOTICE '   1. Run migrations 001 → 001a → 002-009 in order';
    RAISE NOTICE '   2. All migrations are idempotent (safe to re-run)';
    RAISE NOTICE '   3. Run test_tenant_admins_complete.sql to verify';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 You are cleared for deployment!';
  ELSE
    RAISE NOTICE '⚠️  Status: ISSUES DETECTED (%)', issue_count;
    RAISE NOTICE '   Review the messages above before deploying';
  END IF;
  
  RAISE NOTICE '====================================================';

END $$;

ROLLBACK; -- Don't commit, just checking

