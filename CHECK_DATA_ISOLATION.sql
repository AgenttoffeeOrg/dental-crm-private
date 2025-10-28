-- =====================================================
-- CHECK DATA ISOLATION: Are all records tagged with tenant_id AND location_id?
-- =====================================================
-- This query will show which tables have data and whether they have proper isolation

-- 1. DEALS - Check tenant_id and location_id coverage
SELECT 
  '1. DEALS' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(location_id) AS has_location_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  COUNT(*) - COUNT(location_id) AS missing_location_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) = COUNT(location_id) THEN '✅ FULLY ISOLATED'
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) > COUNT(location_id) THEN '⚠️ MISSING LOCATION_ID'
    WHEN COUNT(*) > COUNT(tenant_id) THEN '🚨 MISSING TENANT_ID'
    ELSE '❓ UNKNOWN'
  END AS status
FROM deals;

-- 2. CONTACTS - Check tenant_id and location_id coverage
SELECT 
  '2. CONTACTS' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(location_id) AS has_location_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  COUNT(*) - COUNT(location_id) AS missing_location_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) = COUNT(location_id) THEN '✅ FULLY ISOLATED'
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) > COUNT(location_id) THEN '⚠️ MISSING LOCATION_ID'
    WHEN COUNT(*) > COUNT(tenant_id) THEN '🚨 MISSING TENANT_ID'
    ELSE '❓ UNKNOWN'
  END AS status
FROM contacts;

-- 3. PIPELINES - Check tenant_id coverage (might not need location_id)
SELECT 
  '3. PIPELINES' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ TENANT ISOLATED'
    ELSE '🚨 MISSING TENANT_ID'
  END AS status
FROM pipelines;

-- 4. PIPELINE_STAGES - Check tenant_id coverage
SELECT 
  '4. PIPELINE_STAGES' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) THEN '✅ TENANT ISOLATED'
    ELSE '🚨 MISSING TENANT_ID'
  END AS status
FROM pipeline_stages;

-- 5. TASKS - Check tenant_id and location_id coverage
SELECT 
  '5. TASKS' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(location_id) AS has_location_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  COUNT(*) - COUNT(location_id) AS missing_location_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) = COUNT(location_id) THEN '✅ FULLY ISOLATED'
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) > COUNT(location_id) THEN '⚠️ MISSING LOCATION_ID'
    WHEN COUNT(*) > COUNT(tenant_id) THEN '🚨 MISSING TENANT_ID'
    ELSE '❓ UNKNOWN'
  END AS status
FROM tasks;

-- 6. ACTIVITIES - Check tenant_id and location_id coverage
SELECT 
  '6. ACTIVITIES' AS table_name,
  COUNT(*) AS total_records,
  COUNT(tenant_id) AS has_tenant_id,
  COUNT(location_id) AS has_location_id,
  COUNT(*) - COUNT(tenant_id) AS missing_tenant_id,
  COUNT(*) - COUNT(location_id) AS missing_location_id,
  CASE 
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) = COUNT(location_id) THEN '✅ FULLY ISOLATED'
    WHEN COUNT(*) = COUNT(tenant_id) AND COUNT(*) > COUNT(location_id) THEN '⚠️ MISSING LOCATION_ID'
    WHEN COUNT(*) > COUNT(tenant_id) THEN '🚨 MISSING TENANT_ID'
    ELSE '❓ UNKNOWN'
  END AS status
FROM activities;

-- 7. SMILE TENANT SPECIFIC CHECK - Your data
SELECT 
  '7. SMILE TENANT - DEALS' AS check_name,
  COUNT(*) AS total_deals,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS deals_without_location,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS deals_with_location,
  STRING_AGG(DISTINCT l.name, ', ') AS locations_used
FROM deals d
LEFT JOIN locations l ON d.location_id = l.id
WHERE d.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 8. SMILE TENANT SPECIFIC CHECK - Contacts
SELECT 
  '8. SMILE TENANT - CONTACTS' AS check_name,
  COUNT(*) AS total_contacts,
  COUNT(CASE WHEN location_id IS NULL THEN 1 END) AS contacts_without_location,
  COUNT(CASE WHEN location_id IS NOT NULL THEN 1 END) AS contacts_with_location,
  STRING_AGG(DISTINCT l.name, ', ') AS locations_used
FROM contacts c
LEFT JOIN locations l ON c.location_id = l.id
WHERE c.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 9. FINAL SUMMARY
SELECT 
  '9. ISOLATION SUMMARY' AS summary,
  (SELECT COUNT(*) FROM deals WHERE location_id IS NULL) AS deals_missing_location,
  (SELECT COUNT(*) FROM contacts WHERE location_id IS NULL) AS contacts_missing_location,
  (SELECT COUNT(*) FROM tasks WHERE location_id IS NULL) AS tasks_missing_location,
  CASE 
    WHEN (SELECT COUNT(*) FROM deals WHERE location_id IS NULL) = 0 
     AND (SELECT COUNT(*) FROM contacts WHERE location_id IS NULL) = 0 
    THEN '✅ ALL DATA IS PROPERLY ISOLATED'
    ELSE '🚨 SOME DATA IS MISSING LOCATION_ID - RLS WILL BLOCK ACCESS'
  END AS final_verdict;

