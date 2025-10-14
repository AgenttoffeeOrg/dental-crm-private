-- MANUAL FIX FOR deepakshegde@gmail.com
-- Run this in Supabase SQL Editor if auto-repair doesn't work

-- Step 1: Find the user's auth ID
-- Replace 'deepakshegde@gmail.com' with actual email if different
DO $$
DECLARE
  user_id uuid;
  user_email text := 'deepakshegde@gmail.com';
  tenant_id uuid;
  existing_tenant uuid;
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found', user_email;
  END IF;
  
  RAISE NOTICE 'Found user ID: %', user_id;
  
  -- Check if app_user already exists
  IF EXISTS (SELECT 1 FROM app_users WHERE id = user_id) THEN
    RAISE NOTICE 'app_user already exists! No fix needed.';
    RETURN;
  END IF;
  
  -- Check if tenant exists for this user
  SELECT id INTO existing_tenant
  FROM tenants
  WHERE owner_id = user_id
  LIMIT 1;
  
  IF existing_tenant IS NOT NULL THEN
    -- Reuse existing tenant
    tenant_id := existing_tenant;
    RAISE NOTICE 'Using existing tenant: %', tenant_id;
  ELSE
    -- Create new tenant
    INSERT INTO tenants (owner_id, name)
    VALUES (user_id, 'Deepak Practice')
    RETURNING id INTO tenant_id;
    
    RAISE NOTICE 'Created new tenant: %', tenant_id;
  END IF;
  
  -- Create app_user record
  INSERT INTO app_users (id, tenant_id, full_name, role)
  VALUES (user_id, tenant_id, 'Deepak Hegde', 'owner');
  
  RAISE NOTICE '✅ SUCCESS! app_user created for %', user_email;
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Tenant ID: %', tenant_id;
  
END $$;

-- Verify the fix
SELECT 
  'Verification Results' as status,
  au.email,
  ap.id as app_user_id,
  ap.tenant_id,
  ap.full_name,
  ap.role,
  t.name as tenant_name
FROM auth.users au
LEFT JOIN app_users ap ON au.id = ap.id
LEFT JOIN tenants t ON ap.tenant_id = t.id
WHERE au.email = 'deepakshegde@gmail.com';

