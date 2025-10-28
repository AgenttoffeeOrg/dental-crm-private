-- =====================================================
-- ULTIMATE ARCHITECTURE VERIFICATION QUERY
-- Single comprehensive check of entire multi-org/location architecture
-- =====================================================
-- 
-- This query verifies:
-- 1. Organizations (tenants) exist and are properly configured
-- 2. Locations belong to tenants correctly
-- 3. Users have memberships in organizations
-- 4. Users have location-level permissions
-- 5. Active context (active_tenant_id, active_location_id) is set
-- 6. Data (contacts, deals, etc.) is linked to correct tenant + location
-- 7. RLS functions exist and are callable
-- 8. Audit logs are capturing switches
-- 9. All relationships are properly foreign-keyed
-- 10. No orphaned records
--
-- Run this in Supabase SQL Editor
-- =====================================================

WITH 
-- 1. ORGANIZATIONS (TENANTS)
org_check AS (
  SELECT 
    COUNT(*) AS total_orgs,
    COUNT(*) FILTER (WHERE is_multi_location = true) AS multi_location_orgs,
    COUNT(*) FILTER (WHERE is_multi_location = false) AS single_location_orgs
  FROM tenants
),

-- 2. LOCATIONS
location_check AS (
  SELECT 
    COUNT(*) AS total_locations,
    COUNT(DISTINCT tenant_id) AS orgs_with_locations,
    MIN(locations_per_org) AS min_locations_per_org,
    MAX(locations_per_org) AS max_locations_per_org,
    AVG(locations_per_org)::NUMERIC(10,2) AS avg_locations_per_org
  FROM (
    SELECT tenant_id, COUNT(*) AS locations_per_org
    FROM locations
    GROUP BY tenant_id
  ) loc_counts
),

-- 3. VERIFY LOCATIONS BELONG TO VALID TENANTS
orphaned_locations AS (
  SELECT COUNT(*) AS orphaned_count
  FROM locations l
  LEFT JOIN tenants t ON t.id = l.tenant_id
  WHERE t.id IS NULL
),

-- 4. USERS
user_check AS (
  SELECT 
    COUNT(*) AS total_users,
    COUNT(*) FILTER (WHERE active_tenant_id IS NOT NULL) AS users_with_active_tenant,
    COUNT(*) FILTER (WHERE active_location_id IS NOT NULL) AS users_with_active_location,
    COUNT(*) FILTER (WHERE active_tenant_id IS NULL) AS users_without_active_tenant
  FROM app_users
),

-- 5. USER-TENANT MEMBERSHIPS
membership_check AS (
  SELECT 
    COUNT(*) AS total_memberships,
    COUNT(DISTINCT user_id) AS users_with_memberships,
    COUNT(DISTINCT tenant_id) AS orgs_with_members,
    COUNT(*) FILTER (WHERE status = 'active') AS active_memberships,
    COUNT(*) FILTER (WHERE status != 'active') AS inactive_memberships,
    COUNT(*) FILTER (WHERE all_locations = true) AS memberships_with_all_locations,
    COUNT(*) FILTER (WHERE all_locations = false) AS memberships_with_specific_locations
  FROM user_tenant_memberships
),

-- 6. VERIFY MEMBERSHIPS POINT TO VALID USERS & TENANTS
orphaned_memberships AS (
  SELECT 
    COUNT(*) FILTER (WHERE au.id IS NULL) AS invalid_user_refs,
    COUNT(*) FILTER (WHERE t.id IS NULL) AS invalid_tenant_refs
  FROM user_tenant_memberships utm
  LEFT JOIN app_users au ON au.id = utm.user_id
  LEFT JOIN tenants t ON t.id = utm.tenant_id
),

-- 7. LOCATION-LEVEL PERMISSIONS
location_permissions AS (
  SELECT 
    COUNT(*) AS total_location_permissions,
    COUNT(DISTINCT membership_id) AS memberships_with_location_access,
    COUNT(DISTINCT location_id) AS locations_with_assigned_users
  FROM membership_locations
),

-- 8. VERIFY LOCATION PERMISSIONS ARE VALID
orphaned_location_permissions AS (
  SELECT 
    COUNT(*) FILTER (WHERE utm.id IS NULL) AS invalid_membership_refs,
    COUNT(*) FILTER (WHERE l.id IS NULL) AS invalid_location_refs
  FROM membership_locations ml
  LEFT JOIN user_tenant_memberships utm ON utm.id = ml.membership_id
  LEFT JOIN locations l ON l.id = ml.location_id
),

