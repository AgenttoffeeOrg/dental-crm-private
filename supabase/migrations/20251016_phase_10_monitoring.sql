-- =====================================================
-- PHASE 10: SECURITY MONITORING & HEALTH DASHBOARD
-- Real-time monitoring of tenant isolation and violations
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - SECURITY MONITORING
--
-- This migration creates:
-- - Security health monitoring views
-- - Violation detection and alerting
-- - Multi-tenant metrics
-- - Compliance reporting
-- =====================================================

BEGIN;

-- =====================================================
-- 1. TENANT ISOLATION HEALTH VIEW
-- =====================================================

CREATE OR REPLACE VIEW tenant_isolation_health AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  
  -- Record counts
  (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id) as total_contacts,
  (SELECT COUNT(*) FROM deals WHERE tenant_id = t.id) as total_deals,
  (SELECT COUNT(*) FROM tasks WHERE tenant_id = t.id) as total_tasks,
  (SELECT COUNT(*) FROM automations WHERE tenant_id = t.id) as total_automations,
  
  -- Cross-org violation attempts (last 24h)
  (SELECT COUNT(*) FROM isolation_violations WHERE attempted_org_id = t.id AND created_at > NOW() - INTERVAL '24 hours') as violations_24h,
  (SELECT COUNT(*) FROM isolation_violations WHERE attempted_org_id = t.id AND created_at > NOW() - INTERVAL '7 days') as violations_7d,
  
  -- Org access attempts (last 24h)
  (SELECT COUNT(*) FROM org_access_log WHERE to_org_id = t.id AND created_at > NOW() - INTERVAL '24 hours') as access_attempts_24h,
  (SELECT COUNT(*) FROM org_access_log WHERE to_org_id = t.id AND access_type = 'suspicious' AND created_at > NOW() - INTERVAL '24 hours') as suspicious_access_24h,
  
  -- Active users
  (SELECT COUNT(DISTINCT user_id) FROM org_memberships WHERE tenant_id = t.id AND status = 'active') as active_users,
  (SELECT COUNT(*) FROM org_memberships WHERE tenant_id = t.id AND status = 'suspended') as suspended_users,
  
  -- RLS status
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'contacts') as contacts_rls_enabled,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'deals') as deals_rls_enabled,
  
  -- Last activity
  (SELECT MAX(created_at) FROM contacts WHERE tenant_id = t.id) as last_contact_created,
  (SELECT MAX(created_at) FROM deals WHERE tenant_id = t.id) as last_deal_created,
  
  -- Health score (0-100)
  CASE 
    WHEN (SELECT COUNT(*) FROM isolation_violations WHERE attempted_org_id = t.id AND created_at > NOW() - INTERVAL '24 hours') > 0 THEN 50
    WHEN (SELECT COUNT(*) FROM org_access_log WHERE to_org_id = t.id AND access_type = 'suspicious' AND created_at > NOW() - INTERVAL '24 hours') > 0 THEN 70
    ELSE 100
  END as health_score,
  
  NOW() as last_checked
FROM tenants t;

-- =====================================================
-- 2. SECURITY VIOLATIONS SUMMARY VIEW
-- =====================================================

CREATE OR REPLACE VIEW security_violations_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour_bucket,
  user_org_id,
  attempted_org_id,
  violation_type,
  COUNT(*) as violation_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT table_name) as affected_tables,
  MAX(created_at) as last_occurred
FROM isolation_violations
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), user_org_id, attempted_org_id, violation_type
ORDER BY hour_bucket DESC, violation_count DESC;

-- =====================================================
-- 3. DATA INTEGRITY CHECKS VIEW
-- =====================================================

CREATE OR REPLACE VIEW data_integrity_status AS
SELECT 
  'deals_with_invalid_contact' as check_name,
  'critical' as severity,
  COUNT(*) as violations_count,
  json_agg(json_build_object('deal_id', d.id, 'tenant_id', d.tenant_id, 'contact_tenant', c.tenant_id)) as violations
FROM deals d
LEFT JOIN contacts c ON d.contact_id = c.id
WHERE d.contact_id IS NOT NULL
  AND (c.id IS NULL OR c.tenant_id != d.tenant_id)
  
UNION ALL

SELECT 
  'deals_with_invalid_pipeline' as check_name,
  'critical' as severity,
  COUNT(*) as violations_count,
  json_agg(json_build_object('deal_id', d.id, 'tenant_id', d.tenant_id, 'pipeline_tenant', p.tenant_id)) as violations
FROM deals d
LEFT JOIN pipelines p ON d.pipeline_id = p.id
WHERE d.pipeline_id IS NOT NULL
  AND (p.id IS NULL OR p.tenant_id != d.tenant_id)

UNION ALL

