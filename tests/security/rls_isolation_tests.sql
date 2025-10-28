-- =====================================================
-- RLS ISOLATION TESTS
-- Purpose: Verify tenant isolation and location scoping work correctly
-- Run these tests manually with a test user to verify RLS policies
-- =====================================================

-- TEST 1: CROSS-TENANT ISOLATION
-- EXPECTED: 0 rows (users cannot see data from other tenants)
-- SETUP: Login as a user with access to tenant A only
-- TEST: Try to read contacts from tenant B

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 1: CROSS-TENANT ISOLATION';
  RAISE NOTICE '========================================';
END $$;

-- Simulated test (run this as an authenticated user)
/*
SET request.jwt.claim.sub = '<user_id_from_tenant_A>';
SELECT COUNT(*) as cross_tenant_leaks
FROM contacts 
WHERE tenant_id != auth.get_user_tenant_id();

-- PASS: count = 0
-- FAIL: count > 0 (SECURITY BREACH!)
*/

-- TEST 2: LOCATION SUBSET VISIBILITY
-- EXPECTED: Only rows for locations L1, L2 (not L3)
-- SETUP: User has membership_locations entries for L1 and L2 only
-- TEST: Query contacts and verify L3 is not visible

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 2: LOCATION SUBSET VISIBILITY';
  RAISE NOTICE '========================================';
END $$;

/*
-- Setup: Ensure test user has access to exactly 2 locations
INSERT INTO membership_locations (membership_id, location_id, is_active)
SELECT 
  utm.id,
  l.id,
  true
FROM user_tenant_memberships utm
CROSS JOIN locations l
WHERE utm.user_id = '<test_user_id>'
  AND utm.tenant_id = '<test_tenant_id>'
  AND l.tenant_id = '<test_tenant_id>'
  AND l.name IN ('Location 1', 'Location 2');  -- Only these 2

-- Test: User should see only contacts from L1, L2
SET request.jwt.claim.sub = '<test_user_id>';
SELECT 
  l.name as location_name,
  COUNT(*) as contact_count
FROM contacts c
JOIN locations l ON l.id = c.location_id
WHERE c.tenant_id = auth.get_user_tenant_id()
GROUP BY l.id, l.name
ORDER BY l.name;

-- PASS: Only 'Location 1' and 'Location 2' appear in results
-- FAIL: 'Location 3' or other locations appear (LEAK!)
*/

-- TEST 3: ALL LOCATIONS FLAG
-- EXPECTED: User sees all tenant locations (no restrictions)
-- SETUP: User has all_locations=true in user_tenant_memberships
-- TEST: Query contacts and verify all locations visible

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 3: ALL LOCATIONS FLAG';
  RAISE NOTICE '========================================';
END $$;

/*
-- Setup: Give user all_locations access
UPDATE user_tenant_memberships
SET all_locations = true
WHERE user_id = '<test_user_id>'
  AND tenant_id = '<test_tenant_id>';

-- Test: User should see contacts from ALL locations in their tenant
SET request.jwt.claim.sub = '<test_user_id>';
SELECT 
  COALESCE(l.name, 'Org-wide') as location_name,
  COUNT(*) as contact_count
FROM contacts c
LEFT JOIN locations l ON l.id = c.location_id
WHERE c.tenant_id = auth.get_user_tenant_id()
GROUP BY l.id, l.name
ORDER BY l.name NULLS FIRST;

-- PASS: All locations in active tenant visible (including NULL = org-wide)
-- FAIL: Some locations missing
*/

-- TEST 4: NULL LOCATION (ORG-WIDE DATA)
-- EXPECTED: All users see org-wide data (location_id IS NULL)
-- SETUP: Create contacts with location_id = NULL
-- TEST: Verify all users in tenant can see them

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 4: ORG-WIDE DATA (NULL LOCATION)';
  RAISE NOTICE '========================================';
END $$;

