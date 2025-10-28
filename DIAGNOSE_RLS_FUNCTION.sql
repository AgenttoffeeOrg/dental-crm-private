-- =====================================================
-- DIAGNOSE: Why is get_accessible_tenants() still failing?
-- =====================================================

-- 1. Check the current function definition
SELECT 
  'STEP 1: Current Function Definition' AS step,
  pg_get_functiondef(oid) AS function_code
FROM pg_proc 
WHERE proname = 'get_accessible_tenants';

-- 2. Check your app_users record
SELECT 
  'STEP 2: Your app_users Record' AS step,
  id,
  email,
  full_name,
  active_tenant_id,
  tenant_id AS old_tenant_id_column
FROM app_users
WHERE email = 'deepakshegde@gmail.com';

-- 3. Check your user_tenant_memberships
SELECT 
  'STEP 3: Your Memberships' AS step,
  utm.id,
  utm.user_id,
  utm.tenant_id,
  t.name AS tenant_name,
  utm.role,
  utm.status,
  utm.all_locations
FROM user_tenant_memberships utm
JOIN tenants t ON utm.tenant_id = t.id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepakshegde@gmail.com' LIMIT 1);

-- 4. Manually check what the function WOULD return for you
SELECT 
  'STEP 4: What function would return' AS step,
  ARRAY_AGG(DISTINCT utm.tenant_id) AS tenant_ids
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepakshegde@gmail.com' LIMIT 1)
  AND utm.status = 'active';

-- 5. Check if Smile tenant is in that list
WITH user_tenants AS (
  SELECT ARRAY_AGG(DISTINCT utm.tenant_id) AS tenant_ids
  FROM user_tenant_memberships utm
  WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepakshegde@gmail.com' LIMIT 1)
    AND utm.status = 'active'
)
SELECT 
  'STEP 5: Is Smile in the list?' AS step,
  (SELECT id FROM tenants WHERE name = 'Smile') AS smile_tenant_id,
  ut.tenant_ids AS your_accessible_tenants,
  CASE 
    WHEN (SELECT id FROM tenants WHERE name = 'Smile') = ANY(ut.tenant_ids)
    THEN '✅ YES - Smile is accessible'
    ELSE '❌ NO - Smile is NOT accessible'
  END AS result
FROM user_tenants ut;

-- 6. Check deal's tenant_id
SELECT 
  'STEP 6: Deal Tenant ID' AS step,
  id,
  title,
  tenant_id,
  (SELECT name FROM tenants WHERE id = deals.tenant_id) AS tenant_name
FROM deals
WHERE id = '87a4028d-6f38-4b7c-9fa0-6f1fa26c720f';

-- 7. Check if deal's tenant matches your accessible tenants
WITH user_tenants AS (
  SELECT ARRAY_AGG(DISTINCT utm.tenant_id) AS tenant_ids
  FROM user_tenant_memberships utm
  WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepakshegde@gmail.com' LIMIT 1)
    AND utm.status = 'active'
)
SELECT 
  'STEP 7: FINAL VERDICT' AS step,
  d.tenant_id AS deal_tenant_id,
  t.name AS deal_tenant_name,
  ut.tenant_ids AS your_accessible_tenants,
  CASE 
    WHEN d.tenant_id = ANY(ut.tenant_ids)
    THEN '✅ DEAL SHOULD BE VISIBLE'
    ELSE '❌ DEAL WILL BE BLOCKED BY RLS'
  END AS verdict
FROM deals d
JOIN tenants t ON d.tenant_id = t.id
CROSS JOIN user_tenants ut
WHERE d.id = '87a4028d-6f38-4b7c-9fa0-6f1fa26c720f';

