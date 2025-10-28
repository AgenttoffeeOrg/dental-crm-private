-- =====================================================
-- SIMPLE: Find your email and create membership
-- =====================================================

-- 1. Show ALL users in the system
SELECT 
  '1. ALL USERS IN SYSTEM' AS info,
  id,
  email,
  full_name,
  active_tenant_id
FROM app_users
ORDER BY created_at DESC;

-- 2. Show which user has Smile as their active tenant
SELECT 
  '2. WHO HAS SMILE ACTIVE?' AS info,
  au.id,
  au.email,
  au.full_name
FROM app_users au
JOIN tenants t ON au.active_tenant_id = t.id
WHERE t.name = 'Smile';

-- 3. Show ALL memberships for Smile
SELECT 
  '3. SMILE MEMBERSHIPS' AS info,
  au.email,
  utm.role,
  utm.all_locations
FROM user_tenant_memberships utm
JOIN app_users au ON utm.user_id = au.id
JOIN tenants t ON utm.tenant_id = t.id
WHERE t.name = 'Smile';

-- 4. Count the data
SELECT 
  '4. DATA COUNT' AS info,
  (SELECT COUNT(*) FROM deals WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) AS deals_count,
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) AS contacts_count;

