-- TEST AFTER FIX - Verify everything is working
-- Run this AFTER running SAFE_EMERGENCY_FIX.sql

-- Test 1: Check if account exists and is working
SELECT 
  'ACCOUNT STATUS' as test,
  au.email,
  au.email_confirmed_at,
  ap.id as app_user_exists,
  ap.full_name,
  ap.role,
  t.id as tenant_exists,
  t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users ap ON au.id = ap.id
LEFT JOIN tenants t ON ap.tenant_id = t.id
WHERE au.email = 'deepakshegde@gmail.com';

-- Test 2: Try to SELECT from app_users (should work now)
SELECT 
  'SELECT TEST' as test,
  COUNT(*) as total_app_users,
  COUNT(CASE WHEN id = 'a0901598-6cc5-49bc-9234-db90b9af3444' THEN 1 END) as deepak_exists
FROM app_users;

-- Test 3: Try to SELECT from tenants (should work now)
SELECT 
  'TENANTS TEST' as test,
  COUNT(*) as total_tenants,
  COUNT(CASE WHEN owner_id = 'a0901598-6cc5-49bc-9234-db90b9af3444' THEN 1 END) as deepak_tenant_exists
FROM tenants;

-- Test 4: Check RLS policies
SELECT 
  'RLS CHECK' as test,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN cmd = 'ALL' AND 'authenticated' = ANY(roles) THEN '✅ GOOD'
    ELSE '❌ CHECK NEEDED'
  END as policy_status
FROM pg_policies
WHERE tablename IN ('app_users', 'tenants')
ORDER BY tablename, cmd;
