-- SAFE CLEANUP - Keep First User, Delete Only Duplicates
-- This script protects your first/main user account

-- =====================================================
-- STEP 1: IDENTIFY YOUR USERS
-- =====================================================

-- See all users and their creation order
SELECT 
    ROW_NUMBER() OVER (ORDER BY au.created_at ASC) as user_number,
    au.id,
    au.email,
    au.created_at,
    au.email_confirmed_at,
    CASE 
        WHEN app.id IS NULL THEN '❌ Missing app_user'
        ELSE '✅ Has app_user'
    END as app_user_status,
    app.full_name,
    t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users app ON app.id = au.id
LEFT JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.created_at ASC;

-- This will show you:
-- user_number | email | created_at | status
-- 1           | first@example.com  | 2024-... | ✅ Has app_user
-- 2           | test@example.com   | 2024-... | ❌ Missing app_user
-- etc.

-- =====================================================
-- STEP 2: SAFE DELETE - SPECIFIC EMAIL ONLY
-- =====================================================

-- Option A: Delete a specific test email (SAFEST)
-- Replace 'test-email@example.com' with the email you want to delete
-- This will NOT touch any other users!

/*
DO $$
DECLARE
    user_email text := 'test-email@example.com'; -- CHANGE THIS TO YOUR TEST EMAIL
    user_id uuid;
    tenant_ids uuid[];
    first_user_email text;
BEGIN
    -- Get the first user's email (to protect it)
    SELECT email INTO first_user_email 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Safety check: Don't delete the first user
    IF user_email = first_user_email THEN
        RAISE EXCEPTION 'SAFETY: Cannot delete the first user! Email: %', user_email;
    END IF;
    
    -- Get user ID
    SELECT id INTO user_id FROM auth.users WHERE email = user_email;
    
    IF user_id IS NOT NULL THEN
        -- Get associated tenant IDs
        SELECT ARRAY_AGG(tenant_id) INTO tenant_ids 
        FROM app_users WHERE id = user_id;
        
        -- Delete app_user
        DELETE FROM app_users WHERE id = user_id;
        
        -- Delete their tenant (if they're the only user)
        IF tenant_ids IS NOT NULL THEN
            DELETE FROM tenants 
            WHERE id = ANY(tenant_ids)
            AND id NOT IN (
                SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
            );
        END IF;
        
        -- Delete auth user
        DELETE FROM auth.users WHERE id = user_id;
        
        RAISE NOTICE 'Successfully deleted: %', user_email;
    ELSE
        RAISE NOTICE 'User not found: %', user_email;
    END IF;
END $$;
*/

-- =====================================================
-- STEP 3: DELETE ONLY DUPLICATE/INCOMPLETE ACCOUNTS
-- =====================================================

-- Option B: Delete only users who are missing app_user records
-- (These are incomplete signups)
-- This keeps users who have complete profiles

/*
DO $$
DECLARE
    first_user_id uuid;
    deleted_count int := 0;
BEGIN
    -- Get first user ID (to protect)
    SELECT id INTO first_user_id 
    FROM auth.users 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- Delete auth users who don't have app_user records
    -- BUT skip the first user for safety
    DELETE FROM auth.users
    WHERE id NOT IN (SELECT id FROM app_users)
    AND id != first_user_id
    RETURNING id INTO deleted_count;
    
    RAISE NOTICE 'Deleted % incomplete signup(s)', deleted_count;
    RAISE NOTICE 'First user (ID: %) was protected', first_user_id;
END $$;
*/

-- =====================================================
-- STEP 4: CLEAN UP ORPHANED DATA
-- =====================================================

-- Delete orphaned tenants (tenants with no users)
-- This is safe to run anytime
/*
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id FROM app_users WHERE tenant_id IS NOT NULL
);
*/

-- =====================================================
-- STEP 5: VERIFICATION
-- =====================================================

-- Check what's left after cleanup
SELECT 
    '✅ Remaining Users' as status,
    COUNT(*) as count
FROM auth.users
UNION ALL
SELECT 
    '✅ App Users' as status,
    COUNT(*) as count
FROM app_users
UNION ALL
SELECT 
    '✅ Tenants' as status,
    COUNT(*) as count
FROM tenants;

-- Show remaining users
SELECT 
    au.email,
    au.created_at,
    au.email_confirmed_at,
    app.full_name,
    t.name as tenant_name,
    '✅ Complete Account' as status
FROM auth.users au
JOIN app_users app ON app.id = au.id
JOIN tenants t ON t.id = app.tenant_id
ORDER BY au.created_at ASC;

-- =====================================================
-- RECOMMENDED WORKFLOW
-- =====================================================

/*
1. Run STEP 1 to see all your users
2. Identify which email(s) you want to delete
3. Use Option A (STEP 2) to delete specific test emails
4. Run STEP 4 to clean up orphaned tenants
5. Run STEP 5 to verify

Example:
- You have user #1: admin@yourcompany.com (KEEP THIS)
- You have user #2: test1@example.com (DELETE THIS)
- You have user #3: test2@example.com (DELETE THIS)

Just run Option A twice:
- Once with test1@example.com
- Once with test2@example.com

Your first user will always be protected!
*/


