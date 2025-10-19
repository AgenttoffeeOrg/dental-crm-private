-- =====================================================
-- FIX: role_permissions foreign key constraints
-- =====================================================
-- Version: 1.0.0
-- Date: October 19, 2025
-- Purpose: Fix foreign key constraints to point to correct tables
-- Run this BEFORE running 46_treatment_routing_permissions.sql
-- =====================================================
--
-- PROBLEM:
-- - role_permissions has FK to role_definitions (wrong table)
-- - Should reference custom_roles (correct table)
-- - INSERT fails because role_id doesn't exist in role_definitions
--
-- SOLUTION:
-- 1. Check which FK constraints exist
-- 2. Drop incorrect FK constraints
-- 3. Create correct FK constraints
-- 4. Verify tables exist
--
-- SAFETY:
-- - Checks table existence
-- - Only fixes incorrect constraints
-- - Zero data loss
-- - Clear console messages
--
-- =====================================================

BEGIN;

DO $$
DECLARE
  v_has_custom_roles BOOLEAN;
  v_has_role_definitions BOOLEAN;
  v_has_permission_definitions BOOLEAN;
  v_constraint_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE 'FIX: role_permissions Foreign Key Constraints';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  
  -- Check which tables exist
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'custom_roles'
  ) INTO v_has_custom_roles;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'role_definitions'
  ) INTO v_has_role_definitions;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'permission_definitions'
  ) INTO v_has_permission_definitions;
  
  RAISE NOTICE '→ Table existence check:';
  RAISE NOTICE '  custom_roles: %', CASE WHEN v_has_custom_roles THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  role_definitions: %', CASE WHEN v_has_role_definitions THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '  permission_definitions: %', CASE WHEN v_has_permission_definitions THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '';
  
  IF NOT v_has_custom_roles THEN
    RAISE EXCEPTION 'custom_roles table does not exist. Please ensure your base migrations have run.';
  END IF;
  
  IF NOT v_has_permission_definitions THEN
    RAISE EXCEPTION 'permission_definitions table does not exist. Please ensure your base migrations have run.';
  END IF;
  
  -- Drop all existing FK constraints on role_permissions
  RAISE NOTICE '→ Step 1: Dropping existing foreign key constraints...';
  
  -- Drop role_id FK (regardless of which table it points to)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_role_id_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_role_id_fkey;
    RAISE NOTICE '  ✓ Dropped: role_permissions_role_id_fkey';
  ELSE
    RAISE NOTICE '  ℹ No role_id FK constraint found (will create correct one)';
  END IF;
  
  -- Drop permission_key FK (in case it exists)
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_permission_key_fkey'
  ) INTO v_constraint_exists;
  
  IF v_constraint_exists THEN
    ALTER TABLE role_permissions DROP CONSTRAINT role_permissions_permission_key_fkey;
    RAISE NOTICE '  ✓ Dropped: role_permissions_permission_key_fkey';
  ELSE
    RAISE NOTICE '  ℹ No permission_key FK constraint found (will create correct one)';
  END IF;
  
  RAISE NOTICE '';
  
  -- Create correct FK constraints
  RAISE NOTICE '→ Step 2: Creating correct foreign key constraints...';
  
  -- FK to custom_roles (correct)
  ALTER TABLE role_permissions 
    ADD CONSTRAINT role_permissions_role_id_fkey 
    FOREIGN KEY (role_id) 
    REFERENCES custom_roles(id) 
    ON DELETE CASCADE;
  RAISE NOTICE '  ✓ Created: role_permissions_role_id_fkey → custom_roles(id)';
  
  -- FK to permission_definitions (correct)
  ALTER TABLE role_permissions 
    ADD CONSTRAINT role_permissions_permission_key_fkey 
    FOREIGN KEY (permission_key) 
    REFERENCES permission_definitions(key) 
    ON DELETE CASCADE;
  RAISE NOTICE '  ✓ Created: role_permissions_permission_key_fkey → permission_definitions(key)';
  
  RAISE NOTICE '';
  
  -- Verify unique constraint exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'role_permissions' 
    AND constraint_name = 'role_permissions_role_id_permission_key_key'
  ) INTO v_constraint_exists;
  
  IF NOT v_constraint_exists THEN
    RAISE NOTICE '→ Step 3: Creating unique constraint...';
    ALTER TABLE role_permissions 
      ADD CONSTRAINT role_permissions_role_id_permission_key_key 
      UNIQUE(role_id, permission_key);
    RAISE NOTICE '  ✓ Created: UNIQUE(role_id, permission_key)';
    RAISE NOTICE '';
  ELSE
    RAISE NOTICE '→ Step 3: Unique constraint already exists ✓';
    RAISE NOTICE '';
  END IF;
  
  -- Verify indexes exist
  RAISE NOTICE '→ Step 4: Ensuring indexes exist...';
  
  IF NOT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'role_permissions' 
    AND indexname = 'role_permissions_role_id_idx'
  ) THEN
    CREATE INDEX role_permissions_role_id_idx ON role_permissions(role_id);
    RAISE NOTICE '  ✓ Created: role_permissions_role_id_idx';
  ELSE
    RAISE NOTICE '  ✓ Index role_permissions_role_id_idx already exists';
  END IF;
  
  IF NOT EXISTS(
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'role_permissions' 
    AND indexname = 'role_permissions_permission_key_idx'
  ) THEN
    CREATE INDEX role_permissions_permission_key_idx ON role_permissions(permission_key);
    RAISE NOTICE '  ✓ Created: role_permissions_permission_key_idx';
  ELSE
    RAISE NOTICE '  ✓ Index role_permissions_permission_key_idx already exists';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '✓ SUCCESS! Foreign key constraints fixed';
  RAISE NOTICE '═══════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Run migration 46_treatment_routing_permissions.sql';
  RAISE NOTICE '2. This will now succeed with correct FK constraints';
  RAISE NOTICE '';
  
END $$;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these after the fix to verify:

-- Check FK constraints
-- SELECT
--   tc.constraint_name,
--   tc.table_name,
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
-- AND tc.table_name = 'role_permissions';
-- 
-- Expected:
-- role_permissions_role_id_fkey → custom_roles(id)
-- role_permissions_permission_key_fkey → permission_definitions(key)

-- =====================================================

