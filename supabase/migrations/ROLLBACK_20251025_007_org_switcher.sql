-- =====================================================
-- ROLLBACK: Step 6 - Org Switcher & User Defaults
-- Purpose: Remove context management and preference system
-- Safety: Reverts to pre-Step-6 state
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Issues with org switcher
-- - Context switching causing problems
-- - Need to revert to single active context
-- - Preference system causing issues
--
-- WHAT THIS DOES:
-- 1. Drops preference management functions
-- 2. Drops context switching functions
-- 3. Drops user_org_preferences table
-- 4. Drops user_context_history table
-- 5. Drops user_recent_orgs view
-- 6. Removes context tracking columns from app_users
-- 7. Preserves core tenant membership data
--
-- DATA LOSS:
-- - All org preferences (pins, nicknames, defaults)
-- - Context switch history
-- - Visit count analytics
-- - Recent orgs tracking
--
-- DATA PRESERVED:
-- - All users (app_users core data)
-- - All memberships (user_tenant_memberships)
-- - All organizations (tenants)
-- - Core active_tenant_id and default_tenant_id
--
-- RECOVERY TIME: ~2 minutes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: DROP PREFERENCE FUNCTIONS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'DROPPING PREFERENCE FUNCTIONS';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

DROP FUNCTION IF EXISTS public.get_user_org_preferences(UUID);
DROP FUNCTION IF EXISTS public.toggle_org_pin(UUID, UUID, BOOLEAN);
DROP FUNCTION IF EXISTS public.set_default_org(UUID, UUID);
DROP FUNCTION IF EXISTS public.record_org_visit(UUID, UUID);
DROP FUNCTION IF EXISTS public.update_org_nickname(UUID, UUID, TEXT);

DO $$ BEGIN RAISE NOTICE '✅ Dropped preference functions'; END $$;

-- =====================================================
-- STEP 2: DROP CONTEXT FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_context(UUID);
DROP FUNCTION IF EXISTS public.switch_tenant_context(UUID, UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.switch_location_context(UUID, UUID, BOOLEAN);

DO $$ BEGIN RAISE NOTICE '✅ Dropped context functions'; END $$;

-- =====================================================
-- STEP 3: DROP VIEW
-- =====================================================

DROP VIEW IF EXISTS user_recent_orgs CASCADE;

DO $$ BEGIN RAISE NOTICE '✅ Dropped user_recent_orgs view'; END $$;

-- =====================================================
-- STEP 4: DROP TABLES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping tables...';
  RAISE NOTICE '';
END $$;

DROP TABLE IF EXISTS user_org_preferences CASCADE;
DROP TABLE IF EXISTS user_context_history CASCADE;

DO $$ BEGIN RAISE NOTICE '✅ Dropped preference and history tables'; END $$;

-- =====================================================
-- STEP 5: REMOVE CONTEXT TRACKING COLUMNS
-- =====================================================

-- Note: We keep active_tenant_id and default_tenant_id as they were added in Step 1
-- We only remove Step 6 additions

ALTER TABLE app_users DROP COLUMN IF EXISTS last_active_tenant_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS last_tenant_switch_at;
ALTER TABLE app_users DROP COLUMN IF EXISTS tenant_switch_count;
ALTER TABLE app_users DROP COLUMN IF EXISTS active_location_id;
ALTER TABLE app_users DROP COLUMN IF EXISTS per_tenant_location_preferences;

-- Drop indexes
DROP INDEX IF EXISTS idx_app_users_active_tenant;
DROP INDEX IF EXISTS idx_app_users_last_active_tenant;
DROP INDEX IF EXISTS idx_app_users_active_location;

DO $$ BEGIN RAISE NOTICE '✅ Removed context tracking columns from app_users'; END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  user_org_preferences_exists BOOLEAN;
  user_context_history_exists BOOLEAN;
  user_recent_orgs_exists BOOLEAN;
  last_active_tenant_exists BOOLEAN;
  active_location_exists BOOLEAN;
  function_count INTEGER;
BEGIN
  -- Check tables
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_org_preferences'
  ) INTO user_org_preferences_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_context_history'
  ) INTO user_context_history_exists;
  
  -- Check view
  SELECT EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'user_recent_orgs'
  ) INTO user_recent_orgs_exists;
  
  -- Check columns
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'last_active_tenant_id'
  ) INTO last_active_tenant_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'app_users' AND column_name = 'active_location_id'
  ) INTO active_location_exists;
  
  -- Count remaining functions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc
  WHERE proname IN (
    'get_user_org_preferences', 'toggle_org_pin', 'set_default_org',
    'record_org_visit', 'update_org_nickname',
    'get_user_context', 'switch_tenant_context', 'switch_location_context'
  );
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'user_org_preferences exists: %', user_org_preferences_exists;
  RAISE NOTICE 'user_context_history exists: %', user_context_history_exists;
  RAISE NOTICE 'user_recent_orgs view exists: %', user_recent_orgs_exists;
  RAISE NOTICE 'app_users.last_active_tenant_id exists: %', last_active_tenant_exists;
  RAISE NOTICE 'app_users.active_location_id exists: %', active_location_exists;
  RAISE NOTICE 'Remaining functions: %', function_count;
  RAISE NOTICE '';
  
  IF NOT user_org_preferences_exists AND NOT user_context_history_exists
     AND NOT user_recent_orgs_exists AND NOT last_active_tenant_exists
     AND NOT active_location_exists AND function_count = 0 THEN
    RAISE NOTICE '✅ Clean rollback completed';
  ELSE
    RAISE WARNING '⚠️  Some components still exist';
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
  RAISE NOTICE '✅ 8 functions dropped';
  RAISE NOTICE '✅ 2 tables dropped (user_org_preferences, user_context_history)';
  RAISE NOTICE '✅ 1 view dropped (user_recent_orgs)';
  RAISE NOTICE '✅ 5 columns removed from app_users';
  RAISE NOTICE '✅ All indexes dropped';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Verify basic tenant switching still works';
  RAISE NOTICE '2. Test single-org user flows';
  RAISE NOTICE '3. Core tenant context preserved (active_tenant_id, default_tenant_id)';
  RAISE NOTICE '4. Can re-run Step 6 migrations to restore org switcher';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - All app_users (core data)';
  RAISE NOTICE '   - All user_tenant_memberships';
  RAISE NOTICE '   - All tenants';
  RAISE NOTICE '   - active_tenant_id and default_tenant_id columns';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - Org preferences (pins, nicknames)';
  RAISE NOTICE '   - Context switch history';
  RAISE NOTICE '   - Visit analytics';
  RAISE NOTICE '   - Recent orgs tracking';
END $$;



