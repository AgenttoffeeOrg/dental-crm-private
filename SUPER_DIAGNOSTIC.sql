-- =====================================================
-- SUPER DETAILED DIAGNOSTIC - Show me EVERYTHING
-- =====================================================

-- 1. Does Deepak exist?
SELECT 
  '1. DEEPAK USER' AS check_name,
  id,
  email,
  full_name,
  active_tenant_id
FROM app_users
WHERE email = 'deepak.s.hegde@gmail.com';

-- 2. Does Smile tenant exist?
SELECT 
  '2. SMILE TENANT' AS check_name,
  id,
  name,
  created_at
FROM tenants
WHERE name = 'Smile';

-- 3. What memberships does Deepak have?
SELECT 
  '3. ALL DEEPAK MEMBERSHIPS' AS check_name,
  t.name AS org_name,
  utm.role,
  utm.status,
  utm.all_locations,
  utm.created_at
FROM user_tenant_memberships utm
JOIN tenants t ON utm.tenant_id = t.id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
ORDER BY utm.created_at DESC;

-- 4. Check for Smile membership specifically (with raw IDs)
SELECT 
  '4. SMILE MEMBERSHIP (RAW)' AS check_name,
  utm.user_id,
  utm.tenant_id,
  utm.role,
  utm.status,
  utm.all_locations,
  au.email,
  t.name
FROM user_tenant_memberships utm
LEFT JOIN app_users au ON utm.user_id = au.id
LEFT JOIN tenants t ON utm.tenant_id = t.id
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 5. If no membership, let's try to create it MANUALLY
DO $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_membership_exists BOOLEAN;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com';
  RAISE NOTICE 'User ID: %', v_user_id;
  
  -- Get tenant ID
  SELECT id INTO v_tenant_id FROM tenants WHERE name = 'Smile';
  RAISE NOTICE 'Tenant ID: %', v_tenant_id;
  
  -- Check if membership exists
  SELECT EXISTS(
    SELECT 1 FROM user_tenant_memberships 
    WHERE user_id = v_user_id AND tenant_id = v_tenant_id
  ) INTO v_membership_exists;
  
  IF v_membership_exists THEN
    RAISE NOTICE '✅ Membership already exists - updating...';
    UPDATE user_tenant_memberships
    SET all_locations = TRUE,
        role = 'owner',
        status = 'active',
        updated_at = NOW()
    WHERE user_id = v_user_id AND tenant_id = v_tenant_id;
    RAISE NOTICE '✅ Updated existing membership';
  ELSE
    RAISE NOTICE '🚨 No membership exists - creating...';
    INSERT INTO user_tenant_memberships (
      user_id,
      tenant_id,
      role,
      status,
      all_locations,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_tenant_id,
      'owner',
      'active',
      TRUE,
      NOW(),
      NOW()
    );
    RAISE NOTICE '✅ Created new membership';
  END IF;
END $$;

-- 6. Verify the membership NOW
SELECT 
  '6. VERIFY MEMBERSHIP NOW' AS check_name,
  utm.role,
  utm.status,
  utm.all_locations,
  CASE 
    WHEN utm.all_locations = TRUE THEN '✅ SUCCESS!'
    ELSE '🚨 STILL FALSE'
  END AS status_check
FROM user_tenant_memberships utm
WHERE utm.user_id = (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com')
  AND utm.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

-- 7. Test RLS function
SELECT 
  '7. RLS ACCESS TEST' AS check_name,
  l.name AS location_name,
  public.user_has_location_access_rls(
    (SELECT id FROM app_users WHERE email = 'deepak.s.hegde@gmail.com'),
    (SELECT id FROM tenants WHERE name = 'Smile'),
    l.id
  ) AS has_access
FROM locations l
WHERE l.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile')
ORDER BY l.name;

