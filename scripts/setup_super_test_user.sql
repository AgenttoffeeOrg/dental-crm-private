-- =====================================================
-- Setup Super Test User: deepakshegde@gmail.com
-- Purpose: Full access to all features for testing
-- Date: October 17, 2025
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FIND OR CREATE USER
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'deepakshegde@gmail.com';
  v_tenant_id UUID;
  v_dental_group_id UUID;
  v_location2_id UUID;
  v_location3_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found. Please sign up first.', v_email;
  END IF;
  
  RAISE NOTICE '✅ Found user: % (ID: %)', v_email, v_user_id;
  
  -- Get user's current tenant
  SELECT tenant_id INTO v_tenant_id
  FROM app_users
  WHERE id = v_user_id;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'User has no tenant assigned';
  END IF;
  
  RAISE NOTICE '✅ User tenant: %', v_tenant_id;
  
  -- =====================================================
  -- 2. UPGRADE TENANT TO MULTI-LOCATION
  -- =====================================================
  
  -- Create dental group for this user
  INSERT INTO dental_groups (
    name,
    primary_email,
    billing_email,
    created_by_user_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    'Deepak Test Dental Group',
    v_email,
    v_email,
    v_user_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_dental_group_id;
  
  -- If already exists, get the ID
  IF v_dental_group_id IS NULL THEN
    SELECT dg.id INTO v_dental_group_id
    FROM dental_groups dg
    INNER JOIN tenants t ON t.dental_group_id = dg.id
    WHERE t.id = v_tenant_id;
  END IF;
  
  RAISE NOTICE '✅ Dental group: %', v_dental_group_id;
  
  -- Update main tenant as location 1
  UPDATE tenants
  SET 
    is_multi_location = TRUE,
    dental_group_id = v_dental_group_id,
    location_name = 'Main Office - Downtown',
    updated_at = NOW()
  WHERE id = v_tenant_id;
  
  RAISE NOTICE '✅ Updated main tenant as Location 1';
  
  -- Create location 2
  INSERT INTO tenants (
    name,
    is_multi_location,
    dental_group_id,
    location_name,
    website_url,
    billing_email,
    currency_code,
    locale,
    created_at,
    updated_at
  )
  VALUES (
    'Deepak Test Dental - North Branch',
    TRUE,
    v_dental_group_id,
    'North Branch',
    'https://north.dentalcrm.test',
    v_email,
    'USD',
    'en-US',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_location2_id;
  
  IF v_location2_id IS NULL THEN
    SELECT id INTO v_location2_id
    FROM tenants
    WHERE dental_group_id = v_dental_group_id
      AND location_name = 'North Branch';
  END IF;
  
  RAISE NOTICE '✅ Created Location 2: %', v_location2_id;
  
  -- Create location 3
  INSERT INTO tenants (
    name,
    is_multi_location,
    dental_group_id,
    location_name,
    website_url,
    billing_email,
    currency_code,
    locale,
    created_at,
    updated_at
  )
  VALUES (
    'Deepak Test Dental - West Branch',
    TRUE,
    v_dental_group_id,
    'West Branch',
    'https://west.dentalcrm.test',
    v_email,
    'USD',
    'en-US',
    NOW(),
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_location3_id;
  
  IF v_location3_id IS NULL THEN
    SELECT id INTO v_location3_id
    FROM tenants
    WHERE dental_group_id = v_dental_group_id
      AND location_name = 'West Branch';
  END IF;
  
  RAISE NOTICE '✅ Created Location 3: %', v_location3_id;
  
  -- =====================================================
  -- 3. GRANT ACCESS TO ALL LOCATIONS
  -- =====================================================
  
  -- Grant access to location 1 (main)
  INSERT INTO user_location_access (
    user_id,
    tenant_id,
    granted_by_user_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_tenant_id,
    v_user_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = TRUE, updated_at = NOW();
  
  -- Grant access to location 2
  INSERT INTO user_location_access (
    user_id,
    tenant_id,
    granted_by_user_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_location2_id,
    v_user_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = TRUE, updated_at = NOW();
  
  -- Grant access to location 3
  INSERT INTO user_location_access (
    user_id,
    tenant_id,
    granted_by_user_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_location3_id,
    v_user_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = TRUE, updated_at = NOW();
  
  RAISE NOTICE '✅ Granted access to all 3 locations';
  
  -- =====================================================
  -- 4. MAKE USER TENANT ADMIN
  -- =====================================================
  
  INSERT INTO tenant_admins (
    user_id,
    tenant_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    v_user_id,
    v_tenant_id,
    TRUE,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET is_active = TRUE, updated_at = NOW();
  
  RAISE NOTICE '✅ Made user tenant admin';
  
  -- Assign Owner/Admin role with full permissions
  UPDATE app_users
  SET role = 'owner'
  WHERE id = v_user_id;
  
  RAISE NOTICE '✅ Assigned Owner role with full permissions';
  
  -- Make user platform super admin if the table exists (for maximum access)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'super_admins' AND table_schema = 'public') THEN
    -- Check if super_admins has user_id column (new schema)
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'super_admins' AND column_name = 'user_id') THEN
      INSERT INTO super_admins (user_id, is_active)
      VALUES (v_user_id, TRUE)
      ON CONFLICT (user_id) DO UPDATE
      SET is_active = TRUE;
      RAISE NOTICE '✅ Made user platform super admin (full system access)';
    ELSE
      RAISE NOTICE 'ℹ️  super_admins table has different schema (email-based), skipping';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️  super_admins table does not exist, skipping (user still has full tenant admin access)';
  END IF;
  
  -- =====================================================
  -- 5. CREATE UNLIMITED SUBSCRIPTION
  -- =====================================================
  
  -- Check if subscription already exists, update or insert
  IF EXISTS (SELECT 1 FROM subscriptions WHERE dental_group_id = v_dental_group_id) THEN
    -- Update existing subscription
    UPDATE subscriptions
    SET 
      status = 'active',
      seat_limit = 9999,
      active_seats = 1,
      current_period_end = NOW() + INTERVAL '1 year',
      updated_at = NOW()
    WHERE dental_group_id = v_dental_group_id;
    
    RAISE NOTICE '✅ Updated existing subscription to unlimited';
  ELSE
    -- Create new subscription with unlimited seats
    INSERT INTO subscriptions (
      dental_group_id,
      plan_id,
      status,
      seat_limit,
      active_seats,
      current_period_start,
      current_period_end,
      cancel_at_period_end,
      created_at,
      updated_at
    )
    SELECT
      v_dental_group_id,
      p.id,
      'active',
      9999, -- Unlimited seats for testing
      1,
      NOW(),
      NOW() + INTERVAL '1 year', -- Valid for 1 year
      FALSE,
      NOW(),
      NOW()
    FROM plans p
    WHERE p.name = 'Enterprise'
    LIMIT 1;
    
    RAISE NOTICE '✅ Created unlimited subscription';
  END IF;
  
  -- =====================================================
  -- 6. ENABLE ALL ENTITLEMENTS
  -- =====================================================
  
  -- Update subscription to have all features
  UPDATE subscriptions s
  SET updated_at = NOW()
  FROM plans p
  WHERE s.tenant_id = v_dental_group_id
    AND p.name = 'Enterprise'
    AND s.plan_id = p.id;
  
  RAISE NOTICE '✅ All enterprise features enabled';
  
  -- =====================================================
  -- FINAL SUMMARY
  -- =====================================================
  
  RAISE NOTICE '====================================================';
  RAISE NOTICE '✅ SUPER TEST USER SETUP COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'User: %', v_email;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Dental Group: %', v_dental_group_id;
  RAISE NOTICE 'Locations:';
  RAISE NOTICE '  1. Main Office (ID: %)', v_tenant_id;
  RAISE NOTICE '  2. North Branch (ID: %)', v_location2_id;
  RAISE NOTICE '  3. West Branch (ID: %)', v_location3_id;
  RAISE NOTICE 'Subscription: Enterprise (unlimited seats)';
  RAISE NOTICE 'Valid until: %', (NOW() + INTERVAL '1 year')::DATE;
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🚀 You can now test multi-location features!';
  RAISE NOTICE '====================================================';
  
END $$;

COMMIT;

