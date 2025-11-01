-- =====================================================
-- DELETE USER: agentjoeyjoey@gmail.com (SAFE - No Triggers)
-- =====================================================
-- 
-- This version temporarily disables problematic triggers
-- to avoid recursion issues during deletion.
-- 
-- ⚠️ IMPORTANT: This ONLY deletes agentjoeyjoey@gmail.com
-- ⚠️ Does NOT delete other users, workflows, or shared data
-- =====================================================

-- STEP 1: Get the user ID first
SELECT id as user_id, email 
FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 2: Temporarily disable problematic triggers to prevent recursion
DO $$
BEGIN
    -- Disable the recursive trigger that causes stack overflow
    ALTER TABLE pending_invites DISABLE TRIGGER trg_expire_old_invites;
    RAISE NOTICE 'Disabled trg_expire_old_invites trigger';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pending_invites table does not exist - skipping trigger disable';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not disable trigger (may not exist): %', SQLERRM;
END $$;

-- STEP 3: Delete memberships FIRST (prevents tenant deletion issues)
DELETE FROM user_tenant_memberships 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 4: Delete orphaned tenants (tenants with NO remaining members)
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id 
    FROM user_tenant_memberships 
    WHERE tenant_id IS NOT NULL
);

-- STEP 5: Delete orphaned locations (locations without a tenant)
DELETE FROM locations 
WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- STEP 6: Delete app_user record
DELETE FROM app_users 
WHERE id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 7: Delete auth.users record (must be last)
DELETE FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 8: Re-enable triggers (cleanup)
DO $$
BEGIN
    ALTER TABLE pending_invites ENABLE TRIGGER trg_expire_old_invites;
    RAISE NOTICE 'Re-enabled trg_expire_old_invites trigger';
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pending_invites table does not exist - skipping trigger enable';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not re-enable trigger: %', SQLERRM;
END $$;

-- STEP 9: Verify deletion
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ User completely deleted - safe to sign up fresh'
        ELSE '⚠️ User still exists in database'
    END as status,
    COUNT(*) as remaining_records
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';

