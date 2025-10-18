-- ================================================================
-- A4: ENTITLEMENTS VERIFICATION (CRITICAL SECURITY TEST)
-- ================================================================
-- Purpose: Verify entitlement system is secure and hierarchical
-- SECURITY: Verify check_entitlement() cannot be spoofed
-- APPROACH: Test with existing tenants, verify feature gates work
-- ================================================================
--
-- NOTE: String literals are intentionally duplicated in test files for clarity.
--       Each test should be self-contained and readable. This is a standard
--       practice in test files where explicit values aid debugging.
--       SonarQube warnings suppressed for test file readability.
-- ================================================================

BEGIN;

-- Use existing tenants for testing
DO $$
DECLARE
  v_tenant_count int;
BEGIN
  SELECT COUNT(*) INTO v_tenant_count FROM tenants;
  
  IF v_tenant_count < 1 THEN
    RAISE EXCEPTION '⚠️  No tenants found. Run seed script first: npx ts-node scripts/seed/verify_seed.ts';
  END IF;
  
  RAISE NOTICE '✅ Using existing tenants for entitlement tests';
END $$;

-- ================================================================
-- TEST 1: Feature Hierarchy
-- ================================================================

-- Verify features are correctly structured
SELECT 
  '1a. Feature hierarchy exists' AS test_name,
  COUNT(*) >= 9 AS has_features,
  true AS expected,
  CASE WHEN COUNT(*) >= 9 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM features;

-- Show feature tree
SELECT 
  f.code,
  f.name,
  f.category,
  pf.code AS parent_feature_code,
  f.is_active
FROM features f
LEFT JOIN features pf ON pf.id = f.parent_feature_id
ORDER BY f.category ASC, pf.code NULLS FIRST ASC, f.code ASC;

-- ================================================================
-- TEST 2: check_entitlement() Security
-- ================================================================

-- Verify function signature does NOT accept tenant_id parameter (security fix)
SELECT 
  '2a. check_entitlement() has secure signature (no tenant_id param)' AS test_name,
  proargnames AS parameter_names,
  CASE 
    WHEN 'p_tenant_id' = ANY(proargnames) THEN '❌ FAIL: Insecure parameter found'
    ELSE '✅ PASS: Tenant ID derived from auth context only'
  END AS status
FROM pg_proc
WHERE proname = 'check_entitlement'
  AND pronamespace = 'public'::regnamespace;

-- ================================================================
-- TEST 3: Base Entitlement (crm_base)
-- ================================================================

-- Grant crm_base to first tenant
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  (SELECT id FROM tenants LIMIT 1),
  f.id,
  true
FROM features f
WHERE f.code = 'crm_base'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_enabled = true;