/*
-- Setup: Create org-wide contact
INSERT INTO contacts (tenant_id, location_id, name, email)
VALUES ('<test_tenant_id>', NULL, 'Org-Wide Contact', 'orgwide@test.com');

-- Test: Even users with limited location access see org-wide data
SET request.jwt.claim.sub = '<user_with_limited_locations>';
SELECT name, location_id
FROM contacts
WHERE tenant_id = auth.get_user_tenant_id()
  AND location_id IS NULL;

-- PASS: Contact visible
-- FAIL: Contact not visible (ORG-WIDE DATA BLOCKED!)
*/

-- TEST 5: LOCATION BELONGS TO SINGLE TENANT
-- EXPECTED: 0 rows (structurally impossible for location to be in multiple tenants)
-- TEST: Verify location can't be shared across tenants

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 5: LOCATION SINGLE-TENANT OWNERSHIP';
  RAISE NOTICE '========================================';
END $$;

/*
-- This test verifies schema constraints (should always pass)
SELECT l.id, l.name, COUNT(DISTINCT l.tenant_id) as tenant_count
FROM locations l
GROUP BY l.id, l.name
HAVING COUNT(DISTINCT l.tenant_id) > 1;

-- PASS: 0 rows (no location in multiple tenants)
-- FAIL: Any rows (SCHEMA CONSTRAINT VIOLATED!)
*/

-- TEST 6: INSERT VALIDATION (WITH CHECK)
-- EXPECTED: Error when trying to insert data for wrong tenant
-- TEST: Verify RLS prevents inserting data into other tenants

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 6: INSERT VALIDATION';
  RAISE NOTICE '========================================';
END $$;

/*
SET request.jwt.claim.sub = '<user_in_tenant_A>';

-- This should FAIL (user from tenant A cannot insert into tenant B)
INSERT INTO contacts (tenant_id, name, email)
VALUES ('<tenant_B_id>', 'Malicious Contact', 'hack@evil.com');

-- PASS: Error thrown (policy violation)
-- FAIL: Insert succeeds (SECURITY BREACH!)
*/

-- TEST 7: UPDATE VALIDATION (USING clause)
-- EXPECTED: Error when trying to update data from other tenants
-- TEST: Verify RLS prevents updating data in other tenants

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 7: UPDATE VALIDATION';
  RAISE NOTICE '========================================';
END $$;

/*
SET request.jwt.claim.sub = '<user_in_tenant_A>';

-- Get a contact from tenant B (this will fail in SELECT due to RLS)
-- But if somehow contact_id was known, verify UPDATE also fails
UPDATE contacts
SET name = 'Hacked'
WHERE id = '<contact_id_from_tenant_B>';

-- PASS: 0 rows updated (policy blocks access)
-- FAIL: Row updated (SECURITY BREACH!)
*/

-- TEST 8: DELETE VALIDATION (USING clause)
-- EXPECTED: Error when trying to delete data from other tenants
-- TEST: Verify RLS prevents deleting data in other tenants

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 8: DELETE VALIDATION';
  RAISE NOTICE '========================================';
END $$;

/*
SET request.jwt.claim.sub = '<user_in_tenant_A>';

-- Try to delete a contact from tenant B
DELETE FROM contacts
WHERE id = '<contact_id_from_tenant_B>';

-- PASS: 0 rows deleted (policy blocks access)
-- FAIL: Row deleted (SECURITY BREACH!)
*/

-- TEST 9: LOCATION SWITCH ACCESS VALIDATION
-- EXPECTED: user_has_location_access_rls() returns false for inaccessible locations
-- TEST: Verify location access validation before switching
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 9: LOCATION SWITCH ACCESS VALIDATION';
  RAISE NOTICE '========================================';
END $$;

