-- =====================================================
-- CHECK: RLS Policies and Function Permissions
-- =====================================================

-- 1. Check function permissions
SELECT 
  'STEP 1: Function Permissions' AS step,
  proname AS function_name,
  prosecdef AS is_security_definer,
  proacl AS access_privileges
FROM pg_proc
WHERE proname = 'get_accessible_tenants';

-- 2. Check what RLS policies exist on deals table
SELECT 
  'STEP 2: Deals RLS Policies' AS step,
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

-- 3. Check if deals table has RLS enabled
SELECT 
  'STEP 3: RLS Status on Deals' AS step,
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'deals';

-- 4. Test if auth.uid() returns your user ID
SELECT 
  'STEP 4: Current Auth User' AS step,
  auth.uid() AS current_user_id,
  (SELECT email FROM app_users WHERE id = auth.uid()) AS current_user_email;

-- 5. Test what get_accessible_tenants() returns for YOU right now
SELECT 
  'STEP 5: Your Accessible Tenants (Live)' AS step,
  public.get_accessible_tenants() AS accessible_tenant_ids,
  (
    SELECT array_agg(t.name)
    FROM tenants t
    WHERE t.id = ANY(public.get_accessible_tenants())
  ) AS accessible_tenant_names;

-- 6. Check if the deal's tenant_id matches your accessible tenants
SELECT 
  'STEP 6: Deal Visibility Check' AS step,
  d.id,
  d.title,
  d.tenant_id,
  public.get_accessible_tenants() AS your_accessible_tenants,
  CASE 
    WHEN d.tenant_id = ANY(public.get_accessible_tenants())
    THEN '✅ VISIBLE'
    ELSE '❌ BLOCKED'
  END AS rls_result
FROM deals d
WHERE d.id = '87a4028d-6f38-4b7c-9fa0-6f1fa26c720f';

