-- =====================================================
-- CHECK USER STATUS: agentjoeyjoey@gmail.com
-- =====================================================
-- 
-- This script checks if the user has an organization,
-- membership, and locations BEFORE deletion.
-- Run this FIRST to see the current state.
-- =====================================================

-- STEP 1: Check if user exists and get basic info
SELECT 
    '👤 USER INFO' as section,
    id as user_id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'agentjoeyjoey@gmail.com';

-- STEP 2: Check app_user record
SELECT 
    '📋 APP_USER RECORD' as section,
    id,
    full_name,
    role,
    tenant_id as legacy_tenant_id,
    active_tenant_id,
    active_location_id,
    created_at
FROM app_users
WHERE id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

-- STEP 3: Check memberships
SELECT 
    '🔗 MEMBERSHIPS' as section,
    utm.id as membership_id,
    utm.tenant_id,
    utm.role,
    utm.status,
    utm.all_locations,
    t.name as organization_name,
    utm.created_at
FROM user_tenant_memberships utm
LEFT JOIN tenants t ON t.id = utm.tenant_id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
ORDER BY utm.created_at DESC;

-- STEP 4: Check organizations (tenants) where user is a member
SELECT 
    '🏢 ORGANIZATIONS' as section,
    t.id as tenant_id,
    t.name as organization_name,
    t.is_multi_location,
    COUNT(DISTINCT utm.user_id) as total_members,
    COUNT(DISTINCT l.id) as total_locations,
    t.created_at
FROM tenants t
INNER JOIN user_tenant_memberships utm ON utm.tenant_id = t.id
LEFT JOIN locations l ON l.tenant_id = t.id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
GROUP BY t.id, t.name, t.is_multi_location, t.created_at;

-- STEP 5: Check locations for user's organizations
SELECT 
    '📍 LOCATIONS' as section,
    l.id as location_id,
    l.name as location_name,
    l.tenant_id,
    t.name as organization_name,
    l.is_active,
    l.created_at
FROM locations l
INNER JOIN tenants t ON t.id = l.tenant_id
WHERE l.tenant_id IN (
    SELECT tenant_id 
    FROM user_tenant_memberships 
    WHERE user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
)
ORDER BY t.name, l.name;

-- STEP 6: Check if user has any data in their organizations (contacts, deals, tasks)
-- This shows data count per organization the user belongs to
SELECT 
    '📊 DATA IN USER ORGANIZATIONS' as section,
    utm.tenant_id,
    t.name as organization_name,
    'contacts' as data_type,
    COUNT(DISTINCT c.id) as count
FROM user_tenant_memberships utm
LEFT JOIN tenants t ON t.id = utm.tenant_id
LEFT JOIN contacts c ON c.tenant_id = utm.tenant_id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
GROUP BY utm.tenant_id, t.name

UNION ALL

SELECT 
    '📊 DATA IN USER ORGANIZATIONS' as section,
    utm.tenant_id,
    t.name as organization_name,
    'deals' as data_type,
    COUNT(DISTINCT d.id) as count
FROM user_tenant_memberships utm
LEFT JOIN tenants t ON t.id = utm.tenant_id
LEFT JOIN deals d ON d.tenant_id = utm.tenant_id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
GROUP BY utm.tenant_id, t.name

UNION ALL

SELECT 
    '📊 DATA IN USER ORGANIZATIONS' as section,
    utm.tenant_id,
    t.name as organization_name,
    'tasks' as data_type,
    COUNT(DISTINCT task.id) as count
FROM user_tenant_memberships utm
LEFT JOIN tenants t ON t.id = utm.tenant_id
LEFT JOIN tasks task ON task.tenant_id = utm.tenant_id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
GROUP BY utm.tenant_id, t.name
ORDER BY organization_name, data_type;

-- STEP 7: SUMMARY - Does user have an organization?
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM user_tenant_memberships utm
            WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com')
              AND utm.status = 'active'
        ) THEN '✅ USER HAS ORGANIZATION(S) - Do NOT delete unless you want to remove them completely'
        ELSE '⚠️ USER HAS NO ORGANIZATION - Safe to delete and recreate'
    END as recommendation,
    
    COUNT(DISTINCT utm.tenant_id) as organization_count,
    COUNT(DISTINCT utm.id) as membership_count,
    COUNT(DISTINCT l.id) as location_count
FROM user_tenant_memberships utm
LEFT JOIN locations l ON l.tenant_id = utm.tenant_id
WHERE utm.user_id = (SELECT id FROM auth.users WHERE email = 'agentjoeyjoey@gmail.com');

