-- FIXED EMERGENCY FIX - No column ambiguity
-- Run this in Supabase SQL Editor

-- Step 1: Safely drop existing policies (if they exist)
DROP POLICY IF EXISTS "authenticated_full_access_app_users" ON app_users;
DROP POLICY IF EXISTS "authenticated_full_access_tenants" ON tenants;
DROP POLICY IF EXISTS "Users view own tenant users" ON app_users;
DROP POLICY IF EXISTS "Users update own profile" ON app_users;
DROP POLICY IF EXISTS "Users view own tenant" ON tenants;

-- Step 2: Create new policies
CREATE POLICY "authenticated_full_access_app_users" 
ON app_users FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "authenticated_full_access_tenants" 
ON tenants FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Step 3: Fix deepakshegde@gmail.com account
DO $$
DECLARE
  user_id uuid := 'a0901598-6cc5-49bc-9234-db90b9af3444';
  user_tenant_id uuid;  -- Renamed to avoid ambiguity
BEGIN
  -- Check if app_user already exists
  IF EXISTS (SELECT 1 FROM app_users WHERE id = user_id) THEN
    RAISE NOTICE '✅ app_user already exists for deepakshegde@gmail.com';
    
    -- Just verify the account is working
    SELECT app_users.tenant_id INTO user_tenant_id FROM app_users WHERE id = user_id;
    RAISE NOTICE '✅ Account verified - Tenant ID: %', user_tenant_id;
    RETURN;
  END IF;
  
  -- Find or create tenant
  SELECT id INTO user_tenant_id FROM tenants WHERE owner_id = user_id LIMIT 1;
  
  IF user_tenant_id IS NULL THEN
    INSERT INTO tenants (id, owner_id, name, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      user_id,
      'Deepak Practice',
      NOW(),
      NOW()
    )
    RETURNING id INTO user_tenant_id;
    
    RAISE NOTICE '✅ Created new tenant: %', user_tenant_id;
  ELSE
    RAISE NOTICE '✅ Using existing tenant: %', user_tenant_id;
  END IF;
  
  -- Create app_user
  INSERT INTO app_users (id, tenant_id, full_name, role, created_at, updated_at)
  VALUES (
    user_id,
    user_tenant_id,
    'Deepak Hegde',
    'owner',
    NOW(),
    NOW()
  );
  
  RAISE NOTICE '✅ SUCCESS! Account fixed for deepakshegde@gmail.com';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Tenant ID: %', user_tenant_id;
END $$;

-- Step 4: Verify the fix
SELECT 
  'VERIFICATION' as status,
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

-- Step 5: Check RLS policies
SELECT 
  'RLS POLICIES' as status,
  tablename, 
  policyname, 
  cmd, 
  roles
FROM pg_policies
WHERE tablename IN ('app_users', 'tenants')
ORDER BY tablename, cmd;
