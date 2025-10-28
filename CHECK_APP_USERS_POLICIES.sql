-- Check ALL policies on app_users table
SELECT 
  polname AS policy_name,
  polcmd AS command,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS command_name,
  pg_get_expr(polqual, polrelid) AS using_expression,
  pg_get_expr(polwithcheck, polrelid) AS with_check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
WHERE cls.relname = 'app_users'
ORDER BY polcmd, polname;

