SET search_path TO public, extensions;

-- =====================================================
-- Migration: get_user_accessible_locations RPC
-- Purpose: Helper function to fetch locations accessible to a user in a given tenant
-- Dependencies: membership_locations, user_tenant_memberships, locations tables
-- =====================================================

-- Drop existing if upgrading
DROP FUNCTION IF EXISTS public.get_user_accessible_locations(UUID, UUID);

-- Create function to get accessible locations for a user in a tenant
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
    AND utm.status = 'active'
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
    
    RETURN;
  END IF;
  
  -- Otherwise, return only locations with explicit access
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.tenant_id,
    l.is_primary,
    l.created_at
  FROM locations l
  INNER JOIN membership_locations ml ON ml.location_id = l.id
  WHERE ml.membership_id = v_membership_id
    AND ml.is_active = true
    AND l.tenant_id = p_tenant_id
  ORDER BY l.is_primary DESC, l.name ASC;
  
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(UUID, UUID) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.get_user_accessible_locations IS 
  'Returns all locations accessible to a user within a specific tenant. Respects all_locations flag and membership_locations constraints.';

-- =====================================================
-- Verification
-- =====================================================

DO $$
BEGIN
  -- Verify function exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_accessible_locations'
  ) THEN
    RAISE EXCEPTION 'Function public.get_user_accessible_locations not created!';
  END IF;
  
  RAISE NOTICE '✅ get_user_accessible_locations function created successfully';
END $$;