/*
-- Setup: User has access to L1, L2 but not L3
-- Test: Verify RLS function correctly validates access

SET request.jwt.claim.sub = '<test_user_id>';

-- This should return TRUE for allowed locations
SELECT public.user_has_location_access_rls(
  '<test_user_id>'::UUID,
  '<test_tenant_id>'::UUID,
  '<location_1_id>'::UUID
) as has_access_l1;

-- This should return FALSE for denied locations
SELECT public.user_has_location_access_rls(
  '<test_user_id>'::UUID,
  '<test_tenant_id>'::UUID,
  '<location_3_id>'::UUID
) as has_access_l3;

-- PASS: L1 returns TRUE, L3 returns FALSE
-- FAIL: Wrong results (ACCESS CONTROL BROKEN!)
*/

-- TEST 10: ACTIVE LOCATION CONTEXT PERSISTENCE
-- EXPECTED: active_location_id persists across requests
-- TEST: Verify app_users.active_location_id updates correctly

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 10: ACTIVE LOCATION CONTEXT';
  RAISE NOTICE '========================================';
END $$;

/*
-- Update active location
UPDATE app_users
SET active_location_id = '<location_2_id>'::UUID
WHERE id = '<test_user_id>';

-- Verify persistence
SELECT 
  id,
  active_tenant_id,
  active_location_id,
  last_context_switch_at
FROM app_users
WHERE id = '<test_user_id>';

-- PASS: active_location_id matches, last_context_switch_at updated
-- FAIL: Values not persisted correctly
*/

-- =====================================================
-- AUTOMATED VERIFICATION (Run as service_role)
-- =====================================================

DO $$
DECLARE
  v_test_user_id UUID;
  v_test_tenant_a UUID;
  v_test_tenant_b UUID;
  v_contact_a_id UUID;
  v_contact_b_id UUID;
  v_leak_count INTEGER;
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'AUTOMATED RLS VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  
  -- Check that auth.get_user_tenant_id() exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'get_user_tenant_id'
  ) THEN
    RAISE WARNING '❌ auth.get_user_tenant_id() function not found!';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ auth.get_user_tenant_id() function exists';
  
  -- Check that public.user_has_location_access_rls() exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'user_has_location_access_rls'
  ) THEN
    RAISE WARNING '❌ public.user_has_location_access_rls() function not found!';
  ELSE
    RAISE NOTICE '✅ public.user_has_location_access_rls() function exists';
  END IF;
  
  -- Check that RLS is enabled on core tables
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
      AND tablename = 'contacts' 
      AND rowsecurity = true
  ) THEN
    RAISE WARNING '❌ RLS not enabled on contacts table!';
  ELSE
    RAISE NOTICE '✅ RLS enabled on contacts';
  END IF;
  
  -- Count policies on contacts
  SELECT COUNT(*) INTO v_leak_count
  FROM pg_policies
  WHERE tablename = 'contacts';
  
  RAISE NOTICE '✅ Contacts has % RLS policies', v_leak_count;
  
  -- Verify policies reference auth.get_user_tenant_id
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'contacts'
      AND (qual LIKE '%auth.get_user_tenant_id()%' OR with_check LIKE '%auth.get_user_tenant_id()%')
  ) THEN
    RAISE NOTICE '✅ Policies use auth.get_user_tenant_id()';
  ELSE
    RAISE WARNING '⚠️  Policies may not be using auth.get_user_tenant_id()';
  END IF;
  
  -- Verify app_users has active context columns
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'active_tenant_id'
  ) THEN
    RAISE NOTICE '✅ app_users.active_tenant_id column exists';
  ELSE
    RAISE WARNING '❌ app_users.active_tenant_id column missing!';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'app_users'
      AND column_name = 'active_location_id'
  ) THEN
    RAISE NOTICE '✅ app_users.active_location_id column exists';
  ELSE
    RAISE WARNING '❌ app_users.active_location_id column missing!';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Manual tests required to fully verify tenant isolation.';
  RAISE NOTICE 'Run the commented SQL blocks above as authenticated test users.';
END $$;