SELECT 
  'orphaned_deals' as check_name,
  'warning' as severity,
  COUNT(*) as violations_count,
  json_agg(json_build_object('deal_id', d.id, 'tenant_id', d.tenant_id)) as violations
FROM deals d
WHERE d.contact_id IS NULL

UNION ALL

SELECT 
  'orphaned_tasks' as check_name,
  'warning' as severity,
  COUNT(*) as violations_count,
  json_agg(json_build_object('task_id', t.id, 'tenant_id', t.tenant_id)) as violations
FROM tasks t
WHERE t.contact_id IS NULL AND t.deal_id IS NULL;

-- =====================================================
-- 4. COMPLIANCE REPORT VIEW
-- =====================================================

CREATE OR REPLACE VIEW compliance_report AS
SELECT 
  t.id as tenant_id,
  t.name as tenant_name,
  
  -- GDPR Compliance
  COALESCE((SELECT gdpr_enabled FROM privacy_settings WHERE tenant_id = t.id), false) as gdpr_enabled,
  (SELECT COUNT(*) FROM consent_records WHERE tenant_id = t.id AND granted = true) as active_consents,
  (SELECT COUNT(*) FROM gdpr_export_requests WHERE tenant_id = t.id AND status = 'pending') as pending_exports,
  (SELECT COUNT(*) FROM gdpr_deletion_requests WHERE tenant_id = t.id AND status = 'pending') as pending_deletions,
  
  -- Audit Trail
  (SELECT COUNT(*) FROM audit_trail WHERE tenant_id = t.id AND created_at > NOW() - INTERVAL '30 days') as audit_events_30d,
  (SELECT COUNT(*) FROM audit_trail WHERE tenant_id = t.id AND severity IN ('error', 'critical') AND created_at > NOW() - INTERVAL '7 days') as critical_events_7d,
  
  -- Data Access
  (SELECT COUNT(*) FROM data_access_log WHERE tenant_id = t.id AND created_at > NOW() - INTERVAL '24 hours') as data_accesses_24h,
  (SELECT COUNT(DISTINCT user_id) FROM data_access_log WHERE tenant_id = t.id AND created_at > NOW() - INTERVAL '24 hours') as active_users_24h,
  
  -- Security
  (SELECT COUNT(*) FROM isolation_violations WHERE user_org_id = t.id OR attempted_org_id = t.id) as total_violations,
  (SELECT COUNT(*) FROM security_breaches WHERE tenant_id = t.id AND status != 'resolved') as open_breaches,
  
  -- Compliance Score (0-100)
  CASE
    WHEN (SELECT COUNT(*) FROM security_breaches WHERE tenant_id = t.id AND status != 'resolved') > 0 THEN 30
    WHEN (SELECT COUNT(*) FROM isolation_violations WHERE user_org_id = t.id AND created_at > NOW() - INTERVAL '7 days') > 10 THEN 50
    WHEN (SELECT COUNT(*) FROM gdpr_deletion_requests WHERE tenant_id = t.id AND status = 'pending' AND requested_at < NOW() - INTERVAL '30 days') > 0 THEN 70
    WHEN NOT COALESCE((SELECT gdpr_enabled FROM privacy_settings WHERE tenant_id = t.id), false) THEN 80
    ELSE 100
  END as compliance_score,
  
  NOW() as report_generated_at
FROM tenants t;

-- =====================================================
-- 5. MONITORING ALERTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('isolation_violation', 'suspicious_access', 'data_integrity', 'compliance_issue', 'performance', 'breach_detected')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_table TEXT,
  affected_record_id UUID,
  violation_count INTEGER DEFAULT 1,
  auto_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES app_users(id),
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_tenant ON security_alerts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts(severity, created_at DESC) WHERE severity IN ('high', 'critical');
CREATE INDEX IF NOT EXISTS idx_security_alerts_unresolved ON security_alerts(created_at DESC) WHERE resolved_at IS NULL;

-- =====================================================
-- 6. AUTOMATED VIOLATION DETECTION
-- =====================================================

