-- =====================================================
-- TEST 3: DEALS VISIBILITY (WHY AREN'T THEY SHOWING?)
-- =====================================================

SELECT 
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS deals_with_location,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS deals_without_location,
  CASE 
    WHEN COUNT(CASE WHEN location_id IS NULL THEN 1 END) > 0 
    THEN '🚨 Some deals have NULL location_id - RLS will block them!'
    WHEN COUNT(*) = 0 
    THEN '🚨 No deals found for this tenant!'
    ELSE '✅ All deals have location_id'
  END AS diagnosis
FROM deals
WHERE tenant_id = 'c128efd3-e2e8-4523-922f-22852b93d2d2'::UUID
  AND deleted_at IS NULL;  -- Only count active deals

