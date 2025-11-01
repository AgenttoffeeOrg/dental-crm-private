-- =====================================================
-- VERIFY FIX: Check that everything is configured correctly
-- Run this after running URGENT_FIX_SIGNUP.sql
-- =====================================================

-- =====================================================
-- 1. CHECK tenant_id is nullable
-- =====================================================
SELECT 
    '✅ Database Configuration' as check_name,
    column_name,
    is_nullable,
    CASE 
        WHEN is_nullable = 'YES' THEN '✅ CORRECT - tenant_id is nullable'
        ELSE '❌ WRONG - tenant_id is still NOT NULL'
    END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'app_users'
  AND column_name = 'tenant_id';

-- =====================================================
-- 2. CHECK auto-create trigger is dropped
-- =====================================================
SELECT 
    '✅ Auto-Create Trigger' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ CORRECT - Trigger is dropped'
        ELSE '❌ WARNING - Trigger still exists'
    END as status
FROM pg_trigger
WHERE tgname = 'trigger_auto_create_tenant_for_new_user';

-- =====================================================
-- 3. CHECK auto-create function is dropped
-- =====================================================
SELECT 
    '✅ Auto-Create Function' as check_name,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ CORRECT - Function is dropped'
        ELSE '❌ WARNING - Function still exists'
    END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'auto_create_tenant_for_new_user';

-- =====================================================
-- 4. CHECK primary key (should be on id only)
-- =====================================================
SELECT 
    '✅ Primary Key' as check_name,
    pc.conname as constraint_name,
    array_length(pc.conkey, 1) as key_columns_count,
    CASE 
        WHEN array_length(pc.conkey, 1) = 1 THEN '✅ CORRECT - Single column PK'
        WHEN array_length(pc.conkey, 1) > 1 THEN '⚠️ WARNING - Composite PK still exists'
        ELSE '❌ ERROR - No primary key found'
    END as status
FROM pg_constraint pc
JOIN pg_class pgc ON pc.conrelid = pgc.oid
WHERE pgc.relname = 'app_users'
  AND pc.contype = 'p'
LIMIT 1;

-- =====================================================
-- 5. CHECK for orphaned users
-- =====================================================
SELECT 
    '✅ Orphaned Users' as check_name,
    COUNT(*) as orphaned_count,
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ CORRECT - No orphaned users'
        ELSE CONCAT('⚠️ WARNING - ', COUNT(*), ' orphaned user(s) found')
    END as status
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE app.id IS NULL;

-- =====================================================
-- SUMMARY
-- =====================================================
DO $$
DECLARE
    v_tenant_nullable TEXT;
    v_trigger_count INT;
    v_function_count INT;
    v_orphaned_count INT;
BEGIN
    -- Check tenant_id nullable
    SELECT is_nullable INTO v_tenant_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'tenant_id';
    
    -- Check trigger
    SELECT COUNT(*) INTO v_trigger_count
    FROM pg_trigger
    WHERE tgname = 'trigger_auto_create_tenant_for_new_user';
    
    -- Check function
    SELECT COUNT(*) INTO v_function_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'auto_create_tenant_for_new_user';
    
    -- Check orphaned users
    SELECT COUNT(*) INTO v_orphaned_count
    FROM auth.users au
    LEFT JOIN app_users app ON app.id = au.id
    WHERE app.id IS NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '  VERIFICATION SUMMARY';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE 'tenant_id nullable: %', v_tenant_nullable;
    RAISE NOTICE 'Auto-create trigger: % (0 = dropped)', v_trigger_count;
    RAISE NOTICE 'Auto-create function: % (0 = dropped)', v_function_count;
    RAISE NOTICE 'Orphaned users: %', v_orphaned_count;
    RAISE NOTICE '';
    
    IF v_tenant_nullable = 'YES' AND v_trigger_count = 0 AND v_function_count = 0 THEN
        RAISE NOTICE '✅ ALL CHECKS PASSED!';
        RAISE NOTICE '';
        RAISE NOTICE 'Sign-up should work correctly now.';
        RAISE NOTICE 'Try signing up with a new email address.';
    ELSE
        RAISE NOTICE '⚠️ SOME CHECKS FAILED';
        RAISE NOTICE '';
        IF v_tenant_nullable != 'YES' THEN
            RAISE NOTICE '❌ tenant_id is still NOT NULL';
        END IF;
        IF v_trigger_count > 0 THEN
            RAISE NOTICE '❌ Auto-create trigger still exists';
        END IF;
        IF v_function_count > 0 THEN
            RAISE NOTICE '❌ Auto-create function still exists';
        END IF;
    END IF;
    
    IF v_orphaned_count > 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '⚠️ Found % orphaned user(s)', v_orphaned_count;
        RAISE NOTICE '   Run DELETE_USER scripts to clean them up.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════';
END $$;

