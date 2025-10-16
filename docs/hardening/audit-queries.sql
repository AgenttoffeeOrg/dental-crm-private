-- =====================================================
-- HARDENING AUDIT QUERIES
-- Run these in Supabase SQL Editor to verify current state
-- Date: October 16, 2025
-- =====================================================

-- =====================================================
-- 1. TENANT-SCOPED TABLES & RLS STATUS
-- =====================================================

SELECT 
  '=== TENANT-SCOPED TABLES & RLS STATUS ===' as section;

SELECT 
  t.tablename,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  ) as has_tenant_id,
  t.rowsecurity as rls_enabled,
  COUNT(p.policyname) as policy_count,
  STRING_AGG(p.cmd::text, ', ' ORDER BY p.cmd) as policy_types
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public' 
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
GROUP BY t.tablename, t.rowsecurity
HAVING EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  )
ORDER BY policy_count ASC, t.tablename;

-- =====================================================
-- 2. MISSING COLUMNS AUDIT
-- =====================================================

SELECT 
  '=== TABLES MISSING updated_at ===' as section;

SELECT t.tablename,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  ) as has_tenant_id
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'updated_at'
  )
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
ORDER BY has_tenant_id DESC, t.tablename;

SELECT 
  '=== TABLES MISSING deleted_at (SOFT DELETE) ===' as section;

SELECT t.tablename,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  ) as has_tenant_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'created_at'
  ) as has_created_at
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND c.table_name = t.tablename
      AND c.column_name = 'deleted_at'
  )
  AND t.tablename NOT LIKE 'pg_%'
  AND t.tablename NOT LIKE 'sql_%'
  AND t.tablename NOT IN ('audit_log', 'data_reconciliation_log', 'org_access_log', 'isolation_violations')
ORDER BY has_tenant_id DESC, t.tablename;

-- =====================================================
-- 3. FOREIGN KEY RELATIONSHIPS
-- =====================================================

SELECT 
  '=== FOREIGN KEY CONSTRAINTS (Same-Tenant Protection Needed) ===' as section;

SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  EXISTS (
    SELECT 1 FROM information_schema.columns c1
    WHERE c1.table_schema = 'public'
      AND c1.table_name = tc.table_name
      AND c1.column_name = 'tenant_id'
  ) as source_has_tenant_id,
  EXISTS (
    SELECT 1 FROM information_schema.columns c2
    WHERE c2.table_schema = 'public'
      AND c2.table_name = ccu.table_name
      AND c2.column_name = 'tenant_id'
  ) as target_has_tenant_id
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name NOT LIKE 'pg_%'
ORDER BY tc.table_name, kcu.column_name;

-- =====================================================
-- 4. CHECK CONSTRAINTS (Tenant Guards)
-- =====================================================

SELECT 
  '=== EXISTING CHECK CONSTRAINTS (Tenant Guards) ===' as section;

SELECT
  con.conname as constraint_name,
  rel.relname as table_name,
  pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE con.contype = 'c'
  AND nsp.nspname = 'public'
  AND pg_get_constraintdef(con.oid) LIKE '%tenant_id%'
ORDER BY rel.relname, con.conname;

-- =====================================================
-- 5. TRIGGERS
-- =====================================================

SELECT 
  '=== EXISTING TRIGGERS ===' as section;

SELECT 
  trigger_name,
  event_object_table as table_name,
  event_manipulation as event,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name NOT LIKE 'pg_%'
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 6. FUNCTIONS (Entitlement & Helper Functions)
-- =====================================================

SELECT 
  '=== SECURITY/HELPER FUNCTIONS ===' as section;

SELECT 
  p.proname as function_name,
  pg_get_function_arguments(p.oid) as arguments,
  CASE p.provolatile
    WHEN 'i' THEN 'IMMUTABLE'
    WHEN 's' THEN 'STABLE'
    WHEN 'v' THEN 'VOLATILE'
  END as volatility,
  CASE p.prosecdef
    WHEN true THEN 'SECURITY DEFINER'
    ELSE 'SECURITY INVOKER'
  END as security
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_entitlement',
    'current_tenant_id',
    'get_user_org_id',
    'get_user_tenant_id',
    'user_has_org_access',
    'get_user_role_in_org',
    'set_updated_at',
    'is_not_deleted'
  )
ORDER BY p.proname;

-- =====================================================
-- 7. ENTITLEMENT DATA
-- =====================================================

