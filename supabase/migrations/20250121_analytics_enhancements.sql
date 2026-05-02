SET search_path TO public, extensions;

-- =====================================================
-- ANALYTICS ENHANCEMENTS
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Support advanced analytics features (alerts, saved views, shareable links)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. THRESHOLD ALERTS
-- =====================================================

DROP TABLE IF EXISTS analytics_threshold_alerts CASCADE;
CREATE TABLE analytics_threshold_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Alert configuration
  name VARCHAR(255) NOT NULL,
  metric VARCHAR(100) NOT NULL, -- 'cac', 'conversion_rate', 'revenue', etc.
  condition VARCHAR(20) NOT NULL CHECK (condition IN ('above', 'below', 'between')),
  threshold_value DECIMAL(15, 2) NOT NULL,
  threshold_value_2 DECIMAL(15, 2), -- For 'between' condition
  
  -- Notification settings
  notification_channels TEXT[] DEFAULT ARRAY['email', 'in_app'], -- ['email', 'in_app', 'slack']
  recipient_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  slack_webhook_url TEXT,
  
  -- Status
  is_enabled BOOLEAN DEFAULT TRUE,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  last_triggered_value DECIMAL(15, 2),
  trigger_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_threshold_alerts_tenant ON analytics_threshold_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_threshold_alerts_enabled ON analytics_threshold_alerts(tenant_id, is_enabled);

COMMENT ON TABLE analytics_threshold_alerts IS 'Threshold-based alerts for KPI monitoring';

-- =====================================================
-- 2. SAVED VIEWS
-- =====================================================

