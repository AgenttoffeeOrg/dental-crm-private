-- =====================================================
-- DELETE USER: agentjoeyjoey@gmail.com (SIMPLE - Direct Delete)
-- =====================================================
-- 
-- ⚠️ IMPORTANT: This ONLY deletes agentjoeyjoey@gmail.com
-- ⚠️ Does NOT delete other users, workflows, or shared data
-- 
-- This version drops the trigger FIRST, then deletes.
-- Run each step separately if needed.
-- =====================================================

-- STEP 1: Drop the trigger FIRST (prevents any recursion)
DROP TRIGGER IF EXISTS trg_expire_old_invites ON pending_invites;

-- STEP 2: Delete memberships
DELETE FROM user_tenant_memberships 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 3: Delete orphaned tenants (only where user was the only member)
DELETE FROM tenants 
WHERE id NOT IN (
    SELECT DISTINCT tenant_id 
    FROM user_tenant_memberships 
    WHERE tenant_id IS NOT NULL
);

-- STEP 4: Delete orphaned locations
DELETE FROM locations 
WHERE tenant_id NOT IN (SELECT id FROM tenants);

-- STEP 5: Delete app_user
DELETE FROM app_users 
WHERE id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 6: Delete auth.users (must be last)
DELETE FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 7: Recreate the trigger
CREATE TRIGGER trg_expire_old_invites
AFTER INSERT OR UPDATE ON pending_invites
FOR EACH STATEMENT
EXECUTE FUNCTION expire_old_invites();

-- STEP 8: Verify
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ User deleted successfully'
        ELSE '⚠️ User still exists'
    END as status
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';
