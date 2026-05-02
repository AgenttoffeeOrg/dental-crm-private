SET search_path TO public, extensions;

-- =====================================================
-- STEP 3A: ADD LOCATION_ID TO CORE TABLES
-- Purpose: Enable per-location data scoping for multi-location tenants
-- Safety: Non-destructive, backward-compatible, nullable columns
-- FIX: Checks if locations table exists before adding foreign keys
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Adds location_id column to core CRM tables
-- 2. Creates indexes for efficient queries
-- 3. Adds foreign key constraints (only if locations table exists)
-- 4. Preserves all existing data (nullable columns)
-- 5. Does NOT enforce location yet (dual-write prep)
--
-- AFFECTED TABLES:
-- - contacts
-- - deals
-- - pipelines
-- - tasks
-- - activities
-- - files
-- - ai_artifacts
--
-- WHY NULLABLE:
-- - Allows gradual migration
-- - Existing records work without location
-- - Future records can be location-scoped
-- - Feature flag controls enforcement
--
-- SAFETY:
-- - Idempotent: safe to run multiple times
-- - Non-breaking: NULL means "tenant-wide" for now
-- - Backward compatible: old queries still work
-- - Zero downtime: no data modification
-- - Checks locations table exists before adding FK
-- =====================================================

BEGIN;

-- =====================================================
-- 0. CHECK IF LOCATIONS TABLE EXISTS
-- =====================================================

DO $$
DECLARE
  locations_exists BOOLEAN;
  schema_public CONSTANT TEXT := 'public';
  table_name_locations CONSTANT TEXT := 'locations';
  separator CONSTANT TEXT := '========================================';
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_locations
  ) INTO locations_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'PRE-FLIGHT CHECK';
  RAISE NOTICE '%', separator;
  
  IF locations_exists THEN
    RAISE NOTICE '✅ locations table found - will add foreign keys';
  ELSE
    RAISE NOTICE '⚠️  locations table not found';
    RAISE NOTICE '   Foreign keys will NOT be created';
    RAISE NOTICE '   Run Step 2 migrations first (20251025_003a/b/c)';
    RAISE NOTICE '';
    RAISE NOTICE '   This migration will add location_id columns';
    RAISE NOTICE '   but WITHOUT foreign key constraints';
    RAISE NOTICE '';
    RAISE NOTICE '   You can re-run this migration after creating locations table';
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 1. ADD LOCATION_ID COLUMNS (WITHOUT FOREIGN KEYS YET)
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'ADDING LOCATION_ID TO CORE TABLES';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
END $$;

-- Add location_id to contacts
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'contacts';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to contacts';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on contacts';
  END IF;
END $$;

-- Add location_id to deals
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'deals';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to deals';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on deals';
  END IF;
END $$;

-- Add location_id to pipelines
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'pipelines';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to pipelines';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on pipelines';
  END IF;
END $$;

-- Add location_id to tasks
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'tasks';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to tasks';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on tasks';
  END IF;
END $$;

-- Add location_id to activities
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'activities';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE activities ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to activities';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on activities';
  END IF;
END $$;

-- Add location_id to files
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'files';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE files ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to files';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on files';
  END IF;
END $$;

-- Add location_id to ai_artifacts
DO $$
DECLARE
  table_name_target CONSTANT TEXT := 'ai_artifacts';
  column_name_location CONSTANT TEXT := 'location_id';
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = table_name_target AND column_name = column_name_location
  ) THEN
    ALTER TABLE ai_artifacts ADD COLUMN IF NOT EXISTS location_id UUID;
    RAISE NOTICE '✅ Added location_id to ai_artifacts';
  ELSE
    RAISE NOTICE 'ℹ️  location_id already exists on ai_artifacts';
  END IF;
END $$;

-- =====================================================
-- 2. ADD FOREIGN KEY CONSTRAINTS (ONLY IF LOCATIONS EXISTS)
-- =====================================================

DO $$
DECLARE
  locations_exists BOOLEAN;
  schema_public CONSTANT TEXT := 'public';
  table_name_locations CONSTANT TEXT := 'locations';
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_locations
  ) INTO locations_exists;
  
  IF NOT locations_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Skipping foreign key creation - locations table not found';
    RAISE NOTICE '   Re-run this migration after creating locations table';
    RAISE NOTICE '';
    RETURN;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Adding foreign key constraints...';
  RAISE NOTICE '';
  
  -- Add FK to contacts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_contacts_location' AND table_name = 'contacts'
  ) THEN
    ALTER TABLE contacts 
      DROP CONSTRAINT IF EXISTS fk_contacts_location;
