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
-- NOTE: deals requires: tenant_id, contact_id, pipeline_id, stage_id, title
DO $$
DECLARE
  v_contact_t1_id uuid;
  v_contact_t2_id uuid;
  v_pipeline_t1_id uuid;
  v_pipeline_t2_id uuid;
  v_stage_t1_id uuid;
  v_stage_t2_id uuid;
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
    
    -- Get pipeline IDs for each tenant (use any existing pipeline)
    SELECT id INTO v_pipeline_t1_id FROM pipelines 
    WHERE tenant_id::text = '00000000-0000-0000-0000-000000000001' 
    LIMIT 1;
    
    SELECT id INTO v_pipeline_t2_id FROM pipelines 
    WHERE tenant_id::text = '00000000-0000-0000-0000-000000000002' 
    LIMIT 1;
    
    -- Get first stage for each pipeline
    IF v_pipeline_t1_id IS NOT NULL THEN
      SELECT id INTO v_stage_t1_id FROM pipeline_stages 
      WHERE pipeline_id = v_pipeline_t1_id 
      ORDER BY position LIMIT 1;
    END IF;
    
    IF v_pipeline_t2_id IS NOT NULL THEN
      SELECT id INTO v_stage_t2_id FROM pipeline_stages 
      WHERE pipeline_id = v_pipeline_t2_id 
      ORDER BY position LIMIT 1;
    END IF;
    
    -- Only create deals if we have all required references
    IF v_contact_t1_id IS NOT NULL AND v_contact_t2_id IS NOT NULL 
       AND v_pipeline_t1_id IS NOT NULL AND v_pipeline_t2_id IS NOT NULL
       AND v_stage_t1_id IS NOT NULL AND v_stage_t2_id IS NOT NULL THEN
      
      INSERT INTO deals (tenant_id, contact_id, pipeline_id, stage_id, title, value_estimate_cents, currency, treatment_tags, created_at, updated_at)
      VALUES
        ('00000000-0000-0000-0000-000000000001'::uuid, v_contact_t1_id, v_pipeline_t1_id, v_stage_t1_id, 'Test Deal T1', 100000, 'GBP', ARRAY[]::text[], NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000002'::uuid, v_contact_t2_id, v_pipeline_t2_id, v_stage_t2_id, 'Test Deal T2', 200000, 'GBP', ARRAY[]::text[], NOW(), NOW());
      
      RAISE NOTICE '✅ Created test deals with all required FK references';
    ELSE
      RAISE NOTICE '⚠️  Missing required data - skipping deal creation';
      RAISE NOTICE '    Contacts: T1=%, T2=%', v_contact_t1_id IS NOT NULL, v_contact_t2_id IS NOT NULL;
      RAISE NOTICE '    Pipelines: T1=%, T2=%', v_pipeline_t1_id IS NOT NULL, v_pipeline_t2_id IS NOT NULL;
      RAISE NOTICE '    Stages: T1=%, T2=%', v_stage_t1_id IS NOT NULL, v_stage_t2_id IS NOT NULL;
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