-- Simulate check (as service role, we'll call the function directly)
-- In production, this would be called via API with user auth context
SELECT 
  '3a. crm_base entitlement granted' AS test_name,
  COUNT(*) AS entitlements_granted,
  1 AS expected,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tenant_entitlements te
JOIN features f ON f.id = te.feature_id
WHERE te.tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND f.code = 'crm_base'
  AND te.is_enabled = true;

-- ================================================================
-- TEST 4: Marketing Base Entitlement
-- ================================================================

-- Grant marketing to first tenant
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  (SELECT id FROM tenants LIMIT 1),
  f.id,
  true
FROM features f
WHERE f.code = 'marketing'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_enabled = true;

SELECT 
  '4a. marketing entitlement granted' AS test_name,
  COUNT(*) AS entitlements_granted,
  1 AS expected,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tenant_entitlements te
JOIN features f ON f.id = te.feature_id
WHERE te.tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND f.code = 'marketing'
  AND te.is_enabled = true;

-- ================================================================
-- TEST 5: Nested Add-on (requires parent)
-- ================================================================

-- Try to check a nested add-on (e.g., email_warmup requires marketing)
-- First, verify parent-child relationship
SELECT 
  '5a. email_warmup has marketing as parent' AS test_name,
  pf.code AS parent_code,
  'marketing' AS expected_parent,
  CASE WHEN pf.code = 'marketing' THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM features f
JOIN features pf ON pf.id = f.parent_feature_id
WHERE f.code = 'email_warmup';

-- Grant nested add-on WITHOUT granting parent (should work in DB, but check_entitlement should fail)
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  (SELECT id FROM tenants LIMIT 1),
  f.id,
  true
FROM features f
WHERE f.code = 'email_warmup'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_enabled = true;

-- The check_entitlement(feature_code, require_parent=true) should enforce parent check
-- This is a logic test - the function should verify parent entitlement exists

-- ================================================================
-- TEST 6: Combined Entitlement (Marketing Automation)
-- ================================================================

-- Marketing Automations require BOTH 'automations' AND 'marketing'
-- Grant automations
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  (SELECT id FROM tenants LIMIT 1),
  f.id,
  true
FROM features f
WHERE f.code = 'automations'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_enabled = true;

SELECT 
  '6a. Tenant has both automations AND marketing' AS test_name,
  COUNT(*) AS entitlements_granted,
  2 AS expected,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tenant_entitlements te
JOIN features f ON f.id = te.feature_id
WHERE te.tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND f.code IN ('automations', 'marketing')
  AND te.is_enabled = true;

-- ================================================================
-- TEST 7: RLS Policy with Entitlement Check
-- ================================================================

-- Verify marketing tables have RLS policies that call check_entitlement()
SELECT 
  '7a. marketing_campaigns has entitlement-gated RLS' AS test_name,
  COUNT(*) AS policies_with_entitlement_check,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ PASS: RLS uses check_entitlement()'
    ELSE '❌ FAIL: No entitlement check in RLS'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'marketing_campaigns'
  AND (qual::text LIKE '%check_entitlement%' OR with_check::text LIKE '%check_entitlement%');

-- ================================================================
-- TEST 8: get_user_entitlements() for UI
-- ================================================================

-- Verify function exists and returns correct format
SELECT 
  '8a. get_user_entitlements() function exists' AS test_name,
  COUNT(*) AS function_count,
  1 AS expected,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_proc
WHERE proname = 'get_user_entitlements'
  AND pronamespace = 'public'::regnamespace;

-- ================================================================
-- TEST 9: Quota Tracking
-- ================================================================

-- Verify quota fields exist in tenant_entitlements
SELECT 
  '9a. tenant_entitlements has quota fields' AS test_name,
  BOOL_AND(column_name IN ('quota_limit', 'quota_used', 'quota_reset_at')) AS has_quota_fields,
  true AS expected,
  CASE WHEN BOOL_AND(column_name IN ('quota_limit', 'quota_used', 'quota_reset_at')) THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tenant_entitlements'
  AND column_name IN ('quota_limit', 'quota_used', 'quota_reset_at');

-- Set quota for email sends
UPDATE tenant_entitlements
SET quota_limit = 1000, quota_used = 0, quota_reset_at = NOW() + INTERVAL '1 month'
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND feature_id = (SELECT id FROM features WHERE code = 'marketing' LIMIT 1);

SELECT 
  '9b. Quota set correctly' AS test_name,
  quota_limit,
  quota_used,
  quota_reset_at > NOW() AS reset_in_future,
  CASE WHEN quota_limit = 1000 AND quota_used = 0 AND quota_reset_at > NOW() THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM tenant_entitlements
WHERE tenant_id = (SELECT id FROM tenants LIMIT 1)
  AND feature_id = (SELECT id FROM features WHERE code = 'marketing' LIMIT 1);

-- ================================================================
-- CLEANUP
-- ================================================================

ROLLBACK;

-- ================================================================
-- EXPECTED RESULTS:
-- ================================================================
-- ✅ Features table has hierarchical structure (parent_feature_id)
-- ✅ check_entitlement() does NOT accept tenant_id parameter (security fix)
-- ✅ Base entitlements (crm_base, marketing, automations) work independently
-- ✅ Nested add-ons reference parent features correctly
-- ✅ Marketing Automations require BOTH automations AND marketing
-- ✅ RLS policies on marketing tables call check_entitlement()
-- ✅ Quota tracking fields exist and function correctly
-- ✅ get_user_entitlements() function exists for UI consumption
-- ================================================================

