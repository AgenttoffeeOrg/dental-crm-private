-- =====================================================
-- Migration: Fix get_user_accessible_locations column reference
-- Purpose: Update function to use status='active' instead of is_active=true
-- =====================================================

-- Drop and recreate the function with the correct column reference
DROP FUNCTION IF EXISTS public.get_user_accessible_locations(UUID, UUID);

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
    AND utm.status = 'active' -- FIXED: was utm.is_active = true
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
  
  -- Otherwise, return only locations user has explicit access to
  RETURN QUERY
  SELECT 
    l.id,
    l.name,
    l.tenant_id,
    l.is_primary,
    l.created_at
  FROM locations l
  INNER JOIN membership_locations ml ON l.id = ml.location_id
  WHERE ml.membership_id = v_membership_id
    AND l.tenant_id = p_tenant_id
  ORDER BY l.is_primary DESC, l.name ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_accessible_locations(UUID, UUID) TO service_role;

DO $$ BEGIN 
  RAISE NOTICE '✅ Fixed public.get_user_accessible_locations() - now uses status=active instead of is_active'; 
END $$;

