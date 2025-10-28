-- Check RLS policies on joined tables
SELECT 
  'CONTACTS' AS table_name,
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'contacts'
  AND polname LIKE '%Tenant%'

UNION ALL

SELECT 
  'PIPELINE_STAGES' AS table_name,
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'pipeline_stages'
  AND polname LIKE '%Tenant%'

UNION ALL

SELECT 
  'APP_USERS' AS table_name,
  polname AS policy_name,
  pg_get_expr(polqual, polrelid) AS using_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'app_users'

ORDER BY table_name, policy_name;