ALTER TABLE contacts 
      ADD CONSTRAINT fk_contacts_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: contacts.location_id → locations.id';
  END IF;
  
  -- Add FK to deals
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_deals_location' AND table_name = 'deals'
  ) THEN
    ALTER TABLE deals 
      DROP CONSTRAINT IF EXISTS fk_deals_location;
ALTER TABLE deals 
      ADD CONSTRAINT fk_deals_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: deals.location_id → locations.id';
  END IF;
  
  -- Add FK to pipelines
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_pipelines_location' AND table_name = 'pipelines'
  ) THEN
    ALTER TABLE pipelines 
      DROP CONSTRAINT IF EXISTS fk_pipelines_location;
ALTER TABLE pipelines 
      ADD CONSTRAINT fk_pipelines_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: pipelines.location_id → locations.id';
  END IF;
  
  -- Add FK to tasks
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_tasks_location' AND table_name = 'tasks'
  ) THEN
    ALTER TABLE tasks 
      DROP CONSTRAINT IF EXISTS fk_tasks_location;
ALTER TABLE tasks 
      ADD CONSTRAINT fk_tasks_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: tasks.location_id → locations.id';
  END IF;
  
  -- Add FK to activities
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_activities_location' AND table_name = 'activities'
  ) THEN
    ALTER TABLE activities 
      DROP CONSTRAINT IF EXISTS fk_activities_location;
ALTER TABLE activities 
      ADD CONSTRAINT fk_activities_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: activities.location_id → locations.id';
  END IF;
  
  -- Add FK to files
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_files_location' AND table_name = 'files'
  ) THEN
    ALTER TABLE files 
      DROP CONSTRAINT IF EXISTS fk_files_location;
ALTER TABLE files 
      ADD CONSTRAINT fk_files_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: files.location_id → locations.id';
  END IF;
  
  -- Add FK to ai_artifacts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_ai_artifacts_location' AND table_name = 'ai_artifacts'
  ) THEN
    ALTER TABLE ai_artifacts 
      DROP CONSTRAINT IF EXISTS fk_ai_artifacts_location;
