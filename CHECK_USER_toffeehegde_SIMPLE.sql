-- =====================================================
-- SIMPLE DIAGNOSTIC SCRIPT: Check toffeehegde@gmail.com user state
-- Returns actual rows (easier to read than RAISE NOTICE)
-- =====================================================

-- 1. Check auth.users
SELECT 'AUTH.USERS' as section, 
       id as user_id, 
       email,
       email_confirmed_at,
       created_at
FROM auth.users 
WHERE email = 'toffeehegde@gmail.com';

-- 2. Check app_users
SELECT 'APP_USERS' as section,
       id,
       email,
       full_name,
       tenant_id,
       active_tenant_id,
       active_location_id,
       onboarding_current_step,
       created_at
FROM app_users 
WHERE email = 'toffeehegde@gmail.com';

-- 3. Get tenant info (if exists)
SELECT 'TENANTS' as section,
       t.id as tenant_id,
       t.name as tenant_name,
       t.account_type,
       t.created_at as tenant_created_at
FROM app_users au
LEFT JOIN tenants t ON t.id = COALESCE(au.active_tenant_id, au.tenant_id)
WHERE au.email = 'toffeehegde@gmail.com'
  AND t.id IS NOT NULL;

-- 4. Get membership info (if exists)
SELECT 'MEMBERSHIPS' as section,
       utm.id as membership_id,
       utm.tenant_id,
       utm.role,
       utm.status,
       utm.all_locations,
       utm.created_at
FROM app_users au
LEFT JOIN user_tenant_memberships utm ON utm.user_id = au.id
WHERE au.email = 'toffeehegde@gmail.com'
  AND utm.id IS NOT NULL;

-- 5. Get locations (if tenant exists)
SELECT 'LOCATIONS' as section,
       l.id as location_id,
       l.tenant_id,
       l.name as location_name,
       l.address,
       l.city,
       l.postal_code,
       l.phone,
       l.is_primary,
       l.is_active,
       l.created_at
FROM app_users au
LEFT JOIN tenants t ON t.id = COALESCE(au.active_tenant_id, au.tenant_id)
LEFT JOIN locations l ON l.tenant_id = t.id
WHERE au.email = 'toffeehegde@gmail.com'
  AND l.id IS NOT NULL
ORDER BY l.is_primary DESC, l.created_at ASC;

-- 6. Summary
SELECT 'SUMMARY' as section,
       au.id as user_id,
       COALESCE(au.active_tenant_id, au.tenant_id) as effective_tenant_id,
       au.active_location_id,
       CASE 
         WHEN au.active_tenant_id IS NOT NULL OR au.tenant_id IS NOT NULL THEN 'HAS_TENANT'
         ELSE 'NO_TENANT'
       END as tenant_status,
       CASE 
         WHEN au.active_location_id IS NOT NULL THEN 'HAS_ACTIVE_LOCATION'
         ELSE 'NO_ACTIVE_LOCATION'
       END as location_status
FROM app_users au
WHERE au.email = 'toffeehegde@gmail.com';

