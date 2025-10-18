-- Check which critical tables exist or are missing

SELECT 'locations' as table_name, 
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'locations') 
    THEN 'EXISTS' ELSE 'MISSING' 
  END as status
UNION ALL
SELECT 'dental_groups',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'dental_groups')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'user_location_access',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_location_access')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'marketing_audit_runs',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_audit_runs')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'marketing_audit_shares',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_audit_shares')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'audit_metrics',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_metrics')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'billing_plans',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'billing_plans')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'billing_subscriptions',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'billing_subscriptions')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'join_requests',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'join_requests')
    THEN 'EXISTS' ELSE 'MISSING'
  END
UNION ALL
SELECT 'tenant_admins',
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tenant_admins')
    THEN 'EXISTS' ELSE 'MISSING'
  END
ORDER BY table_name;

