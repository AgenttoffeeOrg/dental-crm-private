-- =====================================================
-- VERIFY TEST USER SETUP
-- Run this to see all the data that was created
-- =====================================================

SELECT 
  '👤 USER INFO' AS "Section",
  au.email AS "Email",
  au.role AS "Role",
  au.full_name AS "Name",
  t.name AS "Primary Tenant"
FROM app_users au
LEFT JOIN tenants t ON t.id = au.tenant_id
WHERE au.email = 'deepakshegde@gmail.com'

UNION ALL

SELECT 
  '🏢 DENTAL GROUP',
  dg.name,
  dg.primary_email,
  'Active: ' || dg.is_active::TEXT,
  NULL
FROM dental_groups dg
WHERE dg.primary_email = 'deepakshegde@gmail.com'

UNION ALL

SELECT 
  '📍 LOCATION 1',
  t.name,
  t.location_name,
  'Multi-location: ' || t.is_multi_location::TEXT,
  NULL
FROM tenants t
INNER JOIN dental_groups dg ON dg.id = t.dental_group_id
WHERE dg.primary_email = 'deepakshegde@gmail.com'
ORDER BY t.name
LIMIT 1

UNION ALL

SELECT 
  '📍 LOCATION 2',
  t.name,
  t.location_name,
  'Multi-location: ' || t.is_multi_location::TEXT,
  NULL
FROM tenants t
INNER JOIN dental_groups dg ON dg.id = t.dental_group_id
WHERE dg.primary_email = 'deepakshegde@gmail.com'
  AND t.location_name = 'North Branch'

UNION ALL

SELECT 
  '📍 LOCATION 3',
  t.name,
  t.location_name,
  'Multi-location: ' || t.is_multi_location::TEXT,
  NULL
FROM tenants t
INNER JOIN dental_groups dg ON dg.id = t.dental_group_id
WHERE dg.primary_email = 'deepakshegde@gmail.com'
  AND t.location_name = 'West Branch'

UNION ALL

SELECT 
  '💎 SUBSCRIPTION',
  'Status: ' || s.status,
  'Seats: ' || s.seat_limit::TEXT || ' (Active: ' || s.active_seats::TEXT || ')',
  'Plan: ' || p.name,
  'Valid until: ' || s.current_period_end::DATE::TEXT
FROM subscriptions s
INNER JOIN plans p ON p.id = s.plan_id
INNER JOIN dental_groups dg ON dg.id = s.dental_group_id
WHERE dg.primary_email = 'deepakshegde@gmail.com'

UNION ALL

SELECT 
  '👑 ADMIN STATUS',
  'Tenant Admin: ' || ta.is_active::TEXT,
  NULL,
  NULL,
  NULL
FROM tenant_admins ta
INNER JOIN app_users au ON au.id = ta.user_id
WHERE au.email = 'deepakshegde@gmail.com';