DROP TABLE IF EXISTS analytics_saved_views CASCADE;
CREATE TABLE analytics_saved_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- View configuration
  name VARCHAR(255) NOT NULL,
  dashboard VARCHAR(100) NOT NULL, -- 'executive', 'crm', 'marketing', etc.
  filters JSONB DEFAULT '{}'::JSONB, -- Saved filter state
  
  -- Sharing
  is_public BOOLEAN DEFAULT FALSE, -- Visible to all users in tenant
  share_token VARCHAR(100) UNIQUE, -- For external sharing
  
  -- Metadata
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_views_tenant ON analytics_saved_views(tenant_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_user ON analytics_saved_views(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_views_share_token ON analytics_saved_views(share_token);

COMMENT ON TABLE analytics_saved_views IS 'User-saved dashboard views and filter states';

-- =====================================================
-- 3. SHAREABLE DASHBOARD LINKS
-- =====================================================

DROP TABLE IF EXISTS analytics_shared_dashboards CASCADE;
CREATE TABLE analytics_shared_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES app_users(id),
  
  -- Dashboard configuration
  dashboard_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  filters JSONB DEFAULT '{}'::JSONB,
  
  -- Sharing settings
  share_token VARCHAR(100) UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT FALSE, -- If true, anyone with link can view
  require_login BOOLEAN DEFAULT TRUE,
  password_hash TEXT, -- Optional password protection
  
  -- Access control
  allowed_emails TEXT[], -- Whitelist of emails (if require_login = true)
  expires_at TIMESTAMP WITH TIME ZONE, -- Auto-expire link
  
  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_dashboards_token ON analytics_shared_dashboards(share_token);
CREATE INDEX IF NOT EXISTS idx_shared_dashboards_tenant ON analytics_shared_dashboards(tenant_id);

COMMENT ON TABLE analytics_shared_dashboards IS 'Publicly shareable dashboard links';

-- =====================================================
-- 4. DATA QUALITY MONITORING
-- =====================================================

DROP TABLE IF EXISTS analytics_data_quality_log CASCADE;
CREATE TABLE analytics_data_quality_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Data source
  source_type VARCHAR(100) NOT NULL, -- 'crm', 'marketing', 'ga4', 'gsc', etc.
  source_table VARCHAR(255),
  
  -- Quality metrics
  total_records BIGINT DEFAULT 0,
  null_records BIGINT DEFAULT 0,
  duplicate_records BIGINT DEFAULT 0,
  invalid_records BIGINT DEFAULT 0,
  completeness_score DECIMAL(5, 2), -- % of required fields filled
  accuracy_score DECIMAL(5, 2), -- % of valid data
  freshness_score DECIMAL(5, 2), -- Based on last_updated
  
  -- Freshness
  oldest_record_date TIMESTAMP WITH TIME ZONE,
  newest_record_date TIMESTAMP WITH TIME ZONE,
  last_etl_run TIMESTAMP WITH TIME ZONE,
  
  -- Issues detected
  issues_detected JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_quality_tenant ON analytics_data_quality_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_data_quality_source ON analytics_data_quality_log(source_type);
CREATE INDEX IF NOT EXISTS idx_data_quality_checked_at ON analytics_data_quality_log(checked_at DESC);

COMMENT ON TABLE analytics_data_quality_log IS 'Data quality monitoring and validation results';

-- =====================================================
-- 5. ANOMALY DETECTION LOG
-- =====================================================

DROP TABLE IF EXISTS analytics_anomalies_detected CASCADE;
CREATE TABLE analytics_anomalies_detected (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Anomaly details
  metric VARCHAR(100) NOT NULL,
  value DECIMAL(15, 2) NOT NULL,
  expected_value DECIMAL(15, 2),
  deviation_percentage DECIMAL(5, 2),
  z_score DECIMAL(10, 2), -- Statistical deviation
  
  -- Detection method
  detection_method VARCHAR(50), -- 'z_score', 'iqr', 'isolation_forest', 'seasonality'
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Context
  time_period DATE NOT NULL,
  dimensions JSONB, -- Additional context (source, user, campaign, etc.)
  
  -- Resolution
  acknowledged BOOLEAN DEFAULT FALSE,
  acknowledged_by UUID REFERENCES app_users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  
  -- Metadata
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_tenant ON analytics_anomalies_detected(tenant_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_metric ON analytics_anomalies_detected(metric);
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON analytics_anomalies_detected(severity);
CREATE INDEX IF NOT EXISTS idx_anomalies_acknowledged ON analytics_anomalies_detected(tenant_id, acknowledged);

COMMENT ON TABLE analytics_anomalies_detected IS 'AI-detected anomalies in metrics';

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Threshold Alerts RLS
ALTER TABLE analytics_threshold_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_threshold_alerts_tenant_isolation ON analytics_threshold_alerts;
CREATE POLICY analytics_threshold_alerts_tenant_isolation ON analytics_threshold_alerts
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Saved Views RLS
ALTER TABLE analytics_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_saved_views_owner ON analytics_saved_views;
CREATE POLICY analytics_saved_views_owner ON analytics_saved_views
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR is_public = TRUE AND tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid())
  );

-- Shared Dashboards RLS
ALTER TABLE analytics_shared_dashboards ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_shared_dashboards_access ON analytics_shared_dashboards;
CREATE POLICY analytics_shared_dashboards_access ON analytics_shared_dashboards
  FOR SELECT
  USING (
    -- Owner can always see
    created_by = auth.uid()
    -- Or it's public
    OR is_public = TRUE
    -- Or user's email is in allowed list
    OR auth.jwt() ->> 'email' = ANY(allowed_emails)
  );

-- Data Quality Log RLS
ALTER TABLE analytics_data_quality_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_data_quality_tenant_isolation ON analytics_data_quality_log;
CREATE POLICY analytics_data_quality_tenant_isolation ON analytics_data_quality_log
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Anomalies RLS
ALTER TABLE analytics_anomalies_detected ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_anomalies_tenant_isolation ON analytics_anomalies_detected;
CREATE POLICY analytics_anomalies_tenant_isolation ON analytics_anomalies_detected
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- =====================================================
-- 7. HELPER FUNCTIONS
-- =====================================================

-- Check threshold alerts (called by cron job)
CREATE OR REPLACE FUNCTION check_threshold_alerts()
RETURNS TABLE (
  alert_id UUID,
  alert_name VARCHAR,
  metric VARCHAR,
  threshold DECIMAL,
  current_value DECIMAL,
  is_triggered BOOLEAN
) AS $$
BEGIN
  -- Implementation for checking all active alerts
  -- Compare current metric values against thresholds
  -- Return list of triggered alerts
  
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.metric,
    a.threshold_value,
    0.0::DECIMAL as current_value, -- TODO: Calculate actual current value
    FALSE as is_triggered
  FROM analytics_threshold_alerts a
  WHERE a.is_enabled = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

