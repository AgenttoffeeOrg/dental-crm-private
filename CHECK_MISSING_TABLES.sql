-- Check which tables are missing from your database

SELECT 
  'Missing Tables Report' as report_type,
  COUNT(*) as tables_checked;

-- Check for multi-location tables
SELECT 'locations' as table_name, 
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'locations') 
    THEN 'EXISTS' ELSE 'MISSING' 
  END as status;

SELECT 'dental_groups' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'dental_groups')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

SELECT 'user_location_access' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_location_access')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

-- Check for marketing audit tables
SELECT 'marketing_audit_runs' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'marketing_audit_runs')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

SELECT 'marketing_audit_shares' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'marketing_audit_shares')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

SELECT 'audit_metrics' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'audit_metrics')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

-- Check for billing tables
SELECT 'billing_plans' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'billing_plans')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

SELECT 'billing_subscriptions' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'billing_subscriptions')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

-- Check for join requests
SELECT 'join_requests' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'join_requests')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

-- Check for tenant_admins
SELECT 'tenant_admins' as table_name,
  CASE WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'tenant_admins')
    THEN 'EXISTS' ELSE 'MISSING'
  END as status;

