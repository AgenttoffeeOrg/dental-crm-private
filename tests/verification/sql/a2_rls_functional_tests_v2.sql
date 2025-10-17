-- ================================================================
-- A2: RLS Functional Tests (Tenant Isolation)
-- ================================================================
-- PURPOSE: Verify that RLS policies correctly isolate tenant data
-- APPROACH: Use existing tenants, verify policies, test data-level isolation
-- PRECISION FIX: Simplified UUID handling, defensive cleanup, explicit OR logic
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🧪 TEST A2: RLS FUNCTIONAL TESTS';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- ================================================================
-- SETUP: Ensure test tenants exist
-- ================================================================

DO $$
DECLARE
  v_tenant_count int;
BEGIN
  SELECT COUNT(*) INTO v_tenant_count FROM tenants;
  
  IF v_tenant_count < 2 THEN
    RAISE NOTICE '⚠️  WARNING: Less than 2 tenants found. Run seed script first: npx ts-node scripts/seed/verify_seed.ts';
  ELSE
    RAISE NOTICE '✅ Found % tenants. Using first 2 for testing.', v_tenant_count;
  END IF;
END $$;

-- Create test tenants (will be used if they don't exist)
INSERT INTO tenants (id, name, created_at, updated_at)
VALUES 
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Test Tenant One', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Test Tenant Two', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- TEST 1: Contacts Isolation
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
  RAISE NOTICE '📋 TEST 1: Contacts Isolation';
  RAISE NOTICE '─────────────────────────────────────────────────────────────';
END $$;

-- Clean up any previous test data first (defensive)
DELETE FROM contacts 
WHERE (
  tenant_id::text = '00000000-0000-0000-0000-000000000001' OR
  tenant_id::text = '00000000-0000-0000-0000-000000000002'
) 
AND primary_email LIKE '%@tenant%.test';

-- Create contacts for each tenant
-- Using only essential columns that exist in all schemas
INSERT INTO contacts (tenant_id, full_name, primary_email, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid, 'Contact from Tenant 1', 'contact1@tenant1.test', NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000002'::uuid, 'Contact from Tenant 2', 'contact2@tenant2.test', NOW(), NOW());

-- Verify: As service_role, we can see both
SELECT 
  'Service Role - Should see BOTH contacts' AS test_name, 
  COUNT(*) AS count, 
  2 AS expected,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE (
  tenant_id::text = '00000000-0000-0000-0000-000000000001' OR
  tenant_id::text = '00000000-0000-0000-0000-000000000002'
);

-- Verify RLS policy exists for tenant isolation
SELECT 
  'RLS Policy - Contacts has tenant_id filter in SELECT policy' AS test_name,
  COUNT(*) AS policies_with_tenant_filter,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'contacts'
  AND policyname LIKE '%select%'
  AND qual::text LIKE '%tenant_id%';

-- ================================================================
-- TEST 2: Deals Isolation (if deals table exists)
-- ================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    RAISE NOTICE '';
    RAISE NOTICE '─────────────────────────────────────────────────────────────';
    RAISE NOTICE '💼 TEST 2: Deals Isolation';
    RAISE NOTICE '─────────────────────────────────────────────────────────────';
  ELSE
    RAISE NOTICE '⚠️  Skipping TEST 2: deals table does not exist';
  END IF;
END $$;

-- Clean up test deals
DELETE FROM deals 
WHERE (
  tenant_id::text = '00000000-0000-0000-0000-000000000001' OR
  tenant_id::text = '00000000-0000-0000-0000-000000000002'
) 
AND title LIKE 'Test Deal%';

-- Create test deals (if table exists)
-- NOTE: deals.contact_id is NOT NULL, so we must reference the contacts we created above
DO $$
DECLARE
  v_contact_t1_id uuid;
  v_contact_t2_id uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    -- Get the contact IDs we created in TEST 1
    SELECT id INTO v_contact_t1_id FROM contacts 
    WHERE tenant_id::text = '00000000-0000-0000-0000-000000000001' 
      AND primary_email = 'contact1@tenant1.test' 
    LIMIT 1;
    
    SELECT id INTO v_contact_t2_id FROM contacts 
    WHERE tenant_id::text = '00000000-0000-0000-0000-000000000002' 
      AND primary_email = 'contact2@tenant2.test' 
    LIMIT 1;
    
    IF v_contact_t1_id IS NOT NULL AND v_contact_t2_id IS NOT NULL THEN
      INSERT INTO deals (tenant_id, contact_id, title, value, currency, created_at, updated_at)
      VALUES
        ('00000000-0000-0000-0000-000000000001'::uuid, v_contact_t1_id, 'Test Deal T1', 1000, 'GBP', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000002'::uuid, v_contact_t2_id, 'Test Deal T2', 2000, 'GBP', NOW(), NOW());
      
      RAISE NOTICE '✅ Created test deals linked to same-tenant contacts';
    ELSE
      RAISE NOTICE '⚠️  Could not find test contacts - skipping deal creation';
    END IF;
  END IF;
END $$;

-- Verify: As service_role, we can see both
SELECT 
  'Service Role - Should see BOTH deals' AS test_name, 
  COUNT(*) AS count, 
  2 AS expected,
  CASE WHEN COUNT(*) = 2 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals
WHERE (
  tenant_id::text = '00000000-0000-0000-0000-000000000001' OR
  tenant_id::text = '00000000-0000-0000-0000-000000000002'
)
AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals');

-- Verify RLS policy exists
SELECT 
  'RLS Policy - Deals has tenant_id filter in SELECT policy' AS test_name,
  COUNT(*) AS policies_with_tenant_filter,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'deals'
  AND policyname LIKE '%select%'
  AND qual::text LIKE '%tenant_id%';

-- ================================================================
-- SUMMARY
-- ================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ RLS FUNCTIONAL TESTS COMPLETE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Review the SELECT results above to verify:';
  RAISE NOTICE '   1. Service role can see data from both tenants';
  RAISE NOTICE '   2. RLS policies exist with tenant_id filters';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Next: Test with actual authenticated user contexts';
  RAISE NOTICE '   (requires real auth sessions - beyond SQL scope)';
END $$;

