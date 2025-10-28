-- =====================================================
-- COMPLETE RLS FIX FOR BOTH FUNCTIONS
-- =====================================================
-- This fixes BOTH the user_has_location_access_rls AND get_user_accessible_locations functions
-- Run this in your Supabase SQL Editor

-- =====================================================
-- FIX 1: user_has_location_access_rls - Add all_locations check
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
  v_has_all_locations BOOLEAN;
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
      AND role IN ('owner', 'admin')
      AND status = 'active'
  ) THEN
    RETURN TRUE;
  END IF;

  -- NEW: Check if user has all_locations access
  SELECT all_locations INTO v_has_all_locations
  FROM user_tenant_memberships
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND status = 'active'
  LIMIT 1;

  IF v_has_all_locations = TRUE THEN
    RETURN TRUE;
  END IF;

  -- Check explicit location access via membership_locations
  -- REMOVED: ml.is_active check (column doesn't exist)
  IF EXISTS (
    SELECT 1
    FROM user_tenant_memberships utm
    JOIN membership_locations ml ON ml.membership_id = utm.id
    WHERE utm.user_id = p_user_id
      AND utm.tenant_id = p_tenant_id
      AND utm.status = 'active'
      AND ml.location_id = p_location_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- No access found
  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_has_location_access_rls(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_location_access_rls(UUID, UUID, UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE '✅ Fixed public.user_has_location_access_rls() - Added all_locations check'; END $$;

-- =====================================================
-- FIX 2: get_user_accessible_locations - Fix utm.is_active reference
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_accessible_locations(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  tenant_id UUID,
  is_primary BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_all_locations BOOLEAN;
  v_membership_id UUID;
BEGIN
  -- Get user's membership for this tenant
  SELECT
    utm.id,
    utm.all_locations
  INTO
    v_membership_id,
    v_all_locations
  FROM user_tenant_memberships utm
  WHERE utm.user_id = p_user_id
    AND utm.tenant_id = p_tenant_id
    AND utm.status = 'active' -- Fixed: was utm.is_active = true
  LIMIT 1;

  -- If no membership found, return empty
  IF v_membership_id IS NULL THEN
    RETURN;
  END IF;

  -- If user has all_locations=true, return all locations in tenant
  IF v_all_locations = true THEN
    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.tenant_id,
      l.is_primary,
      l.created_at
    FROM locations l
    WHERE l.tenant_id = p_tenant_id
    ORDER BY l.is_primary DESC, l.name ASC;

  -- If user has specific location access, return only those locations
  ELSE
    RETURN QUERY
    SELECT
      l.id,
      l.name,
      l.tenant_id,
      l.is_primary,
      l.created_at
    FROM locations l
    JOIN membership_locations ml ON l.id = ml.location_id
    WHERE ml.membership_id = v_membership_id
      AND l.tenant_id = p_tenant_id
    ORDER BY l.is_primary DESC, l.name ASC;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(UUID, UUID) TO service_role;

DO $$ BEGIN RAISE NOTICE '✅ Fixed public.get_user_accessible_locations() - Changed utm.is_active to utm.status'; END $$;

-- =====================================================
-- VERIFICATION TEST
-- =====================================================

DO $$
DECLARE
  test_user_id UUID;
  test_tenant_id UUID;
  test_location_id UUID;
  test_result BOOLEAN;
BEGIN
  -- Get deepak's user ID
  SELECT id INTO test_user_id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com';
  
  -- Get Smile tenant ID
  SELECT id INTO test_tenant_id FROM tenants WHERE name = 'Smile';
  
  -- Get first location in Smile tenant
  SELECT id INTO test_location_id FROM locations WHERE tenant_id = test_tenant_id LIMIT 1;
  
  IF test_user_id IS NOT NULL AND test_tenant_id IS NOT NULL AND test_location_id IS NOT NULL THEN
    -- Test the RLS function
    SELECT public.user_has_location_access_rls(test_user_id, test_tenant_id, test_location_id)
    INTO test_result;
    
    RAISE NOTICE '====================================';
    RAISE NOTICE '🧪 VERIFICATION TEST RESULTS';
    RAISE NOTICE '====================================';
    RAISE NOTICE 'User: deepak.s.hegde@gmail.com';
    RAISE NOTICE 'Tenant: Smile';
    RAISE NOTICE 'Location Access Result: %', test_result;
    
    IF test_result = TRUE THEN
      RAISE NOTICE '✅ SUCCESS! User now has location access!';
      RAISE NOTICE '🎉 Your 120 deals should now be visible!';
    ELSE
      RAISE NOTICE '⚠️ WARNING: Still returning FALSE';
      RAISE NOTICE 'This might indicate a membership configuration issue';
    END IF;
  ELSE
    RAISE NOTICE '⚠️ Could not find test data (user/tenant/location)';
  END IF;
END $$;

