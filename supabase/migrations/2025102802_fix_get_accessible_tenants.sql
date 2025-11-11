-- =====================================================
-- FIX: Update get_accessible_tenants() to use active_tenant_id
-- =====================================================
-- ROOT CAUSE: Function was using old `tenant_id` column instead of `active_tenant_id`
-- This caused ALL RLS policies to fail because they were checking against the wrong tenant!

CREATE OR REPLACE FUNCTION public.get_accessible_tenants()
RETURNS UUID[] AS $$
DECLARE
  user_active_tenant_id UUID;
  accessible_tenant_ids UUID[];
BEGIN
  -- Get user's ACTIVE tenant from app_users (not the old tenant_id!)
  SELECT active_tenant_id INTO user_active_tenant_id
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If no active tenant, return empty array (user needs to set active tenant)
  IF user_active_tenant_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Get all tenants user has membership in (via user_tenant_memberships)
  SELECT ARRAY_AGG(DISTINCT utm.tenant_id)
  INTO accessible_tenant_ids
  FROM user_tenant_memberships utm
  WHERE utm.user_id = auth.uid()
    AND utm.status = 'active';
  
  -- If user has no memberships, return empty array
  IF accessible_tenant_ids IS NULL OR array_length(accessible_tenant_ids, 1) IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Return all accessible tenants
  RETURN accessible_tenant_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_accessible_tenants IS 
  'Returns array of tenant IDs user has access to via user_tenant_memberships. Uses active_tenant_id from app_users.';

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_accessible_tenants() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_accessible_tenants() TO service_role;

DO $$ BEGIN RAISE NOTICE '✅ Fixed get_accessible_tenants() to use active_tenant_id and user_tenant_memberships'; END $$;

