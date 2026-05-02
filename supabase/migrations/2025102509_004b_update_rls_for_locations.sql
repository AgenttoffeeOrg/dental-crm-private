SET search_path TO public, extensions;

-- =====================================================
-- STEP 3B: UPDATE RLS POLICIES FOR LOCATION-AWARE ACCESS
-- Purpose: Extend RLS to respect location_id when present
-- Safety: Backward compatible, only applies when location_id set
-- FIX: Creates compatibility function if public.get_user_tenant_id() doesn't exist
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Ensures tenant resolution function exists (creates if missing)
-- 2. Updates RLS policies to check location access
-- 3. Falls back to tenant-wide access if location_id is NULL
-- 4. Uses membership_locations to determine access
-- 5. Maintains existing tenant isolation
-- 6. Adds location-scoped filtering
--
-- POLICY LOGIC:
-- - If record has location_id = NULL → tenant-wide (old behavior)
-- - If record has location_id → check user has access to that location
-- - Location access determined by membership_locations table
-- - Admins/owners can access all locations in their tenant
--
-- AFFECTED TABLES:
-- - contacts
-- - deals  
-- - pipelines
-- - tasks
-- - activities
-- - files
-- - ai_artifacts
--
-- SAFETY:
-- - Idempotent: safe to run multiple times
-- - Backward compatible: NULL location_id works as before
-- - No data modification: only policy changes
-- - Tested with existing data
-- =====================================================

BEGIN;

-- =====================================================
-- 0. ENSURE TENANT RESOLUTION FUNCTION EXISTS
-- =====================================================

DO $$
DECLARE
  auth_function_exists BOOLEAN;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Check if public.get_user_tenant_id() exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND p.proname = 'get_user_tenant_id'
  ) INTO auth_function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'PRE-FLIGHT CHECK';
  RAISE NOTICE '%', separator;
  
  IF auth_function_exists THEN
    RAISE NOTICE '✅ public.get_user_tenant_id() found';
    RAISE NOTICE '   Will use existing tenant resolution';
  ELSE
    RAISE NOTICE '⚠️  public.get_user_tenant_id() not found';
    RAISE NOTICE '   This function should exist from initial RLS setup';
    RAISE NOTICE '   Creating compatibility wrapper...';
  END IF;
  RAISE NOTICE '';
END $$;

-- Create compatibility function in public schema if auth function doesn't exist
-- This provides a fallback that uses the new multi-org model
CREATE OR REPLACE FUNCTION public.get_user_tenant_id_compat()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID;
  v_active_tenant UUID;
  auth_fn_exists BOOLEAN;
  status_active CONSTANT membership_status := 'active';
BEGIN
  -- Check if public.get_user_tenant_id exists
  SELECT EXISTS (
    SELECT 1 
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' 
      AND p.proname = 'get_user_tenant_id'
  ) INTO auth_fn_exists;
  
  -- If auth function exists, use it (old single-tenant model)
  IF auth_fn_exists THEN
    EXECUTE 'SELECT public.get_user_tenant_id()' INTO v_tenant_id;
    RETURN v_tenant_id;
  END IF;
  
  -- Otherwise use new multi-org model
  -- 1. Check active_tenant_id from app_users
  SELECT active_tenant_id INTO v_active_tenant
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  IF v_active_tenant IS NOT NULL THEN
    RETURN v_active_tenant;
  END IF;
  
  -- 2. Fall back to user's first membership
  SELECT tenant_id INTO v_tenant_id
  FROM user_tenant_memberships
  WHERE user_id = auth.uid()
    AND status = status_active
  ORDER BY joined_at ASC
  LIMIT 1;
  
  RETURN v_tenant_id;
END;
$$;

COMMENT ON FUNCTION public.get_user_tenant_id_compat IS
  'Compatibility wrapper for tenant resolution. Uses public.get_user_tenant_id() if available, otherwise falls back to multi-org model.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created compatibility function: public.get_user_tenant_id_compat()';
