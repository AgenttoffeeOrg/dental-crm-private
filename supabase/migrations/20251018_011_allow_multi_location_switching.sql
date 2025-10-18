-- =====================================================
-- UPDATE TRIGGER TO ALLOW MULTI-LOCATION SWITCHING
-- Modifies prevent_tenant_id_change() to allow switches
-- when user has access to both tenants
-- =====================================================

-- Replace the trigger function with a smarter version
CREATE OR REPLACE FUNCTION prevent_tenant_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_multi_location_switch BOOLEAN := FALSE;
  v_accessible_tenants UUID[];
BEGIN
  -- If tenant_id hasn't changed, allow it
  IF OLD.tenant_id IS NOT DISTINCT FROM NEW.tenant_id THEN
    RETURN NEW;
  END IF;
  
  -- SPECIAL CASE: Multi-location switching for app_users table
  -- Allow if:
  -- 1. This is the app_users table
  -- 2. User is changing their OWN record
  -- 3. User has access to BOTH old and new tenants
  IF TG_TABLE_NAME = 'app_users' AND OLD.id = auth.uid() THEN
    BEGIN
      -- Get user's accessible tenants
      SELECT public.get_accessible_tenants() INTO v_accessible_tenants;
      
      -- Check if user has access to BOTH old and new tenant
      IF OLD.tenant_id = ANY(v_accessible_tenants) 
         AND NEW.tenant_id = ANY(v_accessible_tenants) THEN
        -- This is a valid multi-location switch
        v_is_multi_location_switch := TRUE;
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- If get_accessible_tenants fails, don't allow the switch
        v_is_multi_location_switch := FALSE;
    END;
  END IF;
  
  -- If it's a valid multi-location switch, allow it
  IF v_is_multi_location_switch THEN
    RETURN NEW;
  END IF;
  
  -- Otherwise, block the change (original security behavior)
  RAISE EXCEPTION 'SECURITY VIOLATION: Cannot change tenant_id after creation (table: %, id: %)', TG_TABLE_NAME, OLD.id
    USING ERRCODE = '23514'; -- check_violation
    
  RETURN NEW; -- Never reached, but required by syntax
END;
$$;

COMMENT ON FUNCTION prevent_tenant_id_change() IS 
  'Trigger function to prevent tenant_id modifications after record creation. 
   Exception: Allows multi-location users to switch between their accessible tenants.';

-- Test that the function was updated
DO $$
BEGIN
  RAISE NOTICE '✅ Updated prevent_tenant_id_change() to allow multi-location switching';
  RAISE NOTICE '   - Blocks normal tenant_id changes (security maintained)';
  RAISE NOTICE '   - Allows switching when user has access to both tenants';
  RAISE NOTICE '   - Only applies to app_users table for user''s own record';
END $$;

