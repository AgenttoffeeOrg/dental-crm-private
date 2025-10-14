-- DIAGNOSTIC SCRIPT FOR deepakshegde@gmail.com
-- Run this in Supabase SQL Editor to see what's wrong

-- 1. Check if user exists in auth.users
SELECT 
  '1. AUTH USER CHECK' as test,
  id,
  email,
  created_at,
  email_confirmed_at,
  last_sign_in_at
FROM auth.users
WHERE email = 'deepakshegde@gmail.com';

-- 2. Check if app_user exists
SELECT 
  '2. APP USER CHECK' as test,
  ap.*
FROM app_users ap
WHERE ap.id IN (SELECT id FROM auth.users WHERE email = 'deepakshegde@gmail.com');

-- 3. Check if tenant exists for this user
SELECT 
  '3. TENANT CHECK' as test,
  t.*
FROM tenants t
WHERE t.owner_id IN (SELECT id FROM auth.users WHERE email = 'deepakshegde@gmail.com');

-- 4. Check RLS policies on app_users
SELECT 
  '4. RLS POLICIES - app_users' as test,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'app_users';

-- 5. Check RLS policies on tenants
SELECT 
  '5. RLS POLICIES - tenants' as test,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'tenants';

-- 6. Full join to see the complete picture
SELECT 
  '6. COMPLETE PICTURE' as test,
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created,
  ap.id as app_user_id,
  ap.tenant_id,
  ap.full_name,
  ap.role,
  t.id as tenant_id_from_tenants,
  t.name as tenant_name,
  t.owner_id as tenant_owner_id,
  CASE 
    WHEN au.id IS NOT NULL AND ap.id IS NULL THEN '❌ MISSING app_user'
    WHEN au.id IS NOT NULL AND ap.id IS NOT NULL AND t.id IS NULL THEN '⚠️ ORPHANED app_user (no tenant)'
    WHEN au.id IS NOT NULL AND ap.id IS NOT NULL AND t.id IS NOT NULL THEN '✅ ALL GOOD'
    ELSE '❓ UNKNOWN STATE'
  END as status
FROM auth.users au
LEFT JOIN app_users ap ON au.id = ap.id
LEFT JOIN tenants t ON ap.tenant_id = t.id
WHERE au.email = 'deepakshegde@gmail.com';

