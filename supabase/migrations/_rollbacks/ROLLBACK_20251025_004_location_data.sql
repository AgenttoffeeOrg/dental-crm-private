-- =====================================================
-- ROLLBACK: Step 3 - Location-Aware Data & RLS
-- Purpose: Remove location_id columns and revert RLS policies
-- Safety: Reverts to pre-Step-3 state
-- =====================================================
--
-- WHEN TO USE THIS:
-- - Issues with location-scoped queries
-- - RLS policy problems blocking access
-- - Need to revert to tenant-wide access only
-- - Performance issues with location checks
--
-- WHAT THIS DOES:
-- 1. Reverts RLS policies to original tenant-only checks
-- 2. Drops location_id columns from core tables
-- 3. Drops helper function
-- 4. Removes indexes
--
-- DATA LOSS:
-- - All location_id assignments deleted
-- - Location scoping information lost
-- - Can be reassigned after re-running migrations
--
-- DATA PRESERVED:
-- - All core data (contacts, deals, etc.)
-- - locations table (unchanged)
-- - membership_locations table (unchanged)
--
-- RECOVERY TIME: ~3 minutes
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: REVERT RLS POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'REVERTING RLS POLICIES';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

-- Contacts: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view contacts in their tenant and locations" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their tenant and locations" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant and locations" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant and locations" ON contacts;

CREATE POLICY "Users can view contacts in their tenant"
  ON contacts FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create contacts in their tenant"
  ON contacts FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update contacts in their tenant"
  ON contacts FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete contacts in their tenant"
  ON contacts FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted contacts policies'; END $$;

-- Deals: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can create deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant and locations" ON deals;

CREATE POLICY "Users can view deals in their tenant"
  ON deals FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create deals in their tenant"
  ON deals FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update deals in their tenant"
  ON deals FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete deals in their tenant"
  ON deals FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted deals policies'; END $$;

-- Pipelines: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their tenant and locations" ON pipelines;

CREATE POLICY "Users can view pipelines in their tenant"
  ON pipelines FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create pipelines in their tenant"
  ON pipelines FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update pipelines in their tenant"
  ON pipelines FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete pipelines in their tenant"
  ON pipelines FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted pipelines policies'; END $$;

-- Tasks: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their tenant and locations" ON tasks;

CREATE POLICY "Users can view tasks in their tenant"
  ON tasks FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create tasks in their tenant"
  ON tasks FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update tasks in their tenant"
  ON tasks FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete tasks in their tenant"
  ON tasks FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted tasks policies'; END $$;

-- Activities: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their tenant and locations" ON activities;

CREATE POLICY "Users can view activities in their tenant"
  ON activities FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create activities in their tenant"
  ON activities FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update activities in their tenant"
  ON activities FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete activities in their tenant"
  ON activities FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted activities policies'; END $$;

-- Files: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can upload files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can update files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can delete files in their tenant and locations" ON files;

CREATE POLICY "Users can view files in their tenant"
  ON files FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can upload files in their tenant"
  ON files FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update files in their tenant"
  ON files FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete files in their tenant"
  ON files FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted files policies'; END $$;

-- AI Artifacts: revert to simple tenant check
DROP POLICY IF EXISTS "Users can view ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can create ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can update ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can delete ai_artifacts in their tenant and locations" ON ai_artifacts;

CREATE POLICY "Users can view ai_artifacts in their tenant"
  ON ai_artifacts FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create ai_artifacts in their tenant"
  ON ai_artifacts FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update ai_artifacts in their tenant"
  ON ai_artifacts FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete ai_artifacts in their tenant"
  ON ai_artifacts FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

DO $$ BEGIN RAISE NOTICE '✅ Reverted ai_artifacts policies'; END $$;

-- =====================================================
-- STEP 2: DROP HELPER FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS public.user_has_location_access_rls(UUID, UUID, UUID);

DO $$ BEGIN RAISE NOTICE '✅ Dropped helper function'; END $$;

-- =====================================================
-- STEP 3: DROP INDEXES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping location indexes...';
  RAISE NOTICE '';
END $$;

