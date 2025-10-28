-- =====================================================
-- TEST RLS FUNCTION WITH CORRECT EMAIL
-- =====================================================

-- 1. Test the RLS function directly
SELECT 
  '1. RLS FUNCTION TEST' AS test,
  l.name AS location_name,
  public.user_has_location_access_rls(
    'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID,  -- Your user ID
    'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID,  -- Smile tenant ID
    l.id
  ) AS has_access
FROM locations l
WHERE l.tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
ORDER BY l.name;

-- 2. Verify your membership data
SELECT 
  '2. YOUR MEMBERSHIP' AS test,
  utm.role,
  utm.status,
  utm.all_locations,
  CASE 
    WHEN utm.all_locations = TRUE THEN '✅ all_locations IS TRUE'
    ELSE '🚨 all_locations IS FALSE'
  END AS diagnosis
FROM user_tenant_memberships utm
WHERE utm.user_id = 'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID
  AND utm.tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID;

-- 3. Check if deals would be visible with current RLS
SELECT 
  '3. DEALS VISIBILITY TEST' AS test,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS deals_with_location,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS deals_without_location
FROM deals
WHERE tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID;

-- 4. Show the RLS function code
SELECT 
  '4. RLS FUNCTION CODE' AS test,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'user_has_location_access_rls';

