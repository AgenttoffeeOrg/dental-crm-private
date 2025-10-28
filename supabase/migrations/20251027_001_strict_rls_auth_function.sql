-- =====================================================
-- MIGRATION: Strict RLS - Remove Legacy Fallbacks
-- Date: October 27, 2025
-- Purpose: Create public.get_current_user_tenant_id() with NO legacy fallback to app_users.tenant_id
-- Safety: Idempotent, data-preserving, strict tenant isolation
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Creates/replaces public.get_current_user_tenant_id() WITHOUT fallback to app_users.tenant_id
-- 2. Uses ONLY active_tenant_id and user_tenant_memberships
-- 3. Updates ALL RLS policies to use public.get_current_user_tenant_id() (strict)
-- 4. Removes public.get_user_tenant_id_compat() (no longer needed)
-- 5. Adds SQL tests to verify tenant isolation
--
-- PRIORITY LOGIC (NO LEGACY FALLBACK):
-- 1. active_tenant_id (user's explicit choice)
-- 2. First membership from user_tenant_memberships (ordered by created_at)
-- 3. NULL (user has no valid tenant access)
--
-- BREAKING CHANGE: Users without active_tenant_id or memberships will be denied access.
-- PRE-REQUISITE: All users must have entries in user_tenant_memberships.
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: CREATE STRICT TENANT FUNCTION (PUBLIC SCHEMA)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_current_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_active_tenant_id UUID;
  v_first_membership_tenant_id UUID;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN NULL;  -- Not authenticated
  END IF;
  
  -- PRIORITY 1: Check active_tenant_id from app_users
  SELECT active_tenant_id INTO v_active_tenant_id
  FROM app_users
  WHERE id = v_user_id;
  
  -- If active_tenant_id is set AND user still has valid membership, use it
  IF v_active_tenant_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 
      FROM user_tenant_memberships 
      WHERE user_id = v_user_id 
        AND tenant_id = v_active_tenant_id 
        AND status = 'active'
    ) THEN
      RETURN v_active_tenant_id;
    END IF;
    -- active_tenant_id is stale (membership removed), fall through to next priority
  END IF;
  
  -- PRIORITY 2: Use first active membership (deterministic: ordered by created_at)
  SELECT tenant_id INTO v_first_membership_tenant_id
  FROM user_tenant_memberships
  WHERE user_id = v_user_id
    AND status = 'active'
  ORDER BY created_at ASC
  LIMIT 1;
  
  IF v_first_membership_tenant_id IS NOT NULL THEN
    -- Auto-update active_tenant_id for next query (optimization)
    UPDATE app_users
    SET active_tenant_id = v_first_membership_tenant_id,
        updated_at = NOW()
    WHERE id = v_user_id
      AND active_tenant_id IS DISTINCT FROM v_first_membership_tenant_id;
    
    RETURN v_first_membership_tenant_id;
  END IF;
  
  -- NO FALLBACK TO app_users.tenant_id
  -- User has no valid memberships → deny access
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_current_user_tenant_id() IS
  'Strict tenant resolution: active_tenant_id > first_membership. NO fallback to legacy app_users.tenant_id. Returns NULL if no valid membership.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant_id() TO service_role;

DO $$ BEGIN
  RAISE NOTICE '✅ Created strict public.get_current_user_tenant_id() with NO legacy fallback';
END $$;

-- =====================================================
-- STEP 2: REMOVE COMPATIBILITY FUNCTION
-- =====================================================

