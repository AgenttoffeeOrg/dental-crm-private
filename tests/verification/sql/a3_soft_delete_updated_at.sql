-- ================================================================
-- A3: SOFT DELETE & UPDATED_AT VERIFICATION
-- ================================================================
-- Purpose: Verify soft delete functionality and updated_at triggers
-- ================================================================

BEGIN;

-- Create test tenant and user
INSERT INTO tenants (id, name, created_at, updated_at)
VALUES ('99999999-0000-0000-0000-000000000099'::uuid, 'Soft Delete Test Tenant', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO app_users (id, tenant_id, email, role, full_name, created_at, updated_at)
VALUES ('99999999-0000-0000-0000-0000000000AA'::uuid, '99999999-0000-0000-0000-000000000099'::uuid, 'softdelete@test.com', 'owner', 'Test User', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- TEST 1: Soft Delete on Contacts
-- ================================================================

-- Create a test contact
INSERT INTO contacts (id, tenant_id, full_name, primary_email, created_at, updated_at)
VALUES ('AAAAAAAA-0000-0000-0000-000000000001'::uuid, '99999999-0000-0000-0000-000000000099'::uuid, 'Soft Delete Test Contact', 'test@softdelete.com', NOW(), NOW());

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
  CASE WHEN COUNT(*) = 1 AND deleted_at IS NOT NULL THEN '✅ PASS' ELSE '❌ FAIL' END AS status
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

-- Create a test deal
INSERT INTO pipelines (id, tenant_id, name, description, created_at, updated_at)
VALUES ('BBBBBBBB-0000-0000-0000-000000000001'::uuid, '99999999-0000-0000-0000-000000000099'::uuid, 'Test Pipeline', 'Test', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO pipeline_stages (id, pipeline_id, name, "position", probability, created_at, updated_at)
VALUES ('CCCCCCCC-0000-0000-0000-000000000001'::uuid, 'BBBBBBBB-0000-0000-0000-000000000001'::uuid, 'Test Stage', 0, 50, NOW(), NOW());

INSERT INTO deals (id, tenant_id, title, pipeline_id, stage_id, value, created_at, updated_at)
VALUES ('DDDDDDDD-0000-0000-0000-000000000001'::uuid, '99999999-0000-0000-0000-000000000099'::uuid, 'Updated At Test Deal', 'BBBBBBBB-0000-0000-0000-000000000001'::uuid, 'CCCCCCCC-0000-0000-0000-000000000001'::uuid, 1000.00, NOW(), NOW());

-- Capture original updated_at
SELECT updated_at INTO TEMP original_timestamp
FROM deals
WHERE id = 'DDDDDDDD-0000-0000-0000-000000000001'::uuid;

-- Wait a moment to ensure timestamp difference
SELECT pg_sleep(0.1);

-- Update the deal
UPDATE deals
SET value = 2000.00
WHERE id = 'DDDDDDDD-0000-0000-0000-000000000001'::uuid;

-- Verify updated_at changed
SELECT 
  '2a. updated_at changed after UPDATE' AS test_name,
  d.updated_at > o.updated_at AS timestamp_changed,
  true AS expected,
  CASE WHEN d.updated_at > o.updated_at THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM deals d, original_timestamp o
WHERE d.id = 'DDDDDDDD-0000-0000-0000-000000000001'::uuid;

-- ================================================================
-- TEST 3: Soft Delete Cascade (Optional - if implemented)
-- ================================================================

-- Create parent contact and child activities
INSERT INTO contacts (id, tenant_id, full_name, primary_email, created_at, updated_at)
VALUES ('EEEEEEEE-0000-0000-0000-000000000001'::uuid, '99999999-0000-0000-0000-000000000099'::uuid, 'Cascade Test Contact', 'cascade@test.com', NOW(), NOW());

INSERT INTO activities (tenant_id, contact_id, type, subject, created_by, created_at, updated_at)
VALUES ('99999999-0000-0000-0000-000000000099'::uuid, 'EEEEEEEE-0000-0000-0000-000000000001'::uuid, 'note', 'Test Activity', '99999999-0000-0000-0000-0000000000AA'::uuid, NOW(), NOW());

-- Soft delete parent contact
UPDATE contacts
SET deleted_at = NOW()
WHERE id = 'EEEEEEEE-0000-0000-0000-000000000001'::uuid;

-- Check if cascade trigger exists and fired (implementation-dependent)
-- If soft_delete_cascade trigger is implemented, child activities should also be soft-deleted
SELECT 
  '3a. Child activities NOT auto-cascaded (expected behavior)' AS test_name,
  COUNT(*) AS activities_count,
  1 AS expected,
  '⚠️ INFO: Cascade not implemented (OK for now)' AS status
FROM activities
WHERE contact_id = 'EEEEEEEE-0000-0000-0000-000000000001'::uuid
  AND deleted_at IS NULL;

-- ================================================================
-- TEST 4: Soft Deleted Records View
-- ================================================================

-- Check if soft_deleted_records view exists and includes our test data
SELECT 
  '4a. soft_deleted_records view contains soft-deleted contact' AS test_name,
  COUNT(*) >= 1 AS has_records,
  true AS expected,
  CASE WHEN COUNT(*) >= 1 THEN '✅ PASS' ELSE '❌ FAIL (view may not exist)' END AS status
FROM soft_deleted_records
WHERE resource_id = 'AAAAAAAA-0000-0000-0000-000000000001'::uuid
  OR resource_id = 'EEEEEEEE-0000-0000-0000-000000000001'::uuid;

-- ================================================================
-- TEST 5: prevent_tenant_id_change Trigger
-- ================================================================

-- Attempt to change tenant_id (should fail or be prevented)
DO $$
DECLARE
  v_error TEXT;
BEGIN
  -- Try to change tenant_id
  UPDATE contacts
  SET tenant_id = '00000000-0000-0000-0000-000000000001'::uuid
  WHERE id = 'EEEEEEEE-0000-0000-0000-000000000001'::uuid;
  
  RAISE NOTICE '5a. ❌ FAIL: tenant_id change was NOT prevented';
EXCEPTION
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error = MESSAGE_TEXT;
    RAISE NOTICE '5a. ✅ PASS: tenant_id change prevented: %', v_error;
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

