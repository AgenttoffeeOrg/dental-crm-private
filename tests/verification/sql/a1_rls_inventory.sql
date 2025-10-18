-- ================================================================
-- A1: RLS COVERAGE INVENTORY
-- ================================================================
-- Purpose: Scan all public.* tables and their RLS policies
-- Expected: All tenant-scoped tables have SELECT/INSERT/UPDATE policies
--           DELETE should be restricted to service_role or admins
-- ================================================================

-- Part 1: List all tables with their RLS status
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
CROSS JOIN target_schema
WHERE schemaname = target_schema.schema_name
ORDER BY tablename;

-- Part 2: List all RLS policies with details
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
CROSS JOIN target_schema
WHERE schemaname = target_schema.schema_name
ORDER BY tablename, policyname;

-- Part 3: Tables WITH RLS enabled and policy count
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) AS commands_covered
FROM pg_tables t
CROSS JOIN target_schema
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = target_schema.schema_name AND t.rowsecurity = true
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Part 4: Tables WITHOUT RLS (potential security gap)
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
),
exempt_tables AS (
  SELECT unnest(ARRAY[
    'schema_migrations',
    'features',
    'tenants'  -- Has special RLS handling
  ]) AS table_name
)
SELECT 
  tablename,
  'NO RLS' AS status,
  'SECURITY_GAP' AS severity
FROM pg_tables
CROSS JOIN target_schema
WHERE schemaname = target_schema.schema_name
  AND rowsecurity = false
  AND tablename NOT IN (SELECT table_name FROM exempt_tables)
ORDER BY tablename;

-- Part 5: Tenant-scoped tables that SHOULD have RLS
-- (Any table with tenant_id column)
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  c.table_name,
  CASE 
    WHEN t.rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Missing'
  END AS rls_status,
  COUNT(p.policyname) AS policy_count
FROM information_schema.columns c
CROSS JOIN target_schema
LEFT JOIN pg_tables t ON t.schemaname = target_schema.schema_name AND t.tablename = c.table_name
LEFT JOIN pg_policies p ON p.schemaname = target_schema.schema_name AND p.tablename = c.table_name
WHERE c.table_schema = target_schema.schema_name
  AND c.column_name = 'tenant_id'
GROUP BY c.table_name, t.rowsecurity
ORDER BY rls_status DESC, c.table_name;

-- Part 6: Check for service_role bypass policies
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  tablename,
  policyname,
  'service_role' = ANY(roles::text[]) AS has_service_role_bypass
FROM pg_policies
CROSS JOIN target_schema
WHERE schemaname = target_schema.schema_name
  AND policyname LIKE '%service%'
ORDER BY tablename;

-- Part 7: Tables with deleted_at column (soft delete support)
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      CROSS JOIN target_schema ts
      WHERE p.schemaname = ts.schema_name
        AND p.tablename = c.table_name
        AND p.qual::text LIKE '%deleted_at%'
    ) THEN '✅ RLS uses soft delete'
    ELSE '⚠️ Soft delete column exists but not in RLS'
  END AS soft_delete_rls_status
FROM information_schema.columns c
CROSS JOIN target_schema
WHERE c.table_schema = target_schema.schema_name
  AND c.column_name = 'deleted_at'
GROUP BY c.table_name
ORDER BY c.table_name;

-- Part 8: Summary Statistics
WITH target_schema AS (
  SELECT 'public'::name AS schema_name
)
SELECT 
  'Total public tables' AS metric,
  COUNT(*) AS count
FROM pg_tables
CROSS JOIN target_schema
WHERE schemaname = target_schema.schema_name

UNION ALL

SELECT 
  'Tables with RLS enabled',
  COUNT(*)
FROM pg_tables
CROSS JOIN (SELECT 'public'::name AS schema_name) AS target_schema
WHERE schemaname = target_schema.schema_name AND rowsecurity = true

UNION ALL

SELECT 
  'Tables with tenant_id column',
  COUNT(DISTINCT table_name)
FROM information_schema.columns
CROSS JOIN (SELECT 'public'::name AS schema_name) AS target_schema
WHERE table_schema = target_schema.schema_name AND column_name = 'tenant_id'

UNION ALL

SELECT 
  'Total RLS policies',
  COUNT(*)
FROM pg_policies
CROSS JOIN (SELECT 'public'::name AS schema_name) AS target_schema
WHERE schemaname = target_schema.schema_name

UNION ALL

SELECT 
  'Tables with deleted_at column',
  COUNT(DISTINCT table_name)
FROM information_schema.columns
CROSS JOIN (SELECT 'public'::name AS schema_name) AS target_schema
WHERE table_schema = target_schema.schema_name AND column_name = 'deleted_at';

-- ================================================================
-- EXPECTED RESULTS:
-- - All tenant-scoped tables (with tenant_id) should have RLS=true
-- - Each tenant table should have at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - SELECT policies should include soft delete filter: is_not_deleted(deleted_at)
-- - DELETE policies should be restricted (service_role or admin roles only)
-- - Service role should have bypass policies for operational access
-- ================================================================
