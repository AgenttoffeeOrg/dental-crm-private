-- =====================================================
-- CHECK SMILE LOCATIONS AND FIX EVERYTHING
-- =====================================================

-- 1. Do the 3 locations exist for Smile?
SELECT 
  '1. SMILE LOCATIONS' AS check_name,
  l.id,
  l.name,
  l.tenant_id,
  t.name AS tenant_name,
  l.is_primary,
  l.created_at
FROM locations l
JOIN tenants t ON l.tenant_id = t.id
WHERE t.name = 'Smile'
ORDER BY l.is_primary DESC, l.name;

-- 2. How many deals are in each location?
SELECT 
  '2. DEALS PER LOCATION' AS check_name,
  l.name AS location_name,
  COUNT(d.id) AS deal_count,
  COUNT(c.id) AS contact_count
FROM locations l
LEFT JOIN deals d ON l.id = d.location_id
LEFT JOIN contacts c ON l.id = c.location_id
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY l.id, l.name
ORDER BY deal_count DESC;

-- 3. Check Deepak's membership configuration
SELECT 
  '3. DEEPAK MEMBERSHIP' AS check_name,
  utm.all_locations,
  utm.role,
  utm.status,
  COUNT(ml.location_id) AS explicit_location_count
FROM user_tenant_memberships utm
LEFT JOIN membership_locations ml ON utm.id = ml.membership_id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY utm.id, utm.all_locations, utm.role, utm.status;

-- 4. DIAGNOSIS: What needs to be fixed?
SELECT 
  '4. DIAGNOSIS' AS check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM locations WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) = 0
    THEN '🚨 NO LOCATIONS EXIST! Need to create them.'
    
    WHEN (SELECT COUNT(*) FROM locations WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) < 3
    THEN '⚠️ MISSING LOCATIONS! Should have 3, found ' || (SELECT COUNT(*) FROM locations WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile'))::text
    
    WHEN (SELECT all_locations FROM user_tenant_memberships 
          WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
            AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) = FALSE
      AND (SELECT COUNT(*) FROM membership_locations ml
           JOIN user_tenant_memberships utm ON ml.membership_id = utm.id
           WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
             AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) = 0
    THEN '🚨 USER HAS NO LOCATION ACCESS! Need to set all_locations=TRUE or add explicit locations.'
    
    ELSE '✅ Locations exist, but access needs to be configured'
  END AS diagnosis;

-- =====================================================
-- FIX OPTION 1: Set all_locations = TRUE (RECOMMENDED)
-- =====================================================
-- Uncomment this to give Deepak access to ALL locations in Smile org:

-- UPDATE user_tenant_memberships
-- SET all_locations = TRUE
-- WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
--   AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- DO $$ BEGIN RAISE NOTICE '✅ Set all_locations = TRUE for Deepak in Smile org'; END $$;

-- =====================================================
-- FIX OPTION 2: Add explicit location access (if you want granular control)
-- =====================================================
-- Uncomment this to give Deepak access to specific locations:

-- INSERT INTO membership_locations (membership_id, location_id)
-- SELECT 
--   utm.id AS membership_id,
--   l.id AS location_id
-- FROM user_tenant_memberships utm
-- CROSS JOIN locations l
-- WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
--   AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
--   AND l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
-- ON CONFLICT DO NOTHING;

-- DO $$ BEGIN RAISE NOTICE '✅ Added explicit location access for Deepak to all Smile locations'; END $$;

-- =====================================================
-- VERIFICATION: Run this after applying the fix
-- =====================================================
SELECT 
  '5. VERIFICATION' AS check_name,
  l.name AS location_name,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    l.id
  ) AS deepak_has_access
FROM locations l
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
ORDER BY l.name;

