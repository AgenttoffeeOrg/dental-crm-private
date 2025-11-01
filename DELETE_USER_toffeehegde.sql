-- =====================================================
-- DELETE USER: toffeehegde@gmail.com
-- Purpose: Completely remove this user so they can sign up fresh
-- Safe to run: Yes - only deletes this specific user
-- =====================================================

-- =====================================================
-- STEP 1: CHECK USER STATUS (Read Only - Run First!)
-- =====================================================
-- Run this first to see the current state of the user

SELECT 
    '👤 USER INFO' as section,
    au.id as user_id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    au.last_sign_in_at,
    CASE 
        WHEN app.id IS NULL THEN '❌ NO APP_USER (incomplete signup)'
        ELSE '✅ HAS APP_USER'
    END as app_user_status,
    app.full_name,
    app.tenant_id,
    app.active_tenant_id,
    (SELECT COUNT(*) FROM user_tenant_memberships WHERE user_id = au.id) as membership_count
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE au.email = 'toffeehegde@gmail.com';

-- Also check for any related data
SELECT 
    '📊 RELATED DATA' as section,
    'user_tenant_memberships' as table_name,
    COUNT(*) as count
FROM user_tenant_memberships
WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'toffeehegde@gmail.com')

UNION ALL

SELECT 
    '📊 RELATED DATA' as section,
    'tenants (via memberships)' as table_name,
    COUNT(DISTINCT utm.tenant_id) as count
FROM user_tenant_memberships utm
WHERE utm.user_id IN (SELECT id FROM auth.users WHERE email = 'toffeehegde@gmail.com')

UNION ALL

SELECT 
    '📊 RELATED DATA' as section,
    'app_users' as table_name,
    COUNT(*) as count
FROM app_users
WHERE id IN (SELECT id FROM auth.users WHERE email = 'toffeehegde@gmail.com');

-- =====================================================
-- STEP 2: DELETE USER COMPLETELY (Run After Reviewing Step 1)
-- =====================================================
-- IMPORTANT: Review Step 1 output first, then uncomment and run this

DO $$
DECLARE
    target_email text := 'toffeehegde@gmail.com';
    target_user_id uuid;
    deleted_memberships int := 0;
    deleted_tenants int := 0;
    deleted_app_user int := 0;
BEGIN
    RAISE NOTICE '🔍 Looking for user: %', target_email;
    
    -- Get user ID
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = target_email;
    
    IF target_user_id IS NULL THEN
        RAISE NOTICE '⚠️ User not found: %', target_email;
        RAISE NOTICE '   User may have already been deleted.';
        RETURN;
    END IF;
    
    RAISE NOTICE '✅ Found user ID: %', target_user_id;
    RAISE NOTICE '';
    RAISE NOTICE '🗑️  Starting deletion process...';
    RAISE NOTICE '';
    
    -- Step 1: Delete user_tenant_memberships
    DELETE FROM user_tenant_memberships 
    WHERE user_id = target_user_id;
    
    GET DIAGNOSTICS deleted_memberships = ROW_COUNT;
    RAISE NOTICE '   ✅ Deleted % membership(s)', deleted_memberships;
    
    -- Step 2: Delete tenants that belong to this user
    -- Only delete tenants where this user is the ONLY member (orphaned tenants)
    -- Get tenant IDs that only have this user as a member
    WITH orphaned_tenants AS (
        SELECT DISTINCT utm.tenant_id
        FROM user_tenant_memberships utm
        WHERE utm.user_id = target_user_id
          AND utm.tenant_id NOT IN (
              -- Exclude tenants that have other members
              SELECT DISTINCT tenant_id 
              FROM user_tenant_memberships 
              WHERE user_id != target_user_id
                AND tenant_id IS NOT NULL
          )
    )
    DELETE FROM tenants t
    WHERE t.id IN (SELECT tenant_id FROM orphaned_tenants);
    
    GET DIAGNOSTICS deleted_tenants = ROW_COUNT;
    IF deleted_tenants > 0 THEN
        RAISE NOTICE '   ✅ Deleted % orphaned tenant(s)', deleted_tenants;
    ELSE
        RAISE NOTICE '   ℹ️  No orphaned tenants to delete (other users have access)';
    END IF;
    
    -- Step 3: Delete app_users record
    DELETE FROM app_users 
    WHERE id = target_user_id;
    
    GET DIAGNOSTICS deleted_app_user = ROW_COUNT;
    IF deleted_app_user > 0 THEN
        RAISE NOTICE '   ✅ Deleted app_users record';
    ELSE
        RAISE NOTICE '   ℹ️  No app_users record found (incomplete signup)';
    END IF;
    
    -- Step 4: Delete auth.users record (this cascades to other tables)
    DELETE FROM auth.users 
    WHERE id = target_user_id;
    
    RAISE NOTICE '   ✅ Deleted auth.users record';
    RAISE NOTICE '';
    RAISE NOTICE '🎉 SUCCESS! User % has been completely removed.', target_email;
    RAISE NOTICE '';
    RAISE NOTICE 'You can now sign up again with this email address.';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING '❌ Error during deletion: %', SQLERRM;
        RAISE WARNING '   User may be partially deleted. Check manually.';
        RAISE;
END $$;

-- =====================================================
-- STEP 3: VERIFY DELETION (Run After Step 2)
-- =====================================================
-- Run this to confirm the user is completely gone

SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ User completely deleted - safe to sign up fresh'
        ELSE '⚠️ User still exists in database'
    END as status,
    COUNT(*) as remaining_records
FROM auth.users
WHERE email = 'toffeehegde@gmail.com';