ALTER TABLE ai_artifacts 
      ADD CONSTRAINT fk_ai_artifacts_location 
      FOREIGN KEY (location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    RAISE NOTICE '✅ Added FK: ai_artifacts.location_id → locations.id';
  END IF;
  
  RAISE NOTICE '✅ All foreign keys created';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error adding foreign keys: %', SQLERRM;
    RAISE NOTICE 'Columns were created but foreign keys may be missing';
    RAISE NOTICE 'This is not critical - can be added manually later';
END $$;

-- =====================================================
-- 3. CREATE INDEXES FOR EFFICIENT QUERIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE 'Creating indexes for location-based queries...';
  RAISE NOTICE '';
END $$;

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_location ON contacts(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_location ON contacts(tenant_id, location_id);

-- Deals indexes
CREATE INDEX IF NOT EXISTS idx_deals_location ON deals(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_tenant_location ON deals(tenant_id, location_id);

-- Pipelines indexes
CREATE INDEX IF NOT EXISTS idx_pipelines_location ON pipelines(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_location ON pipelines(tenant_id, location_id);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS idx_tasks_location ON tasks(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_location ON tasks(tenant_id, location_id);

-- Activities indexes
CREATE INDEX IF NOT EXISTS idx_activities_location ON activities(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_tenant_location ON activities(tenant_id, location_id);

-- Files indexes
CREATE INDEX IF NOT EXISTS idx_files_location ON files(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_files_tenant_location ON files(tenant_id, location_id);

-- AI artifacts indexes
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_location ON ai_artifacts(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_artifacts_tenant_location ON ai_artifacts(tenant_id, location_id);

DO $$
BEGIN
  RAISE NOTICE '✅ All indexes created';
END $$;

-- =====================================================
-- 4. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Apply comments programmatically to avoid string duplication
DO $$
DECLARE
  comment_text CONSTANT TEXT := 'Optional location scoping. NULL means tenant-wide access.';
  comment_text_pipelines CONSTANT TEXT := 'Optional location scoping. NULL means tenant-wide for template pipelines.';
BEGIN
  EXECUTE format('COMMENT ON COLUMN contacts.location_id IS %L', comment_text);
  EXECUTE format('COMMENT ON COLUMN deals.location_id IS %L', comment_text);
  EXECUTE format('COMMENT ON COLUMN pipelines.location_id IS %L', comment_text_pipelines);
  EXECUTE format('COMMENT ON COLUMN tasks.location_id IS %L', comment_text);
  EXECUTE format('COMMENT ON COLUMN activities.location_id IS %L', comment_text);
  EXECUTE format('COMMENT ON COLUMN files.location_id IS %L', comment_text);
  EXECUTE format('COMMENT ON COLUMN ai_artifacts.location_id IS %L', comment_text);
END $$;

-- =====================================================
-- 5. VERIFICATION
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
  all_tables_ready BOOLEAN := true;
  locations_exists BOOLEAN;
  fk_count INTEGER := 0;
  schema_public CONSTANT TEXT := 'public';
  table_name_locations CONSTANT TEXT := 'locations';
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check all columns exist
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
  
  -- Check if locations table exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_locations
  ) INTO locations_exists;
  
  -- Count foreign keys
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE 'fk_%_location';
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'contacts.location_id: %', CASE WHEN contacts_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'deals.location_id: %', CASE WHEN deals_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'pipelines.location_id: %', CASE WHEN pipelines_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'tasks.location_id: %', CASE WHEN tasks_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'activities.location_id: %', CASE WHEN activities_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'files.location_id: %', CASE WHEN files_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'ai_artifacts.location_id: %', CASE WHEN ai_artifacts_has_location THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'locations table exists: %', CASE WHEN locations_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'Foreign keys created: % of 7', fk_count;
  RAISE NOTICE '';
  
  all_tables_ready := contacts_has_location AND deals_has_location AND pipelines_has_location 
                      AND tasks_has_location AND activities_has_location AND files_has_location 
                      AND ai_artifacts_has_location;
  
  IF all_tables_ready THEN
    RAISE NOTICE '✅ All tables have location_id column';
  ELSE
    RAISE WARNING '⚠️  Some tables missing location_id column';
  END IF;
  
  IF NOT locations_exists THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: locations table not found';
    RAISE NOTICE '   Foreign keys could not be created';
    RAISE NOTICE '   Run Step 2 migrations first, then re-run this migration';
  ELSIF fk_count < 7 THEN
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  WARNING: Some foreign keys missing';
    RAISE NOTICE '   This is not critical - columns are usable';
    RAISE NOTICE '   Can add FKs manually later if needed';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  locations_exists BOOLEAN;
  fk_count INTEGER := 0;
  schema_public CONSTANT TEXT := 'public';
  table_name_locations CONSTANT TEXT := 'locations';
  separator CONSTANT TEXT := '========================================';
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_locations
  ) INTO locations_exists;
  
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints 
  WHERE constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE 'fk_%_location';
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ LOCATION COLUMNS ADDED';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ 7 tables updated with location_id';
  RAISE NOTICE '✅ 14 indexes created for efficient queries';
  RAISE NOTICE '✅ % foreign key constraints added', fk_count;
  RAISE NOTICE '✅ All columns nullable (backward compatible)';
  RAISE NOTICE '';
  
  IF NOT locations_exists THEN
    RAISE NOTICE '⚠️  NOTE: locations table not found';
    RAISE NOTICE '   Foreign keys were not created';
    RAISE NOTICE '   Run Step 2 migrations (003a/b/c) first';
    RAISE NOTICE '   Then re-run this migration to add FKs';
    RAISE NOTICE '';
  END IF;
  
  RAISE NOTICE '📝 NEXT STEPS:';
  RAISE NOTICE '   - Run migration 004b to update RLS policies';
  RAISE NOTICE '   - Existing data continues to work (location_id = NULL)';
  RAISE NOTICE '   - New records can optionally set location_id';
  RAISE NOTICE '   - Feature flag controls enforcement';
  RAISE NOTICE '';
  RAISE NOTICE '💡 USAGE:';
  RAISE NOTICE '   -- Create location-scoped contact:';
  RAISE NOTICE '   INSERT INTO contacts (tenant_id, location_id, name, email)';
  RAISE NOTICE '   VALUES (''tenant-id'', ''location-id'', ''John Doe'', ''john@example.com'');';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Query by location:';
  RAISE NOTICE '   SELECT * FROM contacts WHERE tenant_id = ''..'' AND location_id = ''...'';';
END $$;
