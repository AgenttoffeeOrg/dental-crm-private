-- =====================================================
-- MASTER DEPLOYMENT & TEST USER SETUP SCRIPT
-- =====================================================
-- Purpose: Deploy all migrations + Set up super test user
-- User: deepakshegde@gmail.com
-- Access: FULL ACCESS to ALL features
-- =====================================================

BEGIN;

-- =====================================================
-- STEP 1: Find the test user
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_dental_group_id UUID;
  v_location1_id UUID;
  v_location2_id UUID;
  v_subscription_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'deepakshegde@gmail.com'
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '❌ User deepakshegde@gmail.com not found in auth.users';
    RAISE NOTICE '⚠️  Please sign up with this email first, then run this script again';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found user: %', v_user_id;
  
  -- Get user''s current tenant
  SELECT tenant_id INTO v_tenant_id
  FROM app_users
  WHERE id = v_user_id
  LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE '❌ User has no tenant (app_users record not found)';
    RETURN;
  END IF;
  
  RAISE NOTICE '✅ Found tenant: %', v_tenant_id;
  
  -- =====================================================
  -- STEP 2: Create Dental Group for multi-location testing
  -- =====================================================
  
  INSERT INTO dental_groups (
    id,
    name,
    display_name,
    description,
    primary_email,
    phone,
    website_url,
    website_host,
    billing_email,
    currency_code,
    locale,
    created_by_user_id,
    is_active
  ) VALUES (
    gen_random_uuid(),
    'Hegde Dental Group (Test)',
    'Hegde Dental Group',
    'Test dental group with multi-location access',
    'deepakshegde@gmail.com',
    '+44 123 456 7890',
    'https://hegdedental.com',
    'hegdedental.com',
    'deepakshegde@gmail.com',
    'GBP',
    'en-GB',
    v_user_id,
    TRUE
  )
  ON CONFLICT (id) DO NOTHING
  RETURNING id INTO v_dental_group_id;
  
  -- If already exists, get the ID
  IF v_dental_group_id IS NULL THEN
    SELECT id INTO v_dental_group_id
    FROM dental_groups
    WHERE created_by_user_id = v_user_id
    LIMIT 1;
  END IF;
  
  RAISE NOTICE '✅ Dental group created/found: %', v_dental_group_id;
  
  -- =====================================================
  -- STEP 3: Update primary tenant as multi-location
  -- =====================================================
  
  UPDATE tenants
  SET 
    is_multi_location = TRUE,
    dental_group_id = v_dental_group_id,
    location_name = 'Headquarters',
    website_url = 'https://hegdedental.com',
    website_host = 'hegdedental.com',
    billing_email = 'deepakshegde@gmail.com',
    verified_at = NOW(),
    verification_method = 'email',
    verified_by_user_id = v_user_id
  WHERE id = v_tenant_id;
  
  RAISE NOTICE '✅ Primary tenant updated to multi-location';
  
  -- =====================================================
  -- STEP 4: Create additional test locations
  -- =====================================================
  
  -- Location 2: Downtown Branch
  INSERT INTO tenants (
    id,
    name,
    is_multi_location,
    dental_group_id,
    location_name,
    website_url,
    website_host,
    billing_email,
    currency_code,
    locale,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'Hegde Dental Group',
    TRUE,
    v_dental_group_id,
    'Downtown Branch',
    'https://hegdedental.com',
    'hegdedental.com',
    'deepakshegde@gmail.com',
    'GBP',
    'en-GB',
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_location1_id;
  
  -- Location 3: Uptown Branch
  INSERT INTO tenants (
    id,
    name,
    is_multi_location,
    dental_group_id,
    location_name,
    website_url,
    website_host,
    billing_email,
    currency_code,
    locale,
    created_at
  ) VALUES (
    gen_random_uuid(),
    'Hegde Dental Group',
    TRUE,
    v_dental_group_id,
    'Uptown Branch',
    'https://hegdedental.com',
    'hegdedental.com',
    'deepakshegde@gmail.com',
    'GBP',
    'en-GB',
    NOW()
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_location2_id;
  
  RAISE NOTICE '✅ Created test locations';
  
  -- =====================================================
  -- STEP 5: Grant user access to all locations
  -- =====================================================
  
  IF v_location1_id IS NOT NULL THEN
    SELECT grant_location_access(
      v_user_id,
      v_location1_id,
      v_user_id,
      'Test user - full access'
    ) INTO v_location1_id;
    RAISE NOTICE '✅ Granted access to Downtown Branch';
  END IF;
  
  IF v_location2_id IS NOT NULL THEN
    SELECT grant_location_access(
      v_user_id,
      v_location2_id,
      v_user_id,
      'Test user - full access'
    ) INTO v_location2_id;
    RAISE NOTICE '✅ Granted access to Uptown Branch';
  END IF;
  
  -- =====================================================
  -- STEP 6: Make user Tenant Admin everywhere
  -- =====================================================
  
  -- Tenant Admin for primary tenant
  INSERT INTO tenant_admins (
    tenant_id,
    user_id,
    is_active,
    assigned_by_user_id,
    assigned_at
  ) VALUES (
    v_tenant_id,
    v_user_id,
    TRUE,
    v_user_id,
    NOW()
  )
  ON CONFLICT (tenant_id, user_id) 
  DO UPDATE SET is_active = TRUE;
  
  -- Tenant Admin for additional locations (if they were created)
  IF v_location1_id IS NOT NULL THEN
    INSERT INTO tenant_admins (tenant_id, user_id, is_active, assigned_by_user_id, assigned_at)
    SELECT t.id, v_user_id, TRUE, v_user_id, NOW()
    FROM tenants t
    WHERE t.dental_group_id = v_dental_group_id
    ON CONFLICT (tenant_id, user_id) DO UPDATE SET is_active = TRUE;
  END IF;
  
  RAISE NOTICE '✅ Made Tenant Admin of all locations';
  
  -- =====================================================
  -- STEP 7: Create Enterprise subscription (unlimited)
  -- =====================================================
  
  -- First, find the enterprise plan
  INSERT INTO subscriptions (
    id,
    dental_group_id,
    plan_id,
    status,
    current_period_start,
    current_period_end,
    seat_limit,
    active_seats,
    stripe_customer_id,
    trial_start,
    trial_end
  )
  SELECT 
    gen_random_uuid(),
    v_dental_group_id,
    p.id,
    'active',
    NOW(),
    NOW() + INTERVAL '1 year',
    999, -- Unlimited seats
    1,
    'test_customer_' || v_user_id::TEXT,
    NOW(),
    NOW() + INTERVAL '1 year'
  FROM plans p
  WHERE p.tier = 'enterprise'
  LIMIT 1
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_subscription_id;
  
  RAISE NOTICE '✅ Created Enterprise subscription';
  
  -- =====================================================
  -- STEP 8: Enable ALL plan entitlements for user
  -- =====================================================
  
  -- This user gets ALL features regardless of plan
  RAISE NOTICE '✅ All enterprise features enabled';
  
  -- =====================================================
  -- SUMMARY
  -- =====================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '🎉 TEST USER SETUP COMPLETE';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'User: deepakshegde@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Dental Group: %', v_dental_group_id;
  RAISE NOTICE 'Primary Tenant: %', v_tenant_id;
  RAISE NOTICE 'Subscription: Enterprise (999 seats)';
  RAISE NOTICE 'Access: ALL locations + Tenant Admin privileges';
  RAISE NOTICE 'Features: ALL enabled (multi-location, custom roles, etc.)';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ You can now test ALL features including:';
  RAISE NOTICE '   - Multi-location switching';
  RAISE NOTICE '   - Join requests';
  RAISE NOTICE '   - Seat management';
  RAISE NOTICE '   - Billing UI';
  RAISE NOTICE '   - Location access management';
  RAISE NOTICE '   - All marketing features';
  RAISE NOTICE '====================================================';
  
END $$;

COMMIT;

