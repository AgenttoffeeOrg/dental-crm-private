-- =====================================================
-- FIND DEEPAK'S ACTUAL EMAIL
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

-- 4. Find who created the Smile tenant
SELECT 
  '4. SMILE TENANT INFO' AS check_name,
  t.id AS tenant_id,
  t.name,
  t.owner_id,
  au.email AS owner_email,
  au.full_name AS owner_name
FROM tenants t
LEFT JOIN app_users au ON t.owner_id = au.id
WHERE t.name = 'Smile';

-- 5. Find who has deals in the Smile tenant
SELECT 
  '5. USERS WITH SMILE DEALS' AS check_name,
  au.email,
  au.full_name,
  COUNT(d.id) AS deal_count
FROM deals d
JOIN tenants t ON d.tenant_id = t.id
LEFT JOIN app_users au ON d.owner_id = au.id
WHERE t.name = 'Smile'
GROUP BY au.id, au.email, au.full_name
ORDER BY deal_count DESC;

-- 6. Find who has contacts in the Smile tenant
SELECT 
  '6. USERS WITH SMILE CONTACTS' AS check_name,
  au.email,
  au.full_name,
  COUNT(c.id) AS contact_count
FROM contacts c
JOIN tenants t ON c.tenant_id = t.id
LEFT JOIN app_users au ON c.owner_id = au.id
WHERE t.name = 'Smile'
GROUP BY au.id, au.email, au.full_name
ORDER BY contact_count DESC;

