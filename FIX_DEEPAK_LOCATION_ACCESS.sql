-- =====================================================
-- FIX: Grant Deepak access to all Smile locations
-- =====================================================

UPDATE user_tenant_memberships
SET all_locations = TRUE
WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- Verify the fix
SELECT 
  '✅ VERIFICATION' AS check_name,
  l.name AS location_name,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    l.id
  ) AS deepak_has_access_now
FROM locations l
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
ORDER BY l.name;

-- Double-check membership configuration
SELECT 
  '✅ MEMBERSHIP CONFIG' AS check_name,
  utm.all_locations AS all_locations_enabled,
  utm.role,
  utm.status
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

DO $$ BEGIN RAISE NOTICE '🎉 SUCCESS! Deepak now has access to all Smile locations!'; END $$;