DROP INDEX IF EXISTS idx_contacts_location;
DROP INDEX IF EXISTS idx_contacts_tenant_location;
DROP INDEX IF EXISTS idx_deals_location;
DROP INDEX IF EXISTS idx_deals_tenant_location;
DROP INDEX IF EXISTS idx_pipelines_location;
DROP INDEX IF EXISTS idx_pipelines_tenant_location;
DROP INDEX IF EXISTS idx_tasks_location;
DROP INDEX IF EXISTS idx_tasks_tenant_location;
DROP INDEX IF EXISTS idx_activities_location;
DROP INDEX IF EXISTS idx_activities_tenant_location;
DROP INDEX IF EXISTS idx_files_location;
DROP INDEX IF EXISTS idx_files_tenant_location;
DROP INDEX IF EXISTS idx_ai_artifacts_location;
DROP INDEX IF EXISTS idx_ai_artifacts_tenant_location;

DO $$ BEGIN RAISE NOTICE '✅ Dropped 14 indexes'; END $$;

-- =====================================================
-- STEP 4: DROP LOCATION_ID COLUMNS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Dropping location_id columns...';
  RAISE NOTICE '';
END $$;

ALTER TABLE contacts DROP COLUMN IF EXISTS location_id;
ALTER TABLE deals DROP COLUMN IF EXISTS location_id;
ALTER TABLE pipelines DROP COLUMN IF EXISTS location_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS location_id;
ALTER TABLE activities DROP COLUMN IF EXISTS location_id;
ALTER TABLE files DROP COLUMN IF EXISTS location_id;
ALTER TABLE ai_artifacts DROP COLUMN IF EXISTS location_id;

DO $$ BEGIN RAISE NOTICE '✅ Dropped location_id from 7 tables'; END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  contacts_has_location BOOLEAN;
  deals_has_location BOOLEAN;
  pipelines_has_location BOOLEAN;
  tasks_has_location BOOLEAN;
  activities_has_location BOOLEAN;
  files_has_location BOOLEAN;
  ai_artifacts_has_location BOOLEAN;
  function_exists BOOLEAN;
BEGIN
  -- Check columns dropped
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'contacts' AND column_name = 'location_id'
  ) INTO contacts_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'deals' AND column_name = 'location_id'
  ) INTO deals_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'pipelines' AND column_name = 'location_id'
  ) INTO pipelines_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'location_id'
  ) INTO tasks_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'activities' AND column_name = 'location_id'
  ) INTO activities_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' AND column_name = 'location_id'
  ) INTO files_has_location;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_artifacts' AND column_name = 'location_id'
  ) INTO ai_artifacts_has_location;
  
  -- Check function dropped
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'user_has_location_access_rls'
  ) INTO function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ROLLBACK VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'contacts.location_id exists: %', contacts_has_location;
  RAISE NOTICE 'deals.location_id exists: %', deals_has_location;
  RAISE NOTICE 'pipelines.location_id exists: %', pipelines_has_location;
  RAISE NOTICE 'tasks.location_id exists: %', tasks_has_location;
  RAISE NOTICE 'activities.location_id exists: %', activities_has_location;
  RAISE NOTICE 'files.location_id exists: %', files_has_location;
  RAISE NOTICE 'ai_artifacts.location_id exists: %', ai_artifacts_has_location;
  RAISE NOTICE 'Helper function exists: %', function_exists;
  RAISE NOTICE '';
  
  IF NOT contacts_has_location AND NOT deals_has_location AND NOT pipelines_has_location 
     AND NOT tasks_has_location AND NOT activities_has_location AND NOT files_has_location 
     AND NOT ai_artifacts_has_location AND NOT function_exists THEN
    RAISE NOTICE '✅ Clean rollback completed';
  ELSE
    RAISE WARNING '⚠️  Some columns or functions still exist';
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
  RAISE NOTICE '✅ RLS policies reverted to tenant-only';
  RAISE NOTICE '✅ location_id columns dropped from 7 tables';
  RAISE NOTICE '✅ Helper function dropped';
  RAISE NOTICE '✅ 14 indexes dropped';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NEXT STEPS:';
  RAISE NOTICE '1. Verify app works with tenant-only access';
  RAISE NOTICE '2. Test CRUD operations on all tables';
  RAISE NOTICE '3. locations and membership_locations tables preserved';
  RAISE NOTICE '4. Can re-run Step 3 migrations to restore location features';
  RAISE NOTICE '';
  RAISE NOTICE '💾 DATA PRESERVED:';
  RAISE NOTICE '   - All contacts, deals, pipelines, tasks, activities, files, ai_artifacts';
  RAISE NOTICE '   - locations table (unchanged)';
  RAISE NOTICE '   - membership_locations table (unchanged)';
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  DATA LOST:';
  RAISE NOTICE '   - location_id assignments on core data';
  RAISE NOTICE '   - Can be reassigned after re-running migrations';
END $$;