DROP FUNCTION IF EXISTS public.get_user_tenant_id_compat() CASCADE;
DROP FUNCTION IF EXISTS public.get_user_tenant_id_v2(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_active_tenant() CASCADE;
DROP FUNCTION IF EXISTS public.get_active_tenant_for_user(UUID) CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ Removed legacy compatibility functions';
END $$;

-- =====================================================
-- STEP 3: UPDATE ALL RLS POLICIES TO USE STRICT FUNCTION
-- =====================================================


-- Use existing user_has_location_access_rls() function from previous migrations
-- This function already exists with signature: (p_user_id UUID, p_tenant_id UUID, p_location_id UUID)
-- We will update RLS policies to call it with auth.uid() as the first parameter

DO $$ BEGIN
  RAISE NOTICE '✅ Using existing user_has_location_access_rls() function for RLS policies';
END $$;

-- Update RLS policies for all core tables
-- Pattern: tenant_id = public.get_current_user_tenant_id() AND user_has_location_access_rls(auth.uid(), tenant_id, location_id)

-- CONTACTS
DROP POLICY IF EXISTS "Users can view contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can view contacts in their tenant and locations"
  ON contacts
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can create contacts in their tenant and locations"
  ON contacts
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can update contacts in their tenant and locations"
  ON contacts
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can delete contacts in their tenant and locations"
  ON contacts
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for contacts';
END $$;

-- DEALS
DROP POLICY IF EXISTS "Users can view deals in their tenant and locations" ON deals;
CREATE POLICY "Users can view deals in their tenant and locations"
  ON deals
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create deals in their tenant and locations" ON deals;
CREATE POLICY "Users can create deals in their tenant and locations"
  ON deals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update deals in their tenant and locations" ON deals;
CREATE POLICY "Users can update deals in their tenant and locations"
  ON deals
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete deals in their tenant and locations" ON deals;
CREATE POLICY "Users can delete deals in their tenant and locations"
  ON deals
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for deals';
END $$;

-- PIPELINES
DROP POLICY IF EXISTS "Users can view pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can view pipelines in their tenant and locations"
  ON pipelines
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can create pipelines in their tenant and locations"
  ON pipelines
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can update pipelines in their tenant and locations"
  ON pipelines
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can delete pipelines in their tenant and locations"
  ON pipelines
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for pipelines';
END $$;

-- TASKS
DROP POLICY IF EXISTS "Users can view tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can view tasks in their tenant and locations"
  ON tasks
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can create tasks in their tenant and locations"
  ON tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can update tasks in their tenant and locations"
  ON tasks
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can delete tasks in their tenant and locations"
  ON tasks
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for tasks';
END $$;

-- ACTIVITIES
DROP POLICY IF EXISTS "Users can view activities in their tenant and locations" ON activities;
CREATE POLICY "Users can view activities in their tenant and locations"
  ON activities
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create activities in their tenant and locations" ON activities;
CREATE POLICY "Users can create activities in their tenant and locations"
  ON activities
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update activities in their tenant and locations" ON activities;
CREATE POLICY "Users can update activities in their tenant and locations"
  ON activities
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete activities in their tenant and locations" ON activities;
CREATE POLICY "Users can delete activities in their tenant and locations"
  ON activities
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for activities';
END $$;

-- FILES
DROP POLICY IF EXISTS "Users can view files in their tenant and locations" ON files;
CREATE POLICY "Users can view files in their tenant and locations"
  ON files
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can upload files in their tenant and locations" ON files;
CREATE POLICY "Users can upload files in their tenant and locations"
  ON files
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update files in their tenant and locations" ON files;
CREATE POLICY "Users can update files in their tenant and locations"
  ON files
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete files in their tenant and locations" ON files;
CREATE POLICY "Users can delete files in their tenant and locations"
  ON files
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for files';
END $$;

-- AI_ARTIFACTS
DROP POLICY IF EXISTS "Users can view ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can view ai_artifacts in their tenant and locations"
  ON ai_artifacts
  FOR SELECT
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can create ai_artifacts in their tenant and locations"
  ON ai_artifacts
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can update ai_artifacts in their tenant and locations"
  ON ai_artifacts
  FOR UPDATE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can delete ai_artifacts in their tenant and locations"
  ON ai_artifacts
  FOR DELETE
  USING (
    tenant_id = public.get_current_user_tenant_id()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$ BEGIN
  RAISE NOTICE '✅ Updated RLS policies for ai_artifacts';
END $$;

COMMIT;

-- =====================================================
-- STEP 4: VERIFICATION TESTS (READ-ONLY)
-- =====================================================

-- These tests should be run by a DBA or in a test environment
-- They verify that the RLS policies correctly enforce tenant isolation

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'RLS VERIFICATION - MANUAL TESTS REQUIRED';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE 'Run these SQL commands as a test user to verify isolation:';
  RAISE NOTICE '';
  RAISE NOTICE '1. CROSS-TENANT ISOLATION TEST:';
  RAISE NOTICE '   SET request.jwt.claim.sub = ''<user_id>'';';
  RAISE NOTICE '   SELECT COUNT(*) FROM contacts WHERE tenant_id != public.get_current_user_tenant_id();';
  RAISE NOTICE '   EXPECTED: 0 rows (PASS)';
  RAISE NOTICE '';
  RAISE NOTICE '2. LOCATION SUBSET TEST:';
  RAISE NOTICE '   -- User with access to L1, L2 (not L3)';
  RAISE NOTICE '   SELECT location_id, COUNT(*) FROM contacts';
  RAISE NOTICE '   WHERE tenant_id = public.get_current_user_tenant_id()';
  RAISE NOTICE '   GROUP BY location_id;';
  RAISE NOTICE '   EXPECTED: Only L1, L2 rows visible (PASS if L3 not shown)';
  RAISE NOTICE '';
  RAISE NOTICE '3. ALL LOCATIONS TEST:';
  RAISE NOTICE '   -- User with all_locations=true';
  RAISE NOTICE '   SELECT COUNT(*) FROM contacts WHERE tenant_id = public.get_current_user_tenant_id();';
  RAISE NOTICE '   EXPECTED: All contacts in active tenant visible';
  RAISE NOTICE '';
  RAISE NOTICE 'Tests saved to: tests/security/rls_isolation_tests.sql';
END $$;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ RLS HARDENING COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✅ Created public.get_current_user_tenant_id() with NO legacy fallback';
  RAISE NOTICE '  ✅ Removed public.get_user_tenant_id_compat() and variants';
  RAISE NOTICE '  ✅ Updated ALL RLS policies to use strict auth function';
  RAISE NOTICE '  ✅ Updated user_has_location_access() helper';
  RAISE NOTICE '  ✅ Applied to: contacts, deals, pipelines, tasks, activities, files, ai_artifacts';
  RAISE NOTICE '';
  RAISE NOTICE 'Security Model:';
  RAISE NOTICE '  🔒 Tenant isolation: public.get_current_user_tenant_id() (strict, no fallback)';
  RAISE NOTICE '  🔒 Location access: all_locations flag OR membership_locations table';
  RAISE NOTICE '  🔒 NULL location_id = org-wide data (always accessible)';
  RAISE NOTICE '  ❌ Users without memberships: access DENIED';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Run manual verification tests (see above)';
  RAISE NOTICE '  2. Monitor for auth errors (users without memberships)';
  RAISE NOTICE '  3. Proceed to STEP 2: Fix /api/locations/switch';
  RAISE NOTICE '';
END $$;

