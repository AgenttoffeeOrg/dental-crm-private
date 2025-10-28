-- =====================================================
-- QUERY 1: Show ALL users
-- =====================================================
-- Run this FIRST and paste the result

SELECT 
  'ALL USERS' AS info,
  id,
  email,
  full_name,
  active_tenant_id
FROM app_users
ORDER BY created_at DESC;

