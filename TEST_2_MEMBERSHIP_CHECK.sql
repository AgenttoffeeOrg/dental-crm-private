-- =====================================================
-- TEST 2: YOUR MEMBERSHIP CONFIGURATION
-- =====================================================

SELECT 
  utm.user_id,
  utm.tenant_id,
  utm.role,
  utm.status,
  utm.all_locations,
  CASE 
    WHEN utm.all_locations = TRUE AND utm.status = 'active' AND utm.role = 'owner' 
    THEN '✅ PERFECT - Should have full access'
    WHEN utm.all_locations = TRUE AND utm.status = 'active'
    THEN '✅ GOOD - Should have all location access'
    WHEN utm.all_locations = FALSE 
    THEN '🚨 PROBLEM - all_locations is FALSE'
    WHEN utm.status != 'active'
    THEN '🚨 PROBLEM - status is not active'
    ELSE '⚠️ UNKNOWN STATE'
  END AS diagnosis
FROM user_tenant_memberships utm
WHERE utm.user_id = 'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID
  AND utm.tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID;

