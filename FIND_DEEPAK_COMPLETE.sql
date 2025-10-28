-- =====================================================
-- FIND DEEPAK'S ACTUAL EMAIL (FULLY FIXED)
-- =====================================================

-- 1. List ALL users (to find Deepak)
SELECT 
  '1. ALL USERS' AS check_name,
  id,
  email,
  full_name,
  active_tenant_id,
  created_at
FROM app_users
ORDER BY created_at DESC
LIMIT 10;

-- 2. Search for emails containing "deepak"
SELECT 
  '2. USERS WITH "DEEPAK"' AS check_name,
  id,
  email,
  full_name
FROM app_users
WHERE email ILIKE '%deepak%' OR full_name ILIKE '%deepak%';

-- 3. Search for emails containing "hegde"
SELECT 
  '3. USERS WITH "HEGDE"' AS check_name,
  id,
  email,
  full_name
FROM app_users
WHERE email ILIKE '%hegde%' OR full_name ILIKE '%hegde%';

-- 4. Find the Smile tenant info
SELECT 
  '4. SMILE TENANT INFO' AS check_name,
  t.id AS tenant_id,
  t.name,
  t.created_at
FROM tenants t
WHERE t.name = 'Smile';

-- 5. Count deals in Smile tenant (without owner info for now)
SELECT 
  '5. SMILE DEALS COUNT' AS check_name,
  COUNT(d.id) AS total_deals,
  t.name AS tenant_name
FROM deals d
JOIN tenants t ON d.tenant_id = t.id
WHERE t.name = 'Smile'
GROUP BY t.name;

-- 6. Count contacts in Smile tenant (without owner info for now)
SELECT 
  '6. SMILE CONTACTS COUNT' AS check_name,
  COUNT(c.id) AS total_contacts,
  t.name AS tenant_name
FROM contacts c
JOIN tenants t ON c.tenant_id = t.id
WHERE t.name = 'Smile'
GROUP BY t.name;

-- 7. Show ALL existing memberships for Smile tenant
SELECT 
  '7. EXISTING SMILE MEMBERSHIPS' AS check_name,
  au.email,
  au.full_name,
  utm.role,
  utm.status,
  utm.all_locations
FROM user_tenant_memberships utm
JOIN tenants t ON utm.tenant_id = t.id
JOIN app_users au ON utm.user_id = au.id
WHERE t.name = 'Smile';

-- 8. Find user who has active_tenant_id set to Smile
SELECT 
  '8. USERS WITH SMILE AS ACTIVE TENANT' AS check_name,
  au.id,
  au.email,
  au.full_name,
  au.active_tenant_id,
  t.name AS active_tenant_name
FROM app_users au
JOIN tenants t ON au.active_tenant_id = t.id
WHERE t.name = 'Smile';

-- 9. Check deals table columns (to understand structure)
SELECT 
  '9. DEALS TABLE STRUCTURE' AS check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'deals'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 10. Check contacts table columns (to understand structure)
SELECT 
  '10. CONTACTS TABLE STRUCTURE' AS check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'contacts'
  AND table_schema = 'public'
ORDER BY ordinal_position;

