-- Check User Status - Diagnose Dashboard Loading Issue
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: Check All Auth Users and Their App User Status
-- =====================================================

SELECT 
    au.id as user_id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at,
    CASE 
        WHEN app.id IS NULL THEN '❌ MISSING app_user'
        WHEN app.tenant_id IS NULL THEN '⚠️ Has app_user but NO TENANT'
        ELSE '✅ Complete'
    END as status,
    app.full_name,
    app.role,
    app.tenant_id,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.last_sign_in_at DESC NULLS LAST;

-- This shows you:
-- - All auth users
-- - Whether they have an app_user record
-- - Whether they have a tenant
-- - Status of each account

-- =====================================================
-- STEP 2: Show Users Missing App User Records
-- =====================================================

SELECT 
    '❌ These users are MISSING app_user records' as issue,
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE app.id IS NULL;

-- If you see users here, they can signin but get stuck on loading!
-- These need app_user records created

-- =====================================================
-- STEP 3: Fix Missing App User Record (If Needed)
-- =====================================================

-- If you just signed in and got stuck, run this to create the missing app_user
-- Replace the values with your actual data:

/*
DO $$
DECLARE
    auth_user_id uuid := 'YOUR-USER-ID-FROM-STEP-2'; -- Replace this!
    user_email text;
    user_name text;
    new_tenant_id uuid;
BEGIN
    -- Get user email
    SELECT email INTO user_email FROM auth.users WHERE id = auth_user_id;
    
    -- Extract name from email (or use a default)
    user_name := SPLIT_PART(user_email, '@', 1);
    
    RAISE NOTICE 'Creating missing records for: %', user_email;
    
    -- Create tenant
    INSERT INTO tenants (name, timezone)
    VALUES (user_name || '''s Practice', 'Europe/London')
    RETURNING id INTO new_tenant_id;
    
    RAISE NOTICE 'Created tenant: %', new_tenant_id;
    
    -- Create app_user
    INSERT INTO app_users (id, tenant_id, full_name, role)
    VALUES (auth_user_id, new_tenant_id, user_name, 'owner');
    
    RAISE NOTICE '✅ Created app_user and tenant for: %', user_email;
    RAISE NOTICE 'You can now signin and access the dashboard!';
    
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Error: %', SQLERRM;
END $$;
*/

-- =====================================================
-- STEP 4: Verify Fix
-- =====================================================

-- Run this after Step 3 to verify everything is set up:

SELECT 
    '✅ Verification' as check_type,
    au.email,
    au.email_confirmed_at as email_confirmed,
    app.full_name,
    app.role,
    t.name as practice_name,
    'Ready to signin!' as status
FROM auth.users au
JOIN app_users app ON app.id = au.id
JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.created_at ASC;

-- =====================================================
-- COMMON SCENARIOS
-- =====================================================

/*
SCENARIO 1: Dashboard stuck loading after signin
CAUSE: Auth user exists but app_user record is missing
FIX: Run STEP 3 to create the missing app_user record

SCENARIO 2: Signup completed but can't access dashboard  
CAUSE: Email confirmation required but records not created
FIX: Confirm email, then run STEP 3 if still stuck

SCENARIO 3: Signin works but immediately redirects back to signin
CAUSE: Same as Scenario 1 - missing app_user record
FIX: Run STEP 3

SCENARIO 4: Multiple signups but only first user should remain
CAUSE: Testing with different emails
FIX: Run the KEEP_FIRST_USER_DELETE_REST.sql script first
*/

-- =====================================================
-- INSTRUCTIONS
-- =====================================================

/*
If dashboard is stuck loading:

1. Run STEP 1 to see all users and their status
2. Find the user with "❌ MISSING app_user" status
3. Copy that user's ID
4. In STEP 3, replace 'YOUR-USER-ID-FROM-STEP-2' with the actual ID
5. Uncomment STEP 3 (remove /* and */)
6. Run STEP 3
7. Run STEP 4 to verify
8. Clear browser data (Cmd+Shift+Delete)
9. Try signin again - should work!
*/


