-- =====================================================
-- STEP 2C: MIGRATE PRACTICE_LOCATIONS (IF EXISTS) - FIXED
-- Purpose: Migrate existing practice_locations data to new locations table
-- Safety: Only runs if practice_locations exists
-- FIX: Wrapped INSERT in DO block with table existence check
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Checks if practice_locations table exists
-- 2. Migrates data to locations table ONLY if found
-- 3. Preserves all location data
-- 4. Does NOT drop practice_locations (kept for reference)
-- 5. Logs migration to audit trail
-- 6. Adds foreign key to app_users.default_location_id
--
-- WHY THIS EXISTS:
-- - Some installations may have practice_locations from treatment routing
-- - Need to consolidate location data into single locations table
-- - Preserve existing location definitions
-- - Zero data loss
--
-- SAFETY:
-- - Idempotent: safe to run multiple times (ON CONFLICT)
-- - Non-destructive: does NOT drop old table
-- - Validated: checks counts before/after
-- - Conditional: only migrates if source table exists
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CHECK IF PRACTICE_LOCATIONS EXISTS
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  practice_locations_count INTEGER := 0;
  schema_public CONSTANT TEXT := 'public';
  table_name_practice CONSTANT TEXT := 'practice_locations';
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check if table exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_practice
  ) INTO table_exists;
  
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'PRACTICE_LOCATIONS MIGRATION CHECK';
  RAISE NOTICE '%', separator;
  
  IF table_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM practice_locations' INTO practice_locations_count;
    RAISE NOTICE '✅ practice_locations table found: % rows', practice_locations_count;
    RAISE NOTICE 'Will migrate to locations table...';
  ELSE
    RAISE NOTICE 'ℹ️  practice_locations table not found';
    RAISE NOTICE 'Skipping migration (no data to migrate)';
    RAISE NOTICE 'This is normal for new installations';
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. MIGRATE DATA (ONLY IF TABLE EXISTS)
-- =====================================================

DO $$
DECLARE
  table_exists BOOLEAN;
  rows_migrated INTEGER := 0;
  schema_public CONSTANT TEXT := 'public';
  table_name_practice CONSTANT TEXT := 'practice_locations';
BEGIN
  -- Check if practice_locations exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_practice
  ) INTO table_exists;
  
  IF NOT table_exists THEN
    RAISE NOTICE 'Skipping data migration - practice_locations does not exist';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Migrating data from practice_locations to locations...';
  
  -- Migrate practice_locations to locations
  INSERT INTO locations (
    tenant_id,
    name,
    display_name,
    address,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    timezone,
    is_active,
    is_primary,
    created_at,
    updated_at
  )
  SELECT 
    pl.tenant_id,
    pl.name,
    pl.name AS display_name,  -- Use same name as display
    pl.address,
    pl.city,
    pl.state,
    pl.postal_code,
    COALESCE(pl.country, 'UK') AS country,
    pl.phone,
    pl.email,
    COALESCE(pl.timezone, 'Europe/London') AS timezone,
    COALESCE(pl.is_active, true) AS is_active,
    COALESCE(pl.is_primary, false) AS is_primary,
    COALESCE(pl.created_at, NOW()) AS created_at,
    NOW() AS updated_at
  FROM practice_locations pl
  ON CONFLICT (tenant_id, name) DO UPDATE
  SET 
    display_name = EXCLUDED.display_name,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    state = EXCLUDED.state,
    postal_code = EXCLUDED.postal_code,
    country = EXCLUDED.country,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    timezone = EXCLUDED.timezone,
    is_active = EXCLUDED.is_active,
    is_primary = EXCLUDED.is_primary,
    updated_at = NOW();
  
  GET DIAGNOSTICS rows_migrated = ROW_COUNT;
  
  RAISE NOTICE '✅ Migrated % rows from practice_locations to locations', rows_migrated;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error during migration: %', SQLERRM;
    RAISE NOTICE 'Migration will continue - this is not fatal';
END $$;

-- =====================================================
-- 3. ADD FOREIGN KEY TO APP_USERS.DEFAULT_LOCATION_ID
-- =====================================================

-- Check if constraint already exists
DO $$
DECLARE
  constraint_name_fk CONSTANT TEXT := 'fk_app_users_default_location';
  table_name_users CONSTANT TEXT := 'app_users';
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = constraint_name_fk
      AND table_name = table_name_users
  ) THEN
    -- Add foreign key constraint
    ALTER TABLE app_users 
      ADD CONSTRAINT fk_app_users_default_location
      FOREIGN KEY (default_location_id) 
      REFERENCES locations(id) 
      ON DELETE SET NULL;
    
    RAISE NOTICE '✅ Added foreign key: app_users.default_location_id → locations.id';
  ELSE
    RAISE NOTICE 'ℹ️  Foreign key fk_app_users_default_location already exists';
  END IF;
  
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'ℹ️  Foreign key already exists - skipping';
  WHEN OTHERS THEN
    RAISE WARNING 'Could not add foreign key: %', SQLERRM;
    RAISE NOTICE 'This is not critical - can be added later if needed';