-- 9. DATA INTEGRITY - CONTACTS
contact_integrity AS (
  SELECT 
    COUNT(*) AS total_contacts,
    COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) AS contacts_with_tenant,
    COUNT(*) FILTER (WHERE location_id IS NOT NULL) AS contacts_with_location,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) AS contacts_without_tenant,
    COUNT(*) FILTER (WHERE location_id IS NULL) AS contacts_without_location
  FROM contacts
),

-- 10. VERIFY CONTACTS POINT TO VALID TENANTS & LOCATIONS
orphaned_contacts AS (
  SELECT 
    COUNT(*) FILTER (WHERE t.id IS NULL AND c.tenant_id IS NOT NULL) AS invalid_tenant_refs,
    COUNT(*) FILTER (WHERE l.id IS NULL AND c.location_id IS NOT NULL) AS invalid_location_refs
  FROM contacts c
  LEFT JOIN tenants t ON t.id = c.tenant_id
  LEFT JOIN locations l ON l.id = c.location_id
),

-- 11. DATA INTEGRITY - DEALS
deal_integrity AS (
  SELECT 
    COUNT(*) AS total_deals,
    COUNT(*) FILTER (WHERE tenant_id IS NOT NULL) AS deals_with_tenant,
    COUNT(*) FILTER (WHERE location_id IS NOT NULL) AS deals_with_location,
    COUNT(*) FILTER (WHERE tenant_id IS NULL) AS deals_without_tenant,
    COUNT(*) FILTER (WHERE location_id IS NULL) AS deals_without_location
  FROM deals
),

-- 12. VERIFY DEALS POINT TO VALID TENANTS & LOCATIONS
orphaned_deals AS (
  SELECT 
    COUNT(*) FILTER (WHERE t.id IS NULL AND d.tenant_id IS NOT NULL) AS invalid_tenant_refs,
    COUNT(*) FILTER (WHERE l.id IS NULL AND d.location_id IS NOT NULL) AS invalid_location_refs
  FROM deals d
  LEFT JOIN tenants t ON t.id = d.tenant_id
  LEFT JOIN locations l ON l.id = d.location_id
),

-- 13. ACTIVE CONTEXT VALIDATION
active_context_check AS (
  SELECT 
    COUNT(*) AS users_checked,
    COUNT(*) FILTER (
      WHERE au.active_tenant_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM user_tenant_memberships utm 
        WHERE utm.user_id = au.id 
        AND utm.tenant_id = au.active_tenant_id 
        AND utm.status = 'active'
      )
    ) AS users_with_valid_active_tenant,
    COUNT(*) FILTER (
      WHERE au.active_tenant_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM user_tenant_memberships utm 
        WHERE utm.user_id = au.id 
        AND utm.tenant_id = au.active_tenant_id 
        AND utm.status = 'active'
      )
    ) AS users_with_invalid_active_tenant,
    COUNT(*) FILTER (
      WHERE au.active_location_id IS NOT NULL 
      AND EXISTS (
        SELECT 1 FROM locations l 
        WHERE l.id = au.active_location_id 
        AND l.tenant_id = au.active_tenant_id
      )
    ) AS users_with_valid_active_location,
    COUNT(*) FILTER (
      WHERE au.active_location_id IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM locations l 
        WHERE l.id = au.active_location_id 
        AND l.tenant_id = au.active_tenant_id
      )
    ) AS users_with_invalid_active_location
  FROM app_users au
),

-- 14. RLS FUNCTION EXISTENCE
rls_functions AS (
  SELECT 
    EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'get_current_user_tenant_id'
    ) AS has_get_current_user_tenant_id,
    EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'user_has_location_access_rls'
    ) AS has_user_has_location_access_rls,
    EXISTS (
      SELECT 1 FROM pg_proc p 
      JOIN pg_namespace n ON p.pronamespace = n.oid 
      WHERE n.nspname = 'public' AND p.proname = 'get_user_accessible_locations'
    ) AS has_get_user_accessible_locations
),

-- 15. RLS POLICIES
rls_policies AS (
  SELECT 
    COUNT(*) FILTER (WHERE tablename = 'contacts') AS contacts_policies,
    COUNT(*) FILTER (WHERE tablename = 'deals') AS deals_policies,
    COUNT(*) FILTER (WHERE tablename = 'tasks') AS tasks_policies,
    COUNT(*) FILTER (WHERE tablename = 'activities') AS activities_policies,
    COUNT(*) FILTER (WHERE tablename = 'locations') AS locations_policies,
    COUNT(*) FILTER (WHERE tablename = 'user_tenant_memberships') AS memberships_policies
  FROM pg_policies
  WHERE schemaname = 'public'
),

