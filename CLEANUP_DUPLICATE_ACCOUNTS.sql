-- Cleanup Script for Duplicate/Orphaned Accounts
-- Run this in Supabase SQL Editor if you have duplicate account issues

-- 1. First, let's see what we have
-- Check for users in auth but not in app_users
SELECT 
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    CASE 
        WHEN app.id IS NULL THEN '❌ Missing app_user'
        ELSE '✓ Has app_user'
    END as status
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
ORDER BY au.created_at DESC;

-- 2. Check for orphaned tenants (no app_users pointing to them)
SELECT 
    t.id,
    t.name,
    t.created_at,
    COUNT(app.id) as user_count
FROM tenants t
LEFT JOIN app_users app ON app.tenant_id = t.id
GROUP BY t.id, t.name, t.created_at
HAVING COUNT(app.id) = 0
ORDER BY t.created_at DESC;

-- =====================================================
-- CLEANUP OPERATIONS (uncomment to run)
-- =====================================================

-- Option 1: Delete a specific test account completely
-- Replace 'test@example.com' with your test email
/*
DO $$
DECLARE
    user_id uuid;
    tenant_ids uuid[];
BEGIN
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = 'test@example.com';
    
    IF user_id IS NOT NULL THEN
        -- Get associated tenant IDs
        SELECT ARRAY_AGG(tenant_id) INTO tenant_ids 
        FROM app_users WHERE id = user_id;
        
        -- Delete app_user (will cascade to related data)
        DELETE FROM app_users WHERE id = user_id;
        
        -- Delete orphaned tenants
        IF tenant_ids IS NOT NULL THEN
            DELETE FROM tenants WHERE id = ANY(tenant_ids);
        END IF;
        
        -- Delete auth user
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE 'Deleted user and associated data';
    ELSE
        RAISE NOTICE 'User not found';
    END IF;
END $$;
*/

-- Option 2: Delete ALL orphaned tenants (tenants with no users)
/*
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
);
*/

-- Option 3: Fix incomplete signups (create missing app_users)
-- This creates app_user records for any auth.users that don't have one
/*
INSERT INTO app_users (id, tenant_id, full_name, role)
SELECT 
    au.id,
    (SELECT id FROM tenants ORDER BY created_at DESC LIMIT 1), -- assigns to newest tenant
    COALESCE(au.raw_user_meta_data->>'full_name', 'User'),
    'owner'
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
WHERE app.id IS NULL
  AND au.email_confirmed_at IS NOT NULL; -- only for confirmed users
*/

-- =====================================================
-- RECOMMENDED: Start Fresh for Testing
-- =====================================================
-- If you're just testing and want to start completely fresh:
/*
-- WARNING: This deletes EVERYTHING. Only use for testing!
DELETE FROM app_users;
DELETE FROM tenants;
-- Note: Can't directly delete from auth.users via SQL
-- Go to Supabase Dashboard → Authentication → Users and delete manually
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check current state after cleanup
SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_users,
    (SELECT COUNT(*) FROM app_users) as app_users,
    (SELECT COUNT(*) FROM tenants) as tenants,
    (SELECT COUNT(*) FROM auth.users au WHERE NOT EXISTS (
        SELECT 1 FROM app_users app WHERE app.id = au.id
    )) as orphaned_auth_users;


