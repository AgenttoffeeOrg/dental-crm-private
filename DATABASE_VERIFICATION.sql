-- =====================================================
-- AUTOMATED DATABASE VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify backend state
-- =====================================================

-- =====================================================
-- 1. CHECK MIGRATIONS APPLIED
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '1. MIGRATION STATUS CHECK';
  RAISE NOTICE '==============================================';
END $$;

-- Check if get_current_user_tenant_id exists (Migration #1)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_current_user_tenant_id'
  ) THEN
    RAISE NOTICE '✅ Migration #1 Applied: get_current_user_tenant_id() exists';
  ELSE
    RAISE WARNING '❌ Migration #1 MISSING: get_current_user_tenant_id() not found';
  END IF;
END $$;

-- Check if get_user_accessible_locations exists (Migration #2)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'get_user_accessible_locations'
  ) THEN
    RAISE NOTICE '✅ Migration #2 Applied: get_user_accessible_locations() exists';
  ELSE
    RAISE WARNING '❌ Migration #2 MISSING: get_user_accessible_locations() not found';
  END IF;
END $$;

-- =====================================================
-- 2. CHECK REQUIRED TABLES & COLUMNS
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '2. SCHEMA VERIFICATION';
  RAISE NOTICE '==============================================';
END $$;

-- Check app_users has active_tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'active_tenant_id'
  ) THEN
    RAISE NOTICE '✅ app_users.active_tenant_id exists';
  ELSE
    RAISE WARNING '❌ app_users.active_tenant_id MISSING';
  END IF;
END $$;

-- Check app_users has active_location_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'active_location_id'
  ) THEN
    RAISE NOTICE '✅ app_users.active_location_id exists';
  ELSE
    RAISE WARNING '❌ app_users.active_location_id MISSING';
  END IF;
END $$;

-- Check user_tenant_memberships exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'user_tenant_memberships'
  ) THEN
    RAISE NOTICE '✅ user_tenant_memberships table exists';
  ELSE
    RAISE WARNING '❌ user_tenant_memberships table MISSING';
  END IF;
END $$;

-- Check locations table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'locations'
  ) THEN
    RAISE NOTICE '✅ locations table exists';
  ELSE
    RAISE WARNING '❌ locations table MISSING';
  END IF;
END $$;

-- Check membership_locations exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'membership_locations'
  ) THEN
    RAISE NOTICE '✅ membership_locations table exists';
  ELSE
    RAISE WARNING '❌ membership_locations table MISSING';
  END IF;
END $$;

-- Check contacts has location_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contacts' AND column_name = 'location_id'
  ) THEN
    RAISE NOTICE '✅ contacts.location_id exists';
  ELSE
    RAISE WARNING '❌ contacts.location_id MISSING';
  END IF;
END $$;

-- =====================================================
-- 3. CHECK RLS POLICIES
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '3. RLS POLICY VERIFICATION';
  RAISE NOTICE '==============================================';
END $$;

-- Count RLS policies on contacts table
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'contacts';
  
  RAISE NOTICE 'Contacts table has % RLS policies', policy_count;
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ RLS policies exist on contacts';
  ELSE
    RAISE WARNING '❌ NO RLS policies on contacts';
  END IF;
END $$;

-- =====================================================
-- 4. CHECK TEST DATA
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '4. TEST DATA VERIFICATION';
  RAISE NOTICE '==============================================';
END $$;

-- Count organizations
DO $$
DECLARE
  org_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO org_count FROM tenants;
  RAISE NOTICE 'Total organizations: %', org_count;
  
  IF org_count >= 2 THEN
    RAISE NOTICE '✅ Multiple orgs exist (good for testing)';
  ELSE
    RAISE WARNING '⚠️  Only % org(s) - need 2+ for multi-org testing', org_count;
  END IF;
END $$;

-- Count locations
DO $$
DECLARE
  loc_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO loc_count FROM locations;
  RAISE NOTICE 'Total locations: %', loc_count;
  
  IF loc_count >= 3 THEN
    RAISE NOTICE '✅ Multiple locations exist (good for testing)';
  ELSE
    RAISE WARNING '⚠️  Only % location(s) - need 3+ for location testing', loc_count;
  END IF;
