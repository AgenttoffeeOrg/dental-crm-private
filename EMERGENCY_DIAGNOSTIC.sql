-- =====================================================
-- EMERGENCY DIAGNOSTIC: Why is Deepak not an owner with all_locations?
-- =====================================================

-- 1. Check Deepak's current membership status
SELECT 
  '1. DEEPAK MEMBERSHIP STATUS' AS check_name,
  utm.role,
  utm.status,
  utm.all_locations,
  t.name AS tenant_name,
  t.id AS tenant_id,
  utm.created_at
FROM user_tenant_memberships utm
JOIN tenants t ON utm.tenant_id = t.id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND t.name = 'Smile';

-- 2. Check if the UPDATE command worked
SELECT 
  '2. VERIFY UPDATE RESULT' AS check_name,
  CASE 
    WHEN all_locations = TRUE THEN '✅ all_locations is TRUE'
    ELSE '🚨 all_locations is STILL FALSE!'
  END AS status,
  role,
  utm.status AS membership_status
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 3. Test RLS function DIRECTLY
SELECT 
  '3. DIRECT RLS TEST' AS check_name,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    (SELECT id FROM locations WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile') LIMIT 1)
  ) AS has_access;

-- =====================================================
-- FORCE FIX: Set all_locations = TRUE (run this manually if needed)
-- =====================================================

-- Run this ONLY if the above shows all_locations = FALSE:
/*
UPDATE user_tenant_memberships
SET all_locations = TRUE
WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

SELECT 'FORCED UPDATE COMPLETE' AS status;
*/