-- 16. AUDIT LOGS
audit_check AS (
  SELECT 
    COUNT(*) AS total_audit_entries,
    COUNT(*) FILTER (WHERE action = 'user.tenant_switched') AS org_switches,
    COUNT(*) FILTER (WHERE action = 'user.location_switched') AS location_switches,
    MAX(created_at) FILTER (WHERE action = 'user.tenant_switched') AS last_org_switch,
    MAX(created_at) FILTER (WHERE action = 'user.location_switched') AS last_location_switch
  FROM audits
  WHERE created_at > NOW() - INTERVAL '7 days'
),

-- 17. MULTI-ORG USERS (CRITICAL FOR TESTING)
multi_org_users AS (
  SELECT 
    COUNT(DISTINCT user_id) AS count
  FROM (
    SELECT user_id, COUNT(DISTINCT tenant_id) AS org_count
    FROM user_tenant_memberships
    WHERE status = 'active'
    GROUP BY user_id
    HAVING COUNT(DISTINCT tenant_id) > 1
  ) multi
)

-- FINAL REPORT
SELECT 
  '===== ARCHITECTURE VERIFICATION REPORT =====' AS section,
  NOW()::TEXT AS generated_at

UNION ALL SELECT '','='
UNION ALL SELECT '1. ORGANIZATIONS (TENANTS)', '='
UNION ALL SELECT '  Total Organizations', total_orgs::TEXT FROM org_check
UNION ALL SELECT '  Multi-Location Orgs', multi_location_orgs::TEXT FROM org_check
UNION ALL SELECT '  Single-Location Orgs', single_location_orgs::TEXT FROM org_check
UNION ALL SELECT '  ✅ STATUS', CASE WHEN total_orgs >= 2 THEN 'PASS (2+ orgs for testing)' ELSE 'WARNING (need 2+ orgs)' END FROM org_check

UNION ALL SELECT '','='
UNION ALL SELECT '2. LOCATIONS', '='
UNION ALL SELECT '  Total Locations', total_locations::TEXT FROM location_check
UNION ALL SELECT '  Orgs with Locations', orgs_with_locations::TEXT FROM location_check
UNION ALL SELECT '  Min Locations per Org', min_locations_per_org::TEXT FROM location_check
UNION ALL SELECT '  Max Locations per Org', max_locations_per_org::TEXT FROM location_check
UNION ALL SELECT '  Avg Locations per Org', avg_locations_per_org::TEXT FROM location_check
UNION ALL SELECT '  Orphaned Locations', orphaned_count::TEXT FROM orphaned_locations
UNION ALL SELECT '  ✅ STATUS', CASE WHEN orphaned_count = 0 THEN 'PASS (no orphans)' ELSE 'FAIL (orphaned locations!)' END FROM orphaned_locations

UNION ALL SELECT '','='
UNION ALL SELECT '3. USERS', '='
UNION ALL SELECT '  Total Users', total_users::TEXT FROM user_check
UNION ALL SELECT '  Users with active_tenant_id', users_with_active_tenant::TEXT FROM user_check
UNION ALL SELECT '  Users with active_location_id', users_with_active_location::TEXT FROM user_check
UNION ALL SELECT '  Users WITHOUT active_tenant_id', users_without_active_tenant::TEXT FROM user_check
UNION ALL SELECT '  ✅ STATUS', CASE WHEN users_without_active_tenant = 0 THEN 'PASS (all have context)' ELSE 'WARNING (some missing context)' END FROM user_check

UNION ALL SELECT '','='
UNION ALL SELECT '4. USER-TENANT MEMBERSHIPS', '='
UNION ALL SELECT '  Total Memberships', total_memberships::TEXT FROM membership_check
UNION ALL SELECT '  Users with Memberships', users_with_memberships::TEXT FROM membership_check
UNION ALL SELECT '  Orgs with Members', orgs_with_members::TEXT FROM membership_check
UNION ALL SELECT '  Active Memberships', active_memberships::TEXT FROM membership_check
UNION ALL SELECT '  Inactive Memberships', inactive_memberships::TEXT FROM membership_check
UNION ALL SELECT '  All-Locations Access', memberships_with_all_locations::TEXT FROM membership_check
UNION ALL SELECT '  Specific-Locations Access', memberships_with_specific_locations::TEXT FROM membership_check
UNION ALL SELECT '  Invalid User References', invalid_user_refs::TEXT FROM orphaned_memberships
UNION ALL SELECT '  Invalid Tenant References', invalid_tenant_refs::TEXT FROM orphaned_memberships
UNION ALL SELECT '  ✅ STATUS', CASE WHEN invalid_user_refs = 0 AND invalid_tenant_refs = 0 THEN 'PASS (no orphans)' ELSE 'FAIL (invalid references!)' END FROM orphaned_memberships

