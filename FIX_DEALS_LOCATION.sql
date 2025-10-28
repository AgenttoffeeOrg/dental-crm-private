-- =====================================================
-- FIX: ASSIGN LOCATION TO DEALS WITHOUT LOCATION_ID
-- =====================================================
-- This script assigns the primary location to all deals 
-- that don't have a location_id in the Smile tenant

-- STEP 1: Check the current state (READ-ONLY)
SELECT 
  'BEFORE FIX' AS status,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS deals_without_location,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS deals_with_location
FROM deals
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- STEP 2: Show which location will be assigned
SELECT 
  'TARGET LOCATION' AS status,
  l.id AS location_id,
  l.name AS location_name,
  l.is_primary,
  t.name AS tenant_name
FROM locations l
JOIN tenants t ON l.tenant_id = t.id
WHERE t.name = 'Smile'
  AND l.is_primary = true;

-- STEP 3: Update deals without location_id (WRITE OPERATION)
-- ⚠️ IMPORTANT: Review the above results before running this!
-- Uncomment the lines below to actually apply the fix:

/*
UPDATE deals
SET location_id = (
  SELECT l.id 
  FROM locations l
  JOIN tenants t ON l.tenant_id = t.id
  WHERE t.name = 'Smile'
    AND l.is_primary = true
  LIMIT 1
)
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
  AND location_id IS NULL;
*/

-- STEP 4: Verify the fix (will show results after you uncomment Step 3)
SELECT 
  'AFTER FIX' AS status,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS deals_without_location,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS deals_with_location
FROM deals
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- STEP 5: Also fix contacts without location_id
/*
UPDATE contacts
SET location_id = (
  SELECT l.id 
  FROM locations l
  JOIN tenants t ON l.tenant_id = t.id
  WHERE t.name = 'Smile'
    AND l.is_primary = true
  LIMIT 1
)
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
  AND location_id IS NULL;
*/

-- STEP 6: Verify contacts are fixed
SELECT 
  'CONTACTS STATUS' AS status,
  COUNT(*) AS total_contacts,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS contacts_without_location,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS contacts_with_location
FROM contacts
WHERE tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- SUCCESS MESSAGE
DO $$ BEGIN
  RAISE NOTICE '✅ Script complete. Review results and uncomment UPDATE statements if needed.';
END $$;

