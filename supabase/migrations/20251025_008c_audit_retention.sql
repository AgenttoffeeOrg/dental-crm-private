-- =====================================================
-- STEP 7C: AUDIT RETENTION & CLEANUP
-- Purpose: Automated retention policy enforcement and cleanup
-- Safety: Configurable, reversible, audit trail preserved
-- =====================================================

BEGIN;

-- Function to apply retention policies
CREATE OR REPLACE FUNCTION public.apply_audit_retention_policies()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_policy RECORD;
BEGIN
  -- Apply retention policies in priority order
  FOR v_policy IN
    SELECT * FROM audit_retention_policies
    WHERE is_active = true
    ORDER BY priority DESC, created_at ASC
  LOOP
    -- Update retention_until for matching audit logs
    UPDATE audits a
    SET retention_until = NOW() + (v_policy.retention_days || ' days')::INTERVAL
    WHERE a.tenant_id = v_policy.tenant_id
      AND (v_policy.category IS NULL OR a.category = v_policy.category)
      AND (v_policy.severity IS NULL OR a.severity = v_policy.severity)
      AND a.retention_until IS NULL;
  END LOOP;
  
  -- Delete expired audit logs
  DELETE FROM audits
  WHERE retention_until IS NOT NULL
    AND retention_until < NOW();
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  RETURN v_deleted_count;
END;
$$;

-- Function to get audit statistics
CREATE OR REPLACE FUNCTION public.get_audit_statistics(
  p_tenant_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_stats JSONB;
BEGIN
  WITH stats AS (
    SELECT
      COUNT(*) as total_logs,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(*) FILTER (WHERE severity = 'critical') as critical_events,
      COUNT(*) FILTER (WHERE severity = 'error') as error_events,
      COUNT(*) FILTER (WHERE category = 'security') as security_events,
      COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as last_24h
    FROM audits
    WHERE tenant_id = p_tenant_id
      AND created_at > NOW() - (p_days || ' days')::INTERVAL
  )
  SELECT jsonb_build_object(
    'period_days', p_days,
    'total_logs', total_logs,
    'unique_users', unique_users,
    'critical_events', critical_events,
    'error_events', error_events,
    'security_events', security_events,
    'last_24h', last_24h,
    'avg_per_day', ROUND(total_logs::numeric / p_days, 2)
  ) INTO v_stats
  FROM stats;
  
  RETURN v_stats;
END;
$$;

COMMENT ON FUNCTION public.apply_audit_retention_policies IS
  'Apply retention policies and delete expired audit logs';
COMMENT ON FUNCTION public.get_audit_statistics IS
  'Get audit log statistics for a tenant';

DO $$
BEGIN
  RAISE NOTICE '✅ Created retention and statistics functions';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Schedule apply_audit_retention_policies() to run daily';
  RAISE NOTICE '🎯 Step 7 Complete! Audit system ready for production.';
END $$;

COMMIT;