SELECT 
  '=== FEATURES & ENTITLEMENTS ===' as section;

-- Features
SELECT 
  code,
  name,
  category,
  (SELECT f2.code FROM features f2 WHERE f2.id = features.parent_feature_id) as parent_code,
  is_active
FROM features
ORDER BY category, name;

-- Tenant entitlements summary
SELECT 
  t.name as tenant_name,
  f.code as feature_code,
  te.is_enabled,
  te.quota_limit,
  te.quota_used,
  te.expires_at
FROM tenant_entitlements te
JOIN tenants t ON t.id = te.tenant_id
JOIN features f ON f.id = te.feature_id
ORDER BY t.name, f.code;

-- =====================================================
-- 8. DATA QUALITY CHECKS
-- =====================================================

SELECT 
  '=== DATA QUALITY: Email/Phone Normalization ===' as section;

-- Check if normalization columns exist
SELECT 
  table_name,
  column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'contacts'
  AND column_name IN ('primary_email_norm', 'primary_phone_e164');

-- Check for potential duplicate contacts (if normalization missing)
SELECT 
  'Potential duplicate emails' as check_type,
  COUNT(*) as duplicates
FROM (
  SELECT LOWER(TRIM(primary_email)) as norm_email, COUNT(*) as cnt
  FROM contacts
  WHERE primary_email IS NOT NULL
  GROUP BY LOWER(TRIM(primary_email))
  HAVING COUNT(*) > 1
) sub;

-- =====================================================
-- 9. WEBHOOK & IDEMPOTENCY
-- =====================================================

SELECT 
  '=== WEBHOOK IDEMPOTENCY CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'webhook_events'
    ) THEN 'webhook_events table EXISTS ✅'
    ELSE 'webhook_events table MISSING ❌'
  END as status;

-- =====================================================
-- 10. AUTOMATION DLQ
-- =====================================================

SELECT 
  '=== AUTOMATION DLQ CHECK ===' as section;

SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'automation_dlq'
    ) THEN 'automation_dlq table EXISTS ✅'
    ELSE 'automation_dlq table MISSING ❌'
  END as status;

-- Check automation execution logs schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'automation_execution_logs'
ORDER BY ordinal_position;

-- =====================================================
-- 11. STATISTICS
-- =====================================================

SELECT 
  '=== DATABASE STATISTICS ===' as section;

-- Table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
  pg_total_relation_size(schemaname||'.'||tablename) AS size_bytes
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename NOT LIKE 'pg_%'
ORDER BY size_bytes DESC
LIMIT 15;

-- Row counts for key tables
SELECT 
  'contacts' as table_name, 
  COUNT(*) as total_rows,
  COUNT(DISTINCT tenant_id) as tenant_count
FROM contacts
UNION ALL
SELECT 'deals', COUNT(*), COUNT(DISTINCT tenant_id) FROM deals
UNION ALL
SELECT 'tasks', COUNT(*), COUNT(DISTINCT tenant_id) FROM tasks
UNION ALL
SELECT 'pipelines', COUNT(*), COUNT(DISTINCT tenant_id) FROM pipelines
UNION ALL
SELECT 'automations', COUNT(*), COUNT(DISTINCT tenant_id) FROM automations;

-- =====================================================
-- 12. RLS POLICY SUMMARY
-- =====================================================

SELECT 
  '=== RLS POLICY COVERAGE SUMMARY ===' as section;

SELECT
  tablename,
  COUNT(*) as total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as select_policies,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as insert_policies,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as update_policies,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as delete_policies,
  STRING_AGG(DISTINCT cmd::text, ', ' ORDER BY cmd::text) as covered_operations
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY total_policies DESC, tablename;

-- Tables with tenant_id but NO RLS
SELECT 
  '=== SECURITY GAP: Tables with tenant_id but NO RLS ===' as section;

SELECT t.tablename
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND EXISTS (
    SELECT 1 FROM information_schema.columns c 
    WHERE c.table_schema = 'public' 
      AND c.table_name = t.tablename 
      AND c.column_name = 'tenant_id'
  )
  AND t.rowsecurity = false
  AND t.tablename NOT LIKE 'pg_%'
ORDER BY t.tablename;

-- =====================================================
-- END OF AUDIT QUERIES
-- =====================================================

SELECT 
  '=== AUDIT COMPLETE ===' as section,
  NOW() as completed_at;