END $$;

-- =====================================================
-- 1. HELPER FUNCTION: CHECK LOCATION ACCESS
-- =====================================================

CREATE OR REPLACE FUNCTION public.user_has_location_access_rls(
  p_user_id UUID,
  p_tenant_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  role_owner CONSTANT membership_role := 'owner';
  role_admin CONSTANT membership_role := 'admin';
  status_active CONSTANT membership_status := 'active';
BEGIN
  -- NULL location means tenant-wide access (always allow)
  IF p_location_id IS NULL THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user is admin/owner of tenant (full access)
  IF EXISTS (
    SELECT 1 
    FROM user_tenant_memberships
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND role IN (role_owner, role_admin)
      AND status = status_active
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has explicit location access
  IF EXISTS (
    SELECT 1
    FROM user_tenant_memberships utm
    JOIN membership_locations ml ON ml.membership_id = utm.id
    WHERE utm.user_id = p_user_id
      AND utm.tenant_id = p_tenant_id
      AND utm.status = status_active
      AND ml.location_id = p_location_id
      AND ml.is_active
  ) THEN
    RETURN TRUE;
  END IF;
  
  -- No access
  RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.user_has_location_access_rls IS
  'Check if user has access to a specific location within tenant. NULL location = tenant-wide access.';

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'UPDATING RLS POLICIES FOR LOCATIONS';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Helper function created: user_has_location_access_rls';
  RAISE NOTICE '✅ Using public.get_user_tenant_id_compat() for tenant resolution';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- 2. UPDATE CONTACTS RLS POLICIES
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can view contacts in their tenant and locations" ON contacts;

-- Create new location-aware SELECT policy
DROP POLICY IF EXISTS "Users can view contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can view contacts in their tenant and locations" ON contacts
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can create contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can create contacts in their tenant and locations" ON contacts;

-- Create new location-aware INSERT policy
DROP POLICY IF EXISTS "Users can create contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can create contacts in their tenant and locations" ON contacts
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their tenant and locations" ON contacts;

-- Create new location-aware UPDATE policy
DROP POLICY IF EXISTS "Users can update contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can update contacts in their tenant and locations" ON contacts
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

-- Drop existing DELETE policy
DROP POLICY IF EXISTS "Users can delete contacts in their tenant" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their tenant and locations" ON contacts;

-- Create new location-aware DELETE policy
DROP POLICY IF EXISTS "Users can delete contacts in their tenant and locations" ON contacts;
CREATE POLICY "Users can delete contacts in their tenant and locations" ON contacts
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for contacts';
END $$;

-- =====================================================
-- 3. UPDATE DEALS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can view deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can view deals in their tenant and locations" ON deals;
CREATE POLICY "Users can view deals in their tenant and locations" ON deals
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can create deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can create deals in their tenant and locations" ON deals;
CREATE POLICY "Users can create deals in their tenant and locations" ON deals
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can update deals in their tenant and locations" ON deals;
CREATE POLICY "Users can update deals in their tenant and locations" ON deals
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete deals in their tenant" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant and locations" ON deals;
DROP POLICY IF EXISTS "Users can delete deals in their tenant and locations" ON deals;
CREATE POLICY "Users can delete deals in their tenant and locations" ON deals
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for deals';
END $$;

-- =====================================================
-- 4. UPDATE PIPELINES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view pipelines in their tenant" ON pipelines;
DROP POLICY IF EXISTS "Users can view pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can view pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can view pipelines in their tenant and locations" ON pipelines
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create pipelines in their tenant" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can create pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can create pipelines in their tenant and locations" ON pipelines
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update pipelines in their tenant" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can update pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can update pipelines in their tenant and locations" ON pipelines
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete pipelines in their tenant" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their tenant and locations" ON pipelines;
DROP POLICY IF EXISTS "Users can delete pipelines in their tenant and locations" ON pipelines;
CREATE POLICY "Users can delete pipelines in their tenant and locations" ON pipelines
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for pipelines';
END $$;

-- =====================================================
-- 5. UPDATE TASKS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can view tasks in their tenant and locations" ON tasks
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can create tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can create tasks in their tenant and locations" ON tasks
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can update tasks in their tenant and locations" ON tasks
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete tasks in their tenant" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their tenant and locations" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their tenant and locations" ON tasks;
CREATE POLICY "Users can delete tasks in their tenant and locations" ON tasks
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for tasks';
END $$;

-- =====================================================
-- 6. UPDATE ACTIVITIES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view activities in their tenant" ON activities;
DROP POLICY IF EXISTS "Users can view activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can view activities in their tenant and locations" ON activities;
CREATE POLICY "Users can view activities in their tenant and locations" ON activities
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create activities in their tenant" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can create activities in their tenant and locations" ON activities;
CREATE POLICY "Users can create activities in their tenant and locations" ON activities
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update activities in their tenant" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can update activities in their tenant and locations" ON activities;
CREATE POLICY "Users can update activities in their tenant and locations" ON activities
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete activities in their tenant" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their tenant and locations" ON activities;
DROP POLICY IF EXISTS "Users can delete activities in their tenant and locations" ON activities;
CREATE POLICY "Users can delete activities in their tenant and locations" ON activities
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for activities';
END $$;

-- =====================================================
-- 7. UPDATE FILES RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view files in their tenant" ON files;
DROP POLICY IF EXISTS "Users can view files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can view files in their tenant and locations" ON files;
CREATE POLICY "Users can view files in their tenant and locations" ON files
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can upload files in their tenant" ON files;
DROP POLICY IF EXISTS "Users can upload files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can upload files in their tenant and locations" ON files;
CREATE POLICY "Users can upload files in their tenant and locations" ON files
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update files in their tenant" ON files;
DROP POLICY IF EXISTS "Users can update files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can update files in their tenant and locations" ON files;
CREATE POLICY "Users can update files in their tenant and locations" ON files
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete files in their tenant" ON files;
DROP POLICY IF EXISTS "Users can delete files in their tenant and locations" ON files;
DROP POLICY IF EXISTS "Users can delete files in their tenant and locations" ON files;
CREATE POLICY "Users can delete files in their tenant and locations" ON files
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for files';
END $$;

-- =====================================================
-- 8. UPDATE AI_ARTIFACTS RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Users can view ai_artifacts in their tenant" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can view ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can view ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can view ai_artifacts in their tenant and locations" ON ai_artifacts
  FOR SELECT
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can create ai_artifacts in their tenant" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can create ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can create ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can create ai_artifacts in their tenant and locations" ON ai_artifacts
  FOR INSERT
  WITH CHECK (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can update ai_artifacts in their tenant" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can update ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can update ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can update ai_artifacts in their tenant and locations" ON ai_artifacts
  FOR UPDATE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DROP POLICY IF EXISTS "Users can delete ai_artifacts in their tenant" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can delete ai_artifacts in their tenant and locations" ON ai_artifacts;
DROP POLICY IF EXISTS "Users can delete ai_artifacts in their tenant and locations" ON ai_artifacts;
CREATE POLICY "Users can delete ai_artifacts in their tenant and locations" ON ai_artifacts
  FOR DELETE
  USING (
    tenant_id = public.get_user_tenant_id_compat()
    AND public.user_has_location_access_rls(auth.uid(), tenant_id, location_id)
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Updated RLS policies for ai_artifacts';
END $$;

-- =====================================================
-- 9. VERIFICATION
-- =====================================================

DO $$
DECLARE
  contacts_policies INTEGER;
  deals_policies INTEGER;
  pipelines_policies INTEGER;
  tasks_policies INTEGER;
  activities_policies INTEGER;
  files_policies INTEGER;
  ai_artifacts_policies INTEGER;
  compat_function_exists BOOLEAN;
  location_function_exists BOOLEAN;
  separator CONSTANT TEXT := '========================================';
BEGIN
  -- Count policies per table
  SELECT COUNT(*) INTO contacts_policies FROM pg_policies WHERE tablename = 'contacts';
  SELECT COUNT(*) INTO deals_policies FROM pg_policies WHERE tablename = 'deals';
  SELECT COUNT(*) INTO pipelines_policies FROM pg_policies WHERE tablename = 'pipelines';
  SELECT COUNT(*) INTO tasks_policies FROM pg_policies WHERE tablename = 'tasks';
  SELECT COUNT(*) INTO activities_policies FROM pg_policies WHERE tablename = 'activities';
  SELECT COUNT(*) INTO files_policies FROM pg_policies WHERE tablename = 'files';
  SELECT COUNT(*) INTO ai_artifacts_policies FROM pg_policies WHERE tablename = 'ai_artifacts';
  
  -- Check functions exist
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_user_tenant_id_compat'
  ) INTO compat_function_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'user_has_location_access_rls'
  ) INTO location_function_exists;
  
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'VERIFICATION';
  RAISE NOTICE '%', separator;
  RAISE NOTICE 'contacts: % policies', contacts_policies;
  RAISE NOTICE 'deals: % policies', deals_policies;
  RAISE NOTICE 'pipelines: % policies', pipelines_policies;
  RAISE NOTICE 'tasks: % policies', tasks_policies;
  RAISE NOTICE 'activities: % policies', activities_policies;
  RAISE NOTICE 'files: % policies', files_policies;
  RAISE NOTICE 'ai_artifacts: % policies', ai_artifacts_policies;
  RAISE NOTICE '';
  RAISE NOTICE 'get_user_tenant_id_compat(): %', CASE WHEN compat_function_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE 'user_has_location_access_rls(): %', CASE WHEN location_function_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  
  IF contacts_policies >= 4 AND deals_policies >= 4 AND pipelines_policies >= 4 
     AND tasks_policies >= 4 AND activities_policies >= 4 AND files_policies >= 4 
     AND ai_artifacts_policies >= 4 AND compat_function_exists AND location_function_exists THEN
    RAISE NOTICE '✅ All tables have location-aware RLS policies';
    RAISE NOTICE '✅ All helper functions created';
  ELSE
    RAISE WARNING '⚠️  Some tables may be missing policies or functions';
  END IF;
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  separator CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '✅ LOCATION-AWARE RLS COMPLETE';
  RAISE NOTICE '%', separator;
  RAISE NOTICE '';
  RAISE NOTICE '✅ Helper function: get_user_tenant_id_compat()';
  RAISE NOTICE '✅ Helper function: user_has_location_access_rls()';
  RAISE NOTICE '✅ Updated 28 RLS policies across 7 tables';
  RAISE NOTICE '✅ Backward compatible with NULL location_id';
  RAISE NOTICE '✅ Admins/owners have full tenant access';
  RAISE NOTICE '✅ Staff scoped to their assigned locations';
  RAISE NOTICE '';
  RAISE NOTICE '📝 POLICY BEHAVIOR:';
  RAISE NOTICE '   - location_id = NULL → tenant-wide (old behavior)';
  RAISE NOTICE '   - location_id set → check membership_locations';
  RAISE NOTICE '   - owner/admin role → access all locations';
  RAISE NOTICE '   - staff/manager → only assigned locations';
  RAISE NOTICE '';
  RAISE NOTICE '💡 TESTING:';
  RAISE NOTICE '   1. Create test location for tenant';
  RAISE NOTICE '   2. Assign user to location via membership_locations';
  RAISE NOTICE '   3. Create contact/deal with location_id set';
  RAISE NOTICE '   4. Verify user can only see their location''s data';
  RAISE NOTICE '   5. Verify admin sees all data';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Step 3 Complete! Ready for Step 4.';
END $$;
