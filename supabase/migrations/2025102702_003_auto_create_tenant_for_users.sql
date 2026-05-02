SET search_path TO public, extensions;

-- =====================================================
-- FIX: AUTO-CREATE TENANT FOR NEW USERS
-- =====================================================
-- 
-- This migration ensures EVERY user gets a tenant + location
-- automatically upon sign-up (solo user case)
--
-- Run this to fix existing users + add automation for future users
-- =====================================================

-- =====================================================
-- PART 1: FIX EXISTING USERS WITHOUT TENANTS
-- =====================================================

DO $$
DECLARE
  v_user RECORD;
  v_new_tenant_id UUID;
  v_new_location_id UUID;
  v_membership_id UUID;
BEGIN
  -- Loop through users without active_tenant_id
  FOR v_user IN 
    SELECT id, email, full_name 
    FROM app_users 
    WHERE active_tenant_id IS NULL
  LOOP
    RAISE NOTICE 'Creating tenant for user: % (%)', v_user.email, v_user.id;
    
    -- Create a new tenant for this user
    INSERT INTO tenants (
      name,
      owner_id,
      is_multi_location,
      created_at,
      updated_at
    ) VALUES (
      COALESCE(v_user.full_name, 'My Practice'),  -- Use user's name or default
      v_user.id,
      false,  -- Start as single-location
      NOW(),
      NOW()
    ) RETURNING id INTO v_new_tenant_id;
    
    RAISE NOTICE '  ✅ Created tenant: %', v_new_tenant_id;
    
    -- Create default location for this tenant
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
      v_user.id,
      v_new_tenant_id,
      'owner',
      'active',
      true,  -- Owners get all_locations by default
      NOW(),
      NOW()
    ) RETURNING id INTO v_membership_id;
    
    RAISE NOTICE '  ✅ Created membership: %', v_membership_id;
    
    -- Set active context for user
    UPDATE app_users
    SET 
      active_tenant_id = v_new_tenant_id,
      active_location_id = v_new_location_id,
      default_tenant_id = v_new_tenant_id,
      default_location_id = v_new_location_id,
      updated_at = NOW()
    WHERE id = v_user.id;
    
    RAISE NOTICE '  ✅ Set active context for user';
    RAISE NOTICE '';
  END LOOP;
  
  RAISE NOTICE '🎉 Fixed all existing users without tenants!';
END $$;

-- =====================================================
-- PART 2: CREATE OR REPLACE TRIGGER FOR FUTURE SIGN-UPS
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
  IF NEW.active_tenant_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Auto-creating tenant for new user: %', NEW.email;
  
  -- Determine tenant name from user info
  v_user_name := COALESCE(NEW.full_name, SPLIT_PART(NEW.email, '@', 1));
  
  -- Create tenant
  INSERT INTO tenants (
    name,
    owner_id,
    is_multi_location,
    created_at,
    updated_at
  ) VALUES (
    v_user_name || '''s Practice',
    NEW.id,
    false,
    NOW(),
    NOW()
  ) RETURNING id INTO v_new_tenant_id;
  
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
  
  -- Create user membership
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
  
  -- Update the NEW record to set active context
  NEW.active_tenant_id := v_new_tenant_id;
  NEW.active_location_id := v_new_location_id;
  NEW.default_tenant_id := v_new_tenant_id;
  NEW.default_location_id := v_new_location_id;
  
  RAISE NOTICE '✅ Auto-created tenant % for user %', v_new_tenant_id, NEW.email;
  
  RETURN NEW;
END;
$$;

-- CREATE OR REPLACE TRIGGER on app_users INSERT
DROP TRIGGER IF EXISTS trigger_auto_create_tenant_for_new_user ON app_users;
CREATE OR REPLACE TRIGGER trigger_auto_create_tenant_for_new_user
  BEFORE INSERT ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_tenant_for_new_user();

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show all users and their tenant status
SELECT 
  au.email,
  au.full_name,
  CASE 
    WHEN au.active_tenant_id IS NOT NULL THEN '✅ HAS TENANT'
    ELSE '❌ NO TENANT'
  END AS status,
  t.name AS tenant_name,
  l.name AS location_name
FROM app_users au
LEFT JOIN tenants t ON t.id = au.active_tenant_id
LEFT JOIN locations l ON l.id = au.active_location_id
ORDER BY au.created_at;

-- Show membership summary
SELECT 
  '=== MEMBERSHIP SUMMARY ===' AS section,
  COUNT(DISTINCT au.id) AS total_users,
  COUNT(DISTINCT CASE WHEN au.active_tenant_id IS NOT NULL THEN au.id END) AS users_with_tenant,
  COUNT(DISTINCT utm.id) AS total_memberships,
  COUNT(DISTINCT utm.tenant_id) AS tenants_with_members
FROM app_users au
LEFT JOIN user_tenant_memberships utm ON utm.user_id = au.id;

-- Final status message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '1. ✅ Fixed existing users without tenants';
  RAISE NOTICE '2. ✅ Created auto-tenant trigger for future sign-ups';
  RAISE NOTICE '3. ✅ Every user now has organization + location';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Re-run ULTIMATE_ARCHITECTURE_VERIFICATION.sql to verify!';
END $$;