END $$;

-- Count users with multiple org memberships
DO $$
DECLARE
  multi_org_users INTEGER;
BEGIN
  SELECT COUNT(DISTINCT user_id) INTO multi_org_users
  FROM user_tenant_memberships
  GROUP BY user_id
  HAVING COUNT(*) > 1;
  
  RAISE NOTICE 'Users with 2+ org memberships: %', multi_org_users;
  
  IF multi_org_users >= 1 THEN
    RAISE NOTICE '✅ Multi-org test users exist';
  ELSE
    RAISE WARNING '⚠️  No multi-org users - create one for testing';
  END IF;
END $$;

-- =====================================================
-- 5. CHECK AUDIT LOGGING
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE '5. AUDIT LOG VERIFICATION';
  RAISE NOTICE '==============================================';
END $$;

-- Check if audits table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'audits'
  ) THEN
    RAISE NOTICE '✅ audits table exists';
  ELSE
    RAISE WARNING '❌ audits table MISSING - audit logging disabled';
  END IF;
END $$;

-- Count recent audit entries
DO $$
DECLARE
  recent_audits INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_audits
  FROM audits
  WHERE created_at > NOW() - INTERVAL '1 day';
  
  RAISE NOTICE 'Audit entries in last 24h: %', recent_audits;
END $$;

-- =====================================================
-- 6. DETAILED QUERY RESULTS
-- =====================================================

-- Show all organizations
SELECT 
  '=== ORGANIZATIONS ===' AS section,
  id,
  name,
  is_multi_location
FROM tenants
ORDER BY name;

-- Show all locations
SELECT 
  '=== LOCATIONS ===' AS section,
  l.id,
  l.name,
  t.name AS org_name,
  l.is_active
FROM locations l
JOIN tenants t ON t.id = l.tenant_id
ORDER BY t.name, l.name;

-- Show user memberships
SELECT 
  '=== USER MEMBERSHIPS ===' AS section,
  au.email,
  t.name AS org_name,
  utm.all_locations,
  utm.status,
  au.active_tenant_id = utm.tenant_id AS is_active_org
FROM user_tenant_memberships utm
JOIN app_users au ON au.id = utm.user_id
JOIN tenants t ON t.id = utm.tenant_id
ORDER BY au.email, t.name;

-- Show location access
SELECT 
  '=== LOCATION ACCESS ===' AS section,
  au.email,
  t.name AS org_name,
  l.name AS location_name,
  ml.is_active
FROM membership_locations ml
JOIN user_tenant_memberships utm ON utm.id = ml.membership_id
JOIN app_users au ON au.id = utm.user_id
JOIN locations l ON l.id = ml.location_id
JOIN tenants t ON t.id = l.tenant_id
ORDER BY au.email, t.name, l.name;

-- Show active contexts
SELECT 
  '=== ACTIVE CONTEXTS ===' AS section,
  au.email,
  t.name AS active_org,
  l.name AS active_location,
  au.last_context_switch_at
FROM app_users au
LEFT JOIN tenants t ON t.id = au.active_tenant_id
LEFT JOIN locations l ON l.id = au.active_location_id
ORDER BY au.email;

-- Show recent audit logs
SELECT 
  '=== RECENT AUDIT LOGS ===' AS section,
  created_at,
  action,
  au.email AS user_email,
  t.name AS org_name,
  l.name AS location_name,
  metadata
FROM audits a
LEFT JOIN app_users au ON au.id = a.user_id
LEFT JOIN tenants t ON t.id = a.tenant_id
LEFT JOIN locations l ON l.id = a.location_id
WHERE a.action IN ('user.tenant_switched', 'user.location_switched')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'VERIFICATION COMPLETE';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Review the results above.';
  RAISE NOTICE 'All ✅ = System ready for testing';
  RAISE NOTICE 'Any ❌ = Critical issue, needs fix';
  RAISE NOTICE 'Any ⚠️  = Non-critical, may affect testing';
END $$;

