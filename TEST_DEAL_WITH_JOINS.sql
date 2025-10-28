-- Test if we can fetch the deal with joins
-- This simulates what the frontend is doing

SELECT 
  'TEST: Can we fetch deal with joins?' AS test_name,
  d.*,
  c.full_name AS contact_name,
  ps.name AS stage_name,
  au.full_name AS owner_name
FROM deals d
LEFT JOIN contacts c ON d.contact_id = c.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN app_users au ON d.owner_user_id = au.id
WHERE d.id = '87a4028d-6f38-4b7c-9fa0-6f1fa26c720f'
  AND d.tenant_id = (SELECT id FROM tenants WHERE name = 'Smile');

