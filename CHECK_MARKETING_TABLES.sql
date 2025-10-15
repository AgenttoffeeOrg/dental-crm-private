-- Check if Marketing Audit tables exist
-- Run this in Supabase SQL Editor

SELECT 
  table_name,
  CASE 
    WHEN table_name IN (
      'marketing_audit_runs',
      'audit_metrics', 
      'audit_recommendations',
      'audit_competitors',
      'audit_peer_groups',
      'audit_schedules',
      'api_credentials',
      'audit_alerts'
    ) THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'marketing_audit_runs',
    'audit_metrics',
    'audit_recommendations', 
    'audit_competitors',
    'audit_peer_groups',
    'audit_schedules',
    'api_credentials',
    'audit_alerts'
  )
ORDER BY table_name;

-- If you see fewer than 8 rows, you need to run STEP_1_PURE_SQL.sql

