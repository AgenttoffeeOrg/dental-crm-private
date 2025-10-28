-- =====================================================
-- QUERY 3: Existing Smile memberships
-- =====================================================
-- Run this THIRD and paste the result

SELECT 
  'SMILE MEMBERSHIPS' AS info,
  au.email,
  au.full_name,
  utm.role,
  utm.status,
  utm.all_locations
FROM user_tenant_memberships utm
JOIN app_users au ON utm.user_id = au.id
JOIN tenants t ON utm.tenant_id = t.id
WHERE t.name = 'Smile';

