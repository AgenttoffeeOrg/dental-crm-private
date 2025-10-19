-- =====================================================
-- FIX: role_permissions.permission_key UUID → TEXT
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Fix permission_key column type from UUID to TEXT
-- Run this BEFORE running 46_treatment_routing_permissions.sql
-- =====================================================
--
-- PROBLEM:
-- - role_permissions.permission_key is UUID but should be TEXT
-- - Cannot drop column due to policy dependencies
-- - Need to carefully migrate without breaking RLS policies
--
-- SOLUTION:
-- 1. Backup existing data
-- 2. Drop dependent RLS policies (will be recreated by app)
-- 3. Rename old column
-- 4. Add new TEXT column
-- 5. Clear table (will be repopulated by migration 46)
-- 6. Drop old column
-- 7. Add constraints
--
-- SAFETY:
-- - Creates backup table
-- - Non-destructive approach
-- - Can be rolled back
-- - Clear console messages
--
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_column_type TEXT;
  v_has_data BOOLEAN;
  v_column_exists BOOLEAN;
  v_alt_column_name TEXT;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'FIX: role_permissions.permission_key UUID → TEXT';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check if permission_key column exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'role_permissions' 
    AND column_name = 'permission_key'
  ) INTO v_column_exists;
  
  IF NOT v_column_exists THEN
    RAISE NOTICE 'ℹ permission_key column does not exist';
    RAISE NOTICE '→ Checking for alternative column names...';
    
    -- Check for permission_id
    IF EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_permissions' 
      AND column_name = 'permission_id'
    ) THEN
      v_alt_column_name := 'permission_id';
      RAISE NOTICE '✓ Found: permission_id (will rename to permission_key)';
    -- Check for permission_definition_id
    ELSIF EXISTS(
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_permissions' 
      AND column_name = 'permission_definition_id'
    ) THEN
      v_alt_column_name := 'permission_definition_id';
      RAISE NOTICE '✓ Found: permission_definition_id (will rename to permission_key)';
    ELSE
      RAISE EXCEPTION 'role_permissions table exists but has no permission column (permission_key, permission_id, or permission_definition_id). Please check table structure.';
    END IF;
    
    -- Rename the column
    RAISE NOTICE '';
    RAISE NOTICE '→ Renaming % to permission_key...', v_alt_column_name;
    EXECUTE format('ALTER TABLE role_permissions RENAME COLUMN %I TO permission_key', v_alt_column_name);
    RAISE NOTICE '✓ Column renamed';
  END IF;
  
  -- Now get the column type
  SELECT data_type INTO v_column_type
  FROM information_schema.columns 
  WHERE table_schema = 'public'
  AND table_name = 'role_permissions' 
  AND column_name = 'permission_key';
  
  RAISE NOTICE '';
  RAISE NOTICE 'Current permission_key type: %', v_column_type;
  RAISE NOTICE '';
  
  IF v_column_type = 'uuid' THEN
    RAISE NOTICE '✓ Detected: permission_key is UUID (needs to be TEXT)';
    RAISE NOTICE '';
    
    -- Check if table has data
    EXECUTE 'SELECT EXISTS(SELECT 1 FROM role_permissions LIMIT 1)' INTO v_has_data;
    
    IF v_has_data THEN
      RAISE NOTICE 'ℹ Table has % rows', (SELECT COUNT(*) FROM role_permissions);
    ELSE
      RAISE NOTICE 'ℹ Table is empty';
    END IF;
    
    -- Step 1: Create backup
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 1: Creating backup...';
    DROP TABLE IF EXISTS role_permissions_backup_uuid;
    CREATE TABLE role_permissions_backup_uuid AS 
    SELECT * FROM role_permissions;
    RAISE NOTICE '✓ Backup created: role_permissions_backup_uuid';
    
    -- Step 2: Drop dependent policies
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 2: Dropping dependent RLS policies...';
    DROP POLICY IF EXISTS join_requests_select_admin ON organization_join_requests CASCADE;
    DROP POLICY IF EXISTS join_requests_update_admin ON organization_join_requests CASCADE;
    RAISE NOTICE '✓ Policies dropped (will be recreated by application)';
    
    -- Step 3: Rename old column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 3: Renaming permission_key to permission_key_old...';
    ALTER TABLE role_permissions 
      RENAME COLUMN permission_key TO permission_key_old;
    RAISE NOTICE '✓ Column renamed';
    
    -- Step 4: Add new TEXT column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 4: Adding new permission_key as TEXT...';
    ALTER TABLE role_permissions 
      ADD COLUMN permission_key TEXT;
    RAISE NOTICE '✓ New TEXT column added';
    
    -- Step 5: Clear table (will be repopulated by migration 46)
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 5: Clearing table (will be repopulated)...';
    TRUNCATE role_permissions;
    RAISE NOTICE '✓ Table cleared';
    
    -- Step 6: Drop old column
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 6: Dropping old UUID column...';
    ALTER TABLE role_permissions 
      DROP COLUMN permission_key_old;
    RAISE NOTICE '✓ Old column dropped';
    
    -- Step 7: Make column NOT NULL
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 7: Setting NOT NULL constraint...';
    ALTER TABLE role_permissions 
      ALTER COLUMN permission_key SET NOT NULL;
    RAISE NOTICE '✓ NOT NULL constraint added';
    
    -- Step 8: Add constraints and indexes
    RAISE NOTICE '';
    RAISE NOTICE '→ Step 8: Adding foreign key, unique constraint, and index...';
    
    -- Foreign key
    ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_permission_key_fkey 
      FOREIGN KEY (permission_key) 
      REFERENCES permission_definitions(key) 
      ON DELETE CASCADE;
    RAISE NOTICE '  ✓ Foreign key constraint added';
    
    -- Unique constraint
    ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    RAISE NOTICE '  ✓ Unique constraint added';
    
    -- Index
    CREATE INDEX role_permissions_permission_key_idx 
      ON role_permissions(permission_key);
    RAISE NOTICE '  ✓ Index created';
    
    -- Success!
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '✓ SUCCESS! permission_key is now TEXT';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'NEXT STEPS:';
    RAISE NOTICE '1. Run migration 46_treatment_routing_permissions.sql';
    RAISE NOTICE '2. This will populate role_permissions with correct data';
    RAISE NOTICE '3. RLS policies will be recreated by the application';
    RAISE NOTICE '';
    RAISE NOTICE 'BACKUP: role_permissions_backup_uuid (can be dropped later)';
    RAISE NOTICE '';
    
  ELSIF v_column_type = 'text' OR v_column_type = 'character varying' THEN
    RAISE NOTICE '✓ permission_key is already TEXT - no fix needed!';
    RAISE NOTICE '';
    RAISE NOTICE 'You can proceed directly to migration 46.';
    RAISE NOTICE '';
    
  ELSIF v_column_type IS NULL THEN
    RAISE EXCEPTION 'Could not determine permission_key column type. This should not happen - please check that the column exists.';
    
  ELSE
    RAISE NOTICE '⚠ Unexpected permission_key type: %', v_column_type;
    RAISE NOTICE 'Attempting to convert to TEXT anyway...';
    
    -- Try to convert any other type to TEXT
    ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_permission_key_fkey;
    ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_id_permission_key_key;
    DROP INDEX IF EXISTS role_permissions_permission_key_idx;
    
    ALTER TABLE role_permissions RENAME COLUMN permission_key TO permission_key_old;
    ALTER TABLE role_permissions ADD COLUMN permission_key TEXT;
    TRUNCATE role_permissions;
    ALTER TABLE role_permissions DROP COLUMN permission_key_old;
    ALTER TABLE role_permissions ALTER COLUMN permission_key SET NOT NULL;
    
    ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_permission_key_fkey 
      FOREIGN KEY (permission_key) 
      REFERENCES permission_definitions(key) 
      ON DELETE CASCADE;
    
    ALTER TABLE role_permissions
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    
    CREATE INDEX role_permissions_permission_key_idx 
      ON role_permissions(permission_key);
    
    RAISE NOTICE '✓ Converted % to TEXT', v_column_type;
  END IF;
  
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the fix to verify:

-- Check column type
-- SELECT column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'role_permissions' 
-- AND column_name = 'permission_key';
-- Expected: permission_key | text

-- Check table is empty (will be filled by migration 46)
-- SELECT COUNT(*) FROM role_permissions;
-- Expected: 0

-- Check backup exists
-- SELECT COUNT(*) FROM role_permissions_backup_uuid;
-- Shows how many rows were backed up

-- =====================================================
-- ROLLBACK (if needed)
-- =====================================================
-- If something goes wrong, you can rollback:
-- 
-- DROP TABLE IF EXISTS role_permissions;
-- CREATE TABLE role_permissions AS 
-- SELECT * FROM role_permissions_backup_uuid;
-- 
-- Then investigate the issue before trying again.
-- =====================================================