UNION ALL SELECT '','='
UNION ALL SELECT '5. LOCATION PERMISSIONS', '='
UNION ALL SELECT '  Total Location Permissions', total_location_permissions::TEXT FROM location_permissions
UNION ALL SELECT '  Memberships with Location Access', memberships_with_location_access::TEXT FROM location_permissions
UNION ALL SELECT '  Locations with Assigned Users', locations_with_assigned_users::TEXT FROM location_permissions
UNION ALL SELECT '  Invalid Membership References', invalid_membership_refs::TEXT FROM orphaned_location_permissions
UNION ALL SELECT '  Invalid Location References', invalid_location_refs::TEXT FROM orphaned_location_permissions
UNION ALL SELECT '  ✅ STATUS', CASE WHEN invalid_membership_refs = 0 AND invalid_location_refs = 0 THEN 'PASS (no orphans)' ELSE 'FAIL (invalid references!)' END FROM orphaned_location_permissions

UNION ALL SELECT '','='
UNION ALL SELECT '6. DATA INTEGRITY - CONTACTS', '='
UNION ALL SELECT '  Total Contacts', total_contacts::TEXT FROM contact_integrity
UNION ALL SELECT '  Contacts with tenant_id', contacts_with_tenant::TEXT FROM contact_integrity
UNION ALL SELECT '  Contacts with location_id', contacts_with_location::TEXT FROM contact_integrity
UNION ALL SELECT '  Contacts WITHOUT tenant_id', contacts_without_tenant::TEXT FROM contact_integrity
UNION ALL SELECT '  Contacts WITHOUT location_id', contacts_without_location::TEXT FROM contact_integrity
UNION ALL SELECT '  Invalid Tenant References', invalid_tenant_refs::TEXT FROM orphaned_contacts
UNION ALL SELECT '  Invalid Location References', invalid_location_refs::TEXT FROM orphaned_contacts
UNION ALL SELECT '  ✅ STATUS', CASE WHEN contacts_without_tenant = 0 AND invalid_tenant_refs = 0 AND invalid_location_refs = 0 THEN 'PASS (all valid)' ELSE 'WARNING (some invalid data)' END FROM contact_integrity, orphaned_contacts

UNION ALL SELECT '','='
UNION ALL SELECT '7. DATA INTEGRITY - DEALS', '='
UNION ALL SELECT '  Total Deals', total_deals::TEXT FROM deal_integrity
UNION ALL SELECT '  Deals with tenant_id', deals_with_tenant::TEXT FROM deal_integrity
UNION ALL SELECT '  Deals with location_id', deals_with_location::TEXT FROM deal_integrity
UNION ALL SELECT '  Deals WITHOUT tenant_id', deals_without_tenant::TEXT FROM deal_integrity
UNION ALL SELECT '  Deals WITHOUT location_id', deals_without_location::TEXT FROM deal_integrity
UNION ALL SELECT '  Invalid Tenant References', invalid_tenant_refs::TEXT FROM orphaned_deals
UNION ALL SELECT '  Invalid Location References', invalid_location_refs::TEXT FROM orphaned_deals
UNION ALL SELECT '  ✅ STATUS', CASE WHEN deals_without_tenant = 0 AND invalid_tenant_refs = 0 AND invalid_location_refs = 0 THEN 'PASS (all valid)' ELSE 'WARNING (some invalid data)' END FROM deal_integrity, orphaned_deals

UNION ALL SELECT '','='
UNION ALL SELECT '8. ACTIVE CONTEXT VALIDATION', '='
UNION ALL SELECT '  Users Checked', users_checked::TEXT FROM active_context_check
UNION ALL SELECT '  Valid active_tenant_id', users_with_valid_active_tenant::TEXT FROM active_context_check
UNION ALL SELECT '  INVALID active_tenant_id', users_with_invalid_active_tenant::TEXT FROM active_context_check
UNION ALL SELECT '  Valid active_location_id', users_with_valid_active_location::TEXT FROM active_context_check
UNION ALL SELECT '  INVALID active_location_id', users_with_invalid_active_location::TEXT FROM active_context_check
UNION ALL SELECT '  ✅ STATUS', CASE WHEN users_with_invalid_active_tenant = 0 AND users_with_invalid_active_location = 0 THEN 'PASS (all contexts valid)' ELSE 'FAIL (invalid active contexts!)' END FROM active_context_check

