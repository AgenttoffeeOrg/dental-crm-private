-- =====================================================
-- URGENT FIX: Make app_users.tenant_id Nullable
-- Purpose: Fix sign-up failures caused by NOT NULL constraint
-- Run this IMMEDIATELY in Supabase SQL Editor
-- =====================================================
--
-- PROBLEM:
-- Sign-up is failing because app_users.tenant_id is NOT NULL,
-- but our new code doesn't create tenants during sign-up.
--
-- SOLUTION:
-- Make tenant_id nullable and handle composite primary key if needed.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: VERIFY CURRENT STATE
-- =====================================================

DO $$
DECLARE
    v_tenant_id_nullable TEXT;
    v_has_composite_pk BOOLEAN;
    v_pk_constraint_name TEXT;
BEGIN
    -- Check if tenant_id is nullable
    SELECT is_nullable INTO v_tenant_id_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'tenant_id';

    -- Check if there's a composite primary key
    SELECT 
        TRUE,
        pc.conname
    INTO v_has_composite_pk, v_pk_constraint_name
    FROM pg_constraint pc
    JOIN pg_class pgc ON pc.conrelid = pgc.oid
    WHERE pgc.relname = 'app_users'
      AND pc.contype = 'p'
      AND array_length(pc.conkey, 1) > 1
    LIMIT 1;
    
    -- If no row found, set to FALSE
    IF v_has_composite_pk IS NULL THEN
        v_has_composite_pk := FALSE;
    END IF;

    RAISE NOTICE '';
    RAISE NOTICE '📊 CURRENT STATE:';
    RAISE NOTICE '   tenant_id nullable: %', v_tenant_id_nullable;
    RAISE NOTICE '   has composite PK: %', v_has_composite_pk;
    IF v_pk_constraint_name IS NOT NULL THEN
        RAISE NOTICE '   PK constraint: %', v_pk_constraint_name;
    END IF;
    RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: HANDLE COMPOSITE PRIMARY KEY (if exists)
-- =====================================================

DO $$
DECLARE
    v_pk_constraint_name TEXT;
    v_has_composite_pk BOOLEAN;
BEGIN
    -- Check for composite primary key
    SELECT 
        TRUE,
        pc.conname
    INTO v_has_composite_pk, v_pk_constraint_name
    FROM pg_constraint pc
    JOIN pg_class pgc ON pc.conrelid = pgc.oid
    WHERE pgc.relname = 'app_users'
      AND pc.contype = 'p'
      AND array_length(pc.conkey, 1) > 1
    LIMIT 1;
    
    -- If no row found, set to FALSE
    IF v_has_composite_pk IS NULL THEN
        v_has_composite_pk := FALSE;
    END IF;

    IF v_has_composite_pk AND v_pk_constraint_name IS NOT NULL THEN
        RAISE NOTICE '🔧 Found composite primary key, fixing...';
        
        -- Drop composite primary key
        EXECUTE format('ALTER TABLE app_users DROP CONSTRAINT IF EXISTS %I', v_pk_constraint_name);
        
        -- Create primary key on just (id)
        ALTER TABLE app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
        
        RAISE NOTICE '   ✅ Fixed primary key constraint';
    ELSE
        RAISE NOTICE '✅ No composite primary key found (or already fixed)';
    END IF;
END $$;

-- =====================================================
-- STEP 3: MAKE tenant_id NULLABLE
-- =====================================================

-- Check current constraint
DO $$
DECLARE
    v_is_nullable TEXT;
BEGIN
    SELECT is_nullable INTO v_is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'tenant_id';

    IF v_is_nullable = 'NO' THEN
        RAISE NOTICE '🔧 Making tenant_id nullable...';
        ALTER TABLE app_users ALTER COLUMN tenant_id DROP NOT NULL;
        RAISE NOTICE '   ✅ tenant_id is now nullable';
    ELSE
        RAISE NOTICE '✅ tenant_id is already nullable';
    END IF;
END $$;

-- =====================================================
-- STEP 4: DROP AUTO-CREATE TRIGGER (if exists)
-- =====================================================

DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;
DROP FUNCTION IF EXISTS public.auto_create_tenant_for_new_user() CASCADE;

DO $$ BEGIN
    RAISE NOTICE '✅ Dropped auto-create tenant trigger (if it existed)';
END $$;

-- =====================================================
-- STEP 5: VERIFY FIX
-- =====================================================

DO $$
DECLARE
    v_is_nullable TEXT;
BEGIN
    SELECT is_nullable INTO v_is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'tenant_id';

    RAISE NOTICE '';
    RAISE NOTICE '🎉 VERIFICATION:';
    RAISE NOTICE '   tenant_id is nullable: %', v_is_nullable;
    
    IF v_is_nullable = 'YES' THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅ SUCCESS! Sign-up should work now.';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '1. Try signing up again';
        RAISE NOTICE '2. If you see "user already exists", run DELETE_USER_toffeehegde.sql first';
    ELSE
        RAISE NOTICE '';
        RAISE WARNING '⚠️ Still NOT NULL - check manually';
    END IF;
    RAISE NOTICE '';
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '✅ MIGRATION COMPLETE!';
    RAISE NOTICE '';
    RAISE NOTICE 'Sign-up should work correctly now.';
    RAISE NOTICE 'Users can sign up without tenants.';
    RAISE NOTICE '';
END $$;

