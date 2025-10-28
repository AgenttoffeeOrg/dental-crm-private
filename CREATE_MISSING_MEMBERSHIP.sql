-- =====================================================
-- EMERGENCY FIX: Create missing membership for Deepak in Smile
-- =====================================================

-- First, let's verify the problem
SELECT 
  '1. VERIFY PROBLEM' AS step,
  (SELECT COUNT(*) FROM user_tenant_memberships utm
   JOIN app_users au ON utm.user_id = au.id
   JOIN tenants t ON utm.tenant_id = t.id
   WHERE au.email = 'deepak.s.hegde@gmail.com'
     AND t.name = 'Smile') AS existing_memberships,
  CASE 
    WHEN (SELECT COUNT(*) FROM user_tenant_memberships utm
          JOIN app_users au ON utm.user_id = au.id
          JOIN tenants t ON utm.tenant_id = t.id
          WHERE au.email = 'deepak.s.hegde@gmail.com'
            AND t.name = 'Smile') = 0 
    THEN '🚨 NO MEMBERSHIP EXISTS - We need to create it!'
    ELSE '✅ Membership exists'
  END AS diagnosis;

-- =====================================================
-- CREATE THE MISSING MEMBERSHIP
-- =====================================================

INSERT INTO user_tenant_memberships (
  user_id,
  tenant_id,
  role,
  status,
  all_locations,
  created_at,
  updated_at
)
SELECT 
  au.id AS user_id,
  t.id AS tenant_id,
  'owner' AS role,
  'active' AS status,
  TRUE AS all_locations,
  NOW() AS created_at,
  NOW() AS updated_at
FROM app_users au
CROSS JOIN tenants t
WHERE au.email = 'deepak.s.hegde@gmail.com'
  AND t.name = 'Smile'
  AND NOT EXISTS (
    SELECT 1 FROM user_tenant_memberships utm
    WHERE utm.user_id = au.id AND utm.tenant_id = t.id
  )
ON CONFLICT (user_id, tenant_id) DO UPDATE
SET 
  all_locations = TRUE,
  role = 'owner',
  status = 'active',
  updated_at = NOW();

-- =====================================================
-- VERIFY THE FIX
-- =====================================================

SELECT 
  '2. VERIFY FIX' AS step,
  utm.role,
  utm.status,
  utm.all_locations,
  CASE 
    WHEN utm.all_locations = TRUE THEN '✅ all_locations IS NOW TRUE!'
    ELSE '🚨 Still has a problem'
  END AS result
FROM user_tenant_memberships utm
JOIN app_users au ON utm.user_id = au.id
JOIN tenants t ON utm.tenant_id = t.id
WHERE au.email = 'deepak.s.hegde@gmail.com'
  AND t.name = 'Smile';

-- =====================================================
-- TEST RLS FUNCTION
-- =====================================================

SELECT 
  '3. TEST RLS ACCESS' AS step,
  l.name AS location_name,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    l.id
  ) AS has_access
FROM locations l
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
ORDER BY l.name;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

SELECT 
  '4. FINAL SUMMARY' AS step,
  CASE 
    WHEN (SELECT all_locations FROM user_tenant_memberships utm
          JOIN app_users au ON utm.user_id = au.id
          JOIN tenants t ON utm.tenant_id = t.id
          WHERE au.email = 'deepak.s.hegde@gmail.com'
            AND t.name = 'Smile') = TRUE
    THEN '🎉 SUCCESS! Deepak now has owner access with all_locations = TRUE'
    ELSE '🚨 Something is still wrong'
  END AS final_result;

DO $$ BEGIN RAISE NOTICE '✅ Membership created/updated! Refresh your browser to see your 120 deals!'; END $$;