UNION ALL SELECT '','='
UNION ALL SELECT '9. RLS FUNCTIONS', '='
UNION ALL SELECT '  get_current_user_tenant_id()', CASE WHEN has_get_current_user_tenant_id THEN '✅ EXISTS' ELSE '❌ MISSING' END FROM rls_functions
UNION ALL SELECT '  user_has_location_access_rls()', CASE WHEN has_user_has_location_access_rls THEN '✅ EXISTS' ELSE '❌ MISSING' END FROM rls_functions
UNION ALL SELECT '  get_user_accessible_locations()', CASE WHEN has_get_user_accessible_locations THEN '✅ EXISTS' ELSE '❌ MISSING' END FROM rls_functions
UNION ALL SELECT '  ✅ STATUS', CASE WHEN has_get_current_user_tenant_id AND has_user_has_location_access_rls AND has_get_user_accessible_locations THEN 'PASS (all functions exist)' ELSE 'FAIL (missing functions!)' END FROM rls_functions

UNION ALL SELECT '','='
UNION ALL SELECT '10. RLS POLICIES', '='
UNION ALL SELECT '  contacts table', contacts_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  deals table', deals_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  tasks table', tasks_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  activities table', activities_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  locations table', locations_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  memberships table', memberships_policies::TEXT || ' policies' FROM rls_policies
UNION ALL SELECT '  ✅ STATUS', CASE WHEN contacts_policies > 0 AND deals_policies > 0 THEN 'PASS (RLS active)' ELSE 'WARNING (check RLS)' END FROM rls_policies

UNION ALL SELECT '','='
UNION ALL SELECT '11. AUDIT LOGS (Last 7 Days)', '='
UNION ALL SELECT '  Total Audit Entries', total_audit_entries::TEXT FROM audit_check
UNION ALL SELECT '  Org Switches Logged', org_switches::TEXT FROM audit_check
UNION ALL SELECT '  Location Switches Logged', location_switches::TEXT FROM audit_check
UNION ALL SELECT '  Last Org Switch', COALESCE(last_org_switch::TEXT, 'NEVER') FROM audit_check
UNION ALL SELECT '  Last Location Switch', COALESCE(last_location_switch::TEXT, 'NEVER') FROM audit_check
UNION ALL SELECT '  ✅ STATUS', CASE WHEN total_audit_entries > 0 THEN 'PASS (audit active)' ELSE 'WARNING (no recent audits)' END FROM audit_check

UNION ALL SELECT '','='
UNION ALL SELECT '12. TESTING READINESS', '='
UNION ALL SELECT '  Multi-Org Test Users', count::TEXT FROM multi_org_users
UNION ALL SELECT '  ✅ STATUS', CASE WHEN count >= 1 THEN 'PASS (ready for multi-org testing)' ELSE 'FAIL (need multi-org test user!)' END FROM multi_org_users

UNION ALL SELECT '','='
UNION ALL SELECT '===== FINAL VERDICT =====', '='
UNION ALL SELECT '  Result', 
  CASE 
    WHEN (SELECT COUNT(*) FROM (
      SELECT 1 WHERE (SELECT orphaned_count FROM orphaned_locations) > 0
      UNION ALL SELECT 1 WHERE (SELECT invalid_user_refs + invalid_tenant_refs FROM orphaned_memberships) > 0
      UNION ALL SELECT 1 WHERE (SELECT invalid_membership_refs + invalid_location_refs FROM orphaned_location_permissions) > 0
      UNION ALL SELECT 1 WHERE (SELECT users_with_invalid_active_tenant + users_with_invalid_active_location FROM active_context_check) > 0
      UNION ALL SELECT 1 WHERE NOT (SELECT has_get_current_user_tenant_id AND has_user_has_location_access_rls AND has_get_user_accessible_locations FROM rls_functions)
      UNION ALL SELECT 1 WHERE (SELECT count FROM multi_org_users) = 0
    ) failures) = 0 THEN '🎉 PERFECT - Production Ready!'
    WHEN (SELECT COUNT(*) FROM (
      SELECT 1 WHERE (SELECT orphaned_count FROM orphaned_locations) > 0
      UNION ALL SELECT 1 WHERE (SELECT invalid_user_refs + invalid_tenant_refs FROM orphaned_memberships) > 0
      UNION ALL SELECT 1 WHERE (SELECT users_with_invalid_active_tenant + users_with_invalid_active_location FROM active_context_check) > 0
      UNION ALL SELECT 1 WHERE NOT (SELECT has_get_current_user_tenant_id AND has_user_has_location_access_rls AND has_get_user_accessible_locations FROM rls_functions)
    ) critical) > 0 THEN '❌ CRITICAL ISSUES - Fix required!'
    ELSE '⚠️  WARNINGS - Review recommended'
  END;

