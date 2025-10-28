-- =====================================================
-- DEEP DIVE: Check ACTUAL RLS Policy Definitions
-- =====================================================

-- 1. Get the ACTUAL policy expressions (not the parsed view)
SELECT 
  'STEP 1: Deals RLS Policies (RAW)' AS step,
  pol.polname AS policy_name,
  pol.polcmd AS command,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'deals'
ORDER BY pol.polname;

-- 2. Check the function definition one more time
SELECT 
  'STEP 2: get_accessible_tenants Function' AS step,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname = 'get_accessible_tenants';

-- 3. Check if there are any OTHER helper functions that might be outdated
SELECT 
  'STEP 3: All Tenant Helper Functions' AS step,
  proname AS function_name,
  pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE proname LIKE '%tenant%'
  AND proname NOT LIKE 'pg_%'
ORDER BY proname;

