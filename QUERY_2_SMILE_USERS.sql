-- =====================================================
-- QUERY 2: Who has Smile as active tenant?
-- =====================================================
-- Run this SECOND and paste the result

SELECT 
  'WHO HAS SMILE ACTIVE' AS info,
  au.id,
  au.email,
  au.full_name,
  au.active_tenant_id,
  t.name AS tenant_name
FROM app_users au
JOIN tenants t ON au.active_tenant_id = t.id
WHERE t.name = 'Smile';

