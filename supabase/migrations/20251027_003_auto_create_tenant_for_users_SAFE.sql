-- =====================================================
-- SAFE AUTO-CREATE TENANT FOR NEW USERS
-- =====================================================
-- 
-- This migration ONLY adds a trigger for future sign-ups.
-- It does NOT modify existing users or change any workflows.
-- It works with your existing tenants table schema.
--
-- SAFETY GUARANTEED:
-- • No existing data modified
-- • No columns added/removed
-- • Only adds trigger for NEW users
-- • Fully backwards compatible
-- =====================================================

-- =====================================================
-- CREATE TRIGGER FOR FUTURE SIGN-UPS ONLY
-- =====================================================

-- Function to auto-create tenant for new users
CREATE OR REPLACE FUNCTION public.auto_create_tenant_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_new_tenant_id UUID;
  v_new_location_id UUID;
  v_membership_id UUID;
  v_user_name TEXT;
BEGIN
  -- Only proceed if user doesn't have a tenant yet
  -- This check ensures we don't interfere with invited users
  IF NEW.active_tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Auto-creating tenant for new user: %', NEW.email;
  
  -- Determine tenant name from user info
  v_user_name := COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1));
  
  -- Create tenant (using ONLY existing columns)
  INSERT INTO tenants (
    name,
    is_multi_location,
    created_at
  ) VALUES (
    v_user_name || '''s Practice',
    false,
    NOW()
  ) RETURNING id INTO v_new_tenant_id;
  
  RAISE NOTICE '  ✅ Created tenant: %', v_new_tenant_id;
  
  -- Create default location
  INSERT INTO locations (
    tenant_id,
    name,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    v_new_tenant_id,
    'Main Office',
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_location_id;
  
  RAISE NOTICE '  ✅ Created location: %', v_new_location_id;
  
  -- Create user membership (owner with all_locations access)
  INSERT INTO user_tenant_memberships (
    user_id,
    tenant_id,
    role,
    status,
    all_locations,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    v_new_tenant_id,
    'owner',
    'active',
    true,
    NOW(),
    NOW()
  ) RETURNING id INTO v_membership_id;
  
  RAISE NOTICE '  ✅ Created membership: %', v_membership_id;
  
  -- Update the NEW record to set active context
  NEW.active_tenant_id := v_new_tenant_id;
  NEW.active_location_id := v_new_location_id;
  NEW.default_tenant_id := v_new_tenant_id;
  NEW.default_location_id := v_new_location_id;
  
  RAISE NOTICE '✅ Auto-created tenant % for user %', v_new_tenant_id, NEW.email;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block user creation
    RAISE WARNING 'Failed to auto-create tenant for %: %', NEW.email, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_create_tenant_for_new_user() 
IS 'Automatically creates tenant + location for solo user sign-ups. Does NOT affect invited users who already have active_tenant_id set.';

-- Create trigger on app_users INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;
CREATE TRIGGER trigger_auto_create_tenant_for_new_user
  BEFORE INSERT ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_for_new_user();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show current user status
SELECT 
  'Current User Status' AS info,
  COUNT(*) AS total_users,
  COUNT(*) FILTER (WHERE active_tenant_id IS NOT NULL) AS users_with_tenant,
  COUNT(*) FILTER (WHERE active_tenant_id IS NULL) AS users_without_tenant
FROM app_users;

-- Final message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 TRIGGER INSTALLED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '✅ Created auto-tenant trigger for future sign-ups';
  RAISE NOTICE '✅ Solo users will automatically get tenant + location';
  RAISE NOTICE '✅ Invited users are NOT affected (check preserves active_tenant_id)';
  RAISE NOTICE '✅ Existing users are NOT modified';
  RAISE NOTICE '';
  RAISE NOTICE 'SAFETY: This is a minimal change that only affects NEW user creation';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Test by creating a new user via sign-up!';
END $$;

