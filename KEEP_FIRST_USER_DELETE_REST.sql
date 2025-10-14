-- KEEP FIRST USER - DELETE ALL OTHERS
-- This script identifies your first/original user and deletes everything else
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: IDENTIFY YOUR FIRST USER (READ ONLY)
-- =====================================================
-- Run this first to see who will be kept

SELECT 
    '🛡️ THIS USER WILL BE KEPT' as status,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.created_at ASC
LIMIT 1;

-- This shows you THE FIRST USER who will be preserved
-- Make sure this is correct before proceeding!

-- =====================================================
-- STEP 2: SEE WHAT WILL BE DELETED (READ ONLY)
-- =====================================================
-- Run this to see all OTHER users that will be deleted

SELECT 
    '❌ WILL BE DELETED' as status,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
WHERE au.id != (
    SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1
)
ORDER BY au.created_at ASC;

-- This shows all users that will be deleted
-- Review this list carefully!

-- =====================================================
-- STEP 3: DELETE ALL EXCEPT FIRST USER
-- =====================================================
-- IMPORTANT: Only run this AFTER reviewing Steps 1 and 2!
-- Uncomment the script below to execute

/*
DO $$
DECLARE
    first_user_id uuid;
    first_user_email text;
    first_user_tenant_id uuid;
    deleted_users int := 0;
    deleted_tenants int := 0;
BEGIN
    -- Get first user info
    SELECT id, email INTO first_user_id, first_user_email
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Get first user's tenant ID
    SELECT tenant_id INTO first_user_tenant_id
    FROM app_users
    WHERE id = first_user_id;
    
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '🛡️ PROTECTED USER';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Email: %', first_user_email;
    RAISE NOTICE 'ID: %', first_user_id;
    RAISE NOTICE 'Tenant ID: %', COALESCE(first_user_tenant_id::text, 'none');
    RAISE NOTICE '';
    
    -- Delete all OTHER app_users (this will cascade delete related data)
    DELETE FROM app_users 
    WHERE id != first_user_id;
    
    GET DIAGNOSTICS deleted_users = ROW_COUNT;
    RAISE NOTICE '✅ Deleted % other app_user(s)', deleted_users;
    
    -- Delete all OTHER tenants (keep only first user's tenant)
    IF first_user_tenant_id IS NOT NULL THEN
        DELETE FROM tenants 
        WHERE id != first_user_tenant_id;
        
        GET DIAGNOSTICS deleted_tenants = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % other tenant(s)', deleted_tenants;
    ELSE
        -- If first user has no tenant, delete all tenants
        DELETE FROM tenants;
        GET DIAGNOSTICS deleted_tenants = ROW_COUNT;
        RAISE NOTICE '✅ Deleted % tenant(s)', deleted_tenants;
    END IF;
    
    -- Delete all OTHER auth users
    DELETE FROM auth.users 
    WHERE id != first_user_id;
    
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE '✅ CLEANUP COMPLETE';
    RAISE NOTICE '═══════════════════════════════════════';
    RAISE NOTICE 'Your first user has been preserved: %', first_user_email;
    RAISE NOTICE 'All other users and data have been deleted';
    RAISE NOTICE '';
    
END $$;
*/

-- =====================================================
-- STEP 4: VERIFY CLEANUP (READ ONLY)
-- =====================================================
-- Run this after cleanup to verify

SELECT 
    '✅ FINAL STATE' as info,
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM app_users) as app_users,
    (SELECT COUNT(*) FROM tenants) as tenants,
    (SELECT COUNT(*) FROM contacts) as contacts,
    (SELECT COUNT(*) FROM deals) as deals,
    (SELECT COUNT(*) FROM pipelines) as pipelines;

-- Show remaining user details
SELECT 
    '✅ YOUR REMAINING USER' as status,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    app.role,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id;

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

/*
HOW TO USE THIS SCRIPT:

1. Run STEP 1 first
   - This shows you THE USER that will be kept
   - Make sure it's your original account!
   - If wrong, STOP and don't proceed

2. Run STEP 2 
   - This shows all users that WILL BE DELETED
   - Review carefully
   - Make sure you're okay with deleting these

3. If everything looks correct:
   - Uncomment STEP 3 (remove the /* and */)
   - Run STEP 3
   - This will delete all except your first user

4. Run STEP 4 to verify
   - Should show only 1 user (your first user)
   - All other data cleaned up

5. Clear your browser data:
   - Press Cmd+Shift+Delete (Mac) or Ctrl+Shift+Delete (Windows)
   - Clear cookies and site data
   - Close all browser tabs

6. Try signup again with a fresh email:
   - Go to http://localhost:3000/sign-up
   - Use a different email than your first user
   - Should work cleanly now!

SAFETY:
✅ Your first user will ALWAYS be protected
✅ Read-only queries run first so you can verify
✅ Execution requires manual uncommenting
✅ Clear notification of what will be kept/deleted
*/


