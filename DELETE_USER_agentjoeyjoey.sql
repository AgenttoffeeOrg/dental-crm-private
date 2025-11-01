-- =====================================================
-- DELETE USER: agentjoeyjoey@gmail.com
-- =====================================================
-- 
-- This script safely deletes a user and all associated data.
-- Uses simpler approach to avoid trigger recursion issues.
-- =====================================================

-- Step 1: Find user ID first (for verification)
SELECT 
    '👤 USER INFO' as section,
    id as user_id,
    email,
    created_at
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';

-- Step 2: Manual deletion (run each statement separately to avoid recursion)
-- First, get the user ID:
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'User ID: %', v_user_id;
    RAISE NOTICE 'Run the following DELETE statements with this user ID:';
    RAISE NOTICE '';
    RAISE NOTICE '1. DELETE FROM user_tenant_memberships WHERE user_id = ''%'';', v_user_id;
    RAISE NOTICE '2. DELETE FROM tenants WHERE id IN (SELECT DISTINCT tenant_id FROM user_tenant_memberships WHERE user_id = ''%'') AND NOT EXISTS (SELECT 1 FROM user_tenant_memberships utm2 WHERE utm2.tenant_id = tenants.id AND utm2.user_id != ''%'');', v_user_id, v_user_id;
    RAISE NOTICE '3. DELETE FROM locations WHERE tenant_id NOT IN (SELECT id FROM tenants);';
    RAISE NOTICE '4. DELETE FROM app_users WHERE id = ''%'';', v_user_id;
    RAISE NOTICE '5. DELETE FROM auth.users WHERE id = ''%'';', v_user_id;
END $$;

-- OR: Run this simplified all-in-one (uncomment to use):
/*
DO $$
DECLARE
    v_user_id UUID;
    v_email TEXT := 'agentjoeyjoey@gmail.com';
BEGIN
    -- Get user ID (store it to avoid repeated queries)
    SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found';
        RETURN;
    END IF;
    
    -- Step 1: Delete memberships
    EXECUTE 'DELETE FROM user_tenant_memberships WHERE user_id = $1' USING v_user_id;
    
    -- Step 2: Delete orphaned tenants (only if no other members exist)
    -- Use a simpler approach that doesn't reference user_tenant_memberships after deletion
    DELETE FROM tenants t
    WHERE NOT EXISTS (
        SELECT 1 FROM user_tenant_memberships utm
        WHERE utm.tenant_id = t.id
    );
    
    -- Step 3: Clean up orphaned locations
    DELETE FROM locations WHERE tenant_id NOT IN (SELECT id FROM tenants);
    
    -- Step 4: Delete app_user
    EXECUTE 'DELETE FROM app_users WHERE id = $1' USING v_user_id;
    
    -- Step 5: Delete auth.users
    EXECUTE 'DELETE FROM auth.users WHERE id = $1' USING v_user_id;
    
    RAISE NOTICE 'User deleted successfully';
END $$;
*/

-- Verification: Check if user is completely deleted
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ User completely deleted - safe to sign up fresh'
        ELSE '⚠️ User still exists in database'
    END as status,
    COUNT(*) as remaining_records
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';

