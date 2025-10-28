-- =====================================================
-- FIX: Remove Infinite Recursion in RLS Policy
-- =====================================================
-- 
-- PROBLEM:
-- The policy "Tenant admins can view tenant memberships" 
-- queries user_tenant_memberships WITHIN an RLS policy 
-- for user_tenant_memberships, causing infinite recursion.
--
-- SOLUTION:
-- Drop the recursive policy. Users can still view their own
-- memberships via "Users can view own memberships" policy.
-- Admin views can use service role or explicit functions.
-- =====================================================

BEGIN;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Tenant admins can view tenant memberships" ON user_tenant_memberships;

RAISE NOTICE '✅ Removed recursive RLS policy';
RAISE NOTICE '📊 Users can still view their own memberships';
RAISE NOTICE '🔧 Admins should use service role or helper functions for tenant member lists';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- 
-- To verify policies:
-- SELECT policyname, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'user_tenant_memberships';
--
-- Expected policies remaining:
-- 1. "Users can view own memberships" (user_id = auth.uid())
-- 2. "Service role can manage memberships" (auth.role() = 'service_role')
-- 3. "Tenant admins can create memberships" (INSERT only, uses subquery but OK)
-- 4. "Users can update own memberships" (user_id = auth.uid())
-- 5. "Tenant owners can update tenant memberships" (UPDATE with subquery)
-- 6. "Tenant owners can remove members" (DELETE with subquery)
-- =====================================================


