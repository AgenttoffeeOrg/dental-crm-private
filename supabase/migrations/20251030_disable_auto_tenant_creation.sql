-- =====================================================
-- MIGRATION: Disable Auto-Tenant Creation
-- Date: October 30, 2025
-- Purpose: Allow users to sign up without automatically creating a tenant
-- Safety: Idempotent, backward compatible
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Makes app_users.tenant_id nullable (if not already)
-- 2. Drops the auto-create tenant trigger
-- 3. Drops the auto-create tenant function
-- 4. Ensures users can exist without tenants (membership-based architecture)
--
-- ARCHITECTURE:
-- - Users are linked to tenants via user_tenant_memberships (many-to-many)
-- - app_users.tenant_id is legacy field (kept for backward compatibility)
-- - app_users.active_tenant_id is the current session context (nullable)
-- - Users without active_tenant_id can browse but need to create org to create data
--
-- SAFETY:
-- - All operations are idempotent (IF EXISTS, IF NOT EXISTS)
-- - Existing users with tenants are unaffected
-- - No data is deleted or modified
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: VERIFY AND HANDLE app_users.tenant_id CONSTRAINT
-- =====================================================
-- 
-- Check if tenant_id is part of primary key and handle accordingly
-- If it's part of composite primary key (id, tenant_id), we need to:
-- 1. Drop the composite primary key
-- 2. Recreate primary key on just (id)
-- 3. Make tenant_id nullable
-- 4. Add unique constraint on (id, tenant_id) if needed for multi-org support
--

DO $$
DECLARE
  v_pk_constraint_name TEXT;
  v_tenant_id_not_null BOOLEAN;
  v_has_composite_pk BOOLEAN;
BEGIN
  -- Check if tenant_id has NOT NULL constraint
  SELECT 
    CASE WHEN is_nullable = 'NO' THEN true ELSE false END,
    (SELECT COUNT(*) > 0 
     FROM pg_constraint pc
     JOIN pg_class pgc ON pc.conrelid = pgc.oid
     WHERE pgc.relname = 'app_users'
       AND pc.contype = 'p'
       AND array_length(pc.conkey, 1) > 1) -- Composite primary key
  INTO v_tenant_id_not_null, v_has_composite_pk
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'app_users'
    AND column_name = 'tenant_id';

  -- Get primary key constraint name
  SELECT pc.conname INTO v_pk_constraint_name
  FROM pg_constraint pc
  JOIN pg_class pgc ON pc.conrelid = pgc.oid
  WHERE pgc.relname = 'app_users'
    AND pc.contype = 'p'
  LIMIT 1;

  -- Handle composite primary key (id, tenant_id)
  IF v_has_composite_pk AND v_pk_constraint_name IS NOT NULL THEN
    RAISE NOTICE '🔧 Found composite primary key: %', v_pk_constraint_name;
    RAISE NOTICE '   Dropping composite PK to allow NULL tenant_id...';
    
    -- Drop composite primary key
    EXECUTE format('ALTER TABLE app_users DROP CONSTRAINT IF EXISTS %I', v_pk_constraint_name);
    
    -- Create primary key on just (id)
    ALTER TABLE app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
    
    RAISE NOTICE '   ✅ Created new primary key on (id) only';
  END IF;

  -- Make tenant_id nullable if it's currently NOT NULL
  IF v_tenant_id_not_null THEN
    RAISE NOTICE '🔧 Making tenant_id nullable...';
    ALTER TABLE app_users ALTER COLUMN tenant_id DROP NOT NULL;
    RAISE NOTICE '   ✅ tenant_id is now nullable';
  ELSE
    RAISE NOTICE '✅ tenant_id is already nullable';
  END IF;

  -- Ensure we have an index on id for performance
  CREATE INDEX IF NOT EXISTS idx_app_users_id ON app_users(id);
  
  -- Create unique constraint on (id, tenant_id) if tenant_id is not null
  -- This allows multi-org support while allowing NULL tenant_id
  -- Note: PostgreSQL unique constraints allow multiple NULLs, which is what we want
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint pc
    JOIN pg_class pgc ON pc.conrelid = pgc.oid
    WHERE pgc.relname = 'app_users'
      AND pc.contype = 'u'
      AND pc.conname = 'app_users_id_tenant_unique'
  ) THEN
    -- Only create if there are existing rows with tenant_id
    -- If all rows have NULL tenant_id, this constraint would be redundant
    IF EXISTS (SELECT 1 FROM app_users WHERE tenant_id IS NOT NULL LIMIT 1) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS app_users_id_tenant_unique 
        ON app_users(id, tenant_id) 
        WHERE tenant_id IS NOT NULL;
      RAISE NOTICE '   ✅ Created unique index on (id, tenant_id) for multi-org support';
    END IF;
  END IF;

END $$;

-- =====================================================
-- STEP 2: DROP AUTO-CREATE TENANT TRIGGER
-- =====================================================

DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;

DO $$ BEGIN
  RAISE NOTICE '✅ Dropped auto-create tenant trigger';
END $$;

-- =====================================================
-- STEP 3: DROP AUTO-CREATE TENANT FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS public.auto_create_tenant_for_new_user() CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ Dropped auto-create tenant function';
END $$;

-- =====================================================
-- STEP 4: VERIFY SCHEMA STATE
-- =====================================================

DO $$
DECLARE
  v_tenant_id_nullable TEXT;
  v_active_tenant_id_exists BOOLEAN;
BEGIN
  -- Check tenant_id nullable status
  SELECT is_nullable INTO v_tenant_id_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'app_users'
    AND column_name = 'tenant_id';

  -- Check if active_tenant_id exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'active_tenant_id'
  ) INTO v_active_tenant_id_exists;

  RAISE NOTICE '';
  RAISE NOTICE '📊 VERIFICATION:';
  RAISE NOTICE '   app_users.tenant_id is nullable: %', v_tenant_id_nullable;
  RAISE NOTICE '   app_users.active_tenant_id exists: %', v_active_tenant_id_exists;
  RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '1. ✅ Made app_users.tenant_id nullable (if not already)';
  RAISE NOTICE '2. ✅ Dropped auto-create tenant trigger';
  RAISE NOTICE '3. ✅ Dropped auto-create tenant function';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '- Users can now sign up without tenants';
  RAISE NOTICE '- Users will be prompted to create org when needed';
  RAISE NOTICE '- Existing users with tenants are unaffected';
  RAISE NOTICE '';
END $$;