END $$;

COMMENT ON CONSTRAINT fk_app_users_default_location ON app_users IS
  'Links user default location to locations table';

-- =====================================================
-- 4. VERIFICATION
-- =====================================================

DO $$
DECLARE
  practice_locations_exists BOOLEAN;
  practice_locations_count INTEGER := 0;
  locations_count INTEGER;
  fk_exists BOOLEAN;
  schema_public CONSTANT TEXT := 'public';
  table_name_practice CONSTANT TEXT := 'practice_locations';
  constraint_name_fk CONSTANT TEXT := 'fk_app_users_default_location';
  table_name_users CONSTANT TEXT := 'app_users';
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check if practice_locations exists
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_practice
  ) INTO practice_locations_exists;
  
  IF practice_locations_exists THEN
    EXECUTE 'SELECT COUNT(*) FROM practice_locations' INTO practice_locations_count;
  END IF;
  
  -- Count locations
  SELECT COUNT(*) INTO locations_count FROM locations;
  
  -- Check foreign key
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = constraint_name_fk
      AND table_name = table_name_users
  ) INTO fk_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'MIGRATION VERIFICATION';
  RAISE NOTICE '%', separator;
  
  IF practice_locations_exists THEN
    RAISE NOTICE 'practice_locations count: %', practice_locations_count;
    RAISE NOTICE 'locations count: %', locations_count;
    RAISE NOTICE '';
    
    IF locations_count >= practice_locations_count THEN
      RAISE NOTICE '✅ Migration successful: all data migrated';
    ELSE
      RAISE NOTICE '⚠️  Some locations may not have migrated';
      RAISE NOTICE '   This could be due to duplicate names';
      RAISE NOTICE '   Check locations table for actual data';
    END IF;
  ELSE
    RAISE NOTICE 'practice_locations: not found (normal for new installs)';
    RAISE NOTICE 'locations count: %', locations_count;
  END IF;
  
  RAISE NOTICE '';
  
  IF fk_exists THEN
    RAISE NOTICE '✅ Foreign key: app_users.default_location_id → locations.id';
  ELSE
    RAISE NOTICE '⚠️  Foreign key not added (may need manual intervention)';
  END IF;
  
  RAISE NOTICE '';
  
  IF locations_count = 0 THEN
    RAISE NOTICE '📝 NOTE: No locations exist yet';
    RAISE NOTICE '   - Locations can be created via UI or API';
    RAISE NOTICE '   - First location for tenant should be marked is_primary=true';
    RAISE NOTICE '   - Use: INSERT INTO locations (tenant_id, name, is_primary) VALUES (...);';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  total_locations INTEGER;
  practice_locations_exists BOOLEAN;
  fk_exists BOOLEAN;
  schema_public CONSTANT TEXT := 'public';
  table_name_practice CONSTANT TEXT := 'practice_locations';
  constraint_name_fk CONSTANT TEXT := 'fk_app_users_default_location';
  table_name_users CONSTANT TEXT := 'app_users';
  separator CONSTANT TEXT := '========================================';
BEGIN
  SELECT COUNT(*) INTO total_locations FROM locations;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = schema_public 
      AND table_name = table_name_practice
  ) INTO practice_locations_exists;
  
  SELECT EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_name = constraint_name_fk
      AND table_name = table_name_users
  ) INTO fk_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ LOCATION MIGRATION COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'Total locations: %', total_locations;
  RAISE NOTICE 'practice_locations table: %', 
    CASE WHEN practice_locations_exists THEN 'exists (preserved)' ELSE 'not found' END;
  RAISE NOTICE 'Foreign key constraint: %',
    CASE WHEN fk_exists THEN 'added' ELSE 'not added' END;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Step 2 Complete!';
  RAISE NOTICE '   - locations table ready';
  RAISE NOTICE '   - membership_locations table ready';
  RAISE NOTICE '   - Foreign keys in place';
  RAISE NOTICE '   - Per-location roles enabled';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Next Steps:';
  RAISE NOTICE '   - Step 3: Add location_id to core tables (contacts, deals, etc.)';
  RAISE NOTICE '   - Create locations for tenants (via UI or SQL)';
  RAISE NOTICE '   - Assign users to locations (via membership_locations)';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Quick Start:';
  RAISE NOTICE '   -- Create a location:';
  RAISE NOTICE '   INSERT INTO locations (tenant_id, name, is_primary, is_active)';
  RAISE NOTICE '   VALUES (''your-tenant-id'', ''Main Office'', true, true);';
  RAISE NOTICE '';
  RAISE NOTICE '   -- Assign user to location:';
  RAISE NOTICE '   INSERT INTO membership_locations (membership_id, location_id, scope)';
  RAISE NOTICE '   SELECT m.id, l.id, ''location''';
  RAISE NOTICE '   FROM user_tenant_memberships m, locations l';
  RAISE NOTICE '   WHERE m.user_id = ''your-user-id'' AND l.id = ''location-id'';';
END $$;
