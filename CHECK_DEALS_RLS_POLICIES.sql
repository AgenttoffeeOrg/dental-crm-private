-- =====================================================
-- CHECK DEALS TABLE RLS POLICIES
-- =====================================================

-- 1. Show all RLS policies on deals table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'deals'
ORDER BY policyname;

-- 2. Check if RLS is enabled on deals table
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'deals';

-- 3. Test if YOU can see deals directly (bypassing frontend)
SELECT 
  id,
  title,
  tenant_id,
  location_id,
  stage_id,
  owner_user_id,
  value_estimate_cents
FROM deals
WHERE tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 5;