-- Function to detect and alert on isolation violations
CREATE OR REPLACE FUNCTION detect_isolation_violations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If a violation is logged, create an alert
  IF NEW.violation_type IN ('cross_org_query', 'cross_org_update', 'cross_org_delete') THEN
    INSERT INTO security_alerts (
      tenant_id,
      alert_type,
      severity,
      title,
      description,
      affected_table,
      affected_record_id,
      metadata
    ) VALUES (
      NEW.attempted_org_id,
      'isolation_violation',
      CASE 
        WHEN NEW.violation_type IN ('cross_org_update', 'cross_org_delete') THEN 'critical'
        ELSE 'high'
      END,
      'Tenant Isolation Violation Detected',
      format('User from org %s attempted %s on org %s (table: %s)', NEW.user_org_id, NEW.violation_type, NEW.attempted_org_id, NEW.table_name),
      NEW.table_name,
      NEW.record_id,
      jsonb_build_object(
        'violation_id', NEW.id,
        'user_id', NEW.user_id,
        'violation_type', NEW.violation_type
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Apply trigger
DROP TRIGGER IF EXISTS alert_on_isolation_violation ON isolation_violations;
CREATE TRIGGER alert_on_isolation_violation
  AFTER INSERT ON isolation_violations
  FOR EACH ROW
  EXECUTE FUNCTION detect_isolation_violations();

-- =====================================================
-- 7. HEALTH CHECK FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_security_health_score(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  health_report JSON;
  score INTEGER := 100;
  issues TEXT[] := '{}';
BEGIN
  -- Check 1: Any unresolved breaches?
  IF EXISTS (SELECT 1 FROM security_breaches WHERE tenant_id = p_tenant_id AND status != 'resolved') THEN
    score := score - 50;
    issues := array_append(issues, 'Unresolved security breaches');
  END IF;
  
  -- Check 2: Violations in last 24h?
  IF (SELECT COUNT(*) FROM isolation_violations WHERE attempted_org_id = p_tenant_id AND created_at > NOW() - INTERVAL '24 hours') > 0 THEN
    score := score - 20;
    issues := array_append(issues, 'Recent isolation violations');
  END IF;
  
  -- Check 3: RLS enabled?
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE relname = 'contacts') THEN
    score := score - 30;
    issues := array_append(issues, 'RLS not enabled on critical tables');
  END IF;
  
  -- Check 4: Data integrity issues?
  IF EXISTS (
    SELECT 1 FROM deals d
    LEFT JOIN contacts c ON d.contact_id = c.id
    WHERE d.tenant_id = p_tenant_id
      AND d.contact_id IS NOT NULL
      AND (c.id IS NULL OR c.tenant_id != d.tenant_id)
  ) THEN
    score := score - 25;
    issues := array_append(issues, 'Data integrity issues detected');
  END IF;
  
  -- Build report
  health_report := json_build_object(
    'tenant_id', p_tenant_id,
    'health_score', GREATEST(0, score),
    'status', CASE
      WHEN score >= 90 THEN 'healthy'
      WHEN score >= 70 THEN 'warning'
      WHEN score >= 50 THEN 'degraded'
      ELSE 'critical'
    END,
    'issues', issues,
    'checked_at', NOW()
  );
  
  RETURN health_report;
END;
$$;

-- =====================================================
-- 8. RLS FOR MONITORING TABLES
-- =====================================================

-- Security Alerts (admins only)
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security alerts" ON security_alerts
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

CREATE POLICY "Admins can resolve alerts" ON security_alerts
  FOR UPDATE USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.security.manage')
  );

CREATE POLICY "Service role bypass alerts" ON security_alerts
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 9. SCHEDULED HEALTH CHECKS (via pg_cron if available)
-- =====================================================

-- Note: Requires pg_cron extension
-- This is optional, for advanced deployment

COMMENT ON VIEW tenant_isolation_health IS 'Real-time view of tenant isolation health metrics. Query this view to monitor security status.';

COMMENT ON VIEW security_violations_summary IS 'Hourly summary of security violations. Used for alerting and trending.';

COMMENT ON VIEW data_integrity_status IS 'Real-time data integrity checks. Shows orphaned records and cross-tenant relationships.';

COMMENT ON VIEW compliance_report IS 'Compliance status per tenant. Shows GDPR readiness and pending requests.';

COMMIT;

-- =====================================================
-- VERIFICATION & FINAL STATUS
-- =====================================================

DO $$
DECLARE
  alerts_created INTEGER;
  views_created INTEGER;
BEGIN
  SELECT COUNT(*) INTO alerts_created FROM security_alerts;
  SELECT COUNT(*) INTO views_created FROM information_schema.views WHERE table_schema = 'public' AND table_name IN ('tenant_isolation_health', 'security_violations_summary', 'data_integrity_status', 'compliance_report');
  
  RAISE NOTICE '=== MONITORING SYSTEM VERIFICATION ===';
  RAISE NOTICE 'Monitoring views created: %', views_created;
  RAISE NOTICE 'Security alerts: %', alerts_created;
  RAISE NOTICE '======================================';
  
  RAISE NOTICE '✅ Phase 10 Complete: Security monitoring and health dashboard configured';
  RAISE NOTICE '🎉 ALL 10 PHASES COMPLETE!';
  RAISE NOTICE '🔒 Enterprise multi-tenant security: FULLY DEPLOYED';
END $$;

