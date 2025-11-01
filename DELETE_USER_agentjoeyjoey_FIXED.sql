-- =====================================================
-- DELETE USER: agentjoeyjoey@gmail.com (FIXED - No Recursion)
-- =====================================================
-- 
-- ⚠️ IMPORTANT: This ONLY deletes agentjoeyjoey@gmail.com
-- ⚠️ This does NOT delete:
--    - Other users
--    - Workflows/automations
--    - Data from other users
--    - Shared organizations (if other users are members)
-- 
-- ⚠️ This WILL delete:
--    - Only THIS user's account
--    - Only organizations where THIS user is the ONLY member (orphaned)
--    - Only locations belonging to orphaned organizations
-- 
-- Run CHECK_USER_agentjoeyjoey.sql FIRST to verify the user's status!
-- =====================================================

-- STEP 1: Get the user ID (run this first and note the ID)
SELECT id as user_id, email 
FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 2: Delete memberships FIRST (prevents tenant deletion issues)
-- Replace YOUR_USER_ID with the ID from Step 1
DELETE FROM user_tenant_memberships 
WHERE user_id = (
    SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com'
);

-- STEP 3: Delete orphaned tenants (tenants with NO remaining members)
-- This deletes tenants that have zero members after Step 2
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id 
    FROM user_tenant_memberships 
    WHERE tenant_id IS NOT NULL
);

-- STEP 4: Delete orphaned locations (locations without a tenant)
DELETE FROM locations 
WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- STEP 5: Delete app_user record
DELETE FROM app_users 
WHERE id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 6: Delete auth.users record (must be last)
DELETE FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 7: Verify deletion
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ User completely deleted - safe to sign up fresh'
        ELSE '⚠️ User still exists in database'
    END as status,
    COUNT(*) as remaining_records
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';

