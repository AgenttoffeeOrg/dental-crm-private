-- =====================================================
-- STEP 1D: ADD MULTI-ORG TENANT RESOLUTION (NO AUTH SCHEMA CHANGES)
-- Purpose: Create multi-org aware functions WITHOUT modifying auth schema
-- Safety: Zero changes to existing auth.get_user_tenant_id() function
-- =====================================================
--
-- WHAT THIS DOES:
-- 1. Creates public.get_user_tenant_id_v2() with multi-org support
-- 2. Creates public.set_active_tenant() for org switching
-- 3. Does NOT modify auth schema (no permission needed)
-- 4. Application code will use new public functions
-- 5. Existing RLS policies continue using old auth function (dual-read period)
--
-- WHY THIS IS SAFE:
-- - auth.get_user_tenant_id() unchanged (RLS policies work)
-- - New functions in public schema (we have permission)
-- - Application will call public functions directly
-- - Gradual migration path
--
-- FALLBACK PRIORITY:
-- 1. active_tenant_id (user's current selection)
-- 2. First active membership (new system)
-- 3. app_users.tenant_id (legacy - still works!)
--
-- NOTE: In a later step, after testing, we'll update RLS policies
-- to use the new function. For now, both systems coexist.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE NEW MULTI-ORG AWARE FUNCTION (PUBLIC SCHEMA)
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_tenant_id_v2(p_user_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_user_id UUID;
  v_active_tenant_id UUID;
  v_first_membership_tenant_id UUID;
  v_legacy_tenant_id UUID;
  v_use_legacy BOOLEAN;
  status_active CONSTANT membership_status := 'active';
BEGIN
  -- Get user ID (use parameter or auth.uid())
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  IF v_user_id IS NULL THEN
    RETURN NULL;  -- No authenticated user
  END IF;
  
  -- Check feature flag: use_legacy_membership (emergency rollback)
  SELECT enabled INTO v_use_legacy
  FROM feature_flags
  WHERE key = 'use_legacy_membership';
  
  -- If legacy mode enabled (true = use old system), skip new system entirely
  IF COALESCE(v_use_legacy, true) THEN
    SELECT tenant_id INTO v_legacy_tenant_id
    FROM app_users
    WHERE id = v_user_id
    LIMIT 1;
    
    RETURN v_legacy_tenant_id;
  END IF;
  
  -- NEW SYSTEM: Multi-org aware lookup
  
  -- Priority 1: active_tenant_id (user's current selection)
  SELECT active_tenant_id INTO v_active_tenant_id
  FROM app_users
  WHERE id = v_user_id;
  
  IF v_active_tenant_id IS NOT NULL AND EXISTS (
    SELECT 1 
    FROM user_tenant_memberships 
    WHERE user_id = v_user_id 
      AND tenant_id = v_active_tenant_id 
      AND status = status_active
  ) THEN
    RETURN v_active_tenant_id;
  END IF;
  -- Invalid active_tenant_id (stale), fall through to next priority
  
  -- Priority 2: First active membership (new system)
  SELECT tenant_id INTO v_first_membership_tenant_id
  FROM user_tenant_memberships
  WHERE user_id = v_user_id
    AND status = status_active
  ORDER BY joined_at ASC
  LIMIT 1;
  
  IF v_first_membership_tenant_id IS NOT NULL THEN
    -- Auto-update active_tenant_id for next time (optimization)
    UPDATE app_users
    SET active_tenant_id = v_first_membership_tenant_id
    WHERE id = v_user_id
      AND active_tenant_id IS NULL;
    
    RETURN v_first_membership_tenant_id;
  END IF;
  
  -- Priority 3: Legacy tenant_id (backward compatibility)
  SELECT tenant_id INTO v_legacy_tenant_id
  FROM app_users
  WHERE id = v_user_id;
  
  IF v_legacy_tenant_id IS NOT NULL THEN
    -- Auto-update active_tenant_id from legacy (migration helper)
    UPDATE app_users
    SET active_tenant_id = v_legacy_tenant_id
    WHERE id = v_user_id
      AND active_tenant_id IS NULL;
    
    RETURN v_legacy_tenant_id;
  END IF;
  
  -- No tenant found (user exists but not in any org - shouldn't happen)
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.get_user_tenant_id_v2(UUID) IS
  'Multi-org aware tenant resolution. Fallback: active > membership > legacy. Respects use_legacy_membership flag. Application code should use this instead of auth.get_user_tenant_id().';

-- =====================================================
-- 2. ADD HELPER FUNCTION: SET ACTIVE TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.set_active_tenant(p_user_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_member BOOLEAN;
  status_active CONSTANT membership_status := 'active';
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'User ID required';
  END IF;
  
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant ID required';
  END IF;
  
  -- Verify user is member of tenant
  SELECT EXISTS (
    SELECT 1 
    FROM user_tenant_memberships 
    WHERE user_id = p_user_id 
      AND tenant_id = p_tenant_id 
      AND status = status_active
  ) INTO v_is_member;
  
  IF NOT v_is_member THEN
    -- Check legacy membership as fallback
    SELECT EXISTS (
      SELECT 1 
      FROM app_users 
      WHERE id = p_user_id 
        AND tenant_id = p_tenant_id
    ) INTO v_is_member;
  END IF;
  
  IF NOT v_is_member THEN
    RAISE EXCEPTION 'User % is not a member of tenant %', p_user_id, p_tenant_id;
  END IF;
  
  -- Update active tenant
  UPDATE app_users
  SET 
    active_tenant_id = p_tenant_id,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.set_active_tenant(UUID, UUID) IS
  'Switches user active tenant. Validates membership before updating. Call from application code.';

-- Convenience wrapper that uses auth.uid()
CREATE OR REPLACE FUNCTION public.set_active_tenant(p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT public.set_active_tenant(auth.uid(), p_tenant_id);
$$;

COMMENT ON FUNCTION public.set_active_tenant(UUID) IS
  'Switches current user active tenant (uses auth.uid()). Call from RPC or application.';

-- =====================================================
-- 3. ADD HELPER FUNCTION: GET ACTIVE TENANT
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_active_tenant_for_user(p_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_tenant_id_v2(p_user_id);
$$;

COMMENT ON FUNCTION public.get_active_tenant_for_user(UUID) IS
  'Alias for get_user_tenant_id_v2(). Returns user active tenant with fallback logic.';

-- Convenience wrapper for current user
CREATE OR REPLACE FUNCTION public.get_active_tenant()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.get_user_tenant_id_v2(auth.uid());
$$;

COMMENT ON FUNCTION public.get_active_tenant() IS
  'Returns current user active tenant. Use this in application code.';

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_tenant(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_active_tenant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_tenant_for_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_active_tenant() TO authenticated;

-- Grant execute to anon (for RPC calls before auth)
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id_v2(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_active_tenant() TO anon;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION public.get_user_tenant_id_v2(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_active_tenant(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_active_tenant(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_tenant_for_user(UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_tenant() TO service_role;

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

DO $$
DECLARE
  test_user_id UUID;
  test_tenant_id UUID;
  resolved_tenant_id UUID;
  auth_function_exists BOOLEAN;
  verification_header CONSTANT TEXT := '========================================';
  verification_title CONSTANT TEXT := 'FUNCTION VERIFICATION';
BEGIN
  -- Check if auth.get_user_tenant_id() exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'get_user_tenant_id'
  ) INTO auth_function_exists;
  
  -- Get a sample user
  SELECT id, tenant_id INTO test_user_id, test_tenant_id
  FROM app_users
  LIMIT 1;
  
  RAISE NOTICE '%', verification_header;
  RAISE NOTICE '%', verification_title;
  RAISE NOTICE '%', verification_header;
  
  IF auth_function_exists THEN
    RAISE NOTICE '✅ auth.get_user_tenant_id() exists (unchanged)';
  ELSE
    RAISE NOTICE '⚠️  auth.get_user_tenant_id() not found';
  END IF;
  
  IF test_user_id IS NOT NULL THEN
    -- Test the new function
    SELECT public.get_user_tenant_id_v2(test_user_id) INTO resolved_tenant_id;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Sample user ID: %', test_user_id;
    RAISE NOTICE 'User stored tenant_id: %', test_tenant_id;
    RAISE NOTICE 'New function returned: %', resolved_tenant_id;
    RAISE NOTICE '';
    
    IF resolved_tenant_id = test_tenant_id THEN
      RAISE NOTICE '✅ New function returns correct tenant (matches legacy)';
    ELSE
      RAISE WARNING '⚠️  Function returned different tenant - verify this is expected';
    END IF;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ public.get_user_tenant_id_v2(user_id) created';
  RAISE NOTICE '✅ public.get_active_tenant() created';
  RAISE NOTICE '✅ public.set_active_tenant(tenant_id) created';
  RAISE NOTICE '✅ public.get_active_tenant_for_user(user_id) created';
  RAISE NOTICE '✅ Permissions granted to authenticated, anon, service_role';
  RAISE NOTICE '';
  RAISE NOTICE 'Test manually:';
  RAISE NOTICE '  SELECT public.get_active_tenant();';
  RAISE NOTICE '  SELECT public.get_user_tenant_id_v2(auth.uid());';
END $$;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  completion_header CONSTANT TEXT := '========================================';
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '%', completion_header;
  RAISE NOTICE '✅ MULTI-ORG FUNCTIONS CREATED';
  RAISE NOTICE '%', completion_header;
  RAISE NOTICE '';
  RAISE NOTICE '✅ public.get_user_tenant_id_v2() - Multi-org tenant resolution';
  RAISE NOTICE '✅ public.get_active_tenant() - Current user tenant (convenience)';
  RAISE NOTICE '✅ public.set_active_tenant() - Switch organizations';
  RAISE NOTICE '✅ public.get_active_tenant_for_user() - Get any user tenant';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 auth.get_user_tenant_id() UNCHANGED';
  RAISE NOTICE '   - RLS policies continue working';
  RAISE NOTICE '   - No permission errors';
  RAISE NOTICE '   - Legacy system intact';
  RAISE NOTICE '';
  RAISE NOTICE '📝 APPLICATION CODE:';
  RAISE NOTICE '   - Use public.get_active_tenant() for queries';
  RAISE NOTICE '   - Use public.set_active_tenant(id) for org switching';
  RAISE NOTICE '   - RLS still uses auth function (dual-read period)';
  RAISE NOTICE '';
  RAISE NOTICE '♻️  DUAL-READ PERIOD:';
  RAISE NOTICE '   - Old system: app_users.tenant_id + auth function';
  RAISE NOTICE '   - New system: memberships + public functions';
  RAISE NOTICE '   - Both work simultaneously';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Fallback chain: active > membership > legacy';
  RAISE NOTICE '🚨 Emergency rollback: use_legacy_membership flag';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Step 1 migrations complete!';
  RAISE NOTICE '📝 Next: Application code changes (API + UI)';
END $$;
