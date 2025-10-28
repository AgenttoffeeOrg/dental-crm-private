-- =====================================================
-- CHECK RLS POLICIES AND TEST AUTH CONTEXT
-- =====================================================

-- 1. Show RLS policies on deals table
SELECT 
  policyname,
  cmd AS command,
  qual AS using_clause
FROM pg_policies
WHERE tablename = 'deals'
ORDER BY policyname;

-- 2. Check what auth.uid() returns in your current session
SELECT 
  'Your auth.uid()' AS test,
  auth.uid() AS result;

-- 3. Check what auth.get_user_tenant_id() returns
SELECT 
  'Your tenant from auth' AS test,
  COALESCE(
    (SELECT active_tenant_id FROM app_users WHERE id = auth.uid()),
    'NULL - auth.uid() is NULL!'::TEXT
  ) AS result;

-- 4. Simulate what the frontend sees (using your actual user ID)
-- This will tell us if the RLS policy is the problem
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" TO '{"sub": "a0901598-6cc5-49bc-9234-db90b9af3444"}';

SELECT 
  COUNT(*) AS deals_visible_to_authenticated_role
FROM deals
WHERE tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID;

RESET ROLE;

