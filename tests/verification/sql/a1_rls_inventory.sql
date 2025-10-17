-- ================================================================
-- A1: RLS COVERAGE INVENTORY
-- ================================================================
-- Purpose: Scan all public.* tables and their RLS policies
-- Expected: All tenant-scoped tables have SELECT/INSERT/UPDATE policies
--           DELETE should be restricted to service_role or admins
-- ================================================================

-- Part 1: List all tables with their RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Part 2: List all RLS policies with details
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
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Part 3: Tables WITH RLS enabled and policy count
SELECT 
  t.tablename,
  t.rowsecurity AS rls_enabled,
  COUNT(p.policyname) AS policy_count,
  ARRAY_AGG(DISTINCT p.cmd ORDER BY p.cmd) AS commands_covered
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public' AND t.rowsecurity = true
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;

-- Part 4: Tables WITHOUT RLS (potential security gap)
SELECT 
  tablename,
  'NO RLS' AS status,
  'SECURITY_GAP' AS severity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
  AND tablename NOT IN (
    -- Exempt tables (configuration, lookups, etc.)
    'schema_migrations',
    'features',
    'tenants'  -- Has special RLS handling
  )
ORDER BY tablename;

-- Part 5: Tenant-scoped tables that SHOULD have RLS
-- (Any table with tenant_id column)
SELECT 
  c.table_name,
  CASE 
    WHEN t.rowsecurity = true THEN '✅ RLS Enabled'
    ELSE '❌ RLS Missing'
  END AS rls_status,
  COUNT(p.policyname) AS policy_count
FROM information_schema.columns c
LEFT JOIN pg_tables t ON t.schemaname = 'public' AND t.tablename = c.table_name
LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = c.table_name
WHERE c.table_schema = 'public'
  AND c.column_name = 'tenant_id'
GROUP BY c.table_name, t.rowsecurity
ORDER BY rls_status DESC, c.table_name;

-- Part 6: Check for service_role bypass policies
SELECT 
  tablename,
  policyname,
  'service_role' = ANY(roles::text[]) AS has_service_role_bypass
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%service%'
ORDER BY tablename;

-- Part 7: Tables with deleted_at column (soft delete support)
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public' 
        AND p.tablename = c.table_name
        AND p.qual::text LIKE '%deleted_at%'
    ) THEN '✅ RLS uses soft delete'
    ELSE '⚠️ Soft delete column exists but not in RLS'
  END AS soft_delete_rls_status
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.column_name = 'deleted_at'
GROUP BY c.table_name
ORDER BY c.table_name;

-- Part 8: Summary Statistics
SELECT 
  'Total public tables' AS metric,
  COUNT(*) AS count
FROM pg_tables
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tables with RLS enabled',
  COUNT(*)
FROM pg_tables
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
  'Tables with tenant_id column',
  COUNT(DISTINCT table_name)
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'tenant_id'

UNION ALL

SELECT 
  'Total RLS policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT 
  'Tables with deleted_at column',
  COUNT(DISTINCT table_name)
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name = 'deleted_at';

-- ================================================================
-- EXPECTED RESULTS:
-- - All tenant-scoped tables (with tenant_id) should have RLS=true
-- - Each tenant table should have at least 4 policies (SELECT, INSERT, UPDATE, DELETE)
-- - SELECT policies should include soft delete filter: is_not_deleted(deleted_at)
-- - DELETE policies should be restricted (service_role or admin roles only)
-- - Service role should have bypass policies for operational access
-- ================================================================

