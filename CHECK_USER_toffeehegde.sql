-- =====================================================
-- DIAGNOSTIC SCRIPT: Check toffeehegde@gmail.com user state
-- =====================================================

DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_location_id UUID;
  v_app_user_record RECORD;
  v_tenant_record RECORD;
  v_location_record RECORD;
  v_membership_record RECORD;
  v_location_name TEXT;
  v_location_address TEXT;
  v_location_phone TEXT;
  v_membership_count INT;
  v_location_count INT;
BEGIN
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'CHECKING USER: toffeehegde@gmail.com';
  RAISE NOTICE '====================================================';
  RAISE NOTICE '';

  -- 1. Check auth.users
  RAISE NOTICE '1. AUTH.USERS:';
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'toffeehegde@gmail.com';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '  ❌ User not found in auth.users';
    RETURN;
  ELSE
    RAISE NOTICE '  ✅ User found: %', v_user_id;
  END IF;
  RAISE NOTICE '';

  -- 2. Check app_users
  RAISE NOTICE '2. APP_USERS:';
  SELECT 
    id,
    email,
    full_name,
    tenant_id,
    active_tenant_id,
    active_location_id,
    onboarding_current_step,
    created_at
  INTO v_app_user_record
  FROM app_users 
  WHERE id = v_user_id;
  
  IF v_app_user_record IS NULL THEN
    RAISE NOTICE '  ❌ User not found in app_users';
    RETURN;
  END IF;
  
  RAISE NOTICE '  ✅ User found in app_users:';
  RAISE NOTICE '    id: %', v_app_user_record.id;
  RAISE NOTICE '    email: %', v_app_user_record.email;
  RAISE NOTICE '    full_name: %', v_app_user_record.full_name;
  RAISE NOTICE '    tenant_id: %', v_app_user_record.tenant_id;
  RAISE NOTICE '    active_tenant_id: %', v_app_user_record.active_tenant_id;
  RAISE NOTICE '    active_location_id: %', v_app_user_record.active_location_id;
  RAISE NOTICE '    onboarding_current_step: %', v_app_user_record.onboarding_current_step;
  
  -- Set tenant and location IDs (use COALESCE for proper fallback)
  v_tenant_id := COALESCE(v_app_user_record.active_tenant_id, v_app_user_record.tenant_id);
  v_location_id := v_app_user_record.active_location_id;
  RAISE NOTICE '';

  -- 3. Check tenants
  IF v_tenant_id IS NOT NULL THEN
    RAISE NOTICE '3. TENANTS (using active_tenant_id or tenant_id):';
    RAISE NOTICE '  tenant_id: %', v_tenant_id;
    
    SELECT id, name, account_type, created_at 
    INTO v_tenant_record
    FROM tenants 
    WHERE id = v_tenant_id;
    
    IF v_tenant_record IS NULL THEN
      RAISE NOTICE '  ❌ Tenant not found';
    ELSE
      RAISE NOTICE '  ✅ Tenant found:';
      RAISE NOTICE '    id: %', v_tenant_record.id;
      RAISE NOTICE '    name: %', v_tenant_record.name;
      RAISE NOTICE '    account_type: %', v_tenant_record.account_type;
      RAISE NOTICE '    created_at: %', v_tenant_record.created_at;
    END IF;
    
    RAISE NOTICE '';
    
    -- 4. Check user_tenant_memberships
    RAISE NOTICE '4. USER_TENANT_MEMBERSHIPS:';
    SELECT COUNT(*) INTO v_membership_count
    FROM user_tenant_memberships 
    WHERE user_id = v_user_id AND tenant_id = v_tenant_id;
    
    RAISE NOTICE '  Found % membership(s)', v_membership_count;
    
    FOR v_membership_record IN
      SELECT 
        id,
        user_id,
        tenant_id,
        role,
        status,
        all_locations,
        created_at
      FROM user_tenant_memberships 
      WHERE user_id = v_user_id AND tenant_id = v_tenant_id
    LOOP
      RAISE NOTICE '  ✅ Membership:';
      RAISE NOTICE '    id: %', v_membership_record.id;
      RAISE NOTICE '    role: %', v_membership_record.role;
      RAISE NOTICE '    status: %', v_membership_record.status;
      RAISE NOTICE '    all_locations: %', v_membership_record.all_locations;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- 5. Check locations
    RAISE NOTICE '5. LOCATIONS (for tenant %):', v_tenant_id;
    SELECT COUNT(*) INTO v_location_count
    FROM locations 
    WHERE tenant_id = v_tenant_id;
    
    RAISE NOTICE '  Found % location(s)', v_location_count;
    
    -- Query locations - only select columns that definitely exist
    FOR v_location_record IN
      SELECT 
        id,
        tenant_id,
        name,
        city,
        postal_code,
        is_primary,
        is_active,
        created_at
      FROM locations 
      WHERE tenant_id = v_tenant_id
      ORDER BY is_primary DESC, created_at ASC
    LOOP
      -- Get address and phone separately using dynamic SQL to handle column variations
      v_location_address := NULL;
      v_location_phone := NULL;
      
      -- Try to get address (check both address_line1 and address columns)
      BEGIN
        EXECUTE 'SELECT address_line1 FROM locations WHERE id = $1' INTO v_location_address USING v_location_record.id;
      EXCEPTION WHEN OTHERS THEN
        -- Column doesn't exist or other error, try 'address' column
        BEGIN
          EXECUTE 'SELECT address FROM locations WHERE id = $1' INTO v_location_address USING v_location_record.id;
        EXCEPTION WHEN OTHERS THEN
          v_location_address := NULL;
        END;
      END;
      
      -- Try to get phone (check both phone_number and phone columns)
      BEGIN
        EXECUTE 'SELECT phone_number FROM locations WHERE id = $1' INTO v_location_phone USING v_location_record.id;
      EXCEPTION WHEN OTHERS THEN
        -- Column doesn't exist or other error, try 'phone' column
        BEGIN
          EXECUTE 'SELECT phone FROM locations WHERE id = $1' INTO v_location_phone USING v_location_record.id;
        EXCEPTION WHEN OTHERS THEN
          v_location_phone := NULL;
        END;
      END;
      
      RAISE NOTICE '  ✅ Location:';
      RAISE NOTICE '    id: %', v_location_record.id;
      RAISE NOTICE '    name: %', v_location_record.name;
      RAISE NOTICE '    address: %', COALESCE(v_location_address, 'N/A');
      RAISE NOTICE '    city: %', COALESCE(v_location_record.city, 'N/A');
      RAISE NOTICE '    postal_code: %', COALESCE(v_location_record.postal_code, 'N/A');
      RAISE NOTICE '    phone: %', COALESCE(v_location_phone, 'N/A');
      RAISE NOTICE '    is_primary: %', v_location_record.is_primary;
      RAISE NOTICE '    is_active: %', v_location_record.is_active;
    END LOOP;
    
    RAISE NOTICE '';
    
    -- 6. Check if active_location_id matches a location
    IF v_location_id IS NOT NULL THEN
      RAISE NOTICE '6. ACTIVE_LOCATION_ID VERIFICATION:';
      RAISE NOTICE '  active_location_id: %', v_location_id;
      
      IF EXISTS (SELECT 1 FROM locations WHERE id = v_location_id AND tenant_id = v_tenant_id) THEN
        SELECT name INTO v_location_name FROM locations WHERE id = v_location_id;
        RAISE NOTICE '  ✅ Location exists and belongs to tenant';
        RAISE NOTICE '  Location name: %', v_location_name;
      ELSE
        RAISE NOTICE '  ❌ Location does NOT exist or does NOT belong to tenant';
      END IF;
    ELSE
      RAISE NOTICE '6. ACTIVE_LOCATION_ID: NULL';
    END IF;
    
  ELSE
    RAISE NOTICE '3. TENANTS: User has NO tenant_id or active_tenant_id';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '====================================================';
  RAISE NOTICE 'SUMMARY:';
  RAISE NOTICE '  User ID: %', v_user_id;
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE '  Tenant ID: NULL';
  ELSE
    RAISE NOTICE '  Tenant ID: %', v_tenant_id;
  END IF;
  IF v_location_id IS NULL THEN
    RAISE NOTICE '  Location ID: NULL';
  ELSE
    RAISE NOTICE '  Location ID: %', v_location_id;
  END IF;
  RAISE NOTICE '====================================================';
END $$;

