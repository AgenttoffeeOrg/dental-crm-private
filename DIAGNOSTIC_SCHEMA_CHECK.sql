-- =====================================================
-- PRE-MIGRATION SCHEMA DIAGNOSTIC QUERIES
-- =====================================================
-- Run these queries BEFORE attempting any migrations
-- =====================================================

-- =====================================================
-- 1. CHECK LOCATIONS TABLE COLUMNS
-- =====================================================

SELECT 
  column_name, 
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'locations' 
  AND column_name IN ('address', 'address_line1', 'phone', 'phone_number')
ORDER BY column_name;

-- Expected Results Interpretation:
-- ✅ Scenario A: Only 'address', 'phone' → Safe to rename
-- ✅ Scenario B: Only 'address_line1', 'phone_number' → Migrations already ran
-- ❌ Scenario C: Both sets → Database corruption, need cleanup
-- ⚠️  Scenario D: No results → Table missing or wrong schema

-- =====================================================
-- 2. CHECK FOR EXISTING LOCATION_ID COLUMNS
-- =====================================================

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name IN ('deals', 'tasks', 'activities', 'contacts')
  AND column_name = 'location_id'
ORDER BY table_name;

-- Expected Results:
-- If location_id exists in all 4 tables → Already migrated
-- If missing from any → Need to add

-- =====================================================
-- 3. CHECK FOR AUTO-TENANT TRIGGER
-- =====================================================

SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_auto_create_tenant_for_new_user';

-- Expected Results:
-- If exists → Safe to DROP
-- If missing → Already dropped or never created

-- =====================================================
-- 4. CHECK FOR EXISTING INDEXES
-- =====================================================

SELECT 
  table_name,
  index_name,
  index_columns
FROM (
  SELECT 
    schemaname,
    tablename AS table_name,
    indexname AS index_name,
    STRING_AGG(attname, ', ' ORDER BY attnum) AS index_columns
  FROM pg_indexes i
  JOIN pg_index idx ON idx.indexrelid = i.indexrelid
  JOIN pg_attribute attr ON attr.attrelid = idx.indexrelid AND attr.attnum = ANY(idx.indkey)
  WHERE schemaname = 'public'
    AND tablename IN ('deals', 'tasks', 'activities', 'contacts')
    AND indexname LIKE '%location%'
  GROUP BY schemaname, tablename, indexname
) sub
ORDER BY table_name, index_name;

-- Expected Results:
-- Should have indexes like: idx_deals_tenant_location, idx_tasks_tenant_location, etc.
-- If missing → Migration didn't complete properly

-- =====================================================
-- 5. CHECK EXISTING LOCATION DATA
-- =====================================================

-- Count locations with old vs new column names
SELECT 
  'Total Locations' AS metric,
  COUNT(*) AS count
FROM locations;

-- Check if any locations have data in old columns (if they exist)
DO $$
DECLARE
  has_address_col BOOLEAN;
  has_address_line1_col BOOLEAN;
  old_data_count INTEGER := 0;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'address'
  ) INTO has_address_col;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'locations' AND column_name = 'address_line1'
  ) INTO has_address_line1_col;
  
  -- If old column exists, count non-null data
  IF has_address_col THEN
    EXECUTE 'SELECT COUNT(*) FROM locations WHERE address IS NOT NULL AND address != '''''
    INTO old_data_count;
    
    RAISE NOTICE 'Old schema detected: % locations have data in "address" column', old_data_count;
  END IF;
  
  IF has_address_line1_col THEN
    EXECUTE 'SELECT COUNT(*) FROM locations WHERE address_line1 IS NOT NULL AND address_line1 != '''''
    INTO old_data_count;
    
    RAISE NOTICE 'New schema detected: % locations have data in "address_line1" column', old_data_count;
  END IF;
  
  -- Report finding
  IF has_address_col AND has_address_line1_col THEN
    RAISE WARNING '⚠️  DATABASE CORRUPTION: Both old and new columns exist!';
  ELSIF has_address_col THEN
    RAISE NOTICE '✅ Old schema active (safe to migrate)';
  ELSIF has_address_line1_col THEN
    RAISE NOTICE '✅ New schema already active (migrations ran)';
  ELSE
    RAISE WARNING '❌ Unknown schema state';
  END IF;
END $$;

-- =====================================================
-- 6. CHECK MIGRATION HISTORY
-- =====================================================

SELECT 
  id,
  name,
  execution_time_ms,
  applied_at,
  success
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%location%' OR name LIKE '%tenant%'
ORDER BY applied_at DESC
LIMIT 20;

-- If table doesn't exist, try:
SELECT 
  version,
  name,
  executed_at
FROM public.schema_migrations
WHERE name LIKE '%location%' OR name LIKE '%tenant%'
ORDER BY executed_at DESC
LIMIT 20;

-- Expected Results:
-- Shows which migrations have run
-- Helps determine current schema state

-- =====================================================
-- 7. SUMMARY REPORT
-- =====================================================

SELECT 
  'Schema Status Summary' AS report_section
UNION ALL
SELECT '======================================='
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'address')
      THEN '✅ Old schema: locations has "address" column'
    ELSE '❌ Old schema: locations missing "address" column'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'address_line1')
      THEN '✅ New schema: locations has "address_line1" column'
    ELSE '❌ New schema: locations missing "address_line1" column'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'phone')
      THEN '✅ Old schema: locations has "phone" column'
    ELSE '❌ Old schema: locations missing "phone" column'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'locations' AND column_name = 'phone_number')
      THEN '✅ New schema: locations has "phone_number" column'
    ELSE '❌ New schema: locations missing "phone_number" column'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'deals' AND column_name = 'location_id')
      THEN '✅ Deals table has location_id'
    ELSE '❌ Deals table missing location_id'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'location_id')
      THEN '✅ Tasks table has location_id'
    ELSE '❌ Tasks table missing location_id'
  END
UNION ALL
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activities' AND column_name = 'location_id')
      THEN '✅ Activities table has location_id'
    ELSE '❌ Activities table missing location_id'
  END
UNION ALL
SELECT '=======================================';

-- =====================================================
-- INTERPRETATION GUIDE
-- =====================================================

/*
RUN THIS DIAGNOSTIC FIRST, THEN:

If OLD schema (address/phone exist):
  ✅ Safe to run your migrations
  ⚠️  MUST update TypeScript code first
  ⚠️  See PRE_MIGRATION_IMPACT_ANALYSIS.md for files to update

If NEW schema (address_line1/phone_number exist):
  ❌ Your migrations are WRONG
  ✅ Schema already correct
  ⚠️  Check why migrations think they need to run

If BOTH schemas exist:
  💀 DATABASE CORRUPTION
  ❌ DO NOT run migrations
  🔧 Need cleanup script first

If NO schema detected:
  ❌ Critical error - locations table missing
  🔧 Need to check database setup
*/












