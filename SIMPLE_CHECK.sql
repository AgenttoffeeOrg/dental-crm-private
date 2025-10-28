-- =====================================================
-- SIMPLE DIAGNOSTIC: Show me EVERYTHING about Deepak's Smile membership
-- =====================================================

SELECT 
  'DEEPAK SMILE MEMBERSHIP' AS info,
  utm.role,
  utm.status,
  utm.all_locations,
  CASE 
    WHEN utm.all_locations = TRUE THEN '✅ all_locations IS TRUE!'
    WHEN utm.all_locations = FALSE THEN '🚨 all_locations IS FALSE!'
    ELSE '❓ all_locations IS NULL!'
  END AS diagnosis
FROM user_tenant_memberships utm
JOIN app_users au ON utm.user_id = au.id
JOIN tenants t ON utm.tenant_id = t.id
WHERE au.email = 'deepak.s.hegde@gmail.com'
  AND t.name = 'Smile';

-- If the above returns NO rows, run this:
SELECT 
  'ALL DEEPAK MEMBERSHIPS' AS info,
  t.name AS org_name,
  utm.role,
  utm.all_locations
FROM user_tenant_memberships utm
JOIN app_users au ON utm.user_id = au.id
JOIN tenants t ON utm.tenant_id = t.id
WHERE au.email = 'deepak.s.hegde@gmail.com';

