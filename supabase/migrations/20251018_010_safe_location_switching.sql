-- =====================================================
-- SAFE LOCATION SWITCHING FUNCTION (SIMPLIFIED)
-- Works with updated trigger that allows multi-location switches
-- =====================================================

CREATE OR REPLACE FUNCTION public.switch_user_location(
  p_new_tenant_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_has_access BOOLEAN;
  v_old_tenant_id UUID;
  v_accessible_tenants UUID[];
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Not authenticated'
    );
  END IF;
  
  -- Get user's current tenant
  SELECT tenant_id INTO v_old_tenant_id
  FROM app_users
  WHERE id = v_user_id;
  
  -- Get all accessible tenants for this user
  SELECT public.get_accessible_tenants() INTO v_accessible_tenants;
  
  -- Check if user has access to the new tenant
  v_has_access := p_new_tenant_id = ANY(v_accessible_tenants);
  
  IF NOT v_has_access THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'You do not have access to this location'
    );
  END IF;
  
  -- Update user's tenant_id
  -- The trigger will allow this because:
  -- 1. User is updating their OWN record
  -- 2. User has access to both old and new tenant
  UPDATE app_users
  SET 
    tenant_id = p_new_tenant_id,
    updated_at = NOW()
  WHERE id = v_user_id;
  
  -- Log the switch for audit trail (if audit_logs table exists)
  BEGIN
    INSERT INTO audit_logs (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details,
      created_at
    ) VALUES (
      p_new_tenant_id,
      v_user_id,
      'location_switch',
      'tenant',
      p_new_tenant_id,
      jsonb_build_object(
        'from_tenant_id', v_old_tenant_id,
        'to_tenant_id', p_new_tenant_id,
        'accessible_tenants', v_accessible_tenants
      ),
      NOW()
    );
  EXCEPTION
    WHEN undefined_table THEN
      -- audit_logs table doesn't exist, skip logging silently
      NULL;
  END;
  
  RETURN jsonb_build_object(
    'success', true,
    'new_tenant_id', p_new_tenant_id,
    'message', 'Location switched successfully'
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.switch_user_location(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.switch_user_location IS 
  'Safely switches user to a different location (tenant) if they have access. 
   Works with prevent_tenant_id_change trigger which validates the switch.
   Used for multi-location functionality.';
