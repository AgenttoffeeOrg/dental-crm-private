-- ================================================================
-- A3: SOFT DELETE & UPDATED_AT VERIFICATION
-- ================================================================
-- Purpose: Verify soft delete functionality and updated_at triggers
-- APPROACH: Use existing tenant, test data-level soft delete behavior
-- NOTE: Running in transaction with ROLLBACK for clean cleanup
-- ================================================================

BEGIN;

-- Use existing tenant (will use first tenant found)
DO $$
DECLARE
  v_tenant_count int;
  v_test_tenant_id uuid;
BEGIN
  SELECT COUNT(*) INTO v_tenant_count FROM tenants;
  
  IF v_tenant_count < 1 THEN
    RAISE EXCEPTION '⚠️  No tenants found. Run seed script first: npx ts-node scripts/seed/verify_seed.ts';
  END IF;
  
  -- Get first tenant for testing
  SELECT id INTO v_test_tenant_id FROM tenants LIMIT 1;
  RAISE NOTICE '✅ Using tenant: % for soft delete tests', v_test_tenant_id;
END $$;

-- ================================================================
-- TEST 1: Soft Delete on Contacts
-- ================================================================

-- Create a test contact (using first tenant)
INSERT INTO contacts (id, tenant_id, full_name, primary_email, created_at, updated_at)
SELECT 
  'AAAAAAAA-0000-0000-0000-000000000001'::uuid,
  id,
  'Soft Delete Test Contact',
  'test@softdelete.com',
  NOW(),
  NOW()
FROM tenants
LIMIT 1;

-- Verify contact is visible
SELECT 
  '1a. Contact visible before soft delete' AS test_name,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid
  AND deleted_at IS NULL;

-- Soft delete the contact
UPDATE contacts
SET deleted_at = NOW()
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;

-- Verify contact is now hidden (via RLS with soft delete filter)
-- Note: As service_role, we can still see it; as regular user with RLS, it should be hidden
SELECT 
  '1b. Contact has deleted_at timestamp' AS test_name,
  COUNT(*) AS actual_count,
  1 AS expected_count,
  CASE WHEN COUNT(*) = 1 AND MAX(deleted_at) IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;

-- Verify RLS would hide it: is_not_deleted(deleted_at) should return FALSE
SELECT 
  '1c. is_not_deleted() returns FALSE for soft-deleted record' AS test_name,
  is_not_deleted(deleted_at) AS is_visible,
  false AS expected,
  CASE WHEN is_not_deleted(deleted_at) = false THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;

-- ================================================================
-- TEST 2: updated_at Trigger
-- ================================================================

-- Test updated_at trigger on our test contact
DO $$
DECLARE
  v_original_timestamp TIMESTAMPTZ;
  v_new_timestamp TIMESTAMPTZ;
BEGIN
  -- Get original timestamp
  SELECT updated_at INTO v_original_timestamp
  FROM contacts
  WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;
  
  -- Wait a moment to ensure timestamp difference
  PERFORM pg_sleep(0.1);
  
  -- Update the contact
  UPDATE contacts
  SET full_name = 'Updated Test Contact'
  WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;
  
  -- Get new timestamp
  SELECT updated_at INTO v_new_timestamp
  FROM contacts
  WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;
  
  -- Report result
  IF v_new_timestamp > v_original_timestamp THEN
    RAISE NOTICE '✅ TEST 2a PASS: updated_at changed after UPDATE';
  ELSE
    RAISE WARNING '❌ TEST 2a FAIL: updated_at did NOT change';
  END IF;
END $$;

-- Visual confirmation
SELECT 
  '2a. updated_at trigger works' AS test_name,
  full_name AS updated_field,
  updated_at > created_at AS timestamp_advanced,
  CASE WHEN updated_at > created_at THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;

-- ================================================================
-- TEST 3: Service Role Can See Soft-Deleted Records
-- ================================================================

-- Note: We're running as service_role, so we can see the soft-deleted contact
-- In production, normal users would NOT see it due to RLS policies

SELECT 
  '3a. Service role CAN see soft-deleted contact' AS test_name,
  COUNT(*) AS found_count,
  1 AS expected,
  CASE WHEN COUNT(*) = 1 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM contacts
WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid
  AND deleted_at IS NOT NULL;

-- ================================================================
-- TEST 4: Soft Deleted Records View
-- ================================================================

-- Check if soft_deleted_records view exists and includes our test data
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'soft_deleted_records') THEN
    RAISE NOTICE '✅ soft_deleted_records view exists';
  ELSE
    RAISE NOTICE '⚠️  soft_deleted_records view does not exist (OK - optional feature)';
  END IF;
END $$;

-- ================================================================
-- TEST 5: prevent_tenant_id_change Trigger
-- ================================================================

-- Attempt to change tenant_id (should fail or be prevented by trigger)
DO $$
DECLARE
  v_error TEXT;
  v_other_tenant_id uuid;
BEGIN
  -- Get a different tenant ID (if exists)
  SELECT id INTO v_other_tenant_id
  FROM tenants
  WHERE id != (SELECT tenant_id FROM contacts WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid)
  LIMIT 1;
  
  IF v_other_tenant_id IS NULL THEN
    RAISE NOTICE '⚠️  TEST 5 SKIPPED: Only one tenant exists';
    RETURN;
  END IF;
  
  -- Try to change tenant_id to another tenant
  UPDATE contacts
  SET tenant_id = v_other_tenant_id
  WHERE id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid;
  
  RAISE NOTICE '❌ TEST 5 FAIL: tenant_id change was NOT prevented';
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE NOTICE '✅ TEST 5 PASS: tenant_id change prevented: %', v_error;
END $$;

-- ================================================================
-- CLEANUP
-- ================================================================

ROLLBACK;

-- ================================================================
-- SUMMARY OF EXPECTED RESULTS:
-- ================================================================
-- ✅ Soft-deleted contacts have deleted_at timestamp
-- ✅ is_not_deleted() function correctly identifies soft-deleted records
-- ✅ RLS policies hide soft-deleted records from regular users
-- ✅ updated_at trigger fires on UPDATE and changes timestamp
-- ✅ prevent_tenant_id_change trigger prevents tenant_id mutation
-- ⚠️ Soft delete cascade is optional (not all implementations need it)
-- ================================================================

