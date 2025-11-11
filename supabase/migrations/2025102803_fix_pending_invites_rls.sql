-- =====================================================================================================
-- FIX: pending_invites RLS policy that references auth.users
-- =====================================================================================================
-- Problem: The "Users can view invites sent to them" policy queries auth.users table which
-- causes "permission denied for table users" error because users don't have direct access
-- to auth.users.
-- 
-- Solution: Remove the problematic policy. Users don't need to SELECT their own invites directly
-- because:
-- 1. Invite validation happens via validate_invite_code() function (which uses SECURITY DEFINER)
-- 2. The check-pending API endpoint uses the validate_invite_code() function
-- 3. Admins can view invites via the "Admins can view tenant invites" policy
-- =====================================================================================================

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view invites sent to them" ON pending_invites;

-- Note: The remaining policies are sufficient:
-- 1. "Admins can view tenant invites" - Allows owners/admins to see all invites for their org
-- 2. "Admins can create invites" - Allows owners/admins to create invites
-- 3. "Admins can cancel invites" - Allows owners/admins to cancel invites
-- 
-- Users checking their own invites should use the validate_invite_code() function
-- which has SECURITY DEFINER and can safely query the invite.

DO $$ 
BEGIN 
  RAISE NOTICE '✅ Fixed pending_invites RLS policies';
  RAISE NOTICE '✅ Removed policy that queried auth.users table';
  RAISE NOTICE '✅ Invite validation still works via validate_invite_code() function';
END $$;

