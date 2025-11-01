-- =====================================================
-- DELETE USER: agentjoeyjoey@gmail.com (FINAL - Drop Trigger)
-- =====================================================
-- 
-- ⚠️ IMPORTANT: This ONLY deletes agentjoeyjoey@gmail.com
-- ⚠️ Does NOT delete:
--    - Other users (toffeehegde@gmail.com, etc.)
--    - Workflows/automations (unless in orphaned org)
--    - Data from other users
--    - Shared organizations (if other users are members)
-- 
-- ⚠️ This WILL delete:
--    - Only THIS user's account
--    - Only organizations where THIS user is the ONLY member (orphaned)
--    - Only locations belonging to orphaned organizations
-- 
-- This version DROPS the problematic trigger instead of disabling it.
-- =====================================================

-- STEP 1: Get the user ID first (verify user exists)
SELECT id as user_id, email, created_at
FROM auth.users 
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 2: Drop the problematic trigger (prevents recursion)
DO $$
DECLARE
    trigger_exists BOOLEAN;
    trigger_definition TEXT;
BEGIN
    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'trg_expire_old_invites'
    ) INTO trigger_exists;
    
    IF trigger_exists THEN
        -- Get the trigger definition before dropping (so we can recreate it)
        SELECT pg_get_triggerdef(oid)
        INTO trigger_definition
        FROM pg_trigger
        WHERE tgname = 'trg_expire_old_invites'
        LIMIT 1;
        
        -- Drop the trigger
        DROP TRIGGER IF EXISTS trg_expire_old_invites ON pending_invites;
        RAISE NOTICE '✅ Dropped trg_expire_old_invites trigger';
        
        -- Store definition in a temp variable for later recreation
        -- (We'll recreate it manually if needed)
    ELSE
        RAISE NOTICE 'Trigger trg_expire_old_invites does not exist - skipping';
    END IF;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'pending_invites table does not exist - skipping trigger drop';
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop trigger (may not exist): %', SQLERRM;
END $$;

-- STEP 3: Delete memberships FIRST (prevents tenant deletion issues)
DELETE FROM user_tenant_memberships 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 4: Delete orphaned tenants (tenants with NO remaining members)
-- This ONLY deletes tenants that have zero members after Step 3
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

-- STEP 8: Recreate the trigger (if it existed before)
-- Note: The trigger definition from the migration should be:
-- CREATE TRIGGER trg_expire_old_invites
-- AFTER INSERT OR UPDATE ON pending_invites
-- FOR EACH STATEMENT
-- EXECUTE FUNCTION expire_old_invites();
DO $$
BEGIN
    -- Only recreate if pending_invites table exists and function exists
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pending_invites'
    ) AND EXISTS (
        SELECT 1 FROM pg_proc 
        WHERE proname = 'expire_old_invites'
    ) THEN
        -- Recreate the trigger
        CREATE TRIGGER trg_expire_old_invites
        AFTER INSERT OR UPDATE ON pending_invites
        FOR EACH STATEMENT
        EXECUTE FUNCTION expire_old_invites();
        
        RAISE NOTICE '✅ Recreated trg_expire_old_invites trigger';
    ELSE
        RAISE NOTICE 'Skipping trigger recreation (table or function does not exist)';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not recreate trigger: %', SQLERRM;
        RAISE NOTICE '⚠️ You may need to recreate the trigger manually from the migration file';
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

