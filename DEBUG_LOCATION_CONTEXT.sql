-- =====================================================
-- DEBUG: LOCATION CONTEXT FOR DEEPAK
-- =====================================================

-- Simulate what the API endpoint sees
SELECT 
  'STEP 1: User Context' AS step,
  au.id AS user_id,
  au.active_tenant_id,
  au.active_location_id
FROM app_users au
WHERE au.email = 'deepakshegde@gmail.com';

-- Check what get_user_accessible_locations returns
SELECT 
  'STEP 2: Accessible Locations' AS step,
  l.*
FROM public.get_user_accessible_locations(
  'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID,
  'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
) l;

-- Check the logic
SELECT 
  'STEP 3: Multi-Location Check' AS step,
  COUNT(*) AS location_count,
  CASE WHEN COUNT(*) > 1 THEN TRUE ELSE FALSE END AS is_multi_location
FROM public.get_user_accessible_locations(
  'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID,
  'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
);

-- Check if active_location_id is set
SELECT 
  'STEP 4: Active Location Details' AS step,
  l.*
FROM locations l
WHERE l.id = (
  SELECT active_location_id 
  FROM app_users 
  WHERE email = 'deepakshegde@gmail.com'
);

