-- =====================================================
-- DIAGNOSE: Why can't Deepak see his 120 deals?
-- =====================================================

-- 1. What is Deepak's current active context?
SELECT 
  '1. DEEPAK ACTIVE CONTEXT' AS check_name,
  au.email,
  au.active_tenant_id,
  au.active_location_id,
  t.name AS active_tenant_name,
  l.name AS active_location_name,
  utm.all_locations AS has_all_locations_access
FROM app_users au
JOIN tenants t ON au.active_tenant_id = t.id
LEFT JOIN locations l ON au.active_location_id = l.id
LEFT JOIN user_tenant_memberships utm ON au.id = utm.user_id AND au.active_tenant_id = utm.tenant_id
WHERE au.email = 'deepak.s.hegde@gmail.com';

-- 2. What locations exist for the Smile tenant?
SELECT 
  '2. SMILE LOCATIONS' AS check_name,
  l.id,
  l.name,
  l.is_primary,
  COUNT(d.id) AS deals_in_this_location
FROM locations l
LEFT JOIN deals d ON l.id = d.location_id
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY l.id, l.name, l.is_primary
ORDER BY l.is_primary DESC, l.name;

-- 3. Where are Deepak's 120 deals located?
SELECT 
  '3. DEAL DISTRIBUTION' AS check_name,
  l.id AS location_id,
  l.name AS location_name,
  COUNT(d.id) AS deal_count
FROM deals d
JOIN locations l ON d.location_id = l.id
WHERE d.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY l.id, l.name
ORDER BY deal_count DESC;

-- 4. Does RLS function grant Deepak access to his deals' locations?
SELECT 
  '4. RLS ACCESS CHECK' AS check_name,
  l.id AS location_id,
  l.name AS location_name,
  COUNT(d.id) AS deals_here,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    l.id
  ) AS deepak_has_rls_access
FROM locations l
LEFT JOIN deals d ON l.id = d.location_id
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY l.id, l.name
ORDER BY deals_here DESC;

-- 5. Check Deepak's membership configuration
SELECT 
  '5. MEMBERSHIP CONFIG' AS check_name,
  utm.user_id,
  utm.tenant_id,
  utm.all_locations,
  utm.role,
  utm.status,
  COUNT(ml.location_id) AS explicit_location_count,
  STRING_AGG(l.name, ', ') AS explicit_locations
FROM user_tenant_memberships utm
LEFT JOIN membership_locations ml ON utm.id = ml.membership_id
LEFT JOIN locations l ON ml.location_id = l.id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
GROUP BY utm.user_id, utm.tenant_id, utm.all_locations, utm.role, utm.status;

-- 6. FINAL DIAGNOSIS
SELECT 
  '6. DIAGNOSIS' AS check_name,
  CASE 
    WHEN (SELECT all_locations FROM user_tenant_memberships 
          WHERE user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
            AND tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) = TRUE
    THEN '✅ User has all_locations = TRUE, should see ALL deals'
    
    WHEN (SELECT COUNT(*) FROM membership_locations ml
          JOIN user_tenant_memberships utm ON ml.membership_id = utm.id
          WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
            AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) > 0
    THEN '⚠️ User has explicit location access, should see SOME deals'
    
    ELSE '🚨 User has NO location access configured! This is the problem!'
  END AS verdict,
  
  (SELECT COUNT(*) FROM deals 
   WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) AS total_smile_deals,
   
  (SELECT COUNT(DISTINCT location_id) FROM deals 
   WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')) AS locations_with_deals;

