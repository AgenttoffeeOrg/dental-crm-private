-- =====================================================
-- TEST 1: RLS FUNCTION ACCESS TO EACH LOCATION
-- =====================================================

SELECT 
  l.name AS location_name,
  l.id AS location_id,
  public.user_has_location_access_rls(
    'a0901598-6cc5-49bc-9234-db90b9af3444'::UUID,  -- Your user ID
    'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID,  -- Smile tenant ID
    l.id
  ) AS has_access
FROM locations l
WHERE l.tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
ORDER BY l.name;

