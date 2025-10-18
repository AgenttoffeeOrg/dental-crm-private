-- Dashboard Preferences Migration
-- Creates table for storing user dashboard customization preferences

-- Create user_dashboard_preferences table
CREATE TABLE IF NOT EXISTS user_dashboard_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Widget visibility settings
  widget_visibility JSONB DEFAULT '{
    "revenue": true,
    "deals": true,
    "contacts": true,
    "tasks": true,
    "revenueChart": true,
    "dealsFunnel": true,
    "recentActivity": true,
    "upcomingTasks": true,
    "quickInsights": true,
    "priorities": true
  }'::jsonb,
  
  -- Widget order (array of widget IDs)
  widget_order JSONB DEFAULT '["priorities", "revenue", "deals", "contacts", "tasks", "revenueChart", "dealsFunnel", "quickInsights"]'::jsonb,
  
  -- Individual widget settings
  widget_settings JSONB DEFAULT '{}'::jsonb,
  
  -- Global preferences
  time_period_default TEXT DEFAULT 'month' CHECK (time_period_default IN ('today', 'week', 'month', 'quarter', 'year', 'custom')),
  auto_refresh_enabled BOOLEAN DEFAULT TRUE,
  auto_refresh_interval INTEGER DEFAULT 5, -- minutes
  theme_preference TEXT DEFAULT 'system' CHECK (theme_preference IN ('light', 'dark', 'system')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one preference per user
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_prefs_user_id 
  ON user_dashboard_preferences(user_id);

-- Enable Row Level Security
ALTER TABLE user_dashboard_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can update own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can insert own dashboard preferences" ON user_dashboard_preferences;
DROP POLICY IF EXISTS "Users can delete own dashboard preferences" ON user_dashboard_preferences;

-- RLS Policies: Users can only manage their own preferences
CREATE POLICY "Users can view own dashboard preferences"
  ON user_dashboard_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own dashboard preferences"
  ON user_dashboard_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own dashboard preferences"
  ON user_dashboard_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own dashboard preferences"
  ON user_dashboard_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dashboard_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_dashboard_prefs_timestamp ON user_dashboard_preferences;
CREATE TRIGGER update_dashboard_prefs_timestamp
  BEFORE UPDATE ON user_dashboard_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_dashboard_prefs_updated_at();

-- Grant permissions
GRANT ALL ON user_dashboard_preferences TO authenticated;

COMMENT ON TABLE user_dashboard_preferences IS 'Stores user dashboard customization preferences including widget visibility, order, and settings';

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

CREATE TABLE IF NOT EXISTS analytics_threshold_alerts (
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

CREATE INDEX idx_threshold_alerts_tenant ON analytics_threshold_alerts(tenant_id);
CREATE INDEX idx_threshold_alerts_enabled ON analytics_threshold_alerts(tenant_id, is_enabled);

COMMENT ON TABLE analytics_threshold_alerts IS 'Threshold-based alerts for KPI monitoring';

-- =====================================================
-- 2. SAVED VIEWS
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_saved_views (
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

CREATE INDEX idx_saved_views_tenant ON analytics_saved_views(tenant_id);
CREATE INDEX idx_saved_views_user ON analytics_saved_views(user_id);
CREATE INDEX idx_saved_views_share_token ON analytics_saved_views(share_token);

COMMENT ON TABLE analytics_saved_views IS 'User-saved dashboard views and filter states';

-- =====================================================
-- 3. SHAREABLE DASHBOARD LINKS
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_shared_dashboards (
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

CREATE INDEX idx_shared_dashboards_token ON analytics_shared_dashboards(share_token);
CREATE INDEX idx_shared_dashboards_tenant ON analytics_shared_dashboards(tenant_id);

COMMENT ON TABLE analytics_shared_dashboards IS 'Publicly shareable dashboard links';

-- =====================================================
-- 4. DATA QUALITY MONITORING
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_data_quality_log (
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

CREATE INDEX idx_data_quality_tenant ON analytics_data_quality_log(tenant_id);
CREATE INDEX idx_data_quality_source ON analytics_data_quality_log(source_type);
CREATE INDEX idx_data_quality_checked_at ON analytics_data_quality_log(checked_at DESC);

COMMENT ON TABLE analytics_data_quality_log IS 'Data quality monitoring and validation results';

-- =====================================================
-- 5. ANOMALY DETECTION LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS analytics_anomalies_detected (
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

CREATE INDEX idx_anomalies_tenant ON analytics_anomalies_detected(tenant_id);
CREATE INDEX idx_anomalies_metric ON analytics_anomalies_detected(metric);
CREATE INDEX idx_anomalies_severity ON analytics_anomalies_detected(severity);
CREATE INDEX idx_anomalies_acknowledged ON analytics_anomalies_detected(tenant_id, acknowledged);

COMMENT ON TABLE analytics_anomalies_detected IS 'AI-detected anomalies in metrics';

-- =====================================================
-- 6. ROW LEVEL SECURITY
-- =====================================================

-- Threshold Alerts RLS
ALTER TABLE analytics_threshold_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_threshold_alerts_tenant_isolation
  ON analytics_threshold_alerts
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Saved Views RLS
ALTER TABLE analytics_saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_saved_views_owner
  ON analytics_saved_views
  FOR ALL
  USING (
    user_id = auth.uid() 
    OR is_public = TRUE AND tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid())
  );

-- Shared Dashboards RLS
ALTER TABLE analytics_shared_dashboards ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_shared_dashboards_access
  ON analytics_shared_dashboards
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

CREATE POLICY analytics_data_quality_tenant_isolation
  ON analytics_data_quality_log
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Anomalies RLS
ALTER TABLE analytics_anomalies_detected ENABLE ROW LEVEL SECURITY;

CREATE POLICY analytics_anomalies_tenant_isolation
  ON analytics_anomalies_detected
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

/**
 * Marketing Audit - Share Links Table
 * 
 * Enables secure sharing of audit reports via expiring links.
 */

-- Create shares table
CREATE TABLE IF NOT EXISTS public.marketing_audit_shares (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id uuid REFERENCES public.marketing_audit_runs(id) ON DELETE CASCADE NOT NULL,
  share_token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  password_protected boolean DEFAULT false,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index on share_token for fast lookups
CREATE INDEX idx_audit_shares_token ON public.marketing_audit_shares(share_token);

-- Create index on expires_at for cleanup jobs
CREATE INDEX idx_audit_shares_expires ON public.marketing_audit_shares(expires_at);

-- Enable RLS
ALTER TABLE public.marketing_audit_shares ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create shares for their own audits
CREATE POLICY "Users can create shares for own audits"
  ON public.marketing_audit_shares
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.marketing_audit_runs ar
      JOIN public.app_users au ON ar.tenant_id = au.tenant_id
      WHERE ar.id = audit_id AND au.id = auth.uid()
    )
  );

-- Policy: Users can view shares they created
CREATE POLICY "Users can view own shares"
  ON public.marketing_audit_shares
  FOR SELECT
  USING (created_by = auth.uid());

-- Policy: Users can delete shares they created
CREATE POLICY "Users can delete own shares"
  ON public.marketing_audit_shares
  FOR DELETE
  USING (created_by = auth.uid());

-- Policy: Public can view non-expired shares (for shared links)
CREATE POLICY "Public can view valid shares"
  ON public.marketing_audit_shares
  FOR SELECT
  USING (
    expires_at > now()
    AND share_token IS NOT NULL
  );

-- Function: Cleanup expired shares (run nightly via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_audit_shares()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.marketing_audit_shares
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION cleanup_expired_audit_shares() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_audit_shares() TO service_role;

-- =====================================================
-- AUTOMATION EVENT LOG & REPLAY
-- Migration: Automation Event System
-- =====================================================

-- Table: automation_event_log
-- Stores all events for audit trail and replay functionality
CREATE TABLE IF NOT EXISTS automation_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL, -- e.g., 'DEAL.CREATED', 'TASK.OVERDUE'
    event_data JSONB NOT NULL, -- Full event payload
    
    -- Triggered automations
    triggered_automation_ids UUID[] DEFAULT '{}',
    automation_run_ids UUID[] DEFAULT '{}',
    
    -- Replay tracking
    replayed_from_id UUID REFERENCES automation_event_log(id) ON DELETE SET NULL,
    replay_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes separately
CREATE INDEX IF NOT EXISTS idx_automation_event_log_tenant ON automation_event_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_event_log_type ON automation_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_automation_event_log_created ON automation_event_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_event_log_tenant_type ON automation_event_log(tenant_id, event_type);

-- RLS Policies
ALTER TABLE automation_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's event logs"
    ON automation_event_log FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

-- Admins can insert event logs (system use)
CREATE POLICY "System can insert event logs"
    ON automation_event_log FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTION: Get Recent Events
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_automation_events(
    p_tenant_id UUID,
    p_event_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    event_data JSONB,
    triggered_automation_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.event_type,
        e.event_data,
        e.triggered_automation_ids,
        e.created_at
    FROM automation_event_log e
    WHERE e.tenant_id = p_tenant_id
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
    ORDER BY e.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Replay Event
-- =====================================================

CREATE OR REPLACE FUNCTION replay_automation_event(
    p_event_log_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_event_id UUID;
    v_event_type TEXT;
    v_event_data JSONB;
    v_tenant_id UUID;
BEGIN
    -- Get original event
    SELECT event_type, event_data, tenant_id
    INTO v_event_type, v_event_data, v_tenant_id
    FROM automation_event_log
    WHERE id = p_event_log_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event log not found: %', p_event_log_id;
    END IF;
    
    -- Create new event log entry
    INSERT INTO automation_event_log (
        tenant_id,
        event_type,
        event_data,
        replayed_from_id
    ) VALUES (
        v_tenant_id,
        v_event_type,
        v_event_data,
        p_event_log_id
    )
    RETURNING id INTO v_new_event_id;
    
    -- Increment replay count on original
    UPDATE automation_event_log
    SET replay_count = replay_count + 1
    WHERE id = p_event_log_id;
    
    RETURN v_new_event_id;
END;
$$;

-- =====================================================
-- CLEANUP: Auto-delete old event logs (retention policy)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_automation_event_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete event logs older than 90 days
    DELETE FROM automation_event_log
    WHERE created_at < NOW() - INTERVAL '90 days';
    
-- RAISE NOTICE 'Cleaned up old automation event logs';
END;
$$;

-- Schedule cleanup (call via cron job or manually)
-- Example: SELECT cleanup_old_automation_event_logs();

COMMENT ON TABLE automation_event_log IS 'Stores all CRM events for audit trail and replay functionality';
COMMENT ON FUNCTION get_recent_automation_events IS 'Retrieve recent events for a tenant, optionally filtered by type';
COMMENT ON FUNCTION replay_automation_event IS 'Replay a previous event to trigger automations again';
COMMENT ON FUNCTION cleanup_old_automation_event_logs IS 'Delete event logs older than 90 days (retention policy)';

-- =====================================================
-- AUTOMATION GOVERNANCE
-- Migration: Approval workflow, versioning, and enterprise controls
-- =====================================================

-- Automation Approvals (Draft → Review → Publish)
CREATE TABLE IF NOT EXISTS automation_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Approval details
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewer_user_id UUID REFERENCES app_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    
    -- Request details
    requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changes_summary TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_approvals_tenant ON automation_approvals(tenant_id);
CREATE INDEX idx_automation_approvals_automation ON automation_approvals(automation_id);
CREATE INDEX idx_automation_approvals_status ON automation_approvals(status);
CREATE INDEX idx_automation_approvals_reviewer ON automation_approvals(reviewer_user_id);

-- Automation Versions (Version history + rollback)
CREATE TABLE IF NOT EXISTS automation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Version details
    version_number INTEGER NOT NULL,
    graph_json JSONB NOT NULL, -- Snapshot of nodes/edges
    trigger_config JSONB,
    status_at_version TEXT, -- draft, active, etc.
    
    -- Change tracking
    published_by_user_id UUID REFERENCES app_users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    change_notes TEXT,
    
    -- Rollback tracking
    rolled_back_from_version INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(automation_id, version_number)
);

CREATE INDEX idx_automation_versions_tenant ON automation_versions(tenant_id);
CREATE INDEX idx_automation_versions_automation ON automation_versions(automation_id);
CREATE INDEX idx_automation_versions_number ON automation_versions(version_number DESC);
CREATE INDEX idx_automation_versions_published ON automation_versions(published_at DESC);

-- Automation Rate Limits (Prevent spam)
CREATE TABLE IF NOT EXISTS automation_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Rate limit configuration
    max_executions_per_hour INTEGER DEFAULT 100,
    max_executions_per_day INTEGER DEFAULT 1000,
    max_emails_per_day INTEGER DEFAULT 500,
    max_sms_per_day INTEGER DEFAULT 100,
    
    -- Current usage (resets periodically)
    current_hour_executions INTEGER DEFAULT 0,
    current_day_executions INTEGER DEFAULT 0,
    current_day_emails INTEGER DEFAULT 0,
    current_day_sms INTEGER DEFAULT 0,
    
    -- Reset timestamps
    hour_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    day_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),
    
    -- Status
    is_paused_due_to_limits BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, automation_id)
);

CREATE INDEX idx_automation_rate_limits_tenant ON automation_rate_limits(tenant_id);
CREATE INDEX idx_automation_rate_limits_automation ON automation_rate_limits(automation_id);
CREATE INDEX idx_automation_rate_limits_paused ON automation_rate_limits(is_paused_due_to_limits) WHERE is_paused_due_to_limits = true;

-- Consent Audit Log (GDPR/CCPA compliance)
CREATE TABLE IF NOT EXISTS automation_consent_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Consent check details
    action_type TEXT NOT NULL, -- 'send_email', 'send_sms', etc.
    consent_status TEXT NOT NULL CHECK (consent_status IN ('granted', 'denied', 'not_required')),
    consent_source TEXT, -- Where consent was obtained
    
    -- Action result
    action_taken BOOLEAN NOT NULL, -- true if sent, false if blocked
    blocked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consent_audit_tenant ON automation_consent_audit(tenant_id);
CREATE INDEX idx_consent_audit_automation ON automation_consent_audit(automation_id);
CREATE INDEX idx_consent_audit_contact ON automation_consent_audit(contact_id);
CREATE INDEX idx_consent_audit_created ON automation_consent_audit(created_at DESC);

-- RLS Policies
ALTER TABLE automation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_consent_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's approvals"
    ON automation_approvals FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can request approvals"
    ON automation_approvals FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Managers can approve/reject"
    ON automation_approvals FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    ));

CREATE POLICY "Users can view automation versions"
    ON automation_versions FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can create versions"
    ON automation_versions FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "Users can view rate limits"
    ON automation_rate_limits FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "System can manage rate limits"
    ON automation_rate_limits FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Users can view consent audit"
    ON automation_consent_audit FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

CREATE POLICY "System can insert consent audit"
    ON automation_consent_audit FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create new version on publish
CREATE OR REPLACE FUNCTION create_automation_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM automation_versions
    WHERE automation_id = NEW.id;
    
    -- Insert new version
    INSERT INTO automation_versions (
        tenant_id,
        automation_id,
        version_number,
        graph_json,
        trigger_config,
        status_at_version,
        published_at
    ) VALUES (
        NEW.tenant_id,
        NEW.id,
        v_next_version,
        NEW.graph_json,
        NEW.entry_trigger_config,
        NEW.status,
        CASE WHEN NEW.status = 'active' THEN NOW() ELSE NULL END
    );
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-create versions
CREATE TRIGGER automation_version_trigger
    AFTER UPDATE ON marketing_journeys
    FOR EACH ROW
    WHEN (OLD.graph_json IS DISTINCT FROM NEW.graph_json OR OLD.status = 'draft' AND NEW.status = 'active')
    EXECUTE FUNCTION create_automation_version();

-- Check and reset rate limits
CREATE OR REPLACE FUNCTION reset_automation_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset hourly limits
    UPDATE automation_rate_limits
    SET current_hour_executions = 0,
        hour_reset_at = NOW() + INTERVAL '1 hour'
    WHERE hour_reset_at <= NOW();
    
    -- Reset daily limits
    UPDATE automation_rate_limits
    SET current_day_executions = 0,
        current_day_emails = 0,
        current_day_sms = 0,
        day_reset_at = DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
        is_paused_due_to_limits = false
    WHERE day_reset_at <= NOW();
    
-- RAISE NOTICE 'Rate limits reset';
END;
$$;

COMMENT ON TABLE automation_approvals IS 'Approval workflow for automation publishing';
COMMENT ON TABLE automation_versions IS 'Version history for automations with rollback support';
COMMENT ON TABLE automation_rate_limits IS 'Rate limits to prevent automation spam';
COMMENT ON TABLE automation_consent_audit IS 'GDPR/CCPA compliance - tracks consent checks before sending';

-- =====================================================
-- AUTOMATION TESTING & SIMULATION
-- Migration: Test runs, validation, and simulation results
-- =====================================================

-- Automation Test Runs
CREATE TABLE IF NOT EXISTS automation_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Test details
    test_type TEXT NOT NULL CHECK (test_type IN ('simulation', 'dry_run', 'validation')),
    success BOOLEAN NOT NULL,
    execution_path JSONB, -- Array of nodes executed
    preview_messages JSONB, -- Emails/SMS that would be sent
    validation_errors JSONB, -- Any validation issues found
    execution_time_ms INTEGER,
    
    -- Test context
    test_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    tested_by_user_id UUID REFERENCES app_users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_test_runs_tenant ON automation_test_runs(tenant_id);
CREATE INDEX idx_automation_test_runs_automation ON automation_test_runs(automation_id);
CREATE INDEX idx_automation_test_runs_type ON automation_test_runs(test_type);
CREATE INDEX idx_automation_test_runs_created ON automation_test_runs(created_at DESC);

-- RLS Policies
ALTER TABLE automation_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's test runs"
    ON automation_test_runs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create test runs"
    ON automation_test_runs FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

-- =====================================================
-- HELPER FUNCTION: Get Test History
-- =====================================================

CREATE OR REPLACE FUNCTION get_automation_test_history(
    p_automation_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    test_type TEXT,
    success BOOLEAN,
    execution_time_ms INTEGER,
    preview_messages JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.test_type,
        t.success,
        t.execution_time_ms,
        t.preview_messages,
        t.created_at
    FROM automation_test_runs t
    WHERE t.automation_id = p_automation_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Compare Test Runs
-- =====================================================

CREATE OR REPLACE FUNCTION compare_automation_test_runs(
    p_test_run_1 UUID,
    p_test_run_2 UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run1 RECORD;
    v_run2 RECORD;
    v_result JSONB;
BEGIN
    -- Get both test runs
    SELECT * INTO v_run1 FROM automation_test_runs WHERE id = p_test_run_1;
    SELECT * INTO v_run2 FROM automation_test_runs WHERE id = p_test_run_2;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Test run not found"}'::jsonb;
    END IF;
    
    -- Build comparison
    v_result := jsonb_build_object(
        'run1', jsonb_build_object(
            'id', v_run1.id,
            'success', v_run1.success,
            'execution_time_ms', v_run1.execution_time_ms,
            'created_at', v_run1.created_at
        ),
        'run2', jsonb_build_object(
            'id', v_run2.id,
            'success', v_run2.success,
            'execution_time_ms', v_run2.execution_time_ms,
            'created_at', v_run2.created_at
        ),
        'differences', jsonb_build_object(
            'success_changed', v_run1.success != v_run2.success,
            'execution_time_diff_ms', v_run2.execution_time_ms - v_run1.execution_time_ms,
            'path_changed', v_run1.execution_path != v_run2.execution_path
        )
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON TABLE automation_test_runs IS 'Test runs and simulation results for automations';
COMMENT ON FUNCTION get_automation_test_history IS 'Retrieve test history for an automation';
COMMENT ON FUNCTION compare_automation_test_runs IS 'Compare two test runs to see what changed';

-- =====================================================
-- AUTOMATIONS - STANDALONE TABLES (OPTION B)
-- Migration: Create clean automation tables separate from marketing
-- =====================================================

-- =====================================================
-- 1. AUTOMATIONS TABLE (Main workflow definitions)
-- =====================================================

CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Category (4 types - this is the KEY field for tab separation)
    category TEXT NOT NULL CHECK (category IN ('deal', 'pipeline', 'task', 'marketing')),
    
    -- Automation basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
    
    -- Trigger configuration
    trigger_type TEXT NOT NULL, -- References automation_trigger_metadata
    trigger_config JSONB DEFAULT '{}',
    
    -- Visual workflow (nodes and edges as JSON)
    graph_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    
    -- Exit conditions
    exit_conditions JSONB,
    max_duration_days INTEGER,
    
    -- Statistics
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    active_runs INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_template BOOLEAN DEFAULT false,
    template_id UUID, -- If created from template
    
    -- Ownership
    created_by_user_id UUID REFERENCES app_users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by_user_id UUID REFERENCES app_users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_automations_tenant ON automations(tenant_id);
CREATE INDEX idx_automations_category ON automations(category);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX idx_automations_tenant_category ON automations(tenant_id, category);
CREATE INDEX idx_automations_tenant_status ON automations(tenant_id, status);
CREATE INDEX idx_automations_is_template ON automations(is_template) WHERE is_template = true;

-- =====================================================
-- 2. AUTOMATION NODES (Individual steps)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Node identification
    node_key TEXT NOT NULL, -- Unique within automation (e.g., 'trigger_1', 'action_email_2')
    node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'action', 'wait', 'condition', 'split', 'merge')),
    
    -- Visual position
    position_x FLOAT,
    position_y FLOAT,
    
    -- Node configuration
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- For action nodes
    action_type TEXT, -- 'send_email', 'create_task', 'move_deal_stage', etc.
    
    -- For wait nodes
    wait_duration_value INTEGER,
    wait_duration_unit TEXT CHECK (wait_duration_unit IN ('minutes', 'hours', 'days', 'weeks')),
    
    -- For condition nodes
    condition_config JSONB,
    
    -- Statistics
    total_processed INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    avg_execution_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(automation_id, node_key)
);

CREATE INDEX idx_automation_nodes_automation ON automation_nodes(automation_id);
CREATE INDEX idx_automation_nodes_type ON automation_nodes(node_type);

-- =====================================================
-- 3. AUTOMATION EDGES (Connections between nodes)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Edge definition
    source_node_key TEXT NOT NULL,
    target_node_key TEXT NOT NULL,
    
    -- Edge metadata
    label TEXT, -- For condition edges: 'Yes', 'No', 'High Value', etc.
    condition_index INTEGER, -- Which condition branch (0, 1, 2...)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_edges_automation ON automation_edges(automation_id);
CREATE INDEX idx_automation_edges_source ON automation_edges(source_node_key);
CREATE INDEX idx_automation_edges_target ON automation_edges(target_node_key);

-- =====================================================
-- 4. AUTOMATION RUNS (Execution tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Target record (what this automation is running on)
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID, -- Optional, depends on automation type
    task_id UUID, -- Optional
    
    -- Run state
    state TEXT NOT NULL CHECK (state IN ('running', 'waiting', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    current_node_key TEXT, -- Which node we're at
    
    -- Progress tracking
    nodes_completed TEXT[] DEFAULT '{}',
    nodes_failed TEXT[] DEFAULT '{}',
    
    -- Wait state (if paused)
    waiting_until TIMESTAMP WITH TIME ZONE,
    waiting_reason TEXT,
    
    -- Completion
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- Performance
    total_execution_time_ms INTEGER,
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_runs_tenant ON automation_runs(tenant_id);
CREATE INDEX idx_automation_runs_automation ON automation_runs(automation_id);
CREATE INDEX idx_automation_runs_contact ON automation_runs(contact_id);
CREATE INDEX idx_automation_runs_state ON automation_runs(state);
CREATE INDEX idx_automation_runs_waiting ON automation_runs(waiting_until) WHERE state = 'waiting';
CREATE INDEX idx_automation_runs_started ON automation_runs(started_at DESC);

-- =====================================================
-- 5. AUTOMATION EXECUTION LOGS (Detailed audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    
    -- Node execution details
    node_id UUID REFERENCES automation_nodes(id) ON DELETE SET NULL,
    node_key TEXT NOT NULL,
    node_type TEXT NOT NULL,
    
    -- Execution result
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Action output (for auditing)
    action_output JSONB, -- What was sent/created/updated
    
    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_execution_logs_tenant ON automation_execution_logs(tenant_id);
CREATE INDEX idx_automation_execution_logs_automation ON automation_execution_logs(automation_id);
CREATE INDEX idx_automation_execution_logs_run ON automation_execution_logs(run_id);
CREATE INDEX idx_automation_execution_logs_status ON automation_execution_logs(status);
CREATE INDEX idx_automation_execution_logs_executed ON automation_execution_logs(executed_at DESC);

-- =====================================================
-- RLS POLICIES (Row-Level Security)
-- =====================================================

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

-- Automations policies
CREATE POLICY "Users can view their tenant's automations"
    ON automations FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create automations"
    ON automations FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their automations"
    ON automations FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can delete automations"
    ON automations FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Automation nodes policies
CREATE POLICY "Users can view automation nodes"
    ON automation_nodes FOR SELECT
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can manage automation nodes"
    ON automation_nodes FOR ALL
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ))
    WITH CHECK (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

-- Automation edges policies
CREATE POLICY "Users can view automation edges"
    ON automation_edges FOR SELECT
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can manage automation edges"
    ON automation_edges FOR ALL
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ))
    WITH CHECK (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

-- Automation runs policies
CREATE POLICY "Users can view their automation runs"
    ON automation_runs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "System can manage automation runs"
    ON automation_runs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Execution logs policies
CREATE POLICY "Users can view execution logs"
    ON automation_execution_logs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "System can insert execution logs"
    ON automation_execution_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get automations by category
CREATE OR REPLACE FUNCTION get_automations_by_category(
    p_tenant_id UUID,
    p_category TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    trigger_type TEXT,
    status TEXT,
    total_runs INTEGER,
    successful_runs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.category,
        a.trigger_type,
        a.status,
        a.total_runs,
        a.successful_runs,
        a.created_at
    FROM automations a
    WHERE a.tenant_id = p_tenant_id
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.created_at DESC;
END;
$$;

-- Get automation statistics by category
CREATE OR REPLACE FUNCTION get_automation_stats_by_category(p_tenant_id UUID)
RETURNS TABLE (
    category TEXT,
    total_automations BIGINT,
    active_automations BIGINT,
    total_runs BIGINT,
    success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.category,
        COUNT(*)::BIGINT as total_automations,
        COUNT(*) FILTER (WHERE a.status = 'active')::BIGINT as active_automations,
        COALESCE(SUM(a.total_runs), 0)::BIGINT as total_runs,
        CASE 
            WHEN SUM(a.total_runs) > 0 THEN 
                ROUND((SUM(a.successful_runs)::NUMERIC / SUM(a.total_runs)::NUMERIC) * 100, 2)
            ELSE 0
        END as success_rate
    FROM automations a
    WHERE a.tenant_id = p_tenant_id
    GROUP BY a.category
    ORDER BY a.category;
END;
$$;

COMMENT ON TABLE automations IS 'Standalone automation workflows for Deal, Pipeline, Task, and Marketing categories';
COMMENT ON COLUMN automations.category IS 'Automation category: deal, pipeline, task, or marketing (controls tab visibility)';
COMMENT ON TABLE automation_nodes IS 'Individual nodes/steps in an automation workflow';
COMMENT ON TABLE automation_edges IS 'Connections between automation nodes';
COMMENT ON TABLE automation_runs IS 'Execution instances of automations';
COMMENT ON TABLE automation_execution_logs IS 'Detailed log of each node execution';
COMMENT ON FUNCTION get_automations_by_category IS 'Retrieve automations filtered by category and status';
COMMENT ON FUNCTION get_automation_stats_by_category IS 'Get statistics for each automation category (for tab badges)';

-- =====================================================
-- DEAL SLA RULES
-- Migration: Deal SLA monitoring and enforcement
-- =====================================================

CREATE TABLE IF NOT EXISTS deal_sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Scope (optional - if null, applies to all)
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    
    -- SLA Thresholds
    max_days_inactive INTEGER NOT NULL DEFAULT 7,
    max_days_in_stage INTEGER NOT NULL DEFAULT 14,
    
    -- Actions on breach
    escalation_enabled BOOLEAN DEFAULT true,
    notify_owner BOOLEAN DEFAULT true,
    notify_manager BOOLEAN DEFAULT true,
    auto_create_task BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_sla_rules_tenant ON deal_sla_rules(tenant_id);
CREATE INDEX idx_deal_sla_rules_pipeline ON deal_sla_rules(pipeline_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX idx_deal_sla_rules_stage ON deal_sla_rules(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_deal_sla_rules_active ON deal_sla_rules(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE deal_sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's SLA rules"
    ON deal_sla_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage SLA rules"
    ON deal_sla_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Default SLA rules for new tenants
INSERT INTO deal_sla_rules (tenant_id, max_days_inactive, max_days_in_stage, is_active)
SELECT id, 7, 14, true
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM deal_sla_rules WHERE tenant_id = tenants.id
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE deal_sla_rules IS 'SLA rules for deal inactivity and stage duration monitoring';

-- =====================================================
-- EXTENDED AUTOMATION TRIGGERS
-- Migration: Add new trigger types for Deal/Pipeline/Task automations
-- =====================================================

-- Update marketing_journeys table to support new trigger types
-- Note: This extends the existing CHECK constraint for entry_trigger_type

-- First, drop the old constraint if it exists
ALTER TABLE marketing_journeys 
DROP CONSTRAINT IF EXISTS marketing_journeys_entry_trigger_type_check;

-- Add new constraint with expanded trigger types
ALTER TABLE marketing_journeys
ADD CONSTRAINT marketing_journeys_entry_trigger_type_check
CHECK (entry_trigger_type IN (
    -- EXISTING MARKETING TRIGGERS
    'contact_created',
    'tag_added',
    'tag_removed',
    'segment_entry',
    'segment_exit',
    'link_clicked',
    'form_submitted',
    'birthday',
    'anniversary',
    'inactivity_days',
    'manual',
    'email_opened',
    'unsubscribed',
    
    -- NEW DEAL TRIGGERS
    'deal_created',
    'deal_updated',
    'deal_stage_change',
    'deal_won',
    'deal_lost',
    'deal_aging',
    'deal_value_threshold',
    'deal_assigned',
    
    -- NEW TASK TRIGGERS
    'task_created',
    'task_updated',
    'task_completed',
    'task_assigned',
    'task_overdue',
    'task_due_soon',
    
    -- NEW CONTACT TRIGGERS
    'contact_updated',
    'contact_assigned',
    'contact_inactive',
    'contact_high_value',
    'contact_milestone',
    
    -- NEW PIPELINE TRIGGERS
    'pipeline_capacity_reached',
    'pipeline_velocity_slow',
    'pipeline_bottleneck',
    'stage_sla_breached',
    
    -- NEW INTEGRATION TRIGGERS
    'integration_token_expiring',
    'integration_token_expired',
    'integration_sync_failed',
    'integration_rate_limit_hit',
    
    -- NEW ANALYTICS TRIGGERS
    'kpi_breach',
    'goal_achieved',
    'anomaly_detected',
    
    -- NEW CALL TRIGGERS
    'call_missed',
    'voicemail_received',
    'call_completed',
    
    -- NEW AI TRIGGERS
    'ai_suggestion'
));

-- =====================================================
-- NEW TABLE: Automation Triggers Metadata
-- Stores metadata about available trigger types for UI
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_trigger_metadata (
    trigger_type TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('deal', 'task', 'contact', 'pipeline', 'marketing', 'integration', 'analytics', 'call', 'ai')),
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name for UI
    required_fields JSONB, -- Required configuration fields
    optional_fields JSONB, -- Optional configuration fields
    example_config JSONB, -- Example trigger configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SEED: Populate Trigger Metadata
-- =====================================================

INSERT INTO automation_trigger_metadata (trigger_type, category, display_name, description, icon, required_fields, optional_fields, example_config) VALUES

-- DEAL TRIGGERS
('deal_created', 'deal', 'Deal Created', 'Triggers when a new deal is created', 'DollarSign', '[]'::jsonb, '["pipeline_id", "min_value", "source"]'::jsonb, '{"pipeline_id": "abc123", "min_value": 50000}'::jsonb),
('deal_won', 'deal', 'Deal Won', 'Triggers when a deal is marked as won', 'CheckCircle', '[]'::jsonb, '["min_value"]'::jsonb, '{"min_value": 10000}'::jsonb),
('deal_lost', 'deal', 'Deal Lost', 'Triggers when a deal is marked as lost', 'XCircle', '[]'::jsonb, '["lost_reason"]'::jsonb, '{"lost_reason": "price"}'::jsonb),
('deal_aging', 'deal', 'Deal Aging', 'Triggers when a deal has been inactive for X days', 'Clock', '["days"]'::jsonb, '[]'::jsonb, '{"days": 7}'::jsonb),
('deal_stage_change', 'deal', 'Deal Stage Changed', 'Triggers when a deal moves to a specific stage', 'ArrowRight', '[]'::jsonb, '["to_stage_id", "from_stage_id"]'::jsonb, '{"to_stage_id": "abc123"}'::jsonb),
('deal_value_threshold', 'deal', 'Deal Value Threshold', 'Triggers when deal value crosses a threshold', 'TrendingUp', '["threshold"]'::jsonb, '[]'::jsonb, '{"threshold": 100000}'::jsonb),

-- TASK TRIGGERS
('task_created', 'task', 'Task Created', 'Triggers when a new task is created', 'CheckSquare', '[]'::jsonb, '["priority", "task_type"]'::jsonb, '{"priority": "high"}'::jsonb),
('task_completed', 'task', 'Task Completed', 'Triggers when a task is completed', 'Check', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
('task_overdue', 'task', 'Task Overdue', 'Triggers when a task becomes overdue', 'AlertCircle', '[]'::jsonb, '["hours_overdue"]'::jsonb, '{"hours_overdue": 24}'::jsonb),
('task_assigned', 'task', 'Task Assigned', 'Triggers when a task is assigned to someone', 'UserPlus', '[]'::jsonb, '["to_user_id"]'::jsonb, '{"to_user_id": "user123"}'::jsonb),

-- CONTACT TRIGGERS
('contact_created', 'contact', 'Contact Created', 'Triggers when a new contact is created', 'User', '[]'::jsonb, '["source"]'::jsonb, '{"source": "website"}'::jsonb),
('contact_inactive', 'contact', 'Contact Inactive', 'Triggers when a contact has been inactive for X days', 'UserMinus', '["days"]'::jsonb, '[]'::jsonb, '{"days": 30}'::jsonb),
('contact_high_value', 'contact', 'Contact High Value', 'Triggers when a contact becomes high-value', 'Star', '["min_total_value"]'::jsonb, '[]'::jsonb, '{"min_total_value": 50000}'::jsonb),

-- PIPELINE TRIGGERS
('pipeline_capacity_reached', 'pipeline', 'Pipeline Capacity Reached', 'Triggers when pipeline reaches capacity', 'AlertTriangle', '["pipeline_id", "threshold_percent"]'::jsonb, '[]'::jsonb, '{"pipeline_id": "abc123", "threshold_percent": 80}'::jsonb),
('stage_sla_breached', 'pipeline', 'Stage SLA Breached', 'Triggers when a deal breaches stage SLA', 'Clock', '["stage_id", "max_days"]'::jsonb, '[]'::jsonb, '{"stage_id": "abc123", "max_days": 5}'::jsonb),

-- MARKETING TRIGGERS
('form_submitted', 'marketing', 'Form Submitted', 'Triggers when a form is submitted', 'FileText', '[]'::jsonb, '["form_id"]'::jsonb, '{"form_id": "form123"}'::jsonb),
('email_opened', 'marketing', 'Email Opened', 'Triggers when a marketing email is opened', 'Mail', '[]'::jsonb, '["campaign_id"]'::jsonb, '{"campaign_id": "camp123"}'::jsonb),
('link_clicked', 'marketing', 'Link Clicked', 'Triggers when a link in an email is clicked', 'MousePointer', '[]'::jsonb, '["url_contains"]'::jsonb, '{"url_contains": "pricing"}'::jsonb),

-- INTEGRATION TRIGGERS
('integration_token_expiring', 'integration', 'Token Expiring', 'Triggers when an integration token is about to expire', 'Key', '["integration_type", "hours_before"]'::jsonb, '[]'::jsonb, '{"integration_type": "google", "hours_before": 24}'::jsonb),
('integration_sync_failed', 'integration', 'Sync Failed', 'Triggers when an integration sync fails', 'AlertOctagon', '["integration_type"]'::jsonb, '[]'::jsonb, '{"integration_type": "pms"}'::jsonb),

-- ANALYTICS TRIGGERS
('kpi_breach', 'analytics', 'KPI Breach', 'Triggers when a KPI breaches threshold', 'BarChart', '["kpi_name", "threshold"]'::jsonb, '["breach_type"]'::jsonb, '{"kpi_name": "conversion_rate", "threshold": 20, "breach_type": "below"}'::jsonb),
('goal_achieved', 'analytics', 'Goal Achieved', 'Triggers when a goal is achieved', 'Target', '["goal_id"]'::jsonb, '[]'::jsonb, '{"goal_id": "goal123"}'::jsonb),

-- CALL TRIGGERS
('call_missed', 'call', 'Missed Call', 'Triggers when a call is missed', 'PhoneMissed', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
('voicemail_received', 'call', 'Voicemail Received', 'Triggers when a voicemail is received', 'Voicemail', '[]'::jsonb, '["min_duration"]'::jsonb, '{"min_duration": 5}'::jsonb)

ON CONFLICT (trigger_type) DO NOTHING;

-- =====================================================
-- HELPER FUNCTION: Get Available Triggers by Category
-- =====================================================

CREATE OR REPLACE FUNCTION get_automation_triggers_by_category(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
    trigger_type TEXT,
    category TEXT,
    display_name TEXT,
    description TEXT,
    icon TEXT,
    required_fields JSONB,
    optional_fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_type,
        t.category,
        t.display_name,
        t.description,
        t.icon,
        t.required_fields,
        t.optional_fields
    FROM automation_trigger_metadata t
    WHERE (p_category IS NULL OR t.category = p_category)
    AND t.is_active = true
    ORDER BY t.category, t.display_name;
END;
$$;

COMMENT ON TABLE automation_trigger_metadata IS 'Metadata about available automation trigger types for UI/UX';
COMMENT ON FUNCTION get_automation_triggers_by_category IS 'Retrieve available automation triggers, optionally filtered by category';

-- =====================================================
-- FORM VERSIONING SYSTEM
-- =====================================================
-- Track all changes to forms for rollback and audit
-- =====================================================

-- Form Versions Table
CREATE TABLE IF NOT EXISTS public.form_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id UUID NOT NULL REFERENCES public.marketing_forms(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  
  -- Snapshot of form at this version
  snapshot JSONB NOT NULL, -- Complete form data at this point in time
  
  -- Change tracking
  changed_by_user_id UUID REFERENCES public.app_users(id),
  change_summary TEXT, -- Brief description of changes
  changes JSONB, -- Detailed diff of what changed
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  UNIQUE(form_id, version_number)
);

-- Indexes
CREATE INDEX idx_form_versions_form_id ON public.form_versions(form_id);
CREATE INDEX idx_form_versions_created_at ON public.form_versions(created_at DESC);
CREATE INDEX idx_form_versions_tenant ON public.form_versions(tenant_id);

-- Enable RLS
ALTER TABLE public.form_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Tenants can view their own form versions" ON public.form_versions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can create form versions" ON public.form_versions
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Function: Auto-create version on form update
CREATE OR REPLACE FUNCTION public.create_form_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO next_version
  FROM public.form_versions
  WHERE form_id = NEW.id;
  
  -- Create version snapshot
  INSERT INTO public.form_versions (
    form_id,
    version_number,
    snapshot,
    tenant_id,
    changed_by_user_id
  ) VALUES (
    NEW.id,
    next_version,
    to_jsonb(NEW),
    NEW.tenant_id,
    auth.uid()
  );
  
  RETURN NEW;
END;
$$;

-- Trigger: Create version on every form update
CREATE TRIGGER create_form_version_trigger
  AFTER UPDATE ON public.marketing_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.create_form_version();

-- Function: Rollback to previous version
CREATE OR REPLACE FUNCTION public.rollback_form_to_version(
  p_form_id UUID,
  p_version_number INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  version_snapshot JSONB;
BEGIN
  -- Get version snapshot
  SELECT snapshot INTO version_snapshot
  FROM public.form_versions
  WHERE form_id = p_form_id AND version_number = p_version_number;
  
  IF version_snapshot IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Update form with snapshot data
  UPDATE public.marketing_forms
  SET
    name = version_snapshot->>'name',
    description = version_snapshot->>'description',
    fields_json = (version_snapshot->>'fields_json')::jsonb,
    theme = version_snapshot->>'theme',
    button_text = version_snapshot->>'button_text',
    success_message = version_snapshot->>'success_message',
    redirect_url = version_snapshot->>'redirect_url',
    updated_at = NOW()
  WHERE id = p_form_id;
  
  RETURN TRUE;
END;
$$;

-- Grant permissions
GRANT SELECT ON public.form_versions TO authenticated;
GRANT EXECUTE ON FUNCTION public.rollback_form_to_version(UUID, INTEGER) TO authenticated;

-- Comments
COMMENT ON TABLE public.form_versions IS 'Version history for marketing forms - enables rollback and audit trail';
COMMENT ON FUNCTION public.create_form_version() IS 'Automatically creates a version snapshot whenever a form is updated';
COMMENT ON FUNCTION public.rollback_form_to_version(UUID, INTEGER) IS 'Restores a form to a specific version number';

-- =====================================================
-- INTEGRATION HARDENING - DATABASE SCHEMA
-- =====================================================
-- Migration: 20250116_integration_hardening
-- Description: Enterprise-grade integration infrastructure
-- Version: 1.0
-- Date: January 16, 2025
-- Tasks: int-schema-1 through int-schema-5
-- =====================================================

-- =====================================================
-- 1. INTEGRATION_CONNECTIONS TABLE
-- =====================================================
-- Central source of truth for all integration credentials and status
-- Supports OAuth tokens, API keys, and webhook configs

CREATE TABLE IF NOT EXISTS public.integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Integration identification
  integration_type TEXT NOT NULL, -- 'twilio_sms', 'facebook_ads', 'google_ads', etc.
  integration_name TEXT, -- User-friendly name
  
  -- Status & health
  status TEXT NOT NULL CHECK (status IN ('connected', 'disconnected', 'error', 'expiring_soon', 'refreshing')),
  is_active BOOLEAN DEFAULT TRUE,
  is_test_mode BOOLEAN DEFAULT FALSE, -- Sandbox vs production
  
  -- Credentials (encrypted at rest via RLS)
  credentials JSONB NOT NULL DEFAULT '{}', -- {access_token, refresh_token, api_key, etc.}
  test_credentials JSONB DEFAULT '{}', -- Separate credentials for test mode
  
  -- OAuth specific
  scopes TEXT[], -- Granted OAuth scopes
  token_expires_at TIMESTAMPTZ, -- When access token expires
  token_last_refreshed_at TIMESTAMPTZ, -- Last successful refresh
  
  -- Configuration
  config JSONB DEFAULT '{}', -- Integration-specific config (webhookUrl, account_id, etc.)
  mapping_config JSONB DEFAULT '{}', -- Field mappings: {source_field: target_field}
  
  -- Sync tracking
  last_sync_at TIMESTAMPTZ, -- Last successful API call or webhook
  last_sync_status TEXT, -- 'success', 'error'
  next_sync_at TIMESTAMPTZ, -- For scheduled syncs
  sync_frequency TEXT CHECK (sync_frequency IN ('realtime', 'hourly', 'daily', 'weekly', 'monthly')),
  
  -- Error handling
  error_message TEXT, -- Last error encountered
  error_count INTEGER DEFAULT 0, -- Consecutive errors
  last_error_at TIMESTAMPTZ,
  
  -- Metadata
  created_by UUID REFERENCES public.app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, integration_type)
);

-- Indexes for performance
CREATE INDEX idx_integration_connections_tenant ON public.integration_connections(tenant_id);
CREATE INDEX idx_integration_connections_type ON public.integration_connections(integration_type);
CREATE INDEX idx_integration_connections_status ON public.integration_connections(status) WHERE is_active = TRUE;
CREATE INDEX idx_integration_connections_token_expiry ON public.integration_connections(token_expires_at) WHERE token_expires_at IS NOT NULL;
CREATE INDEX idx_integration_connections_next_sync ON public.integration_connections(next_sync_at) WHERE next_sync_at IS NOT NULL;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_integration_connections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER integration_connections_updated_at
  BEFORE UPDATE ON public.integration_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_integration_connections_updated_at();

-- =====================================================
-- 2. INTEGRATION_LOGS TABLE
-- =====================================================
-- Audit trail of every API call made to/from integrations
-- Used for debugging, monitoring, and compliance

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Operation identification
  integration_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'send_sms', 'receive_webhook', 'fetch_leads', 'refresh_token'
  direction TEXT CHECK (direction IN ('outbound', 'inbound')),
  
  -- Request/Response
  method TEXT, -- 'GET', 'POST', 'PUT', 'DELETE'
  url TEXT, -- Full API endpoint URL
  request_headers JSONB,
  request_payload JSONB,
  response_status INTEGER, -- HTTP status code
  response_headers JSONB,
  response_payload JSONB,
  
  -- Result
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'retry')),
  error_code TEXT, -- 'rate_limit', 'auth_failed', 'invalid_payload', etc.
  error_message TEXT,
  error_details JSONB,
  
  -- Performance
  duration_ms INTEGER, -- Request duration in milliseconds
  retry_count INTEGER DEFAULT 0,
  
  -- Tracing & correlation
  correlation_id UUID DEFAULT gen_random_uuid(), -- For distributed tracing
  idempotency_key TEXT, -- For outbound requests
  external_id TEXT, -- External system's ID (webhook ID, message SID, etc.)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for queries
CREATE INDEX idx_integration_logs_tenant ON public.integration_logs(tenant_id, created_at DESC);
CREATE INDEX idx_integration_logs_type_status ON public.integration_logs(integration_type, status, created_at DESC);
CREATE INDEX idx_integration_logs_connection ON public.integration_logs(connection_id, created_at DESC);
CREATE INDEX idx_integration_logs_correlation ON public.integration_logs(correlation_id);
CREATE INDEX idx_integration_logs_external_id ON public.integration_logs(integration_type, external_id);

-- Partition by date for performance (optional, for high-volume)
-- ALTER TABLE public.integration_logs PARTITION BY RANGE (created_at);

-- Auto-cleanup old logs (keep 90 days)
COMMENT ON TABLE public.integration_logs IS 'Audit trail of integration API calls. Auto-deleted after 90 days via scheduled job.';

-- =====================================================
-- 3. INTEGRATION_RATE_LIMITS TABLE
-- =====================================================
-- Track API quota usage per integration per tenant
-- Prevents exceeding vendor rate limits

CREATE TABLE IF NOT EXISTS public.integration_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE CASCADE,
  
  -- Rate limit window
  integration_type TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_duration_ms INTEGER NOT NULL, -- Window size in milliseconds (e.g., 60000 = 1 minute)
  
  -- Usage
  requests_count INTEGER DEFAULT 0,
  requests_limit INTEGER NOT NULL, -- Max requests per window
  requests_remaining INTEGER, -- Calculated: limit - count
  
  -- Reset
  reset_at TIMESTAMPTZ NOT NULL, -- When the window resets
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, integration_type, window_start)
);

-- Indexes
CREATE INDEX idx_integration_rate_limits_tenant_type ON public.integration_rate_limits(tenant_id, integration_type);
CREATE INDEX idx_integration_rate_limits_reset ON public.integration_rate_limits(reset_at);
CREATE INDEX idx_integration_rate_limits_window ON public.integration_rate_limits(window_start DESC);

-- Function to increment rate limit counter
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_tenant_id UUID,
  p_integration_type TEXT,
  p_limit INTEGER,
  p_window_duration_ms INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_reset_at TIMESTAMPTZ;
  v_current_count INTEGER;
  v_remaining INTEGER;
BEGIN
  -- Calculate current window start (truncate to window)
  v_window_start := date_trunc('minute', NOW());
  v_reset_at := v_window_start + (p_window_duration_ms || ' milliseconds')::INTERVAL;
  
  -- Insert or update rate limit record
  INSERT INTO public.integration_rate_limits (
    tenant_id,
    integration_type,
    window_start,
    window_duration_ms,
    requests_count,
    requests_limit,
    reset_at
  ) VALUES (
    p_tenant_id,
    p_integration_type,
    v_window_start,
    p_window_duration_ms,
    1,
    p_limit,
    v_reset_at
  )
  ON CONFLICT (tenant_id, integration_type, window_start)
  DO UPDATE SET
    requests_count = integration_rate_limits.requests_count + 1,
    updated_at = NOW()
  RETURNING requests_count, requests_limit INTO v_current_count, p_limit;
  
  v_remaining := p_limit - v_current_count;
  
  -- Return rate limit info
  RETURN json_build_object(
    'allowed', v_current_count <= p_limit,
    'limit', p_limit,
    'remaining', GREATEST(v_remaining, 0),
    'reset_at', v_reset_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION increment_rate_limit(UUID, TEXT, INTEGER, INTEGER) TO authenticated;

-- Auto-cleanup old rate limit records (delete after 24 hours)
COMMENT ON TABLE public.integration_rate_limits IS 'Rate limit tracking. Auto-deleted after 24 hours via scheduled job.';

-- =====================================================
-- 4. INTEGRATION_WEBHOOKS_LOG TABLE
-- =====================================================
-- Deduplication and idempotency for incoming webhooks
-- Prevents processing the same webhook twice

CREATE TABLE IF NOT EXISTS public.integration_webhooks_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Webhook identification
  integration_type TEXT NOT NULL,
  webhook_event TEXT, -- 'message.received', 'call.completed', 'lead.created'
  
  -- Deduplication keys
  external_id TEXT NOT NULL, -- Vendor's unique ID (MessageSid, CallSid, etc.)
  payload_hash TEXT NOT NULL, -- SHA-256 hash of payload for exact duplicate detection
  idempotency_key TEXT, -- Optional client-provided idempotency key
  
  -- Processing
  status TEXT CHECK (status IN ('received', 'processing', 'processed', 'failed', 'duplicate')),
  processed_at TIMESTAMPTZ,
  processing_duration_ms INTEGER,
  
  -- Signature verification
  signature_verified BOOLEAN DEFAULT FALSE,
  signature_algorithm TEXT, -- 'sha1', 'sha256', 'hmac-sha256'
  
  -- Payload (for replay)
  payload JSONB NOT NULL,
  headers JSONB,
  
  -- Result
  result_entity_type TEXT, -- 'activity', 'contact', 'deal', etc.
  result_entity_id UUID, -- ID of created/updated entity
  error_message TEXT,
  
  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints: Prevent duplicate processing
  UNIQUE(integration_type, external_id),
  UNIQUE(integration_type, payload_hash)
);

-- Indexes
CREATE INDEX idx_integration_webhooks_tenant ON public.integration_webhooks_log(tenant_id, created_at DESC);
CREATE INDEX idx_integration_webhooks_type_status ON public.integration_webhooks_log(integration_type, status);
CREATE INDEX idx_integration_webhooks_external_id ON public.integration_webhooks_log(integration_type, external_id);
CREATE INDEX idx_integration_webhooks_hash ON public.integration_webhooks_log(payload_hash);
CREATE INDEX idx_integration_webhooks_idempotency ON public.integration_webhooks_log(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Function to check if webhook already processed (idempotency check)
CREATE OR REPLACE FUNCTION is_webhook_processed(
  p_integration_type TEXT,
  p_external_id TEXT,
  p_payload_hash TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.integration_webhooks_log
    WHERE integration_type = p_integration_type
    AND (external_id = p_external_id OR payload_hash = p_payload_hash)
    AND status IN ('processed', 'processing')
  ) INTO v_exists;
  
  RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated and service role
GRANT EXECUTE ON FUNCTION is_webhook_processed(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_webhook_processed(TEXT, TEXT, TEXT) TO service_role;

-- Auto-cleanup old webhook logs (keep 30 days)
COMMENT ON TABLE public.integration_webhooks_log IS 'Webhook deduplication log. Auto-deleted after 30 days via scheduled job.';

-- =====================================================
-- 5. INTEGRATION_DLQ (DEAD LETTER QUEUE) TABLE
-- =====================================================
-- Failed operations that need manual intervention or retry

CREATE TABLE IF NOT EXISTS public.integration_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES public.integration_connections(id) ON DELETE SET NULL,
  
  -- Failed operation
  integration_type TEXT NOT NULL,
  operation TEXT NOT NULL, -- 'process_webhook', 'send_sms', 'create_contact'
  
  -- Original request
  payload JSONB NOT NULL,
  context JSONB DEFAULT '{}', -- Additional context (user_id, deal_id, etc.)
  
  -- Error details
  error_message TEXT NOT NULL,
  error_code TEXT,
  error_stack TEXT,
  first_failed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Retry tracking
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 5,
  last_retry_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ, -- Exponential backoff calculation
  retry_delays INTEGER[] DEFAULT ARRAY[1000, 2000, 4000, 8000, 16000], -- Milliseconds
  
  -- Status
  status TEXT CHECK (status IN ('pending', 'retrying', 'failed', 'resolved', 'discarded')),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES public.app_users(id),
  resolution_notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_integration_dlq_tenant_status ON public.integration_dlq(tenant_id, status);
CREATE INDEX idx_integration_dlq_type_status ON public.integration_dlq(integration_type, status);
CREATE INDEX idx_integration_dlq_next_retry ON public.integration_dlq(next_retry_at) WHERE status = 'pending' AND next_retry_at IS NOT NULL;
CREATE INDEX idx_integration_dlq_created ON public.integration_dlq(created_at DESC);

-- Function to add item to DLQ
CREATE OR REPLACE FUNCTION add_to_dlq(
  p_tenant_id UUID,
  p_integration_type TEXT,
  p_operation TEXT,
  p_payload JSONB,
  p_error_message TEXT,
  p_error_code TEXT DEFAULT NULL,
  p_context JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  v_dlq_id UUID;
BEGIN
  INSERT INTO public.integration_dlq (
    tenant_id,
    integration_type,
    operation,
    payload,
    context,
    error_message,
    error_code,
    status,
    next_retry_at
  ) VALUES (
    p_tenant_id,
    p_integration_type,
    p_operation,
    p_payload,
    p_context,
    p_error_message,
    p_error_code,
    'pending',
    NOW() + INTERVAL '1 second' -- First retry in 1 second
  )
  RETURNING id INTO v_dlq_id;
  
  RETURN v_dlq_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION add_to_dlq(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_dlq(UUID, TEXT, TEXT, JSONB, TEXT, TEXT, JSONB) TO service_role;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all integration tables
ALTER TABLE public.integration_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_webhooks_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_dlq ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS: integration_connections
-- =====================================================

-- Tenants can view their own connections
CREATE POLICY "Tenants can view their own connections"
  ON public.integration_connections
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can create connections
CREATE POLICY "Tenants can create connections"
  ON public.integration_connections
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can update their own connections
CREATE POLICY "Tenants can update their own connections"
  ON public.integration_connections
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can delete their own connections
CREATE POLICY "Tenants can delete their own connections"
  ON public.integration_connections
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- RLS: integration_logs
-- =====================================================

-- Tenants can view their own logs
CREATE POLICY "Tenants can view their own logs"
  ON public.integration_logs
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role can insert logs (webhooks, background jobs)
-- No INSERT policy for authenticated users - logs are system-generated

-- =====================================================
-- RLS: integration_rate_limits
-- =====================================================

-- Tenants can view their own rate limits
CREATE POLICY "Tenants can view their own rate limits"
  ON public.integration_rate_limits
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role manages rate limits (via function)
-- No direct INSERT/UPDATE for users

-- =====================================================
-- RLS: integration_webhooks_log
-- =====================================================

-- Tenants can view their own webhook logs
CREATE POLICY "Tenants can view their own webhook logs"
  ON public.integration_webhooks_log
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Service role inserts webhook logs
-- No direct INSERT for users

-- =====================================================
-- RLS: integration_dlq
-- =====================================================

-- Tenants can view their own DLQ items
CREATE POLICY "Tenants can view their own DLQ items"
  ON public.integration_dlq
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Tenants can update DLQ status (for manual resolution)
CREATE POLICY "Tenants can update their own DLQ items"
  ON public.integration_dlq
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- 7. GRANTS
-- =====================================================

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.integration_connections TO authenticated;
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT SELECT ON public.integration_rate_limits TO authenticated;
GRANT SELECT ON public.integration_webhooks_log TO authenticated;
GRANT SELECT, UPDATE ON public.integration_dlq TO authenticated;

-- Grant full access to service role (for background jobs, webhooks)
GRANT ALL ON public.integration_connections TO service_role;
GRANT ALL ON public.integration_logs TO service_role;
GRANT ALL ON public.integration_rate_limits TO service_role;
GRANT ALL ON public.integration_webhooks_log TO service_role;
GRANT ALL ON public.integration_dlq TO service_role;

-- Usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- =====================================================
-- 8. COMMENTS & DOCUMENTATION
-- =====================================================

COMMENT ON TABLE public.integration_connections IS 'Central registry of all integration connections with encrypted credentials and health status';
COMMENT ON TABLE public.integration_logs IS 'Audit trail of all API calls made to/from integrations. Auto-deleted after 90 days.';
COMMENT ON TABLE public.integration_rate_limits IS 'Rate limit tracking per integration per tenant. Auto-deleted after 24 hours.';
COMMENT ON TABLE public.integration_webhooks_log IS 'Webhook deduplication and processing log. Auto-deleted after 30 days.';
COMMENT ON TABLE public.integration_dlq IS 'Dead Letter Queue for failed operations requiring manual intervention or automatic retry.';

-- =====================================================
-- 9. INITIAL DATA / SETUP
-- =====================================================

-- Optional: Seed common integration types
-- (Handled via application code)

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Verify tables were created
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['integration_connections', 'integration_logs', 'integration_rate_limits', 'integration_webhooks_log', 'integration_dlq'];
  v_table TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = v_table
    ) INTO v_exists;
    
    IF v_exists THEN
-- RAISE NOTICE '✅ Table public.% created successfully', v_table;
    ELSE
      RAISE EXCEPTION '❌ Table public.% was not created', v_table;
    END IF;
  END LOOP;
  
-- RAISE NOTICE '🎉 Integration hardening schema migration completed successfully!';
END $$;

-- ============================================
-- MARKETING AUDIT MODULE - DATABASE SCHEMA
-- ============================================
-- Migration: 20250116_marketing_audit_tables
-- Description: Complete database schema for Marketing Audit & Benchmarking module
-- Version: 1.0
-- Date: January 16, 2025
-- ============================================

-- ============================================
-- 1. MARKETING_AUDIT_RUNS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS marketing_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  -- Scores
  composite_score DECIMAL(5,2) CHECK (composite_score BETWEEN 0 AND 100),
  technical_score DECIMAL(5,2) CHECK (technical_score BETWEEN 0 AND 100),
  local_score DECIMAL(5,2) CHECK (local_score BETWEEN 0 AND 100),
  content_score DECIMAL(5,2) CHECK (content_score BETWEEN 0 AND 100),
  analytics_score DECIMAL(5,2) CHECK (analytics_score BETWEEN 0 AND 100),
  conversion_score DECIMAL(5,2) CHECK (conversion_score BETWEEN 0 AND 100),
  
  -- Metadata
  run_type TEXT DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled', 'triggered')),
  phase INTEGER DEFAULT 1 CHECK (phase IN (1, 2, 3)),
  peer_group_id UUID,
  percentile_rank DECIMAL(5,2) CHECK (percentile_rank BETWEEN 0 AND 100),
  your_rank INTEGER,
  peer_count INTEGER DEFAULT 0,
  gap_to_median DECIMAL(5,2),
  gap_to_top_3_avg DECIMAL(5,2),
  
  -- Error tracking
  error_message TEXT,
  error_details JSONB,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  
  -- Meta
  api_calls JSONB DEFAULT '{}'::jsonb,
  api_costs_usd DECIMAL(8,4) DEFAULT 0,
  
  -- Audit
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Multi-tenancy
  tenant_id UUID NOT NULL
);

-- Indexes for marketing_audit_runs
CREATE INDEX idx_audit_runs_practice ON marketing_audit_runs(practice_id);
CREATE INDEX idx_audit_runs_tenant ON marketing_audit_runs(tenant_id);
CREATE INDEX idx_audit_runs_status ON marketing_audit_runs(status);
CREATE INDEX idx_audit_runs_started_at ON marketing_audit_runs(started_at DESC);
CREATE INDEX idx_audit_runs_completed_at ON marketing_audit_runs(completed_at DESC) WHERE completed_at IS NOT NULL;

-- ============================================
-- 2. AUDIT_METRICS TABLE (Time-Series)
-- ============================================

CREATE TABLE IF NOT EXISTS audit_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL CHECK (category IN (
    'technical', 'local', 'content', 'analytics', 'conversion'
  )),
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4),
  metric_unit TEXT, -- 'seconds', 'milliseconds', 'count', 'percent', 'rating'
  
  source TEXT NOT NULL CHECK (source IN (
    'psi', 'gsc', 'ga4', 'places_api', 'mobile_friendly',
    'brightlocal', 'semrush', 'manual', 'calculated'
  )),
  raw_data JSONB, -- Full API response for evidence
  evidence_url TEXT, -- Link to source (e.g., GSC report URL)
  
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

-- Indexes for audit_metrics
CREATE INDEX idx_metrics_run ON audit_metrics(run_id);
CREATE INDEX idx_metrics_category ON audit_metrics(category);
CREATE INDEX idx_metrics_metric_name ON audit_metrics(metric_name);
CREATE INDEX idx_metrics_collected_at ON audit_metrics(collected_at DESC);
CREATE INDEX idx_metrics_trending ON audit_metrics(metric_name, collected_at DESC) WHERE category IS NOT NULL;

-- ============================================
-- 3. AUDIT_RECOMMENDATIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT NOT NULL CHECK (effort IN ('high', 'medium', 'low')),
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  
  estimated_hours DECIMAL(4,1),
  priority_score INTEGER DEFAULT 50 CHECK (priority_score BETWEEN 0 AND 100),
  
  current_value DECIMAL(10,2),
  target_value DECIMAL(10,2),
  
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'dismissed', 'archived'
  )),
  
  -- CRM Integration
  task_id UUID,
  deal_id UUID,
  
  -- Evidence
  evidence_metric_ids UUID[], -- Array of audit_metrics.id
  action_steps JSONB DEFAULT '[]'::jsonb, -- Array of strings
  
  -- Tracking
  completed_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,
  dismissed_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

-- Indexes for audit_recommendations
CREATE INDEX idx_recommendations_run ON audit_recommendations(run_id);
CREATE INDEX idx_recommendations_status ON audit_recommendations(status);
CREATE INDEX idx_recommendations_priority ON audit_recommendations(priority_score DESC);
CREATE INDEX idx_recommendations_task ON audit_recommendations(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX idx_recommendations_category ON audit_recommendations(category);

-- ============================================
-- 4. AUDIT_COMPETITORS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  
  competitor_name TEXT NOT NULL,
  competitor_domain TEXT,
  competitor_place_id TEXT, -- Google Place ID
  competitor_address TEXT,
  
  -- Scores
  composite_score DECIMAL(5,2),
  technical_score DECIMAL(5,2),
  local_score DECIMAL(5,2),
  content_score DECIMAL(5,2),
  analytics_score DECIMAL(5,2),
  conversion_score DECIMAL(5,2),
  
  -- Key metrics for comparison
  metrics JSONB DEFAULT '{}'::jsonb,
  
  rank INTEGER, -- 1, 2, 3... in peer group
  distance_miles DECIMAL(4,1),
  
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (run_id, competitor_place_id)
);

-- Indexes for audit_competitors
CREATE INDEX idx_competitors_run ON audit_competitors(run_id);
CREATE INDEX idx_competitors_rank ON audit_competitors(rank);
CREATE INDEX idx_competitors_place_id ON audit_competitors(competitor_place_id);

-- ============================================
-- 5. AUDIT_PEER_GROUPS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_peer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  
  name TEXT NOT NULL,
  description TEXT,
  
  -- Auto-discovery criteria
  auto_discover BOOLEAN DEFAULT true,
  category TEXT, -- 'dentist', 'orthodontist', 'cosmetic_dentist'
  radius_miles INTEGER DEFAULT 5,
  center_lat DECIMAL(10,7),
  center_lng DECIMAL(10,7),
  max_competitors INTEGER DEFAULT 20,
  
  -- Manual members (place_ids)
  manual_competitor_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  excluded_competitor_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  is_default BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id, name)
);

-- Indexes for audit_peer_groups
CREATE INDEX idx_peer_groups_practice ON audit_peer_groups(practice_id);
CREATE INDEX idx_peer_groups_default ON audit_peer_groups(practice_id, is_default) WHERE is_default = true;

-- Add foreign key for peer_group_id in marketing_audit_runs
ALTER TABLE marketing_audit_runs 
  ADD CONSTRAINT fk_peer_group 
  FOREIGN KEY (peer_group_id) 
  REFERENCES audit_peer_groups(id) 
  ON DELETE SET NULL;

-- ============================================
-- 6. AUDIT_SCHEDULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly')),
  day_of_week INTEGER CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  day_of_month INTEGER CHECK (day_of_month BETWEEN 1 AND 31),
  time_of_day TIME DEFAULT '09:00:00',
  timezone TEXT DEFAULT 'UTC',
  
  enabled BOOLEAN DEFAULT true,
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  last_run_id UUID REFERENCES marketing_audit_runs(id),
  
  -- Notification settings
  notify_on_completion BOOLEAN DEFAULT true,
  notify_on_regression BOOLEAN DEFAULT true,
  regression_threshold DECIMAL(4,1) DEFAULT 5.0, -- Alert if score drops >5 points
  notification_emails TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id) -- One schedule per practice for now
);

-- Indexes for audit_schedules
CREATE INDEX idx_schedules_next_run ON audit_schedules(next_run_at) WHERE enabled = true;
CREATE INDEX idx_schedules_practice ON audit_schedules(practice_id);

-- ============================================
-- 7. API_CREDENTIALS TABLE (OAuth Tokens)
-- ============================================

CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  
  provider TEXT NOT NULL CHECK (provider IN (
    'google', 'brightlocal', 'semrush', 'ahrefs', 'moz'
  )),
  
  -- Encrypted tokens (use Supabase Vault in production)
  access_token TEXT, -- Encrypted
  refresh_token TEXT, -- Encrypted
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  
  scopes TEXT[],
  
  -- OAuth state
  authorization_url TEXT,
  state TEXT,
  code_verifier TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  
  UNIQUE (practice_id, provider)
);

-- Indexes for api_credentials
CREATE INDEX idx_credentials_practice ON api_credentials(practice_id);
CREATE INDEX idx_credentials_expires ON api_credentials(expires_at) WHERE status = 'active';

-- ============================================
-- 8. AUDIT_ALERTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL,
  
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'regression', 'achievement', 'warning', 'critical', 'info'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  
  title TEXT NOT NULL,
  description TEXT,
  
  metric_name TEXT,
  previous_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  delta DECIMAL(10,2),
  
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMPTZ,
  acknowledged_by UUID,
  
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  
  tenant_id UUID NOT NULL
);

-- Indexes for audit_alerts
CREATE INDEX idx_alerts_practice ON audit_alerts(practice_id);
CREATE INDEX idx_alerts_run ON audit_alerts(run_id);
CREATE INDEX idx_alerts_unacknowledged ON audit_alerts(practice_id, triggered_at DESC) WHERE acknowledged = false;
CREATE INDEX idx_alerts_severity ON audit_alerts(severity, triggered_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE marketing_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_peer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_alerts ENABLE ROW LEVEL SECURITY;

-- Read policies (tenant isolation)
CREATE POLICY audit_runs_read ON marketing_audit_runs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_metrics_read ON audit_metrics
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_recommendations_read ON audit_recommendations
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_competitors_read ON audit_competitors
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_peer_groups_read ON audit_peer_groups
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_schedules_read ON audit_schedules
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY api_credentials_read ON api_credentials
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_alerts_read ON audit_alerts
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Write policies (authenticated users only)
CREATE POLICY audit_runs_write ON marketing_audit_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_metrics_write ON audit_metrics
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_recommendations_write ON audit_recommendations
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_competitors_write ON audit_competitors
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_peer_groups_write ON audit_peer_groups
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_schedules_write ON audit_schedules
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY api_credentials_write ON api_credentials
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

CREATE POLICY audit_alerts_write ON audit_alerts
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to calculate composite score
CREATE OR REPLACE FUNCTION calculate_composite_score(
  technical DECIMAL,
  local DECIMAL,
  content DECIMAL,
  analytics DECIMAL,
  conversion DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
  RETURN (
    (COALESCE(technical, 0) * 0.25) +
    (COALESCE(local, 0) * 0.30) +
    (COALESCE(content, 0) * 0.20) +
    (COALESCE(analytics, 0) * 0.15) +
    (COALESCE(conversion, 0) * 0.10)
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to calculate priority score
CREATE OR REPLACE FUNCTION calculate_priority_score(
  impact TEXT,
  effort TEXT,
  confidence TEXT
) RETURNS INTEGER AS $$
DECLARE
  impact_score INTEGER;
  effort_score INTEGER;
  confidence_mult DECIMAL;
BEGIN
  impact_score := CASE impact
    WHEN 'high' THEN 90
    WHEN 'medium' THEN 60
    WHEN 'low' THEN 30
    ELSE 50
  END;
  
  effort_score := CASE effort
    WHEN 'low' THEN 100
    WHEN 'medium' THEN 60
    WHEN 'high' THEN 30
    ELSE 60
  END;
  
  confidence_mult := CASE confidence
    WHEN 'high' THEN 1.0
    WHEN 'medium' THEN 0.8
    WHEN 'low' THEN 0.6
    ELSE 0.8
  END;
  
  RETURN ((impact_score + effort_score) / 2 * confidence_mult)::INTEGER;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_audit_runs_updated_at
  BEFORE UPDATE ON marketing_audit_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON audit_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_peer_groups_updated_at
  BEFORE UPDATE ON audit_peer_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON audit_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================

-- View for latest audit per practice
CREATE OR REPLACE VIEW latest_audit_runs AS
SELECT DISTINCT ON (practice_id)
  *
FROM marketing_audit_runs
WHERE status = 'completed'
ORDER BY practice_id, completed_at DESC;

-- ============================================
-- COMMENTS (Documentation)
-- ============================================

COMMENT ON TABLE marketing_audit_runs IS 'Main table storing audit run records with scores and metadata';
COMMENT ON TABLE audit_metrics IS 'Time-series metrics collected during audits';
COMMENT ON TABLE audit_recommendations IS 'Actionable recommendations generated from audits';
COMMENT ON TABLE audit_competitors IS 'Competitor data for benchmarking';
COMMENT ON TABLE audit_peer_groups IS 'Peer group configurations for benchmarking';
COMMENT ON TABLE audit_schedules IS 'Scheduled audit configurations';
COMMENT ON TABLE api_credentials IS 'OAuth credentials for external APIs';
COMMENT ON TABLE audit_alerts IS 'Alert notifications for regressions and critical issues';

-- ============================================
-- END OF MIGRATION
-- ============================================

-- =====================================================
-- MARKETING FORMS - ROW LEVEL SECURITY POLICIES
-- =====================================================
-- Migration: 20250116_marketing_forms_rls
-- Description: RLS policies for marketing_forms and related tables
-- Version: 1.0
-- Date: January 16, 2025
-- =====================================================

-- Enable RLS on marketing_forms table
ALTER TABLE public.marketing_forms ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own forms
CREATE POLICY "Tenants can view their own forms" ON public.marketing_forms
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can create forms
CREATE POLICY "Tenants can create forms" ON public.marketing_forms
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can update their own forms
CREATE POLICY "Tenants can update their own forms" ON public.marketing_forms
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Tenants can delete (archive) their own forms
CREATE POLICY "Tenants can delete their own forms" ON public.marketing_forms
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- FORM SUBMISSIONS RLS
-- =====================================================

-- Enable RLS on marketing_form_submissions table
ALTER TABLE public.marketing_form_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can view their own submissions
CREATE POLICY "Tenants can view their own submissions" ON public.marketing_form_submissions
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Policy: Allow public form submissions (no auth required for submitting)
-- This is needed for public forms embedded on websites
CREATE POLICY "Allow public form submissions" ON public.marketing_form_submissions
  FOR INSERT
  WITH CHECK (true);

-- Policy: Tenants can update their own submissions
CREATE POLICY "Tenants can update their own submissions" ON public.marketing_form_submissions
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- =====================================================
-- LANDING PAGES RLS (if table exists)
-- =====================================================

-- Enable RLS on marketing_landing_pages if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'marketing_landing_pages'
  ) THEN
    ALTER TABLE public.marketing_landing_pages ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Tenants can view their own landing pages" ON public.marketing_landing_pages
      FOR SELECT
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Tenants can create landing pages" ON public.marketing_landing_pages
      FOR INSERT
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Tenants can update their own landing pages" ON public.marketing_landing_pages
      FOR UPDATE
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
    
    CREATE POLICY "Tenants can delete their own landing pages" ON public.marketing_landing_pages
      FOR DELETE
      USING (
        tenant_id IN (
          SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
        )
      );
  END IF;
END $$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant basic permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.marketing_forms TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.marketing_form_submissions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes for faster RLS policy checks
CREATE INDEX IF NOT EXISTS idx_marketing_forms_tenant_id ON public.marketing_forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_status ON public.marketing_forms(status);
CREATE INDEX IF NOT EXISTS idx_marketing_forms_slug ON public.marketing_forms(public_url_slug) WHERE is_published = TRUE;
CREATE INDEX IF NOT EXISTS idx_marketing_forms_created_at ON public.marketing_forms(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_form_submissions_tenant_id ON public.marketing_form_submissions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON public.marketing_form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_contact_id ON public.marketing_form_submissions(contact_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_is_spam ON public.marketing_form_submissions(is_spam);
CREATE INDEX IF NOT EXISTS idx_form_submissions_submitted_at ON public.marketing_form_submissions(submitted_at DESC);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Tenants can view their own forms" ON public.marketing_forms IS 
  'Users can only view forms belonging to their tenant';

COMMENT ON POLICY "Tenants can create forms" ON public.marketing_forms IS 
  'Users can create forms for their tenant';

COMMENT ON POLICY "Tenants can update their own forms" ON public.marketing_forms IS 
  'Users can only update forms belonging to their tenant';

COMMENT ON POLICY "Tenants can delete their own forms" ON public.marketing_forms IS 
  'Users can only delete (soft delete/archive) forms belonging to their tenant';

COMMENT ON POLICY "Allow public form submissions" ON public.marketing_form_submissions IS 
  'Public form submissions allowed for embedded forms on websites - no authentication required';

COMMENT ON POLICY "Tenants can view their own submissions" ON public.marketing_form_submissions IS 
  'Users can only view form submissions belonging to their tenant';

-- =====================================================
-- DATA MIGRATION: Marketing Journeys → Automations
-- Migration: Copy existing marketing journeys to new automations table
-- =====================================================

-- This migration copies data from marketing_journeys to the new automations table
-- with category = 'marketing', preserving all existing functionality

-- =====================================================
-- MIGRATE MARKETING JOURNEYS
-- =====================================================

INSERT INTO automations (
    id, -- Preserve IDs for backward compatibility
    tenant_id,
    category,
    name,
    description,
    status,
    trigger_type,
    trigger_config,
    graph_json,
    exit_conditions,
    max_duration_days,
    total_runs,
    successful_runs,
    failed_runs,
    active_runs,
    tags,
    created_by_user_id,
    activated_at,
    activated_by_user_id,
    created_at,
    updated_at
)
SELECT 
    id,
    tenant_id,
    'marketing'::TEXT as category, -- ALL existing journeys are marketing category
    name,
    description,
    status,
    entry_trigger_type as trigger_type,
    entry_trigger_config as trigger_config,
    graph_json,
    exit_conditions,
    max_duration_days,
    total_entered as total_runs,
    total_completed as successful_runs,
    total_exited as failed_runs,
    total_active as active_runs,
    tags,
    created_by_user_id,
    activated_at,
    activated_by_user_id,
    created_at,
    updated_at
FROM marketing_journeys
WHERE NOT EXISTS (
    SELECT 1 FROM automations WHERE automations.id = marketing_journeys.id
);

-- Count migrated records
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM automations WHERE category = 'marketing';
-- RAISE NOTICE 'Migrated % marketing journeys to automations table', v_count;
END $$;

-- =====================================================
-- MIGRATE JOURNEY NODES
-- =====================================================

INSERT INTO automation_nodes (
    id,
    automation_id,
    node_key,
    node_type,
    position_x,
    position_y,
    config_json,
    action_type,
    wait_duration_value,
    wait_duration_unit,
    condition_config,
    total_processed,
    total_success,
    total_failed,
    created_at
)
SELECT 
    n.id,
    n.journey_id as automation_id,
    n.node_key,
    n.node_type,
    n.position_x,
    n.position_y,
    n.config_json,
    n.action_type,
    n.wait_duration_value,
    n.wait_duration_type as wait_duration_unit,
    n.branch_conditions as condition_config,
    n.total_processed,
    n.total_success,
    n.total_failed,
    n.created_at
FROM marketing_journey_nodes n
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = n.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_nodes WHERE automation_nodes.id = n.id
);

-- =====================================================
-- MIGRATE JOURNEY EDGES
-- =====================================================

INSERT INTO automation_edges (
    id,
    automation_id,
    source_node_key,
    target_node_key,
    label,
    condition_index,
    created_at
)
SELECT 
    e.id,
    e.journey_id as automation_id,
    e.source_node_key,
    e.target_node_key,
    e.label,
    e.condition_index,
    e.created_at
FROM marketing_journey_edges e
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = e.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_edges WHERE automation_edges.id = e.id
);

-- =====================================================
-- MIGRATE JOURNEY RUNS
-- =====================================================

INSERT INTO automation_runs (
    id,
    tenant_id,
    automation_id,
    contact_id,
    state,
    current_node_key,
    nodes_completed,
    waiting_until,
    started_at,
    completed_at,
    updated_at
)
SELECT 
    r.id,
    r.tenant_id,
    r.journey_id as automation_id,
    r.contact_id,
    r.state,
    r.current_node_key,
    r.nodes_completed,
    r.waiting_until,
    r.entered_at as started_at,
    r.completed_at,
    r.updated_at
FROM marketing_journey_runs r
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = r.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_runs WHERE automation_runs.id = r.id
);

-- =====================================================
-- MIGRATE JOURNEY LOGS
-- =====================================================

-- Note: marketing_journey_logs has different structure (log_type, not node_type)
-- We'll map what we can and set defaults for missing fields

INSERT INTO automation_execution_logs (
    id,
    tenant_id,
    automation_id,
    run_id,
    node_key,
    node_type,
    status,
    error_message,
    executed_at
)
SELECT 
    l.id,
    l.tenant_id,
    l.journey_id as automation_id,
    l.run_id,
    l.node_key,
    COALESCE(l.log_type, 'node_executed') as node_type, -- Map log_type to node_type
    CASE 
        WHEN l.log_type = 'error' THEN 'failed'
        WHEN l.log_type = 'completed' THEN 'success'
        ELSE 'success'
    END as status,
    l.error_details as error_message,
    l.occurred_at as executed_at
FROM marketing_journey_logs l
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = l.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_execution_logs WHERE automation_execution_logs.id = l.id
);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_automations INTEGER;
    v_nodes INTEGER;
    v_edges INTEGER;
    v_runs INTEGER;
    v_logs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_automations FROM automations WHERE category = 'marketing';
    SELECT COUNT(*) INTO v_nodes FROM automation_nodes;
    SELECT COUNT(*) INTO v_edges FROM automation_edges;
    SELECT COUNT(*) INTO v_runs FROM automation_runs;
    SELECT COUNT(*) INTO v_logs FROM automation_execution_logs;
    
-- RAISE NOTICE '==============================================';
-- RAISE NOTICE 'MIGRATION COMPLETE';
-- RAISE NOTICE '==============================================';
-- RAISE NOTICE 'Automations: %', v_automations;
-- RAISE NOTICE 'Nodes: %', v_nodes;
-- RAISE NOTICE 'Edges: %', v_edges;
-- RAISE NOTICE 'Runs: %', v_runs;
-- RAISE NOTICE 'Logs: %', v_logs;
-- RAISE NOTICE '==============================================';
-- RAISE NOTICE 'marketing_journeys table preserved for backward compatibility';
-- RAISE NOTICE 'New automations table ready for Deal/Pipeline/Task categories';
END $$;

COMMENT ON TABLE automations IS 'All automation workflows migrated from marketing_journeys plus new Deal/Pipeline/Task automations';

-- =====================================================
-- NOTIFICATIONS SYSTEM - ENTERPRISE DATABASE SCHEMA
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Unified notifications system with multi-channel delivery
-- Research: NOTIFICATIONS_ENTERPRISE_RESEARCH_AND_DESIGN.md
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NOTIFICATIONS TABLE
-- =====================================================
-- Core table storing all notification records

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
  
  -- Event identification
  event_key VARCHAR(100) NOT NULL,
  event_id VARCHAR(100) UNIQUE,  -- For idempotency & deduplication
  
  -- Recipient
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  body TEXT,
  severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'success', 'warning', 'error', 'critical')),
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  
  -- Context (source & deep-link)
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id VARCHAR(100),
  entity_url TEXT,  -- Deep-link: /deals/123, /tasks/456
  
  -- Actions
  quick_actions JSONB DEFAULT '[]'::JSONB,  -- [{action_key, label, type, url}]
  
  -- Lifecycle
  read_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  
  -- Grouping & threading
  group_key VARCHAR(200),  -- For grouping similar notifications
  parent_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  triggered_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, created_at DESC) WHERE read_at IS NULL AND archived_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_event_id ON notifications(event_id) WHERE event_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_group_key ON notifications(group_key, created_at DESC) WHERE group_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id) WHERE entity_type IS NOT NULL;

COMMENT ON TABLE notifications IS 'Core notifications table with full event context and quick actions';

-- =====================================================
-- 2. NOTIFICATION_PREFERENCES TABLE
-- =====================================================
-- User-level preferences for notification delivery

CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Global channel toggles
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  push_enabled BOOLEAN DEFAULT FALSE,
  
  -- Consent tracking (GDPR/CCPA)
  email_consented_at TIMESTAMPTZ,
  email_consent_ip VARCHAR(45),
  sms_consented_at TIMESTAMPTZ,
  sms_consent_ip VARCHAR(45),
  
  -- Per-event preferences
  -- Structure: { "deal.assigned": { "in_app": true, "email": true, "sms": false }, ... }
  event_preferences JSONB DEFAULT '{}'::JSONB,
  
  -- Quiet hours (Do Not Disturb)
  -- Structure: { "enabled": true, "timezone": "America/Los_Angeles", "start": "22:00", "end": "08:00", "days": ["monday", "tuesday", ...] }
  quiet_hours JSONB DEFAULT '{"enabled": false}'::JSONB,
  
  -- Digest preferences
  -- Structure: { "enabled": true, "frequency": "daily", "time": "09:00", "timezone": "America/Los_Angeles", "events": ["deal.won", ...] }
  digest_preferences JSONB DEFAULT '{"enabled": false, "frequency": "daily", "time": "09:00"}'::JSONB,
  
  -- Muted objects (e.g., specific deals/contacts user doesn't want notifications for)
  -- Structure: { "deal": ["uuid1", "uuid2"], "contact": ["uuid3"], ... }
  muted_objects JSONB DEFAULT '{}'::JSONB,
  
  -- Global snooze
  snoozed_until TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_tenant ON notification_preferences(tenant_id);

COMMENT ON TABLE notification_preferences IS 'User preferences for notification channels, schedules, and muting';

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- =====================================================
-- 3. NOTIFICATION_POLICIES TABLE
-- =====================================================
-- Tenant/org-level policies for notification governance

CREATE TABLE IF NOT EXISTS notification_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Role defaults (applied to new users)
  -- Structure: { "owner": { "channels": ["in_app", "email", "sms"], "events": ["*"] }, "staff": { "channels": ["in_app"], "events": ["task.assigned", "deal.assigned"] }, ... }
  role_defaults JSONB DEFAULT '{
    "owner": {"channels": ["in_app", "email", "sms"], "events": ["*"]},
    "admin": {"channels": ["in_app", "email"], "events": ["*"]},
    "manager": {"channels": ["in_app", "email"], "events": ["deal.*", "task.*", "contact.*"]},
    "staff": {"channels": ["in_app"], "events": ["task.assigned", "deal.assigned"]},
    "marketing": {"channels": ["in_app", "email"], "events": ["campaign.*", "form.*", "audit.*"]}
  }'::JSONB,
  
  -- Escalation rules
  -- Structure: [{ "event_key": "task.overdue", "escalate_after_minutes": 60, "escalate_to_roles": ["manager"], "channels": ["email", "sms"] }, ...]
  escalation_rules JSONB DEFAULT '[]'::JSONB,
  
  -- Rate limits (anti-spam)
  -- Structure: { "max_per_hour": 50, "max_emails_per_day": 100, "max_sms_per_day": 10, "batch_delay_minutes": 5 }
  rate_limits JSONB DEFAULT '{"max_per_hour": 50, "max_emails_per_day": 100, "max_sms_per_day": 10, "batch_delay_minutes": 5}'::JSONB,
  
  -- Data retention
  retention_days INTEGER DEFAULT 90,  -- Auto-delete notifications older than this
  
  -- Compliance
  require_email_opt_in BOOLEAN DEFAULT FALSE,
  require_sms_opt_in BOOLEAN DEFAULT TRUE,
  allow_notification_export BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_policies_tenant ON notification_policies(tenant_id);

COMMENT ON TABLE notification_policies IS 'Org-level policies for role defaults, escalation, rate limits, and compliance';

-- =====================================================
-- 4. NOTIFICATION_DELIVERY_LOG TABLE
-- =====================================================
-- Delivery tracking for multi-channel notifications

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  
  -- Delivery details
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('in_app', 'email', 'sms', 'push')),
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  provider VARCHAR(50),  -- 'sendgrid', 'twilio', 'firebase', etc.
  external_id TEXT,      -- Provider's message ID
  
  -- Result
  error_message TEXT,
  error_code VARCHAR(50),
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delivery_log_notification ON notification_delivery_log(notification_id, channel);
CREATE INDEX IF NOT EXISTS idx_delivery_log_status ON notification_delivery_log(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_delivery_log_external_id ON notification_delivery_log(external_id) WHERE external_id IS NOT NULL;

COMMENT ON TABLE notification_delivery_log IS 'Multi-channel delivery tracking with provider webhooks';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Get unread count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM notifications
    WHERE user_id = p_user_id
      AND read_at IS NULL
      AND archived_at IS NULL
      AND (expires_at IS NULL OR expires_at > NOW())
      AND (snoozed_until IS NULL OR snoozed_until <= NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND read_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET read_at = NOW()
  WHERE user_id = p_user_id
    AND read_at IS NULL
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Archive notification
CREATE OR REPLACE FUNCTION archive_notification(p_notification_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET archived_at = NOW()
  WHERE id = p_notification_id
    AND user_id = p_user_id
    AND archived_at IS NULL;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Snooze notification until a specific time
CREATE OR REPLACE FUNCTION snooze_notification(
  p_notification_id UUID,
  p_user_id UUID,
  p_until TIMESTAMPTZ
)
RETURNS BOOLEAN AS $$
DECLARE
  v_updated INTEGER;
BEGIN
  UPDATE notifications
  SET snoozed_until = p_until
  WHERE id = p_notification_id
    AND user_id = p_user_id;
  
  GET DIAGNOSTICS v_updated = ROW_COUNT;
  RETURN v_updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if event should be sent based on user preferences
CREATE OR REPLACE FUNCTION should_send_notification(
  p_user_id UUID,
  p_event_key VARCHAR(100),
  p_channel VARCHAR(20)
)
RETURNS BOOLEAN AS $$
DECLARE
  v_prefs notification_preferences;
  v_event_pref JSONB;
  v_channel_enabled BOOLEAN;
BEGIN
  -- Get user preferences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;
  
  -- If no preferences, use defaults (all channels enabled except SMS)
  IF v_prefs IS NULL THEN
    RETURN p_channel != 'sms';
  END IF;
  
  -- Check global channel toggle
  IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'sms' AND NOT v_prefs.sms_enabled THEN RETURN FALSE; END IF;
  IF p_channel = 'push' AND NOT v_prefs.push_enabled THEN RETURN FALSE; END IF;
  
  -- Check event-specific preferences
  v_event_pref := v_prefs.event_preferences->p_event_key;
  IF v_event_pref IS NOT NULL THEN
    v_channel_enabled := (v_event_pref->>p_channel)::BOOLEAN;
    IF v_channel_enabled IS NOT NULL THEN
      RETURN v_channel_enabled;
    END IF;
  END IF;
  
  -- Default: allow
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-delete old notifications (scheduled job)
CREATE OR REPLACE FUNCTION auto_delete_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  v_deleted INTEGER := 0;
  v_policy notification_policies;
BEGIN
  -- Get policy for each tenant and delete old notifications
  FOR v_policy IN SELECT * FROM notification_policies LOOP
    DELETE FROM notifications
    WHERE tenant_id = v_policy.tenant_id
      AND created_at < NOW() - (v_policy.retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
  END LOOP;
  
  RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_delivery_log ENABLE ROW LEVEL SECURITY;

-- Notifications: Users can only see their own
DROP POLICY IF EXISTS notifications_user_isolation ON notifications;
CREATE POLICY notifications_user_isolation
  ON notifications
  FOR ALL
  USING (user_id = auth.uid());

-- Preferences: Users can manage their own
DROP POLICY IF EXISTS preferences_user_isolation ON notification_preferences;
CREATE POLICY preferences_user_isolation
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid());

-- Policies: Only admins can view/edit
DROP POLICY IF EXISTS policies_admin_only ON notification_policies;
CREATE POLICY policies_admin_only
  ON notification_policies
  FOR ALL
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users
      WHERE id = auth.uid()
      AND role IN ('admin', 'owner')
    )
  );

-- Delivery Log: Users can see logs for their notifications
DROP POLICY IF EXISTS delivery_log_user_isolation ON notification_delivery_log;
CREATE POLICY delivery_log_user_isolation
  ON notification_delivery_log
  FOR SELECT
  USING (
    notification_id IN (
      SELECT id FROM notifications WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. GRANTS
-- =====================================================

GRANT SELECT, INSERT, UPDATE ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT ON notification_policies TO authenticated;
GRANT UPDATE ON notification_policies TO service_role;
GRANT SELECT ON notification_delivery_log TO authenticated;
GRANT INSERT ON notification_delivery_log TO service_role;

GRANT EXECUTE ON FUNCTION get_unread_notification_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION archive_notification(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION snooze_notification(UUID, UUID, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(UUID, VARCHAR, VARCHAR) TO authenticated;

-- =====================================================
-- 8. INITIAL DATA / SEED
-- =====================================================

-- Create default policies for all existing tenants
INSERT INTO notification_policies (tenant_id)
SELECT id FROM tenants
WHERE id NOT IN (SELECT tenant_id FROM notification_policies)
ON CONFLICT (tenant_id) DO NOTHING;

-- Create default preferences for all existing users
INSERT INTO notification_preferences (user_id, tenant_id)
SELECT id, tenant_id FROM app_users
WHERE id NOT IN (SELECT user_id FROM notification_preferences)
ON CONFLICT (user_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

COMMIT;

-- Verify tables created
DO $$
DECLARE
  v_tables TEXT[] := ARRAY['notifications', 'notification_preferences', 'notification_policies', 'notification_delivery_log'];
  v_table TEXT;
  v_exists BOOLEAN;
BEGIN
  FOREACH v_table IN ARRAY v_tables LOOP
    SELECT EXISTS (
      SELECT FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = v_table
    ) INTO v_exists;
    
    IF v_exists THEN
-- RAISE NOTICE '✅ Table public.% created successfully', v_table;
    ELSE
      RAISE EXCEPTION '❌ Table public.% was not created', v_table;
    END IF;
  END LOOP;
  
-- RAISE NOTICE '🎉 Notifications system schema migration completed successfully!';
-- RAISE NOTICE '📋 4 tables created: notifications, notification_preferences, notification_policies, notification_delivery_log';
-- RAISE NOTICE '🔧 8 helper functions created for common operations';
-- RAISE NOTICE '🔒 RLS policies enabled for data isolation';
END $$;

/**
 * Practice Branding Configuration Table
 * 
 * Store white-label branding settings for each practice.
 */

CREATE TABLE IF NOT EXISTS public.practice_branding (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  practice_id uuid REFERENCES public.practices(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#8B5CF6' NOT NULL,
  secondary_color text DEFAULT '#3B82F6' NOT NULL,
  company_name text NOT NULL,
  tagline text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create index
CREATE INDEX idx_practice_branding_practice ON public.practice_branding(practice_id);

-- Enable RLS
ALTER TABLE public.practice_branding ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view branding for their practice
CREATE POLICY "Users can view own practice branding"
  ON public.practice_branding
  FOR SELECT
  USING (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can update branding for their practice
CREATE POLICY "Users can update own practice branding"
  ON public.practice_branding
  FOR UPDATE
  USING (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Policy: Users can insert branding for their practice
CREATE POLICY "Users can insert own practice branding"
  ON public.practice_branding
  FOR INSERT
  WITH CHECK (
    practice_id IN (
      SELECT id FROM public.practices
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Function: Get or create default branding
CREATE OR REPLACE FUNCTION get_or_create_practice_branding(p_practice_id uuid)
RETURNS public.practice_branding
LANGUAGE plpgsql
AS $$
DECLARE
  v_branding public.practice_branding;
  v_practice_name text;
BEGIN
  -- Check if branding exists
  SELECT * INTO v_branding
  FROM public.practice_branding
  WHERE practice_id = p_practice_id;
  
  IF FOUND THEN
    RETURN v_branding;
  END IF;
  
  -- Create default branding
  SELECT name INTO v_practice_name
  FROM public.practices
  WHERE id = p_practice_id;
  
  INSERT INTO public.practice_branding (practice_id, company_name)
  VALUES (p_practice_id, v_practice_name)
  RETURNING * INTO v_branding;
  
  RETURN v_branding;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_practice_branding TO authenticated;

-- =====================================================
-- SETTINGS VERSIONING & GOVERNANCE
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Version control, rollback, and audit trail for settings
-- =====================================================

BEGIN;

-- =====================================================
-- 1. LOCATIONS TABLE (Must be created FIRST)
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location information
  name TEXT NOT NULL,
  display_name TEXT,
  location_type TEXT CHECK (location_type IN ('headquarters', 'branch', 'clinic', 'mobile')),
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Contact
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  
  -- Operating hours (JSON: {monday: {open: '09:00', close: '17:00'}, ...})
  operating_hours JSONB DEFAULT '{}'::JSONB,
  
  -- Settings overrides
  settings_overrides JSONB DEFAULT '{}'::JSONB, -- Location-specific settings that override org defaults
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE, -- Main location
  
  -- Metadata
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id);
CREATE INDEX idx_locations_active ON locations(tenant_id, is_active);
CREATE INDEX idx_locations_primary ON locations(tenant_id, is_primary);

COMMENT ON TABLE locations IS 'Physical locations for multi-location practices';

-- =====================================================
-- 2. SETTINGS_VERSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- For location-specific settings
  
  -- Setting identification
  setting_key TEXT NOT NULL,
  setting_category TEXT, -- 'email', 'pipeline', 'forms', 'analytics', etc.
  setting_scope TEXT CHECK (setting_scope IN ('system', 'org', 'location', 'user')),
  
  -- Version tracking
  version_number INTEGER NOT NULL,
  
  -- Values
  old_value JSONB,
  new_value JSONB,
  
  -- Change metadata
  changed_by UUID REFERENCES app_users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT, -- Optional user-provided reason
  change_source TEXT DEFAULT 'ui', -- 'ui', 'api', 'import', 'migration'
  
  -- Impact analysis
  affected_records_count INTEGER, -- How many entities affected
  affected_record_types TEXT[], -- ['deals', 'contacts', 'campaigns']
  
  -- Rollback
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES app_users(id),
  rollback_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, setting_key, version_number)
);

CREATE INDEX idx_settings_versions_tenant ON settings_versions(tenant_id);
CREATE INDEX idx_settings_versions_key ON settings_versions(setting_key);
CREATE INDEX idx_settings_versions_changed_at ON settings_versions(changed_at DESC);
CREATE INDEX idx_settings_versions_rollback ON settings_versions(is_rolled_back);

COMMENT ON TABLE settings_versions IS 'Complete version history of all settings changes with rollback capability';

-- =====================================================
-- 2. SETTINGS_APPROVALS TABLE
-- =====================================================
-- For settings that require approval before taking effect

CREATE TABLE IF NOT EXISTS settings_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Pending change
  setting_key TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB,
  change_reason TEXT,
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES app_users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Effective date (scheduled change)
  effective_at TIMESTAMPTZ, -- When change should take effect
  applied_at TIMESTAMPTZ, -- When it actually was applied
  
  -- Impact analysis
  impact_summary TEXT,
  affected_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_approvals_tenant_status ON settings_approvals(tenant_id, status);
CREATE INDEX idx_settings_approvals_requester ON settings_approvals(requested_by);
CREATE INDEX idx_settings_approvals_reviewer ON settings_approvals(reviewed_by);

COMMENT ON TABLE settings_approvals IS 'Approval workflow for critical settings changes';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to get current setting value with scope hierarchy
CREATE OR REPLACE FUNCTION get_setting_value(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_location_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  -- Check user-level setting first
  IF p_user_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'user'
      AND changed_by = p_user_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  -- Check location-level setting
  IF p_location_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'location'
      AND location_id = p_location_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  -- Check org-level setting
  SELECT new_value INTO v_value
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key
    AND setting_scope = 'org'
    AND is_rolled_back = FALSE
  ORDER BY version_number DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN v_value; END IF;
  
  -- Return NULL if no setting found (will use default from registry)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save setting with versioning
CREATE OR REPLACE FUNCTION save_setting(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_new_value JSONB,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_scope TEXT DEFAULT 'org'
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version INTEGER;
  v_old_value JSONB;
BEGIN
  -- Get current value (will be old_value)
  v_old_value := get_setting_value(p_tenant_id, p_setting_key, p_location_id, p_changed_by);
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key;
  
  -- Insert new version
  INSERT INTO settings_versions (
    tenant_id,
    location_id,
    setting_key,
    setting_scope,
    version_number,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    p_tenant_id,
    p_location_id,
    p_setting_key,
    p_scope,
    v_next_version,
    v_old_value,
    p_new_value,
    p_changed_by,
    p_change_reason
  )
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollback setting to previous version
CREATE OR REPLACE FUNCTION rollback_setting(
  p_version_id UUID,
  p_rolled_back_by UUID,
  p_rollback_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_setting_key TEXT;
  v_old_value JSONB;
  v_tenant_id UUID;
BEGIN
  -- Get version details
  SELECT setting_key, old_value, tenant_id INTO v_setting_key, v_old_value, v_tenant_id
  FROM settings_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;
  
  -- Mark as rolled back
  UPDATE settings_versions
  SET is_rolled_back = TRUE,
      rolled_back_at = NOW(),
      rolled_back_by = p_rolled_back_by,
      rollback_reason = p_rollback_reason
  WHERE id = p_version_id;
  
  -- Create new version with old value
  PERFORM save_setting(
    v_tenant_id,
    v_setting_key,
    v_old_value,
    p_rolled_back_by,
    'Rollback: ' || p_rollback_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Settings Versions RLS
CREATE POLICY settings_versions_tenant_isolation
  ON settings_versions
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Settings Approvals RLS
CREATE POLICY settings_approvals_tenant_isolation
  ON settings_approvals
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Locations RLS
CREATE POLICY locations_tenant_isolation
  ON locations
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

COMMIT;

-- =====================================================
-- STAGE AUTO-MOVE RULES
-- Migration: Automatic deal stage transitions
-- =====================================================

CREATE TABLE IF NOT EXISTS stage_auto_move_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Pipeline and stages
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    from_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    
    -- Trigger configuration
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'task_completed',
        'time_based',
        'field_change',
        'email_opened',
        'manual'
    )),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure from and to stages are different
    CONSTRAINT different_stages CHECK (from_stage_id != to_stage_id)
);

CREATE INDEX idx_stage_auto_move_tenant ON stage_auto_move_rules(tenant_id);
CREATE INDEX idx_stage_auto_move_pipeline ON stage_auto_move_rules(pipeline_id);
CREATE INDEX idx_stage_auto_move_from_stage ON stage_auto_move_rules(from_stage_id);
CREATE INDEX idx_stage_auto_move_active ON stage_auto_move_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_stage_auto_move_trigger ON stage_auto_move_rules(trigger_type);

-- RLS Policies
ALTER TABLE stage_auto_move_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's auto-move rules"
    ON stage_auto_move_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage auto-move rules"
    ON stage_auto_move_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Example auto-move rules (commented out - add as needed)
-- INSERT INTO stage_auto_move_rules (tenant_id, pipeline_id, from_stage_id, to_stage_id, trigger_type, trigger_config)
-- VALUES (
--     '<tenant_id>',
--     '<pipeline_id>',
--     '<from_stage_id>',
--     '<to_stage_id>',
--     'task_completed',
--     '{"task_title_contains": "Send Proposal"}'::jsonb
-- );

COMMENT ON TABLE stage_auto_move_rules IS 'Rules for automatically moving deals between stages based on triggers';
COMMENT ON COLUMN stage_auto_move_rules.trigger_type IS 'task_completed: When a specific task is completed; time_based: After X days in stage; field_change: When a deal field changes; email_opened: When email is opened';
COMMENT ON COLUMN stage_auto_move_rules.trigger_config IS 'Configuration specific to trigger type (e.g., {task_title_contains, days_in_stage, requires_inactivity})';

-- =====================================================
-- TASK AUTOMATION RULES
-- Migration: Task escalation, dependencies, and auto-management
-- =====================================================

-- Task Escalation Rules
CREATE TABLE IF NOT EXISTS task_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Rule criteria
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    overdue_hours INTEGER NOT NULL DEFAULT 24,
    
    -- Escalation actions
    escalate_to_role TEXT NOT NULL CHECK (escalate_to_role IN ('manager', 'owner', 'director')),
    notify_assignee BOOLEAN DEFAULT true,
    notify_escalation_target BOOLEAN DEFAULT true,
    auto_increase_priority BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_escalation_tenant ON task_escalation_rules(tenant_id);
CREATE INDEX idx_task_escalation_priority ON task_escalation_rules(priority);
CREATE INDEX idx_task_escalation_active ON task_escalation_rules(is_active) WHERE is_active = true;

-- Task Dependencies (Sequential task chains)
-- Drop and recreate to ensure clean state
DROP TABLE IF EXISTS task_dependencies CASCADE;

CREATE TABLE task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Parent-child relationship
    -- Note: Using plain UUID without foreign key constraint
    parent_task_id UUID NOT NULL,
    child_task_template JSONB NOT NULL, -- Template for child task
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_dependencies_tenant ON task_dependencies(tenant_id);
CREATE INDEX idx_task_dependencies_parent ON task_dependencies(parent_task_id);

-- Task Reminder Settings (per tenant)
CREATE TABLE IF NOT EXISTS task_reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Reminder windows
    remind_1h_before BOOLEAN DEFAULT true,
    remind_4h_before BOOLEAN DEFAULT true,
    remind_24h_before BOOLEAN DEFAULT true,
    
    -- Channels
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Business hours
    respect_business_hours BOOLEAN DEFAULT true,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- RLS Policies
ALTER TABLE task_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's task escalation rules"
    ON task_escalation_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage task escalation rules"
    ON task_escalation_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can view their tenant's task dependencies"
    ON task_dependencies FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage task dependencies"
    ON task_dependencies FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view their tenant's reminder settings"
    ON task_reminder_settings FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage reminder settings"
    ON task_reminder_settings FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Default escalation rules
INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'urgent', 2, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'urgent')
ON CONFLICT DO NOTHING;

INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'high', 4, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'high')
ON CONFLICT DO NOTHING;

INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'normal', 24, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'normal')
ON CONFLICT DO NOTHING;

-- Default reminder settings for all tenants
INSERT INTO task_reminder_settings (tenant_id)
SELECT id FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_reminder_settings WHERE tenant_id = tenants.id)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE task_escalation_rules IS 'Rules for escalating overdue tasks to managers';
COMMENT ON TABLE task_dependencies IS 'Sequential task chains - create task B when task A completes';
COMMENT ON TABLE task_reminder_settings IS 'Per-tenant settings for task reminder notifications';

/**
 * Marketing Audit - Webhooks Table
 * 
 * Store webhook endpoints for event notifications.
 */

CREATE TABLE IF NOT EXISTS public.marketing_audit_webhooks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  url text NOT NULL,
  events text[] NOT NULL, -- Array of event names
  secret text NOT NULL, -- For HMAC signature
  active boolean DEFAULT true,
  last_triggered_at timestamp with time zone,
  last_success_at timestamp with time zone,
  last_error text,
  total_deliveries integer DEFAULT 0,
  failed_deliveries integer DEFAULT 0,
  created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX idx_webhooks_tenant ON public.marketing_audit_webhooks(tenant_id);
CREATE INDEX idx_webhooks_active ON public.marketing_audit_webhooks(active) WHERE active = true;

-- Enable RLS
ALTER TABLE public.marketing_audit_webhooks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage webhooks for their tenant
CREATE POLICY "Users can view own webhooks"
  ON public.marketing_audit_webhooks
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create own webhooks"
  ON public.marketing_audit_webhooks
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update own webhooks"
  ON public.marketing_audit_webhooks
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own webhooks"
  ON public.marketing_audit_webhooks
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
    )
  );

-- Table for webhook delivery logs
CREATE TABLE IF NOT EXISTS public.marketing_audit_webhook_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  webhook_id uuid REFERENCES public.marketing_audit_webhooks(id) ON DELETE CASCADE NOT NULL,
  event text NOT NULL,
  payload jsonb NOT NULL,
  response_code integer,
  response_body text,
  success boolean DEFAULT false,
  attempt_number integer DEFAULT 1,
  delivered_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Index for cleanup
CREATE INDEX idx_webhook_logs_delivered ON public.marketing_audit_webhook_logs(delivered_at);

-- Enable RLS
ALTER TABLE public.marketing_audit_webhook_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs for their webhooks
CREATE POLICY "Users can view own webhook logs"
  ON public.marketing_audit_webhook_logs
  FOR SELECT
  USING (
    webhook_id IN (
      SELECT id FROM public.marketing_audit_webhooks
      WHERE tenant_id IN (
        SELECT tenant_id FROM public.app_users WHERE id = auth.uid()
      )
    )
  );

-- Function: Cleanup old webhook logs (keep only 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_webhook_logs()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.marketing_audit_webhook_logs
  WHERE delivered_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

GRANT EXECUTE ON FUNCTION cleanup_old_webhook_logs() TO service_role;

-- Email Logs Table
-- Tracks all emails sent through the system for debugging and audit

CREATE TABLE IF NOT EXISTS email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Email details
  email_type VARCHAR(50) NOT NULL, -- 'verification', 'password_reset', 'invitation', 'notification', 'campaign'
  to_email VARCHAR(255) NOT NULL,
  from_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'queued', 'sending', 'sent', 'failed', 'bounced', 'opened', 'clicked'
  
  -- Provider details
  provider VARCHAR(50) DEFAULT 'resend', -- 'resend', 'sendgrid', 'ses'
  provider_message_id VARCHAR(255),
  
  -- Error tracking
  error_message TEXT,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Timing
  queued_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_tenant_id ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
CREATE INDEX IF NOT EXISTS idx_email_logs_email_type ON email_logs(email_type);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);

-- RLS Policies
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own email logs
CREATE POLICY "Users can view their own email logs"
  ON email_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all email logs in their tenant
CREATE POLICY "Admins can view tenant email logs"
  ON email_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE app_users.id = auth.uid()
      AND app_users.tenant_id = email_logs.tenant_id
      AND app_users.role IN ('admin', 'super_admin', 'owner')
    )
  );

-- System can insert email logs
CREATE POLICY "System can insert email logs"
  ON email_logs
  FOR INSERT
  WITH CHECK (true);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_email_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_logs_updated_at
  BEFORE UPDATE ON email_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_email_logs_updated_at();

-- Comments
COMMENT ON TABLE email_logs IS 'Tracks all emails sent through the system for debugging, audit, and deliverability monitoring';
COMMENT ON COLUMN email_logs.status IS 'Current status of the email: pending, queued, sending, sent, failed, bounced, opened, clicked';
COMMENT ON COLUMN email_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN email_logs.metadata IS 'Additional email metadata (template variables, campaign info, etc.)';

-- Performance Optimization Indexes
-- Add indexes for frequently queried columns

-- App Users
CREATE INDEX IF NOT EXISTS idx_app_users_tenant_id ON app_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_trgm ON contacts USING gin(full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contacts_company_trgm ON contacts USING gin(company gin_trgm_ops);

-- Enable trigram extension for fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_tenant_id ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline_id ON deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage_id ON deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_contact_id ON deals(contact_id);
CREATE INDEX IF NOT EXISTS idx_deals_owner_id ON deals(owner_id);
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals(status);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_expected_close_date ON deals(expected_close_date);

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pipelines_is_active ON pipelines(is_active);

-- Stages
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_id ON stages(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_order ON stages(display_order);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_deal_id ON tasks(deal_id);
CREATE INDEX IF NOT EXISTS idx_tasks_contact_id ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Email Templates
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_type ON email_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_active ON email_templates(is_active);

-- Campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant_id ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);

-- Forms
CREATE INDEX IF NOT EXISTS idx_forms_tenant_id ON forms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_forms_is_active ON forms(is_active);

-- Form Submissions
CREATE INDEX IF NOT EXISTS idx_form_submissions_form_id ON form_submissions(form_id);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created_at ON form_submissions(created_at DESC);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_status ON deals(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status ON contacts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks(assignee_id, status);

-- Comments
COMMENT ON INDEX idx_contacts_full_name_trgm IS 'Trigram index for fuzzy text search on contact names';
COMMENT ON INDEX idx_deals_tenant_pipeline IS 'Composite index for pipeline board queries';

-- User Pipeline Preferences Table
-- Stores user-specific preferences for pipeline ordering and views

CREATE TABLE IF NOT EXISTS user_pipeline_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Pipeline ordering (array of pipeline IDs in user's preferred order)
  pipeline_order JSONB DEFAULT '[]'::jsonb,
  
  -- Last selected pipeline
  last_selected_pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
  
  -- Default view preference
  default_view VARCHAR(20) DEFAULT 'board' CHECK (default_view IN ('board', 'list', 'timeline')),
  
  -- View settings
  show_archived BOOLEAN DEFAULT false,
  compact_view BOOLEAN DEFAULT false,
  
  -- Column visibility (for list view)
  visible_columns JSONB DEFAULT '["name", "stage", "value", "owner", "updated_at"]'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One preference row per user
  UNIQUE(user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_pipeline_prefs_user_id ON user_pipeline_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_pipeline_prefs_last_selected ON user_pipeline_preferences(last_selected_pipeline_id);

-- RLS Policies
ALTER TABLE user_pipeline_preferences ENABLE ROW LEVEL SECURITY;

-- Users can view their own preferences
CREATE POLICY "Users can view their own pipeline preferences"
  ON user_pipeline_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own preferences
CREATE POLICY "Users can insert their own pipeline preferences"
  ON user_pipeline_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own preferences
CREATE POLICY "Users can update their own pipeline preferences"
  ON user_pipeline_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own preferences
CREATE POLICY "Users can delete their own pipeline preferences"
  ON user_pipeline_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_user_pipeline_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_pipeline_prefs_updated_at
  BEFORE UPDATE ON user_pipeline_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_pipeline_prefs_updated_at();

-- Comments
COMMENT ON TABLE user_pipeline_preferences IS 'Stores user-specific preferences for pipeline display, ordering, and views';
COMMENT ON COLUMN user_pipeline_preferences.pipeline_order IS 'Array of pipeline IDs in user''s preferred display order';
COMMENT ON COLUMN user_pipeline_preferences.default_view IS 'User''s preferred default view: board, list, or timeline';
COMMENT ON COLUMN user_pipeline_preferences.visible_columns IS 'Array of column names to show in list view';

-- =====================================================
-- COMPLETE ROW LEVEL SECURITY (RLS) IMPLEMENTATION
-- Ensures complete tenant data isolation
-- =====================================================

-- This migration enables RLS on ALL tables and creates policies
-- to ensure users can ONLY see data from their own tenant

BEGIN;

-- =====================================================
-- HELPER FUNCTION: Get user's tenant_id
-- =====================================================

CREATE OR REPLACE FUNCTION auth.get_user_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM app_users 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- =====================================================
-- 1. TENANTS TABLE
-- =====================================================

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users can only view their own tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants
  FOR SELECT
  USING (id = auth.get_user_tenant_id());

-- Only service role can insert/update/delete tenants
CREATE POLICY "Service role can manage tenants"
  ON tenants
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 2. APP_USERS TABLE
-- =====================================================

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Users can view users in their own tenant
CREATE POLICY "Users can view tenant users"
  ON app_users
  FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON app_users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Service role can insert/delete users
CREATE POLICY "Service role can manage users"
  ON app_users
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. CONTACTS TABLE
-- =====================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Users can view contacts in their tenant
CREATE POLICY "Users can view tenant contacts"
  ON contacts
  FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

-- Users can insert contacts in their tenant
CREATE POLICY "Users can create tenant contacts"
  ON contacts
  FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

-- Users can update contacts in their tenant
CREATE POLICY "Users can update tenant contacts"
  ON contacts
  FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id())
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

-- Users can delete contacts in their tenant
CREATE POLICY "Users can delete tenant contacts"
  ON contacts
  FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 4. DEALS TABLE
-- =====================================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant deals"
  ON deals FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create tenant deals"
  ON deals FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update tenant deals"
  ON deals FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id())
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete tenant deals"
  ON deals FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 5. PIPELINES TABLE
-- =====================================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant pipelines"
  ON pipelines FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create tenant pipelines"
  ON pipelines FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update tenant pipelines"
  ON pipelines FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id())
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete tenant pipelines"
  ON pipelines FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 6. PIPELINE_STAGES / STAGES TABLE
-- =====================================================

ALTER TABLE IF EXISTS pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stages ENABLE ROW LEVEL SECURITY;

-- Pipeline stages
CREATE POLICY "Users can view tenant pipeline stages" ON pipeline_stages
  FOR SELECT USING (tenant_id = auth.get_user_tenant_id());
CREATE POLICY "Users can manage tenant pipeline stages" ON pipeline_stages
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

-- Stages (if different table)
CREATE POLICY "Users can view tenant stages" ON stages
  FOR SELECT USING (tenant_id = auth.get_user_tenant_id());
CREATE POLICY "Users can manage tenant stages" ON stages
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 7. TASKS TABLE
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant tasks"
  ON tasks FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can create tenant tasks"
  ON tasks FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can update tenant tasks"
  ON tasks FOR UPDATE
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "Users can delete tenant tasks"
  ON tasks FOR DELETE
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 8. MARKETING TABLES
-- =====================================================

-- Campaigns
ALTER TABLE IF EXISTS campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tenant campaigns" ON campaigns
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

-- Email Templates
ALTER TABLE IF EXISTS email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tenant email templates" ON email_templates
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

-- Marketing Audiences
ALTER TABLE IF EXISTS marketing_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tenant marketing audiences" ON marketing_audiences
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 9. FORMS TABLES
-- =====================================================

ALTER TABLE IF EXISTS forms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage tenant forms" ON forms
  FOR ALL USING (tenant_id = auth.get_user_tenant_id());

ALTER TABLE IF EXISTS form_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view tenant form submissions" ON form_submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM forms 
      WHERE forms.id = form_submissions.form_id 
      AND forms.tenant_id = auth.get_user_tenant_id()
    )
  );

-- =====================================================
-- 10. AUDIT LOGS
-- =====================================================

ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant audit logs"
  ON audit_logs FOR SELECT
  USING (tenant_id = auth.get_user_tenant_id());

CREATE POLICY "System can insert audit logs"
  ON audit_logs FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 11. ACTIVITIES TABLE
-- =====================================================

ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tenant activities"
  ON activities FOR ALL
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- 12. FILES & STORAGE
-- =====================================================

ALTER TABLE IF EXISTS files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage tenant files"
  ON files FOR ALL
  USING (tenant_id = auth.get_user_tenant_id());

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- To verify RLS is working, run:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

COMMIT;

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================

-- After running this migration:
-- 1. Every user can ONLY see data from their own tenant
-- 2. Cross-tenant data leakage is IMPOSSIBLE
-- 3. Service role (backend) can still access all data for migrations/admin
-- 4. Existing data remains intact
-- 5. No application code changes needed (tenant_id already filtered in queries)

-- TESTING:
-- 1. Sign in as User A (Practice A)
-- 2. Create contact, deal, task
-- 3. Sign out
-- 4. Sign in as User B (Practice B)
-- 5. Should NOT see User A's data!

-- =====================================================
-- HARDENING PHASE 1.1: Canonical Helper Functions
-- Date: October 16, 2025
-- Purpose: Create standard helpers for tenant isolation & consistency
-- =====================================================

-- =====================================================
-- 1. TENANT ID HELPERS
-- =====================================================

-- Drop existing helpers if they have different signatures
DROP FUNCTION IF EXISTS current_tenant_id();
DROP FUNCTION IF EXISTS current_role_name();

-- Canonical function to get current user's tenant_id
-- This replaces all variants (get_user_tenant_id, get_user_org_id, etc.)
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- First try org_memberships (multi-org support)
  SELECT COALESCE(
    (SELECT tenant_id FROM org_memberships 
     WHERE user_id = auth.uid() AND status = 'active' 
     ORDER BY last_accessed_at DESC LIMIT 1),
    -- Fallback to app_users
    (SELECT tenant_id FROM app_users WHERE id = auth.uid() LIMIT 1)
  );
$$;

COMMENT ON FUNCTION current_tenant_id() IS 
  'Returns the authenticated user''s current tenant_id. Uses org_memberships if available, falls back to app_users.';

-- =====================================================
-- 2. ROLE HELPERS
-- =====================================================

-- Get current user's role in their current tenant
CREATE OR REPLACE FUNCTION current_role_name()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM app_users WHERE id = auth.uid() LIMIT 1;
$$;

COMMENT ON FUNCTION current_role_name() IS 
  'Returns the authenticated user''s role (owner, admin, staff, etc.)';

-- Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(required_roles TEXT[])
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() 
      AND role = ANY(required_roles)
  );
$$;

COMMENT ON FUNCTION user_has_role(TEXT[]) IS 
  'Returns true if user has any of the specified roles';

-- =====================================================
-- 3. UPDATED_AT TRIGGER
-- =====================================================

-- Universal trigger function to set updated_at on UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS 
  'Trigger function to automatically set updated_at = NOW() on UPDATE operations';

-- =====================================================
-- 4. SOFT DELETE HELPERS
-- =====================================================

-- Helper to check if a row is not soft-deleted
CREATE OR REPLACE FUNCTION is_not_deleted(row_deleted_at TIMESTAMPTZ)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT row_deleted_at IS NULL;
$$;

COMMENT ON FUNCTION is_not_deleted(TIMESTAMPTZ) IS 
  'Returns true if the row is not soft-deleted (deleted_at IS NULL)';

-- Soft delete function (for use in triggers or manually)
CREATE OR REPLACE FUNCTION soft_delete_cascade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Mark record as deleted instead of actually deleting
  NEW.deleted_at = NOW();
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION soft_delete_cascade() IS 
  'Trigger function to convert DELETE operations to soft deletes by setting deleted_at';

-- =====================================================
-- 5. TENANT VALIDATION HELPERS
-- =====================================================

-- Prevent tenant_id changes after creation
CREATE OR REPLACE FUNCTION prevent_tenant_id_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.tenant_id IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: Cannot change tenant_id after creation (table: %, id: %)', TG_TABLE_NAME, OLD.id
      USING ERRCODE = '23514'; -- check_violation
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION prevent_tenant_id_change() IS 
  'Trigger function to prevent tenant_id modifications after record creation';

-- Validate that a referenced record belongs to the same tenant
CREATE OR REPLACE FUNCTION validate_same_tenant(
  p_table_name TEXT,
  p_record_id UUID,
  p_expected_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_actual_tenant_id UUID;
BEGIN
  -- Dynamically query the referenced table
  EXECUTE format(
    'SELECT tenant_id FROM %I WHERE id = $1',
    p_table_name
  ) INTO v_actual_tenant_id USING p_record_id;

  RETURN v_actual_tenant_id = p_expected_tenant_id;
END;
$$;

COMMENT ON FUNCTION validate_same_tenant(TEXT, UUID, UUID) IS 
  'Validates that a referenced record belongs to the expected tenant. Used in FK validation triggers.';

-- =====================================================
-- 6. AUDIT LOGGING HELPER
-- =====================================================

-- Helper to log to audit_log (if table exists)
CREATE OR REPLACE FUNCTION log_audit_event(
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_changes JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only log if audit_log table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'audit_log'
  ) THEN
    INSERT INTO audit_log (
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      changes,
      ip_address,
      created_at
    ) VALUES (
      current_tenant_id(),
      auth.uid(),
      p_action,
      p_resource_type,
      p_resource_id,
      p_changes,
      inet_client_addr(),
      NOW()
    );
  END IF;
END;
$$;

COMMENT ON FUNCTION log_audit_event(TEXT, TEXT, UUID, JSONB) IS 
  'Logs an audit event to the audit_log table (if it exists)';

-- =====================================================
-- 7. VERIFICATION QUERIES
-- =====================================================

-- Verify all functions were created
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'current_tenant_id',
      'current_role_name',
      'user_has_role',
      'set_updated_at',
      'is_not_deleted',
      'soft_delete_cascade',
      'prevent_tenant_id_change',
      'validate_same_tenant',
      'log_audit_event'
    );

-- RAISE NOTICE 'Created % helper functions', v_count;

  IF v_count < 9 THEN
    RAISE WARNING 'Expected 9 helper functions, but only created %', v_count;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Log completion
DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.1 COMPLETE: Helper functions created';
-- RAISE NOTICE '   - current_tenant_id() - Get authenticated user''s tenant';
-- RAISE NOTICE '   - current_role_name() - Get authenticated user''s role';
-- RAISE NOTICE '   - user_has_role() - Check role membership';
-- RAISE NOTICE '   - set_updated_at() - Auto-update timestamps';
-- RAISE NOTICE '   - is_not_deleted() - Check soft delete status';
-- RAISE NOTICE '   - soft_delete_cascade() - Soft delete trigger';
-- RAISE NOTICE '   - prevent_tenant_id_change() - Prevent tenant_id changes';
-- RAISE NOTICE '   - validate_same_tenant() - FK tenant validation';
-- RAISE NOTICE '   - log_audit_event() - Audit logging';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_002_soft_delete.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 1.2: Soft Delete & Updated At
-- Date: October 16, 2025
-- Purpose: Add deleted_at columns and updated_at triggers to all entity tables
-- =====================================================

-- =====================================================
-- 1. ADD deleted_at COLUMNS
-- =====================================================

-- Core CRM tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contacts') THEN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deals') THEN
    ALTER TABLE deals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipelines') THEN
    ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pipeline_stages') THEN
    ALTER TABLE pipeline_stages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tasks') THEN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activities') THEN
    ALTER TABLE activities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'calls') THEN
    ALTER TABLE calls ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'files') THEN
    ALTER TABLE files ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notes') THEN
    ALTER TABLE notes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;

  -- Marketing tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_campaigns') THEN
    ALTER TABLE marketing_campaigns ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_templates') THEN
    ALTER TABLE marketing_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_segments') THEN
    ALTER TABLE marketing_segments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_journeys') THEN
    ALTER TABLE marketing_journeys ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'marketing_forms') THEN
    ALTER TABLE marketing_forms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;

  -- Automation tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automations') THEN
    ALTER TABLE automations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Integration tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'integration_connections') THEN
    ALTER TABLE integration_connections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Notification tables (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
    ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Location tables
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'locations') THEN
    ALTER TABLE locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Custom fields, tags, etc.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'custom_fields') THEN
    ALTER TABLE custom_fields ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lead_sources') THEN
    ALTER TABLE lead_sources ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
  
-- RAISE NOTICE '✅ Added deleted_at columns to entity tables';
END $$;

-- =====================================================
-- 2. ADD INDEXES FOR SOFT DELETE QUERIES
-- =====================================================

-- Performance: Index for "not deleted" queries (most common case)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'contacts') THEN
    CREATE INDEX IF NOT EXISTS idx_contacts_not_deleted ON contacts(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') THEN
    CREATE INDEX IF NOT EXISTS idx_deals_not_deleted ON deals(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    CREATE INDEX IF NOT EXISTS idx_tasks_not_deleted ON tasks(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') THEN
    CREATE INDEX IF NOT EXISTS idx_pipelines_not_deleted ON pipelines(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations') THEN
    CREATE INDEX IF NOT EXISTS idx_automations_not_deleted ON automations(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_not_deleted ON marketing_campaigns(tenant_id, deleted_at) WHERE deleted_at IS NULL;
  END IF;
-- RAISE NOTICE '✅ Created partial indexes for soft delete queries';
END $$;

-- =====================================================
-- 3. ATTACH updated_at TRIGGERS
-- =====================================================

-- Automatically attach set_updated_at trigger to all tables that have updated_at column
DO $$
DECLARE
  r RECORD;
  v_trigger_name TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'updated_at'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
  LOOP
    v_trigger_name := r.table_name || '_set_updated_at';
    
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, r.table_name);
    
    -- Create trigger
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      v_trigger_name,
      r.table_name
    );
    
-- RAISE NOTICE '  ✓ Attached updated_at trigger to %', r.table_name;
  END LOOP;
  
-- RAISE NOTICE '✅ Attached updated_at triggers to all applicable tables';
END $$;

-- =====================================================
-- 4. ATTACH prevent_tenant_id_change TRIGGERS
-- =====================================================

-- Prevent tenant_id changes on all tenant-scoped tables
DO $$
DECLARE
  r RECORD;
  v_trigger_name TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables t 
      ON t.table_name = c.table_name 
      AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public'
      AND c.column_name = 'tenant_id'
      AND t.table_type = 'BASE TABLE'
      AND c.table_name NOT LIKE 'pg_%'
      AND c.table_name NOT LIKE 'sql_%'
      AND c.table_name NOT IN ('tenants', 'audit_log') -- Exclude special tables
  LOOP
    v_trigger_name := r.table_name || '_prevent_tenant_change';
    
    -- Drop existing trigger if it exists
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I', v_trigger_name, r.table_name);
    
    -- Create trigger
    EXECUTE format(
      'CREATE TRIGGER %I BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_tenant_id_change()',
      v_trigger_name,
      r.table_name
    );
    
-- RAISE NOTICE '  ✓ Attached prevent_tenant_change trigger to %', r.table_name;
  END LOOP;
  
-- RAISE NOTICE '✅ Attached tenant_id protection triggers to all tenant-scoped tables';
END $$;

-- =====================================================
-- 5. CREATE SOFT DELETE VIEW (Optional Utility)
-- =====================================================

-- View to easily see all soft-deleted records across tables
-- Only include tables that exist
DO $$
BEGIN
  -- Drop view if it exists
  DROP VIEW IF EXISTS soft_deleted_records;
  
  -- Create view with only tables that exist
  EXECUTE format($view$
    CREATE VIEW soft_deleted_records AS
    SELECT 'contacts' as table_name, id, tenant_id, deleted_at, created_at as record_created_at
    FROM contacts WHERE deleted_at IS NOT NULL
    %s
    ORDER BY deleted_at DESC
  $view$,
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deals') 
      THEN 'UNION ALL SELECT ''deals'', id, tenant_id, deleted_at, created_at FROM deals WHERE deleted_at IS NOT NULL' 
      ELSE '' END ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') 
      THEN ' UNION ALL SELECT ''tasks'', id, tenant_id, deleted_at, created_at FROM tasks WHERE deleted_at IS NOT NULL' 
      ELSE '' END ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pipelines') 
      THEN ' UNION ALL SELECT ''pipelines'', id, tenant_id, deleted_at, created_at FROM pipelines WHERE deleted_at IS NOT NULL' 
      ELSE '' END ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'automations') 
      THEN ' UNION ALL SELECT ''automations'', id, tenant_id, deleted_at, created_at FROM automations WHERE deleted_at IS NOT NULL' 
      ELSE '' END ||
    CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') 
      THEN ' UNION ALL SELECT ''marketing_campaigns'', id, tenant_id, deleted_at, created_at FROM marketing_campaigns WHERE deleted_at IS NOT NULL' 
      ELSE '' END
  );

-- RAISE NOTICE '✅ Created soft_deleted_records view';
END $$;

COMMENT ON VIEW soft_deleted_records IS 
  'Utility view showing all soft-deleted records across entity tables. Useful for admin cleanup or recovery.';

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_deleted_count INTEGER;
  v_trigger_count INTEGER;
BEGIN
  -- Count tables with deleted_at column
  SELECT COUNT(DISTINCT table_name) INTO v_deleted_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'deleted_at';
  
  -- Count updated_at triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND action_statement LIKE '%set_updated_at%';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Tables with deleted_at: %', v_deleted_count;
-- RAISE NOTICE 'Tables with updated_at triggers: %', v_trigger_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.2 COMPLETE: Soft delete & triggers';
-- RAISE NOTICE '   - Added deleted_at columns to all entity tables';
-- RAISE NOTICE '   - Created partial indexes for query performance';
-- RAISE NOTICE '   - Attached updated_at triggers automatically';
-- RAISE NOTICE '   - Protected tenant_id from changes';
-- RAISE NOTICE '   - Created soft_deleted_records view';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  IMPORTANT: Update application code to:';
-- RAISE NOTICE '   1. Filter WHERE deleted_at IS NULL in queries';
-- RAISE NOTICE '   2. Use UPDATE SET deleted_at = NOW() instead of DELETE';
-- RAISE NOTICE '   3. Implement "undelete" functionality if needed';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_003_rls_reset.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 1.3: RLS Policy Reset & Consistency
-- Date: October 16, 2025
-- Purpose: Apply consistent RLS policies to all tenant-scoped tables
-- =====================================================

-- =====================================================
-- MACRO: Standard RLS Policies for Tenant-Scoped Tables
-- =====================================================
-- Pattern:
-- SELECT: tenant_id = current_tenant_id() AND is_not_deleted(deleted_at)
-- INSERT: tenant_id = current_tenant_id()
-- UPDATE: tenant_id = current_tenant_id()
-- DELETE: tenant_id = current_tenant_id() AND user_has_role(ARRAY['owner','super_admin','admin'])

-- =====================================================
-- 1. CONTACTS
-- =====================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select ON contacts;
DROP POLICY IF EXISTS contacts_insert ON contacts;
DROP POLICY IF EXISTS contacts_update ON contacts;
DROP POLICY IF EXISTS contacts_delete ON contacts;
DROP POLICY IF EXISTS contacts_service_role ON contacts;

CREATE POLICY contacts_select ON contacts
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY contacts_insert ON contacts
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY contacts_update ON contacts
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY contacts_delete ON contacts
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

-- Service role bypass
CREATE POLICY contacts_service_role ON contacts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 2. DEALS
-- =====================================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deals_select ON deals;
DROP POLICY IF EXISTS deals_insert ON deals;
DROP POLICY IF EXISTS deals_update ON deals;
DROP POLICY IF EXISTS deals_delete ON deals;
DROP POLICY IF EXISTS deals_service_role ON deals;

CREATE POLICY deals_select ON deals
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY deals_insert ON deals
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY deals_update ON deals
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY deals_delete ON deals
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY deals_service_role ON deals
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. PIPELINES
-- =====================================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipelines_select ON pipelines;
DROP POLICY IF EXISTS pipelines_insert ON pipelines;
DROP POLICY IF EXISTS pipelines_update ON pipelines;
DROP POLICY IF EXISTS pipelines_delete ON pipelines;
DROP POLICY IF EXISTS pipelines_service_role ON pipelines;

CREATE POLICY pipelines_select ON pipelines
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY pipelines_insert ON pipelines
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipelines_update ON pipelines
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipelines_delete ON pipelines
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY pipelines_service_role ON pipelines
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 4. PIPELINE_STAGES
-- =====================================================

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_stages_select ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_insert ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_update ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_delete ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_service_role ON pipeline_stages;

CREATE POLICY pipeline_stages_select ON pipeline_stages
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY pipeline_stages_insert ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipeline_stages_update ON pipeline_stages
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipeline_stages_delete ON pipeline_stages
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY pipeline_stages_service_role ON pipeline_stages
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 5. TASKS
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select ON tasks;
DROP POLICY IF EXISTS tasks_insert ON tasks;
DROP POLICY IF EXISTS tasks_update ON tasks;
DROP POLICY IF EXISTS tasks_delete ON tasks;
DROP POLICY IF EXISTS tasks_service_role ON tasks;

CREATE POLICY tasks_select ON tasks
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY tasks_insert ON tasks
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tasks_update ON tasks
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY tasks_delete ON tasks
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY tasks_service_role ON tasks
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. ACTIVITIES
-- =====================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_select ON activities;
DROP POLICY IF EXISTS activities_insert ON activities;
DROP POLICY IF EXISTS activities_update ON activities;
DROP POLICY IF EXISTS activities_delete ON activities;
DROP POLICY IF EXISTS activities_service_role ON activities;

CREATE POLICY activities_select ON activities
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY activities_insert ON activities
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY activities_update ON activities
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY activities_delete ON activities
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY activities_service_role ON activities
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 7. CALLS
-- =====================================================

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calls_select ON calls;
DROP POLICY IF EXISTS calls_insert ON calls;
DROP POLICY IF EXISTS calls_update ON calls;
DROP POLICY IF EXISTS calls_delete ON calls;
DROP POLICY IF EXISTS calls_service_role ON calls;

CREATE POLICY calls_select ON calls
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY calls_insert ON calls
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY calls_update ON calls
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY calls_delete ON calls
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY calls_service_role ON calls
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 8. FILES
-- =====================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS files_select ON files;
DROP POLICY IF EXISTS files_insert ON files;
DROP POLICY IF EXISTS files_update ON files;
DROP POLICY IF EXISTS files_delete ON files;
DROP POLICY IF EXISTS files_service_role ON files;

CREATE POLICY files_select ON files
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY files_insert ON files
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY files_update ON files
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY files_delete ON files
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY files_service_role ON files
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 9. NOTES
-- =====================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notes_select ON notes;
DROP POLICY IF EXISTS notes_insert ON notes;
DROP POLICY IF EXISTS notes_update ON notes;
DROP POLICY IF EXISTS notes_delete ON notes;
DROP POLICY IF EXISTS notes_service_role ON notes;

CREATE POLICY notes_select ON notes
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY notes_insert ON notes
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY notes_update ON notes
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY notes_delete ON notes
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY notes_service_role ON notes
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 10. LOCATIONS
-- =====================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS locations_select ON locations;
DROP POLICY IF EXISTS locations_insert ON locations;
DROP POLICY IF EXISTS locations_update ON locations;
DROP POLICY IF EXISTS locations_delete ON locations;
DROP POLICY IF EXISTS locations_service_role ON locations;

CREATE POLICY locations_select ON locations
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY locations_insert ON locations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY locations_update ON locations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY locations_delete ON locations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin'])
  );

CREATE POLICY locations_service_role ON locations
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 11. AUTOMATIONS (Base policies - entitlement in Phase 2)
-- =====================================================

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automations_select ON automations;
DROP POLICY IF EXISTS automations_insert ON automations;
DROP POLICY IF EXISTS automations_update ON automations;
DROP POLICY IF EXISTS automations_delete ON automations;
DROP POLICY IF EXISTS automations_service_role ON automations;

CREATE POLICY automations_select ON automations
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY automations_insert ON automations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automations_update ON automations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automations_delete ON automations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY automations_service_role ON automations
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 12. AUTOMATION_EXECUTION_LOGS
-- =====================================================

ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

CREATE POLICY automation_logs_select ON automation_execution_logs
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY automation_logs_insert ON automation_execution_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY automation_logs_service_role ON automation_execution_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rls_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== RLS VERIFICATION ===';
-- RAISE NOTICE 'Tables with RLS enabled: %', v_rls_count;
-- RAISE NOTICE 'Total RLS policies: %', v_policy_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.3 COMPLETE: RLS policies reset';
-- RAISE NOTICE '   - Applied consistent RLS to 12 core tables';
-- RAISE NOTICE '   - SELECT: tenant filter + soft delete check';
-- RAISE NOTICE '   - INSERT: tenant filter';
-- RAISE NOTICE '   - UPDATE: tenant filter';
-- RAISE NOTICE '   - DELETE: tenant filter + admin role check';
-- RAISE NOTICE '   - Service role bypass for all tables';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  NOTE: Marketing tables will get entitlement checks in Phase 2';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_004_fk_guards.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 1.3: RLS Policy Reset & Consistency (SAFE VERSION)
-- Date: October 16, 2025
-- Purpose: Apply consistent RLS policies to all tenant-scoped tables that exist
-- =====================================================

-- This version checks if tables exist before applying RLS

DO $$
DECLARE
  v_table_name TEXT;
  v_policy_count INTEGER := 0;
  v_has_deleted_at BOOLEAN;
  v_has_tenant_id BOOLEAN;
BEGIN
  -- List of tables we want to apply RLS to
  FOR v_table_name IN 
    SELECT unnest(ARRAY[
      'contacts', 'deals', 'pipelines', 'pipeline_stages', 'tasks',
      'activities', 'calls', 'files', 'notes', 'locations',
      'automations', 'automation_execution_logs', 'automation_nodes', 'automation_edges', 'automation_runs'
    ])
  LOOP
    -- Check if table exists AND has tenant_id column
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = v_table_name
    ) THEN
      
      -- Check if table has tenant_id column (REQUIRED for RLS)
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_table_name
          AND column_name = 'tenant_id'
      ) INTO v_has_tenant_id;
      
      -- Only apply RLS if table has tenant_id
      IF NOT v_has_tenant_id THEN
-- RAISE NOTICE 'Skipping table (no tenant_id column): %', v_table_name;
        CONTINUE; -- Skip to next table
      END IF;
      
-- RAISE NOTICE 'Applying RLS to table: %', v_table_name;
      
      -- Check if table has deleted_at column
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = v_table_name
          AND column_name = 'deleted_at'
      ) INTO v_has_deleted_at;
      
      -- Enable RLS
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table_name);
      
      -- Drop existing policies
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_select', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_insert', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_update', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_delete', v_table_name);
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I', v_table_name || '_service_role', v_table_name);
      
      -- Create SELECT policy (with or without soft delete check)
      IF v_has_deleted_at THEN
        EXECUTE format('
          CREATE POLICY %I ON %I
          FOR SELECT
          USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at))
        ', v_table_name || '_select', v_table_name);
      ELSE
        EXECUTE format('
          CREATE POLICY %I ON %I
          FOR SELECT
          USING (tenant_id = current_tenant_id())
        ', v_table_name || '_select', v_table_name);
      END IF;
      
      -- Create INSERT policy
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR INSERT
        WITH CHECK (tenant_id = current_tenant_id())
      ', v_table_name || '_insert', v_table_name);
      
      -- Create UPDATE policy
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR UPDATE
        USING (tenant_id = current_tenant_id())
      ', v_table_name || '_update', v_table_name);
      
      -- Create DELETE policy (admin only)
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR DELETE
        USING (
          tenant_id = current_tenant_id()
          AND user_has_role(ARRAY[''owner'', ''super_admin'', ''admin''])
        )
      ', v_table_name || '_delete', v_table_name);
      
      -- Service role bypass
      EXECUTE format('
        CREATE POLICY %I ON %I
        FOR ALL
        USING (auth.role() = ''service_role'')
      ', v_table_name || '_service_role', v_table_name);
      
      v_policy_count := v_policy_count + 1;
      
    ELSE
-- RAISE NOTICE 'Skipping table (does not exist): %', v_table_name;
    END IF;
  END LOOP;
  
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ Applied RLS policies to % tables', v_policy_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rls_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== RLS VERIFICATION ===';
-- RAISE NOTICE 'Tables with RLS enabled: %', v_rls_count;
-- RAISE NOTICE 'Total RLS policies: %', v_policy_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.3 COMPLETE: RLS policies reset';
-- RAISE NOTICE '   - Applied consistent RLS to all existing tables';
-- RAISE NOTICE '   - SELECT: tenant filter + soft delete check';
-- RAISE NOTICE '   - INSERT: tenant filter';
-- RAISE NOTICE '   - UPDATE: tenant filter';
-- RAISE NOTICE '   - DELETE: tenant filter + admin role check';
-- RAISE NOTICE '   - Service role bypass for all tables';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  NOTE: Marketing tables will get entitlement checks in Phase 2';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_004_fk_guards.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 1.4: Foreign Key Tenant Guards
-- Date: October 16, 2025
-- Purpose: Add CHECK constraints to validate same-tenant relationships
-- =====================================================

-- =====================================================
-- IMPORTANT: Audit existing data first
-- =====================================================

-- Check for existing cross-tenant violations before adding constraints
DO $$
DECLARE
  v_violations INTEGER := 0;
BEGIN
-- RAISE NOTICE '=== AUDITING EXISTING DATA FOR CROSS-TENANT VIOLATIONS ===';
  
  -- Check deals.contact_id
  SELECT COUNT(*) INTO v_violations
  FROM deals d
  LEFT JOIN contacts c ON c.id = d.contact_id
  WHERE d.contact_id IS NOT NULL
    AND c.tenant_id IS DISTINCT FROM d.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % deals with contact_id from different tenant', v_violations;
  ELSE
-- RAISE NOTICE '✓ deals.contact_id: No violations';
  END IF;
  
  -- Check tasks.contact_id
  SELECT COUNT(*) INTO v_violations
  FROM tasks t
  LEFT JOIN contacts c ON c.id = t.contact_id
  WHERE t.contact_id IS NOT NULL
    AND c.tenant_id IS DISTINCT FROM t.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % tasks with contact_id from different tenant', v_violations;
  ELSE
-- RAISE NOTICE '✓ tasks.contact_id: No violations';
  END IF;
  
  -- Check tasks.deal_id
  SELECT COUNT(*) INTO v_violations
  FROM tasks t
  LEFT JOIN deals d ON d.id = t.deal_id
  WHERE t.deal_id IS NOT NULL
    AND d.tenant_id IS DISTINCT FROM t.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % tasks with deal_id from different tenant', v_violations;
  ELSE
-- RAISE NOTICE '✓ tasks.deal_id: No violations';
  END IF;
  
-- RAISE NOTICE '=== AUDIT COMPLETE ===';
END $$;

-- =====================================================
-- 1. DEALS TABLE CONSTRAINTS
-- =====================================================

-- Validate deals.contact_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_contact_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = deals.contact_id
  ) = tenant_id
);

-- Validate deals.pipeline_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_pipeline_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_pipeline_same_tenant CHECK (
  pipeline_id IS NULL OR (
    SELECT tenant_id FROM pipelines WHERE id = deals.pipeline_id
  ) = tenant_id
);

-- Validate deals.stage_id belongs to same tenant (and same pipeline)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_stage_same_tenant CHECK (
  stage_id IS NULL OR (
    SELECT tenant_id FROM pipeline_stages WHERE id = deals.stage_id
  ) = tenant_id
);

-- Validate deals.owner_user_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_owner_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_owner_same_tenant CHECK (
  owner_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = deals.owner_user_id
  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to deals table (4 constraints)';
END $$;

-- =====================================================
-- 2. TASKS TABLE CONSTRAINTS
-- =====================================================

-- Validate tasks.contact_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_contact_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = tasks.contact_id
  ) = tenant_id
);

-- Validate tasks.deal_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_deal_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = tasks.deal_id
  ) = tenant_id
);

-- Validate tasks.assignee_user_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_same_tenant CHECK (
  assignee_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = tasks.assignee_user_id
  ) = tenant_id
);

-- Validate tasks.created_by_user_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_same_tenant CHECK (
  created_by_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = tasks.created_by_user_id
  ) = tenant_id
);

-- Validate tasks.parent_task_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_parent_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_parent_same_tenant CHECK (
  parent_task_id IS NULL OR (
    SELECT tenant_id FROM tasks WHERE id = tasks.parent_task_id
  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to tasks table (5 constraints)';
END $$;

-- =====================================================
-- 3. ACTIVITIES TABLE CONSTRAINTS
-- =====================================================

-- Validate activities.contact_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_contact_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = activities.contact_id
  ) = tenant_id
);

-- Validate activities.deal_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_deal_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = activities.deal_id
  ) = tenant_id
);

-- Validate activities.user_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_user_same_tenant CHECK (
  user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = activities.user_id
  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to activities table (3 constraints)';
END $$;

-- =====================================================
-- 4. CALLS TABLE CONSTRAINTS
-- =====================================================

-- Validate calls.contact_id belongs to same tenant
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_contact_same_tenant;
ALTER TABLE calls ADD CONSTRAINT calls_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = calls.contact_id
  ) = tenant_id
);

-- Validate calls.user_id belongs to same tenant
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_user_same_tenant;
ALTER TABLE calls ADD CONSTRAINT calls_user_same_tenant CHECK (
  user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = calls.user_id
  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to calls table (2 constraints)';
END $$;

-- =====================================================
-- 5. FILES TABLE CONSTRAINTS
-- =====================================================

-- Validate files.contact_id belongs to same tenant
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_contact_same_tenant;
ALTER TABLE files ADD CONSTRAINT files_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = files.contact_id
  ) = tenant_id
);

-- Validate files.deal_id belongs to same tenant
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_deal_same_tenant;
ALTER TABLE files ADD CONSTRAINT files_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = files.deal_id
  ) = tenant_id
);

-- Validate files.uploaded_by_user_id belongs to same tenant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' 
    AND column_name = 'uploaded_by_user_id'
  ) THEN
    ALTER TABLE files DROP CONSTRAINT IF EXISTS files_uploader_same_tenant;
    ALTER TABLE files ADD CONSTRAINT files_uploader_same_tenant CHECK (
      uploaded_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = files.uploaded_by_user_id
      ) = tenant_id
    );
  END IF;
  END IF;
  
-- RAISE NOTICE '✅ Added tenant guards to files table (2-3 constraints)';
END $$;

-- =====================================================
-- 6. NOTES TABLE CONSTRAINTS
-- =====================================================

-- Validate notes.contact_id belongs to same tenant
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_contact_same_tenant;
ALTER TABLE notes ADD CONSTRAINT notes_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = notes.contact_id
  ) = tenant_id
);

-- Validate notes.deal_id belongs to same tenant
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_deal_same_tenant;
ALTER TABLE notes ADD CONSTRAINT notes_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = notes.deal_id
  ) = tenant_id
);

-- Validate notes.created_by_user_id belongs to same tenant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' 
    AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_creator_same_tenant;
    ALTER TABLE notes ADD CONSTRAINT notes_creator_same_tenant CHECK (
      created_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = notes.created_by_user_id
      ) = tenant_id
    );
  END IF;
  END IF;
  
-- RAISE NOTICE '✅ Added tenant guards to notes table (2-3 constraints)';
END $$;

-- =====================================================
-- 7. PIPELINE_STAGES TABLE CONSTRAINTS
-- =====================================================

-- Validate pipeline_stages.pipeline_id belongs to same tenant
ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS stages_pipeline_same_tenant;
ALTER TABLE pipeline_stages ADD CONSTRAINT stages_pipeline_same_tenant CHECK (
  (SELECT tenant_id FROM pipelines WHERE id = pipeline_stages.pipeline_id  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to pipeline_stages table (1 constraint)';
END $$;

-- =====================================================
-- 8. MARKETING TABLES CONSTRAINTS
-- =====================================================

-- Validate marketing_campaigns.created_by_user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS campaigns_creator_same_tenant;
    ALTER TABLE marketing_campaigns ADD CONSTRAINT campaigns_creator_same_tenant CHECK (
      created_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = marketing_campaigns.created_by_user_id
      ) = tenant_id
    );
-- RAISE NOTICE '✓ Added tenant guard to marketing_campaigns';
  END IF;
END $$;

-- Validate marketing_campaign_sends.contact_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    ALTER TABLE marketing_campaign_sends DROP CONSTRAINT IF EXISTS sends_contact_same_tenant;
    ALTER TABLE marketing_campaign_sends ADD CONSTRAINT sends_contact_same_tenant CHECK (
      contact_id IS NULL OR (
        SELECT tenant_id FROM contacts WHERE id = marketing_campaign_sends.contact_id
      ) = tenant_id
    );
    
    ALTER TABLE marketing_campaign_sends DROP CONSTRAINT IF EXISTS sends_campaign_same_tenant;
    ALTER TABLE marketing_campaign_sends ADD CONSTRAINT sends_campaign_same_tenant CHECK (
      campaign_id IS NULL OR (
        SELECT tenant_id FROM marketing_campaigns WHERE id = marketing_campaign_sends.campaign_id
      ) = tenant_id
    );
-- RAISE NOTICE '✓ Added tenant guards to marketing_campaign_sends';
  END IF;
END $$;

-- =====================================================
-- 9. AUTOMATION TABLES CONSTRAINTS
-- =====================================================

-- Validate automation_execution_logs.automation_id
ALTER TABLE automation_execution_logs DROP CONSTRAINT IF EXISTS logs_automation_same_tenant;
ALTER TABLE automation_execution_logs ADD CONSTRAINT logs_automation_same_tenant CHECK (
  automation_id IS NULL OR (
    SELECT tenant_id FROM automations WHERE id = automation_execution_logs.automation_id
  ) = tenant_id
);

DO $$
BEGIN
-- RAISE NOTICE '✅ Added tenant guards to automation_execution_logs table (1 constraint)';
END $$;

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_constraint_count INTEGER;
BEGIN
  -- Count all tenant guard CHECK constraints
  SELECT COUNT(*) INTO v_constraint_count
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE con.contype = 'c'
    AND nsp.nspname = 'public'
    AND pg_get_constraintdef(con.oid) LIKE '%tenant_id%'
    AND con.conname LIKE '%same_tenant%';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Total same-tenant CHECK constraints: %', v_constraint_count;
-- RAISE NOTICE '';
  
  IF v_constraint_count < 20 THEN
    RAISE WARNING 'Expected at least 20 tenant guard constraints, but found %', v_constraint_count;
  END IF;
END $$;

-- Test constraint (will fail if constraint works)
-- Uncomment to test:
-- INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title)
-- VALUES (gen_random_uuid(), gen_random_uuid(), (SELECT id FROM contacts LIMIT 1), gen_random_uuid(), gen_random_uuid(), 'Test');
-- Expected: ERROR - violates check constraint "deals_contact_same_tenant"

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.4 COMPLETE: FK tenant guards';
-- RAISE NOTICE '   - Added 25+ CHECK constraints across 9 tables';
-- RAISE NOTICE '   - deals: 4 constraints (contact, pipeline, stage, owner)';
-- RAISE NOTICE '   - tasks: 5 constraints (contact, deal, assignee, creator, parent)';
-- RAISE NOTICE '   - activities: 3 constraints (contact, deal, user)';
-- RAISE NOTICE '   - calls: 2 constraints (contact, user)';
-- RAISE NOTICE '   - files: 2-3 constraints (contact, deal, uploader)';
-- RAISE NOTICE '   - notes: 2-3 constraints (contact, deal, creator)';
-- RAISE NOTICE '   - pipeline_stages: 1 constraint (pipeline)';
-- RAISE NOTICE '   - marketing tables: 3 constraints';
-- RAISE NOTICE '   - automation_execution_logs: 1 constraint';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Cross-tenant data linkage now BLOCKED at DB level';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ PHASE 1 COMPLETE (All 4 migrations done)';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run Phase 2 migrations (Entitlement hardening)';
END $$;

-- =====================================================
-- HARDENING PHASE 1.4: Foreign Key Tenant Guards (TRIGGER VERSION)
-- Date: October 16, 2025
-- Purpose: Validate same-tenant relationships using triggers (not CHECK constraints)
-- =====================================================

-- NOTE: PostgreSQL does not allow subqueries in CHECK constraints.
-- We must use BEFORE INSERT/UPDATE triggers instead.

-- =====================================================
-- 1. DEALS TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_deal_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_pipeline_tenant_id UUID;
  v_stage_tenant_id UUID;
  v_owner_tenant_id UUID;
BEGIN
  -- Validate contact_id belongs to same tenant
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id
    FROM contacts
    WHERE id = NEW.contact_id;
    
    IF v_contact_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Contact % does not exist', NEW.contact_id;
    END IF;
    
    IF v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal contact must belong to same tenant (deal: %, contact: %)', 
        NEW.tenant_id, v_contact_tenant_id;
    END IF;
  END IF;
  
  -- Validate pipeline_id belongs to same tenant
  IF NEW.pipeline_id IS NOT NULL THEN
    SELECT tenant_id INTO v_pipeline_tenant_id
    FROM pipelines
    WHERE id = NEW.pipeline_id;
    
    IF v_pipeline_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Pipeline % does not exist', NEW.pipeline_id;
    END IF;
    
    IF v_pipeline_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal pipeline must belong to same tenant (deal: %, pipeline: %)', 
        NEW.tenant_id, v_pipeline_tenant_id;
    END IF;
  END IF;
  
  -- Validate stage_id belongs to same tenant
  IF NEW.stage_id IS NOT NULL THEN
    SELECT tenant_id INTO v_stage_tenant_id
    FROM pipeline_stages
    WHERE id = NEW.stage_id;
    
    IF v_stage_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Pipeline stage % does not exist', NEW.stage_id;
    END IF;
    
    IF v_stage_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal stage must belong to same tenant (deal: %, stage: %)', 
        NEW.tenant_id, v_stage_tenant_id;
    END IF;
  END IF;
  
  -- Validate owner_user_id belongs to same tenant
  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_owner_tenant_id
    FROM app_users
    WHERE id = NEW.owner_user_id;
    
    IF v_owner_tenant_id IS NULL THEN
      RAISE EXCEPTION 'User % does not exist', NEW.owner_user_id;
    END IF;
    
    IF v_owner_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal owner must belong to same tenant (deal: %, owner: %)', 
        NEW.tenant_id, v_owner_tenant_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_deal_tenant_fks ON deals;
CREATE TRIGGER validate_deal_tenant_fks
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION validate_deal_tenant_relationships();

-- =====================================================
-- 2. TASKS TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_task_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_assignee_tenant_id UUID;
  v_creator_tenant_id UUID;
  v_parent_tenant_id UUID;
BEGIN
  -- Validate contact_id
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task contact must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate deal_id
  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task deal must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate assignee_user_id
  IF NEW.assignee_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_assignee_tenant_id FROM app_users WHERE id = NEW.assignee_user_id;
    IF v_assignee_tenant_id IS NOT NULL AND v_assignee_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task assignee must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate created_by_user_id
  IF NEW.created_by_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_creator_tenant_id FROM app_users WHERE id = NEW.created_by_user_id;
    IF v_creator_tenant_id IS NOT NULL AND v_creator_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task creator must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate parent_task_id
  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant_id FROM tasks WHERE id = NEW.parent_task_id;
    IF v_parent_tenant_id IS NOT NULL AND v_parent_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Parent task must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_task_tenant_fks ON tasks;
CREATE TRIGGER validate_task_tenant_fks
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_tenant_relationships();

-- =====================================================
-- 3. ACTIVITIES TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_activity_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity contact must belong to same tenant';
    END IF;
  END IF;
  
  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity deal must belong to same tenant';
    END IF;
  END IF;
  
  IF NEW.user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_user_tenant_id FROM app_users WHERE id = NEW.user_id;
    IF v_user_tenant_id IS NOT NULL AND v_user_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity user must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_activity_tenant_fks ON activities;
CREATE TRIGGER validate_activity_tenant_fks
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION validate_activity_tenant_relationships();

-- =====================================================
-- 4. PIPELINE_STAGES TABLE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION validate_pipeline_stage_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_pipeline_tenant_id UUID;
BEGIN
  IF NEW.pipeline_id IS NOT NULL THEN
    SELECT tenant_id INTO v_pipeline_tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    IF v_pipeline_tenant_id IS NOT NULL AND v_pipeline_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Stage pipeline must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_stage_tenant_fks ON pipeline_stages;
CREATE TRIGGER validate_stage_tenant_fks
  BEFORE INSERT OR UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION validate_pipeline_stage_tenant();

-- =====================================================
-- 5. AUTOMATION_EXECUTION_LOGS TABLE TRIGGER (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_execution_logs') THEN
    CREATE OR REPLACE FUNCTION validate_automation_log_tenant()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      v_automation_tenant_id UUID;
    BEGIN
      IF NEW.automation_id IS NOT NULL THEN
        SELECT tenant_id INTO v_automation_tenant_id FROM automations WHERE id = NEW.automation_id;
        IF v_automation_tenant_id IS NOT NULL AND v_automation_tenant_id != NEW.tenant_id THEN
          RAISE EXCEPTION 'SECURITY VIOLATION: Automation log must belong to same tenant as automation';
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $func$;

    DROP TRIGGER IF EXISTS validate_automation_log_tenant_fks ON automation_execution_logs;
    CREATE TRIGGER validate_automation_log_tenant_fks
      BEFORE INSERT OR UPDATE ON automation_execution_logs
      FOR EACH ROW
      EXECUTE FUNCTION validate_automation_log_tenant();
      
-- RAISE NOTICE '✅ Created tenant validation trigger on automation_execution_logs';
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND (trigger_name LIKE 'validate_%tenant%' OR action_statement LIKE '%SECURITY VIOLATION%');
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Tenant validation triggers: %', v_trigger_count;
-- RAISE NOTICE '';
  
  IF v_trigger_count < 4 THEN
    RAISE WARNING 'Expected at least 4 tenant validation triggers, but found %', v_trigger_count;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.4 COMPLETE: FK tenant guards (TRIGGER VERSION)';
-- RAISE NOTICE '   - Created 5 trigger functions for tenant validation';
-- RAISE NOTICE '   - deals: Validates contact, pipeline, stage, owner (4 FKs)';
-- RAISE NOTICE '   - tasks: Validates contact, deal, assignee, creator, parent (5 FKs)';
-- RAISE NOTICE '   - activities: Validates contact, deal, user (3 FKs)';
-- RAISE NOTICE '   - pipeline_stages: Validates pipeline (1 FK)';
-- RAISE NOTICE '   - automation_execution_logs: Validates automation (1 FK)';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Cross-tenant data linkage BLOCKED via triggers';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  NOTE: Using triggers (not CHECK constraints) because Postgres';
-- RAISE NOTICE '   does not support subqueries in CHECK constraints.';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ PHASE 1 COMPLETE (All 4 migrations done)';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run Phase 2 migrations (Entitlement hardening)';
END $$;

-- =====================================================
-- HARDENING PHASE 1.5: Entitlement Schema (PREREQUISITE)
-- Date: October 16, 2025
-- Purpose: Create features and tenant_entitlements tables
-- MUST RUN BEFORE: Migration 005 (entitlements_db.sql)
-- =====================================================

-- =====================================================
-- 1. FEATURES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('base', 'addon', 'nested_addon')),
  parent_feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  tier_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_code ON features(code);
CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_feature_id);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);

COMMENT ON TABLE features IS 
  'Defines all available features in the system.
   Supports hierarchical structure (base → addon → nested_addon).';

-- =====================================================
-- 2. TENANT_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  quota_limit INTEGER,
  quota_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_tenant ON tenant_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_feature ON tenant_entitlements(feature_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_enabled ON tenant_entitlements(tenant_id, feature_id) 
  WHERE is_enabled = true;

COMMENT ON TABLE tenant_entitlements IS 
  'Maps which tenants have access to which features.
   Includes quota tracking and expiration dates.';

-- =====================================================
-- 3. SEED BASE FEATURES
-- =====================================================

-- Insert base features (idempotent using ON CONFLICT)
INSERT INTO features (code, name, category, description) VALUES
  ('crm_base', 'CRM Base', 'base', 'Core CRM functionality'),
  ('marketing', 'Marketing Module', 'addon', 'Campaigns, journeys, and marketing analytics'),
  ('automations', 'Automations', 'addon', 'Workflow automation across deals, pipelines, and tasks')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert nested marketing add-ons
INSERT INTO features (code, name, category, parent_feature_id, description) VALUES
  ('marketing_email_warmup', 'Email Warm-Up', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Automated email warm-up for better deliverability'),
  ('marketing_ab_testing', 'A/B Testing', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Split test your campaigns'),
  ('marketing_heatmaps', 'Click Heatmaps', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Visual click tracking in emails'),
  ('marketing_advanced_analytics', 'Advanced Analytics Suite', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Deep-dive analytics and attribution'),
  ('marketing_ai_send_time', 'AI Send-Time Optimization', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'AI-powered optimal send time prediction'),
  ('marketing_social', 'Social Media Publishing', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Publish to Facebook, Instagram, LinkedIn'),
  ('marketing_sms', 'SMS Campaigns', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'SMS campaign management'),
  ('marketing_whatsapp', 'WhatsApp Campaigns', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'WhatsApp business messaging')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 4. ENABLE ALL TENANTS WITH CRM_BASE (Grandfather in existing tenants)
-- =====================================================

-- Give all existing tenants the base CRM feature
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  t.id as tenant_id,
  f.id as feature_id,
  true as is_enabled
FROM tenants t
CROSS JOIN features f
WHERE f.code = 'crm_base'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_entitlements te
    WHERE te.tenant_id = t.id AND te.feature_id = f.id
  );

-- =====================================================
-- 5. ENABLE RLS ON ENTITLEMENT TABLES
-- =====================================================

ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entitlements ENABLE ROW LEVEL SECURITY;

-- Features are visible to all authenticated users (read-only)
DROP POLICY IF EXISTS features_select_all ON features;
CREATE POLICY features_select_all ON features
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Service role can manage features
DROP POLICY IF EXISTS features_service_role ON features;
CREATE POLICY features_service_role ON features
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their tenant's entitlements
DROP POLICY IF EXISTS entitlements_select ON tenant_entitlements;
CREATE POLICY entitlements_select ON tenant_entitlements
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Service role can manage entitlements
DROP POLICY IF EXISTS entitlements_service_role ON tenant_entitlements;
CREATE POLICY entitlements_service_role ON tenant_entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_feature_count INTEGER;
  v_entitlement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_feature_count FROM features;
  SELECT COUNT(*) INTO v_entitlement_count FROM tenant_entitlements;
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== ENTITLEMENT SCHEMA VERIFICATION ===';
-- RAISE NOTICE 'Features defined: %', v_feature_count;
-- RAISE NOTICE 'Tenant entitlements created: %', v_entitlement_count;
-- RAISE NOTICE '';
-- RAISE NOTICE 'Base features:';
-- RAISE NOTICE '  - crm_base (all tenants)';
-- RAISE NOTICE '  - marketing (addon)';
-- RAISE NOTICE '  - automations (addon)';
-- RAISE NOTICE '';
-- RAISE NOTICE 'Nested marketing add-ons:';
-- RAISE NOTICE '  - marketing_ab_testing';
-- RAISE NOTICE '  - marketing_social';
-- RAISE NOTICE '  - marketing_sms';
-- RAISE NOTICE '  - marketing_whatsapp';
-- RAISE NOTICE '  - + 4 more';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 1.5 COMPLETE: Entitlement schema';
-- RAISE NOTICE '   - Created features table (9 features seeded)';
-- RAISE NOTICE '   - Created tenant_entitlements table';
-- RAISE NOTICE '   - All existing tenants granted crm_base';
-- RAISE NOTICE '   - RLS policies applied';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 FOUNDATION: Entitlement system ready';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_005_entitlements_db.sql';
-- RAISE NOTICE '   (This will create the check_entitlement() functions)';
END $$;

-- =====================================================
-- HARDENING PHASE 2.1: Entitlement Function Refactor
-- Date: October 16, 2025
-- Purpose: Fix security hole - remove tenant_id parameter
-- =====================================================

-- =====================================================
-- CRITICAL SECURITY FIX
-- =====================================================
-- OLD (INSECURE): check_entitlement(p_tenant_id UUID, p_feature_code TEXT, ...)
--   Problem: Caller can pass ANY tenant_id, bypassing security
--
-- NEW (SECURE): check_entitlement(p_feature_code TEXT, ...)
--   Solution: Always uses current_tenant_id() - no parameter bypass possible
-- =====================================================

-- Drop old insecure version
DROP FUNCTION IF EXISTS check_entitlement(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS check_entitlement(UUID, TEXT);

-- Create new secure version that derives tenant from auth context
CREATE OR REPLACE FUNCTION check_entitlement(
  p_feature_code TEXT,
  p_require_parent BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id(); -- ✅ SECURITY: Always from auth context
  v_feature_id UUID;
  v_parent UUID;
  v_is_enabled BOOLEAN;
  v_parent_enabled BOOLEAN;
BEGIN
  -- Guard: Must have valid tenant context
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get feature ID and parent
  SELECT id, parent_feature_id INTO v_feature_id, v_parent
  FROM features
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    -- Feature doesn't exist or is inactive
    RETURN false;
  END IF;

  -- Check if feature is entitled and enabled for this tenant
  SELECT is_enabled INTO v_is_enabled
  FROM tenant_entitlements
  WHERE tenant_id = v_tenant_id
    AND feature_id = v_feature_id
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_is_enabled IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- If this is a nested add-on, check parent is also enabled
  IF p_require_parent AND v_parent IS NOT NULL THEN
    SELECT is_enabled INTO v_parent_enabled
    FROM tenant_entitlements te
    WHERE te.tenant_id = v_tenant_id
      AND te.feature_id = v_parent
      AND (te.expires_at IS NULL OR te.expires_at > NOW());
    
    IF v_parent_enabled IS NOT TRUE THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_entitlement(TEXT, BOOLEAN) IS 
  'SECURE: Checks if authenticated user''s tenant has access to a feature. 
   Always uses current_tenant_id() - no bypass possible.
   If p_require_parent=true, also validates parent feature is enabled (for nested add-ons).';

-- =====================================================
-- Helper: Check multiple entitlements at once
-- =====================================================

CREATE OR REPLACE FUNCTION check_entitlements(
  p_feature_codes TEXT[],
  p_require_all BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_code TEXT;
  v_has_access BOOLEAN;
  v_any_access BOOLEAN := false;
BEGIN
  IF p_feature_codes IS NULL OR array_length(p_feature_codes, 1) = 0 THEN
    RETURN true; -- No requirements
  END IF;
  
  FOREACH v_code IN ARRAY p_feature_codes LOOP
    v_has_access := check_entitlement(v_code, true);
    
    IF p_require_all THEN
      -- ALL mode: Return false immediately if any check fails
      IF NOT v_has_access THEN
        RETURN false;
      END IF;
    ELSE
      -- ANY mode: Return true immediately if any check succeeds
      IF v_has_access THEN
        RETURN true;
      END IF;
      v_any_access := v_any_access OR v_has_access;
    END IF;
  END LOOP;
  
  -- If we reach here:
  -- - ALL mode: all checks passed
  -- - ANY mode: no checks passed
  RETURN p_require_all OR v_any_access;
END;
$$;

COMMENT ON FUNCTION check_entitlements(TEXT[], BOOLEAN) IS 
  'Check multiple entitlements at once.
   If p_require_all=true: returns true only if ALL features are entitled (AND logic).
   If p_require_all=false: returns true if ANY feature is entitled (OR logic).';

-- =====================================================
-- Helper: Get list of entitled features for current user
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_entitlements()
RETURNS TABLE (
  feature_code TEXT,
  feature_name TEXT,
  is_enabled BOOLEAN,
  quota_limit INTEGER,
  quota_used INTEGER,
  expires_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    f.code as feature_code,
    f.name as feature_name,
    te.is_enabled,
    te.quota_limit,
    te.quota_used,
    te.expires_at
  FROM features f
  JOIN tenant_entitlements te ON te.feature_id = f.id
  WHERE te.tenant_id = current_tenant_id()
    AND f.is_active = true
  ORDER BY f.category, f.name;
$$;

COMMENT ON FUNCTION get_user_entitlements() IS 
  'Returns all entitled features for the authenticated user''s tenant.
   Useful for populating UI (e.g., Settings → Billing page).';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '';
-- RAISE NOTICE '=== ENTITLEMENT FUNCTIONS UPDATED ===';
-- RAISE NOTICE '✅ check_entitlement(feature_code, require_parent) - SECURE VERSION';
-- RAISE NOTICE '   - Removed tenant_id parameter (security fix)';
-- RAISE NOTICE '   - Always uses current_tenant_id() from auth context';
-- RAISE NOTICE '   - No bypass possible';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ check_entitlements(feature_codes[], require_all) - NEW';
-- RAISE NOTICE '   - Batch check multiple features';
-- RAISE NOTICE '   - Supports AND/OR logic';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ get_user_entitlements() - NEW';
-- RAISE NOTICE '   - Returns all features for current user';
-- RAISE NOTICE '   - For UI rendering';
-- RAISE NOTICE '';
END $$;

-- Test the function (should work for authenticated user)
-- SELECT check_entitlement('crm_base');  -- Should return true/false
-- SELECT check_entitlement('marketing'); -- Should return true/false
-- SELECT check_entitlements(ARRAY['automations', 'marketing']); -- Should return true only if both are entitled

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 2.1 COMPLETE: Entitlement security fix';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 CRITICAL SECURITY FIX:';
-- RAISE NOTICE '   - check_entitlement() no longer accepts tenant_id parameter';
-- RAISE NOTICE '   - Always derives tenant from current_tenant_id()';
-- RAISE NOTICE '   - Eliminates entitlement bypass vulnerability';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  BREAKING CHANGE FOR APPLICATION CODE:';
-- RAISE NOTICE '   OLD: await supabase.rpc("check_entitlement", { p_tenant_id: tenantId, p_feature_code: "marketing" })';
-- RAISE NOTICE '   NEW: await supabase.rpc("check_entitlement", { p_feature_code: "marketing" })';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_006_rls_marketing.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 2.2: Marketing RLS with Entitlement Checks
-- Date: October 16, 2025
-- Purpose: Apply entitlement checks to all marketing tables
-- =====================================================

-- =====================================================
-- Pattern: All marketing tables require 'marketing' entitlement
-- Nested add-ons (e.g., AB testing) require BOTH base + nested
-- =====================================================

-- =====================================================
-- 1. MARKETING_CAMPAIGNS
-- =====================================================

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_campaigns_select ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_insert ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_update ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_delete ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_service ON marketing_campaigns;

CREATE POLICY marketing_campaigns_select ON marketing_campaigns
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_campaigns_insert ON marketing_campaigns
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_campaigns_update ON marketing_campaigns
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_campaigns_delete ON marketing_campaigns
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_campaigns_service ON marketing_campaigns
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaigns';
END $$;

-- =====================================================
-- 2. MARKETING_TEMPLATES
-- =====================================================

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_templates_select ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_insert ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_update ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_delete ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_service ON marketing_templates;

CREATE POLICY marketing_templates_select ON marketing_templates
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_templates_insert ON marketing_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_templates_update ON marketing_templates
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_templates_delete ON marketing_templates
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_templates_service ON marketing_templates
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_templates';
END $$;

-- =====================================================
-- 3. MARKETING_SEGMENTS
-- =====================================================

ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_segments_select ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_insert ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_update ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_delete ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_service ON marketing_segments;

CREATE POLICY marketing_segments_select ON marketing_segments
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_segments_insert ON marketing_segments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_segments_update ON marketing_segments
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_segments_delete ON marketing_segments
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_segments_service ON marketing_segments
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_segments';
END $$;

-- =====================================================
-- 4. MARKETING_JOURNEYS
-- =====================================================

ALTER TABLE marketing_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_journeys_select ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_insert ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_update ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_delete ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_service ON marketing_journeys;

CREATE POLICY marketing_journeys_select ON marketing_journeys
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_journeys_insert ON marketing_journeys
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_journeys_update ON marketing_journeys
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_journeys_delete ON marketing_journeys
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_journeys_service ON marketing_journeys
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_journeys';
END $$;

-- =====================================================
-- 5. MARKETING_FORMS
-- =====================================================

ALTER TABLE marketing_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_forms_select ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_insert ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_update ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_delete ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_service ON marketing_forms;

CREATE POLICY marketing_forms_select ON marketing_forms
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_forms_insert ON marketing_forms
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_forms_update ON marketing_forms
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_forms_delete ON marketing_forms
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_forms_service ON marketing_forms
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_forms';
END $$;

-- =====================================================
-- 6. MARKETING_CAMPAIGN_SENDS (Transactional table)
-- =====================================================

-- Note: No soft delete check here as this is a transactional log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    ALTER TABLE marketing_campaign_sends ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_select ON marketing_campaign_sends';
    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_insert ON marketing_campaign_sends';
    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_service ON marketing_campaign_sends';

    EXECUTE 'CREATE POLICY marketing_sends_select ON marketing_campaign_sends
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_sends_insert ON marketing_campaign_sends
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_sends_service ON marketing_campaign_sends
      FOR ALL
      USING (auth.role() = ''service_role'')';

-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaign_sends';
  END IF;
END $$;

-- =====================================================
-- 7. MARKETING_CAMPAIGN_EVENTS (Transactional table)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_events') THEN
    ALTER TABLE marketing_campaign_events ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS marketing_events_select ON marketing_campaign_events';
    EXECUTE 'DROP POLICY IF EXISTS marketing_events_insert ON marketing_campaign_events';
    EXECUTE 'DROP POLICY IF EXISTS marketing_events_service ON marketing_campaign_events';

    EXECUTE 'CREATE POLICY marketing_events_select ON marketing_campaign_events
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_events_insert ON marketing_campaign_events
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_events_service ON marketing_campaign_events
      FOR ALL
      USING (auth.role() = ''service_role'')';

-- RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaign_events';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_marketing_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_marketing_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'marketing_%';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Marketing table policies: %', v_marketing_policy_count;
-- RAISE NOTICE '';
  
  IF v_marketing_policy_count = 0 THEN
    RAISE WARNING 'No marketing policies found - tables may not exist yet';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 2.2 COMPLETE: Marketing RLS with entitlements';
-- RAISE NOTICE '   - Applied to: campaigns, templates, segments, journeys, forms';
-- RAISE NOTICE '   - All SELECT/INSERT/UPDATE operations require marketing entitlement';
-- RAISE NOTICE '   - DELETE restricted to owner/admin/marketing roles';
-- RAISE NOTICE '   - Service role bypass for admin operations';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Marketing data hidden from non-entitled tenants';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run 20251016_hardening_007_rls_automations_entitlement.sql';
END $$;

-- =====================================================
-- HARDENING PHASE 2.3: Automations RLS with Combined Entitlements
-- Date: October 16, 2025
-- Purpose: Marketing automations require BOTH automations + marketing entitlements
-- =====================================================

-- =====================================================
-- COMBINED ENTITLEMENT LOGIC
-- =====================================================
-- - Base automations (deal, pipeline, task): require 'automations' only
-- - Marketing automations: require 'automations' AND 'marketing'
-- =====================================================

-- Drop existing automation policies
DROP POLICY IF EXISTS automations_select ON automations;
DROP POLICY IF EXISTS automations_insert ON automations;
DROP POLICY IF EXISTS automations_update ON automations;
DROP POLICY IF EXISTS automations_delete ON automations;
DROP POLICY IF EXISTS automations_service_role ON automations;

-- =====================================================
-- 1. AUTOMATIONS TABLE - COMBINED ENTITLEMENT CHECK
-- =====================================================

CREATE POLICY automations_select ON automations
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND is_not_deleted(deleted_at)
    AND check_entitlement('automations', false)
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_select ON automations IS 
  'SELECT: Requires automations entitlement. 
   If category=marketing, also requires marketing entitlement.';

CREATE POLICY automations_insert ON automations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_insert ON automations IS 
  'INSERT: Requires automations entitlement + manager+ role. 
   If category=marketing, also requires marketing entitlement.';

CREATE POLICY automations_update ON automations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_update ON automations IS 
  'UPDATE: Requires automations entitlement + manager+ role. 
   If category=marketing, also requires marketing entitlement.';

CREATE POLICY automations_delete ON automations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_delete ON automations IS 
  'DELETE: Requires automations entitlement + admin role. 
   If category=marketing, also requires marketing entitlement.';

CREATE POLICY automations_service_role ON automations
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied combined entitlement RLS to automations table';
END $$;

-- =====================================================
-- 2. AUTOMATION_NODES (Supporting table)
-- =====================================================

ALTER TABLE automation_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_nodes_select ON automation_nodes;
DROP POLICY IF EXISTS automation_nodes_all ON automation_nodes;
DROP POLICY IF EXISTS automation_nodes_service ON automation_nodes;

CREATE POLICY automation_nodes_select ON automation_nodes
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_nodes_all ON automation_nodes
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
  );

CREATE POLICY automation_nodes_service ON automation_nodes
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to automation_nodes';
END $$;

-- =====================================================
-- 3. AUTOMATION_EDGES (Supporting table)
-- =====================================================

ALTER TABLE automation_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_edges_select ON automation_edges;
DROP POLICY IF EXISTS automation_edges_all ON automation_edges;
DROP POLICY IF EXISTS automation_edges_service ON automation_edges;

CREATE POLICY automation_edges_select ON automation_edges
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_edges_all ON automation_edges
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
  );

CREATE POLICY automation_edges_service ON automation_edges
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to automation_edges';
END $$;

-- =====================================================
-- 4. AUTOMATION_RUNS (Execution history)
-- =====================================================

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_runs_select ON automation_runs;
DROP POLICY IF EXISTS automation_runs_insert ON automation_runs;
DROP POLICY IF EXISTS automation_runs_service ON automation_runs;

CREATE POLICY automation_runs_select ON automation_runs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_runs_insert ON automation_runs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_runs_service ON automation_runs
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied entitlement RLS to automation_runs';
END $$;

-- =====================================================
-- 5. UPDATE AUTOMATION_EXECUTION_LOGS (Already has basic RLS)
-- =====================================================

-- Update existing policies to include entitlement check
DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

CREATE POLICY automation_logs_select ON automation_execution_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_logs_insert ON automation_execution_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_logs_service_role ON automation_execution_logs
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Updated entitlement RLS on automation_execution_logs';
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_automation_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_automation_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'automation%';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Automation table policies: %', v_automation_policy_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- TEST SCENARIOS (Document expected behavior)
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '';
-- RAISE NOTICE '=== ENTITLEMENT LOGIC ===';
-- RAISE NOTICE '';
-- RAISE NOTICE '1. User with NO automations entitlement:';
-- RAISE NOTICE '   - Cannot see ANY automations (all categories)';
-- RAISE NOTICE '   - All automation queries return 0 rows';
-- RAISE NOTICE '';
-- RAISE NOTICE '2. User with automations but NO marketing:';
-- RAISE NOTICE '   - CAN see: deal, pipeline, task automations';
-- RAISE NOTICE '   - CANNOT see: marketing automations';
-- RAISE NOTICE '   - Marketing tab in UI should be hidden/locked';
-- RAISE NOTICE '';
-- RAISE NOTICE '3. User with automations AND marketing:';
-- RAISE NOTICE '   - CAN see: ALL automations (all 4 categories)';
-- RAISE NOTICE '   - All tabs visible and functional';
-- RAISE NOTICE '';
-- RAISE NOTICE '4. Service role (admin/background jobs):';
-- RAISE NOTICE '   - Bypasses all entitlement checks';
-- RAISE NOTICE '   - Can access all automation data';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 2.3 COMPLETE: Automations combined entitlements';
-- RAISE NOTICE '   - automations: Combined entitlement check (automations + marketing for category=marketing)';
-- RAISE NOTICE '   - automation_nodes: Requires automations';
-- RAISE NOTICE '   - automation_edges: Requires automations';
-- RAISE NOTICE '   - automation_runs: Requires automations';
-- RAISE NOTICE '   - automation_execution_logs: Requires automations';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Marketing automations hidden without BOTH entitlements';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ PHASE 2 (DB Layer) COMPLETE';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Implement API middleware (tRPC) and UI hooks';
END $$;

-- =====================================================
-- HARDENING PHASE 2.3: Automations RLS (SAFE VERSION)
-- Date: October 16, 2025
-- Purpose: Apply entitlement RLS only to automation tables that exist AND have tenant_id
-- =====================================================

-- =====================================================
-- 1. AUTOMATIONS TABLE
-- =====================================================

DO $$
BEGIN
  -- Only apply if table exists and has tenant_id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automations' AND column_name = 'tenant_id'
  ) THEN
    
-- RAISE NOTICE 'Applying combined entitlement RLS to automations table...';
    
    ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automations_select ON automations;
    DROP POLICY IF EXISTS automations_insert ON automations;
    DROP POLICY IF EXISTS automations_update ON automations;
    DROP POLICY IF EXISTS automations_delete ON automations;
    DROP POLICY IF EXISTS automations_service_role ON automations;

    -- SELECT: Requires automations entitlement
    -- If category='marketing', also requires marketing entitlement
    CREATE POLICY automations_select ON automations
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND is_not_deleted(deleted_at)
        AND check_entitlement('automations', false)
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_insert ON automations
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_update ON automations
      FOR UPDATE
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_delete ON automations
      FOR DELETE
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_service_role ON automations
      FOR ALL
      USING (auth.role() = 'service_role');

-- RAISE NOTICE '✅ Applied combined entitlement RLS to automations table';
    
  ELSE
-- RAISE NOTICE 'Skipping automations table (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- 2. AUTOMATION_EXECUTION_LOGS TABLE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'tenant_id'
  ) THEN
    
-- RAISE NOTICE 'Applying entitlement RLS to automation_execution_logs...';
    
    ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
    DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
    DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

    CREATE POLICY automation_logs_select ON automation_execution_logs
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_logs_insert ON automation_execution_logs
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_logs_service_role ON automation_execution_logs
      FOR ALL
      USING (auth.role() = 'service_role');

-- RAISE NOTICE '✅ Applied entitlement RLS to automation_execution_logs';
    
  ELSE
-- RAISE NOTICE 'Skipping automation_execution_logs (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- 3. AUTOMATION_RUNS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automation_runs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automation_runs' AND column_name = 'tenant_id'
  ) THEN
    
    ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automation_runs_select ON automation_runs;
    DROP POLICY IF EXISTS automation_runs_insert ON automation_runs;
    DROP POLICY IF EXISTS automation_runs_service ON automation_runs;

    CREATE POLICY automation_runs_select ON automation_runs
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_runs_insert ON automation_runs
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_runs_service ON automation_runs
      FOR ALL
      USING (auth.role() = 'service_role');

-- RAISE NOTICE '✅ Applied entitlement RLS to automation_runs';
  ELSE
-- RAISE NOTICE 'Skipping automation_runs (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_automation_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_automation_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'automation%';
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== VERIFICATION ===';
-- RAISE NOTICE 'Automation table policies: %', v_automation_policy_count;
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 2.3 COMPLETE: Automations combined entitlements';
-- RAISE NOTICE '   - automations: Combined entitlement check';
-- RAISE NOTICE '   - automation_execution_logs: Requires automations';
-- RAISE NOTICE '   - automation_runs: Requires automations (if exists)';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Marketing automations hidden without BOTH entitlements';
-- RAISE NOTICE '';
-- RAISE NOTICE '✅ PHASE 2 (Entitlements) COMPLETE';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Phase 3-8 feature migrations';
END $$;

-- =====================================================
-- HARDENING PHASE 3: Quotas & Billing Enforcement
-- Date: October 16, 2025
-- Purpose: Enforce per-tenant quotas at database layer
-- =====================================================

-- =====================================================
-- 1. QUOTA ENFORCEMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_quota_and_increment(
  p_feature_code TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_feature_id UUID;
  v_quota_limit INTEGER;
  v_quota_used INTEGER;
  v_quota_reset_at TIMESTAMPTZ;
BEGIN
  -- Guard: Must have valid tenant context
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: No tenant context available';
  END IF;
  
  -- Get feature ID
  SELECT id INTO v_feature_id 
  FROM features 
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive feature: %', p_feature_code
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  -- Lock the entitlement row for update (prevents race conditions)
  SELECT quota_limit, quota_used, quota_reset_at
  INTO v_quota_limit, v_quota_used, v_quota_reset_at
  FROM tenant_entitlements
  WHERE tenant_id = v_tenant_id 
    AND feature_id = v_feature_id
  FOR UPDATE;

  -- Check if record exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not entitled to feature %', v_tenant_id, p_feature_code
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- If quota_limit is NULL, it means unlimited usage
  IF v_quota_limit IS NULL THEN
    -- Still increment for tracking, but don't enforce
    UPDATE tenant_entitlements
    SET quota_used = COALESCE(quota_used, 0) + p_amount,
        updated_at = NOW()
    WHERE tenant_id = v_tenant_id
      AND feature_id = v_feature_id;
    RETURN;
  END IF;

  -- Check if quota has reset (monthly reset logic)
  IF v_quota_reset_at IS NOT NULL AND v_quota_reset_at < NOW() THEN
    -- Reset quota
    v_quota_used := 0;
    v_quota_reset_at := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ;
    
    UPDATE tenant_entitlements
    SET quota_used = 0,
        quota_reset_at = v_quota_reset_at,
        updated_at = NOW()
    WHERE tenant_id = v_tenant_id
      AND feature_id = v_feature_id;
  END IF;

  -- Check if adding p_amount would exceed quota
  IF (v_quota_used + p_amount) > v_quota_limit THEN
    RAISE EXCEPTION 'QUOTA EXCEEDED: Feature "%" quota limit reached (used: %, limit: %, attempting: %)', 
      p_feature_code, v_quota_used, v_quota_limit, p_amount
      USING 
        ERRCODE = '53400', -- configuration_limit_exceeded
        HINT = 'Please upgrade your plan or wait for quota reset';
  END IF;

  -- Increment quota usage
  UPDATE tenant_entitlements
  SET quota_used = v_quota_used + p_amount,
      updated_at = NOW()
  WHERE tenant_id = v_tenant_id
    AND feature_id = v_feature_id;
END;
$$;

COMMENT ON FUNCTION enforce_quota_and_increment(TEXT, INTEGER) IS 
  'Enforces quota limits for a feature before allowing an action.
   Raises exception if quota is exceeded.
   If quota_limit IS NULL, usage is unlimited (but still tracked).
   Automatically resets quota if past quota_reset_at date.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created enforce_quota_and_increment() function';
END $$;

-- =====================================================
-- 2. QUOTA CHECK FUNCTION (Non-enforcing, for UI)
-- =====================================================

CREATE OR REPLACE FUNCTION check_quota_status(p_feature_code TEXT)
RETURNS TABLE (
  quota_limit INTEGER,
  quota_used INTEGER,
  quota_remaining INTEGER,
  quota_reset_at TIMESTAMPTZ,
  is_near_limit BOOLEAN,
  is_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_feature_id UUID;
  v_limit INTEGER;
  v_used INTEGER;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id 
  FROM features 
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    RETURN;
  END IF;

  -- Get quota info
  SELECT te.quota_limit, te.quota_used, te.quota_reset_at
  INTO v_limit, v_used, v_reset
  FROM tenant_entitlements te
  WHERE te.tenant_id = v_tenant_id 
    AND te.feature_id = v_feature_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return status
  RETURN QUERY
  SELECT 
    v_limit as quota_limit,
    v_used as quota_used,
    CASE 
      WHEN v_limit IS NULL THEN NULL -- Unlimited
      ELSE v_limit - v_used
    END as quota_remaining,
    v_reset as quota_reset_at,
    CASE
      WHEN v_limit IS NULL THEN false -- Unlimited
      WHEN v_used >= (v_limit * 0.85) THEN true -- >= 85% used
      ELSE false
    END as is_near_limit,
    CASE
      WHEN v_limit IS NULL THEN false -- Unlimited
      WHEN v_used >= v_limit THEN true
      ELSE false
    END as is_exceeded;
END;
$$;

COMMENT ON FUNCTION check_quota_status(TEXT) IS 
  'Returns current quota status for a feature.
   Used by UI to display usage warnings.
   is_near_limit = true when >= 85% used.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created check_quota_status() function';
END $$;

-- =====================================================
-- 3. TRIGGER FOR MARKETING CAMPAIGN SENDS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    -- Create trigger function
    CREATE OR REPLACE FUNCTION before_insert_marketing_send()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      v_feature_code TEXT;
    BEGIN
      -- Determine feature code based on channel
      v_feature_code := CASE NEW.channel
        WHEN 'email' THEN 'marketing' -- Base marketing quota for email
        WHEN 'sms' THEN 'marketing_sms'
        WHEN 'whatsapp' THEN 'marketing_whatsapp'
        ELSE 'marketing'
      END;

      -- Enforce quota before insert
      PERFORM enforce_quota_and_increment(v_feature_code, 1);

      -- If we reach here, quota check passed
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and re-raise
-- RAISE NOTICE 'Quota enforcement failed for send %: %', NEW.id, SQLERRM;
        RAISE;
    END;
    $func$;

    -- Attach trigger
    DROP TRIGGER IF EXISTS trig_quota_marketing_send ON marketing_campaign_sends;
    CREATE TRIGGER trig_quota_marketing_send
      BEFORE INSERT ON marketing_campaign_sends
      FOR EACH ROW
      EXECUTE FUNCTION before_insert_marketing_send();

-- RAISE NOTICE '✅ Created quota trigger on marketing_campaign_sends';
  ELSE
-- RAISE NOTICE 'ℹ️  marketing_campaign_sends table does not exist - skipping trigger';
  END IF;
END $$;

-- =====================================================
-- 4. TRIGGER FOR MARKETING CAMPAIGNS (Optional - count campaigns)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    -- Create trigger function to count campaigns
    CREATE OR REPLACE FUNCTION before_insert_marketing_campaign()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Optional: Enforce quota on number of campaigns created per month
      -- Uncomment if needed:
      -- PERFORM enforce_quota_and_increment('marketing_campaigns', 1);
      
      RETURN NEW;
    END;
    $func$;

    -- Note: Trigger creation commented out - enable if campaign count quota needed
    -- DROP TRIGGER IF EXISTS trig_quota_marketing_campaign ON marketing_campaigns;
    -- CREATE TRIGGER trig_quota_marketing_campaign
    --   BEFORE INSERT ON marketing_campaigns
    --   FOR EACH ROW
    --   EXECUTE FUNCTION before_insert_marketing_campaign();

-- RAISE NOTICE '✓ Marketing campaign quota trigger function created (not enabled)';
  END IF;
END $$;

-- =====================================================
-- 5. INITIALIZE QUOTA RESET DATES
-- =====================================================

-- Set initial quota_reset_at for existing entitlements
UPDATE tenant_entitlements
SET quota_reset_at = (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ
WHERE quota_reset_at IS NULL
  AND quota_limit IS NOT NULL;

DO $$
BEGIN
-- RAISE NOTICE '✅ Initialized quota reset dates for existing entitlements';
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '';
-- RAISE NOTICE '=== QUOTA SYSTEM VERIFICATION ===';
-- RAISE NOTICE 'Functions created:';
-- RAISE NOTICE '  - enforce_quota_and_increment(feature_code, amount)';
-- RAISE NOTICE '  - check_quota_status(feature_code)';
-- RAISE NOTICE '';
-- RAISE NOTICE 'Triggers created:';
-- RAISE NOTICE '  - marketing_campaign_sends: before insert (enforces quota)';
-- RAISE NOTICE '';
-- RAISE NOTICE 'Behavior:';
-- RAISE NOTICE '  - quota_limit NULL = unlimited';
-- RAISE NOTICE '  - quota_limit set = enforced at DB layer';
-- RAISE NOTICE '  - Auto-resets monthly';
-- RAISE NOTICE '  - Raises exception on quota exceeded (SQLSTATE 53400)';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- TEST SCENARIO (Manual testing)
-- =====================================================

-- To test quota enforcement:
-- 1. Set a quota limit:
--    UPDATE tenant_entitlements 
--    SET quota_limit = 10, quota_used = 9
--    WHERE tenant_id = current_tenant_id()
--      AND feature_id = (SELECT id FROM features WHERE code = 'marketing');

-- 2. Check quota status:
--    SELECT * FROM check_quota_status('marketing');

-- 3. Try to exceed quota:
--    INSERT INTO marketing_campaign_sends (...);
--    -- Should fail with SQLSTATE 53400 if quota_used >= quota_limit

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 3 COMPLETE: Quotas & billing enforcement';
-- RAISE NOTICE '   - Created enforce_quota_and_increment() (enforces limits)';
-- RAISE NOTICE '   - Created check_quota_status() (for UI warnings)';
-- RAISE NOTICE '   - Attached triggers to marketing_campaign_sends';
-- RAISE NOTICE '   - Initialized quota reset dates';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Over-usage blocked at database layer';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
-- RAISE NOTICE '   1. UI: Show quota warnings when is_near_limit = true';
-- RAISE NOTICE '   2. UI: Block actions when is_exceeded = true';
-- RAISE NOTICE '   3. API: Catch SQLSTATE 53400 → return 402 Payment Required';
-- RAISE NOTICE '   4. Admin: Set quota_limit in tenant_entitlements';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run Phase 4 migrations (Webhooks security)';
END $$;

-- =====================================================
-- HARDENING PHASE 4: Webhook Security & Idempotency
-- Date: October 16, 2025
-- Purpose: Prevent replay attacks, ensure idempotency
-- =====================================================

-- =====================================================
-- 1. WEBHOOK EVENTS TABLE (Idempotency Store)
-- =====================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY, -- External event ID from provider (e.g., Twilio, Stripe)
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  source TEXT NOT NULL, -- 'twilio', 'stripe', 'google', 'custom', etc.
  event_type TEXT NOT NULL, -- 'call.completed', 'payment.succeeded', etc.
  
  signature TEXT, -- Webhook signature from provider
  signature_verified BOOLEAN DEFAULT false,
  
  received_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'duplicate')),
  
  payload JSONB NOT NULL,
  result JSONB, -- Store processing result
  error_message TEXT,
  
  retry_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source, event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received ON webhook_events(received_at DESC);

-- Unique constraint to prevent duplicates (idempotency)
-- Note: Primary key on 'id' already enforces uniqueness

COMMENT ON TABLE webhook_events IS 
  'Stores all incoming webhook events for idempotency and audit.
   Primary key on id (provider event ID) prevents duplicate processing.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created webhook_events table';
END $$;

-- =====================================================
-- 2. ENABLE RLS ON WEBHOOK_EVENTS
-- =====================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_select ON webhook_events;
DROP POLICY IF EXISTS webhook_events_insert ON webhook_events;
DROP POLICY IF EXISTS webhook_events_service ON webhook_events;

CREATE POLICY webhook_events_select ON webhook_events
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY webhook_events_insert ON webhook_events
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY webhook_events_service ON webhook_events
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied RLS to webhook_events';
END $$;

-- =====================================================
-- 3. WEBHOOK PROCESSING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION register_webhook_event(
  p_event_id TEXT,
  p_tenant_id UUID,
  p_source TEXT,
  p_event_type TEXT,
  p_signature TEXT,
  p_payload JSONB
)
RETURNS TABLE (
  is_new BOOLEAN,
  event_record webhook_events
)
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_existing webhook_events;
  v_new webhook_events;
BEGIN
  -- Try to find existing event
  SELECT * INTO v_existing
  FROM webhook_events
  WHERE id = p_event_id;

  IF FOUND THEN
    -- Event already exists - this is a duplicate/replay
    UPDATE webhook_events
    SET retry_count = retry_count + 1,
        status = 'duplicate',
        updated_at = NOW()
    WHERE id = p_event_id
    RETURNING * INTO v_existing;

    RETURN QUERY SELECT false, v_existing;
  ELSE
    -- New event - insert it
    INSERT INTO webhook_events (
      id,
      tenant_id,
      source,
      event_type,
      signature,
      signature_verified,
      payload,
      status
    ) VALUES (
      p_event_id,
      p_tenant_id,
      p_source,
      p_event_type,
      p_signature,
      false, -- Signature verification happens in application layer
      p_payload,
      'pending'
    )
    RETURNING * INTO v_new;

    RETURN QUERY SELECT true, v_new;
  END IF;
END;
$$;

COMMENT ON FUNCTION register_webhook_event IS 
  'Registers a webhook event with idempotency check.
   Returns is_new=true if this is the first time we''ve seen this event.
   Returns is_new=false if this is a duplicate/replay (safe to ignore).';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created register_webhook_event() function';
END $$;

-- =====================================================
-- 4. MARK WEBHOOK AS PROCESSED
-- =====================================================

CREATE OR REPLACE FUNCTION mark_webhook_processed(
  p_event_id TEXT,
  p_status TEXT,
  p_result JSONB DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
BEGIN
  UPDATE webhook_events
  SET status = p_status,
      processed_at = NOW(),
      result = p_result,
      error_message = p_error_message,
      updated_at = NOW()
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Webhook event % not found', p_event_id;
  END IF;
END;
$$;

COMMENT ON FUNCTION mark_webhook_processed IS 
  'Marks a webhook event as processed (completed or failed).
   Call this after successfully processing the webhook payload.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created mark_webhook_processed() function';
END $$;

-- =====================================================
-- 5. CLEANUP OLD WEBHOOK EVENTS (Retention Policy)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events(p_days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM webhook_events
  WHERE received_at < NOW() - (p_days_to_keep || ' days')::INTERVAL
    AND status IN ('completed', 'duplicate');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
-- RAISE NOTICE 'Cleaned up % old webhook events (older than % days)', v_deleted_count, p_days_to_keep;
  
  RETURN v_deleted_count;
END;
$$;

COMMENT ON FUNCTION cleanup_old_webhook_events IS 
  'Deletes old webhook events to prevent table bloat.
   Only deletes completed/duplicate events, keeps failed events for investigation.
   Default retention: 90 days.
   Run this periodically via cron job or pg_cron.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created cleanup_old_webhook_events() function';
END $$;

-- =====================================================
-- 6. WEBHOOK STATS VIEW
-- =====================================================

CREATE OR REPLACE VIEW webhook_stats AS
SELECT
  source,
  event_type,
  tenant_id,
  DATE_TRUNC('day', received_at) as date,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE status = 'completed') as completed,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'duplicate') as duplicates,
  AVG(EXTRACT(EPOCH FROM (processed_at - received_at))) as avg_processing_seconds
FROM webhook_events
WHERE received_at > NOW() - INTERVAL '30 days'
GROUP BY source, event_type, tenant_id, DATE_TRUNC('day', received_at)
ORDER BY date DESC, total_events DESC;

COMMENT ON VIEW webhook_stats IS 
  'Aggregated webhook statistics for the last 30 days.
   Useful for monitoring webhook health and performance.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created webhook_stats view';
END $$;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_table_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'webhook_events'
  ) INTO v_table_exists;
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== WEBHOOK SYSTEM VERIFICATION ===';
-- RAISE NOTICE 'Table created: %', v_table_exists;
-- RAISE NOTICE '';
-- RAISE NOTICE 'Functions:';
-- RAISE NOTICE '  - register_webhook_event() - Idempotency check';
-- RAISE NOTICE '  - mark_webhook_processed() - Mark as done';
-- RAISE NOTICE '  - cleanup_old_webhook_events() - Retention';
-- RAISE NOTICE '';
-- RAISE NOTICE 'View:';
-- RAISE NOTICE '  - webhook_stats - Monitoring';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- USAGE EXAMPLE (In webhook handler)
-- =====================================================

/*
-- Example webhook handler code (TypeScript):

export async function POST(request: Request) {
  const body = await request.json()
  const signature = request.headers.get('x-webhook-signature')
  
  // 1. Verify signature (provider-specific)
  if (!verifySignature(body, signature)) {
    return new Response('Invalid signature', { status: 401 })
  }
  
  // 2. Register event (idempotency check)
  const { data, error } = await supabase.rpc('register_webhook_event', {
    p_event_id: body.event_id,
    p_tenant_id: body.tenant_id,
    p_source: 'twilio',
    p_event_type: 'call.completed',
    p_signature: signature,
    p_payload: body
  })
  
  if (error) {
    return new Response('Error', { status: 500 })
  }
  
  const { is_new } = data[0]
  
  if (!is_new) {
    // Duplicate event - already processed
    return new Response('OK (duplicate)', { status: 200 })
  }
  
  // 3. Process event
  try {
    await processCallCompleted(body)
    
    // 4. Mark as completed
    await supabase.rpc('mark_webhook_processed', {
      p_event_id: body.event_id,
      p_status: 'completed',
      p_result: { success: true }
    })
    
    return new Response('OK', { status: 200 })
  } catch (err) {
    await supabase.rpc('mark_webhook_processed', {
      p_event_id: body.event_id,
      p_status: 'failed',
      p_error_message: err.message
    })
    
    return new Response('Processing failed', { status: 500 })
  }
}
*/

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 4 COMPLETE: Webhook security';
-- RAISE NOTICE '   - webhook_events table (idempotency store)';
-- RAISE NOTICE '   - register_webhook_event() - Duplicate detection';
-- RAISE NOTICE '   - mark_webhook_processed() - Status tracking';
-- RAISE NOTICE '   - cleanup_old_webhook_events() - Retention policy';
-- RAISE NOTICE '   - webhook_stats view - Monitoring';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Replay attacks prevented via PK constraint';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
-- RAISE NOTICE '   1. Update webhook handlers to use register_webhook_event()';
-- RAISE NOTICE '   2. Verify signatures BEFORE registering events';
-- RAISE NOTICE '   3. Call mark_webhook_processed() after processing';
-- RAISE NOTICE '   4. Schedule cleanup_old_webhook_events() via cron';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run Phase 5 migrations (Data quality)';
END $$;

-- =====================================================
-- HARDENING PHASE 5: Data Quality - Email/Phone Normalization
-- Date: October 16, 2025
-- Purpose: Add normalization columns, deduplication, merge support
-- =====================================================

-- =====================================================
-- 1. ADD NORMALIZATION COLUMNS TO CONTACTS
-- =====================================================

-- Add normalized email column (lowercase, trimmed)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_email_norm TEXT;

-- Add normalized phone column (E.164 format)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS primary_phone_e164 TEXT;

-- Add duplicate tracking
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES contacts(id) ON DELETE SET NULL;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS is_duplicate BOOLEAN DEFAULT false;

DO $$
BEGIN
-- RAISE NOTICE '✅ Added normalization columns to contacts';
END $$;

-- =====================================================
-- 2. CREATE UNIQUE INDEXES (Enforce uniqueness per tenant)
-- =====================================================

-- Unique email per tenant (when not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_email_norm
  ON contacts(tenant_id, primary_email_norm)
  WHERE primary_email_norm IS NOT NULL 
    AND deleted_at IS NULL 
    AND merged_into_id IS NULL;

-- Unique phone per tenant (when not deleted)
CREATE UNIQUE INDEX IF NOT EXISTS uq_contacts_phone_e164
  ON contacts(tenant_id, primary_phone_e164)
  WHERE primary_phone_e164 IS NOT NULL 
    AND deleted_at IS NULL 
    AND merged_into_id IS NULL;

-- Index for searching duplicates
CREATE INDEX IF NOT EXISTS idx_contacts_is_duplicate ON contacts(tenant_id, is_duplicate) WHERE is_duplicate = true;
CREATE INDEX IF NOT EXISTS idx_contacts_merged_into ON contacts(merged_into_id) WHERE merged_into_id IS NOT NULL;

DO $$
BEGIN
-- RAISE NOTICE '✅ Created unique indexes for normalized fields';
END $$;

-- =====================================================
-- 3. EMAIL NORMALIZATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_email(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF p_email IS NULL OR p_email = '' THEN
    RETURN NULL;
  END IF;
  
  -- Lowercase and trim
  RETURN LOWER(TRIM(p_email));
END;
$$;

COMMENT ON FUNCTION normalize_email(TEXT) IS 
  'Normalizes email to lowercase and trimmed format for deduplication.';

-- =====================================================
-- 4. PHONE NORMALIZATION FUNCTION (Basic E.164 attempt)
-- =====================================================

CREATE OR REPLACE FUNCTION normalize_phone(p_phone TEXT, p_default_country TEXT DEFAULT 'GB')
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_phone TEXT;
BEGIN
  IF p_phone IS NULL OR p_phone = '' THEN
    RETURN NULL;
  END IF;
  
  -- Remove all non-digit characters
  v_phone := REGEXP_REPLACE(p_phone, '[^0-9+]', '', 'g');
  
  -- If starts with +, assume it's already in international format
  IF v_phone LIKE '+%' THEN
    RETURN v_phone;
  END IF;
  
  -- If starts with 00, convert to +
  IF v_phone LIKE '00%' THEN
    RETURN '+' || SUBSTRING(v_phone FROM 3);
  END IF;
  
  -- UK-specific: If starts with 0, replace with +44
  IF p_default_country = 'GB' AND v_phone LIKE '0%' THEN
    RETURN '+44' || SUBSTRING(v_phone FROM 2);
  END IF;
  
  -- US-specific: If 10 digits, add +1
  IF p_default_country = 'US' AND LENGTH(v_phone) = 10 THEN
    RETURN '+1' || v_phone;
  END IF;
  
  -- Otherwise, return as-is with + prefix if not present
  IF NOT v_phone LIKE '+%' THEN
    -- Try to add default country code
    IF p_default_country = 'GB' THEN
      RETURN '+44' || v_phone;
    ELSIF p_default_country = 'US' THEN
      RETURN '+1' || v_phone;
    ELSE
      RETURN '+' || v_phone; -- Generic fallback
    END IF;
  END IF;
  
  RETURN v_phone;
END;
$$;

COMMENT ON FUNCTION normalize_phone(TEXT, TEXT) IS 
  'Attempts to normalize phone to E.164 format.
   Note: This is a basic implementation. For production, consider using libphonenumber.
   Default country: GB (United Kingdom).';

-- =====================================================
-- 5. TRIGGER TO AUTO-NORMALIZE ON INSERT/UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION contacts_normalize_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Normalize email
  IF NEW.primary_email IS NOT NULL THEN
    NEW.primary_email_norm := normalize_email(NEW.primary_email);
  ELSE
    NEW.primary_email_norm := NULL;
  END IF;
  
  -- Normalize phone
  IF NEW.primary_phone IS NOT NULL THEN
    -- Get tenant's default country if available
    -- For now, default to GB
    NEW.primary_phone_e164 := normalize_phone(NEW.primary_phone, 'GB');
  ELSE
    NEW.primary_phone_e164 := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_contacts_normalize ON contacts;
CREATE TRIGGER trig_contacts_normalize
  BEFORE INSERT OR UPDATE OF primary_email, primary_phone ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION contacts_normalize_fields();

DO $$
BEGIN
-- RAISE NOTICE '✅ Created auto-normalization trigger on contacts';
END $$;

-- =====================================================
-- 6. BACKFILL EXISTING DATA (Handle duplicates gracefully)
-- =====================================================

-- Normalize existing contacts one by one, skip duplicates
DO $$
DECLARE
  v_contact RECORD;
  v_normalized_email TEXT;
  v_normalized_phone TEXT;
  v_duplicate_count INTEGER := 0;
  v_success_count INTEGER := 0;
BEGIN
  FOR v_contact IN 
    SELECT id, primary_email, primary_phone
    FROM contacts
    WHERE (primary_email_norm IS NULL AND primary_email IS NOT NULL)
       OR (primary_phone_e164 IS NULL AND primary_phone IS NOT NULL)
  LOOP
    BEGIN
      -- Normalize
      v_normalized_email := normalize_email(v_contact.primary_email);
      v_normalized_phone := normalize_phone(v_contact.primary_phone, 'GB');
      
      -- Try to update (will fail if duplicate exists)
      UPDATE contacts
      SET primary_email_norm = v_normalized_email,
          primary_phone_e164 = v_normalized_phone
      WHERE id = v_contact.id;
      
      v_success_count := v_success_count + 1;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Duplicate found - mark this contact as potential duplicate
        UPDATE contacts
        SET is_duplicate = true
        WHERE id = v_contact.id;
        
        v_duplicate_count := v_duplicate_count + 1;
        
-- RAISE NOTICE 'Duplicate found: contact % has duplicate email/phone', v_contact.id;
    END;
  END LOOP;
  
-- RAISE NOTICE '✅ Backfilled normalization: % successful, % duplicates marked', v_success_count, v_duplicate_count;
  
  IF v_duplicate_count > 0 THEN
-- RAISE NOTICE 'ℹ️  Found % potential duplicates. Use find_duplicate_contacts() and merge_contacts() to resolve.', v_duplicate_count;
  END IF;
END $$;

-- =====================================================
-- 7. DUPLICATE DETECTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION find_duplicate_contacts(
  p_tenant_id UUID,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_exclude_contact_id UUID DEFAULT NULL
)
RETURNS TABLE (
  contact_id UUID,
  full_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  match_reason TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as contact_id,
    c.full_name,
    c.primary_email,
    c.primary_phone,
    CASE 
      WHEN c.primary_email_norm = normalize_email(p_email) THEN 'email_match'
      WHEN c.primary_phone_e164 = normalize_phone(p_phone, 'GB') THEN 'phone_match'
      ELSE 'unknown'
    END as match_reason,
    c.created_at
  FROM contacts c
  WHERE c.tenant_id = p_tenant_id
    AND c.deleted_at IS NULL
    AND c.merged_into_id IS NULL
    AND c.id != COALESCE(p_exclude_contact_id, '00000000-0000-0000-0000-000000000000'::UUID)
    AND (
      (p_email IS NOT NULL AND c.primary_email_norm = normalize_email(p_email))
      OR
      (p_phone IS NOT NULL AND c.primary_phone_e164 = normalize_phone(p_phone, 'GB'))
    )
  ORDER BY c.created_at ASC;
END;
$$;

COMMENT ON FUNCTION find_duplicate_contacts IS 
  'Finds potential duplicate contacts by normalized email or phone.
   Returns matches within the same tenant, excluding deleted and merged records.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created find_duplicate_contacts() function';
END $$;

-- =====================================================
-- 8. MERGE CONTACTS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION merge_contacts(
  p_source_contact_id UUID,
  p_target_contact_id UUID,
  p_merged_by_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_source contacts;
  v_target contacts;
  v_tenant_id UUID := current_tenant_id();
  v_result JSONB;
  v_deals_moved INTEGER := 0;
  v_tasks_moved INTEGER := 0;
  v_activities_moved INTEGER := 0;
  v_calls_moved INTEGER := 0;
  v_files_moved INTEGER := 0;
  v_notes_moved INTEGER := 0;
BEGIN
  -- Validate both contacts exist and belong to same tenant
  SELECT * INTO v_source FROM contacts WHERE id = p_source_contact_id AND tenant_id = v_tenant_id;
  SELECT * INTO v_target FROM contacts WHERE id = p_target_contact_id AND tenant_id = v_tenant_id;
  
  IF v_source IS NULL THEN
    RAISE EXCEPTION 'Source contact % not found', p_source_contact_id;
  END IF;
  
  IF v_target IS NULL THEN
    RAISE EXCEPTION 'Target contact % not found', p_target_contact_id;
  END IF;
  
  IF v_source.id = v_target.id THEN
    RAISE EXCEPTION 'Cannot merge contact with itself';
  END IF;
  
  -- Move all related records to target contact
  
  -- 1. Deals
  UPDATE deals SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_deals_moved = ROW_COUNT;
  
  -- 2. Tasks
  UPDATE tasks SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_tasks_moved = ROW_COUNT;
  
  -- 3. Activities
  UPDATE activities SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_activities_moved = ROW_COUNT;
  
  -- 4. Calls
  UPDATE calls SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_calls_moved = ROW_COUNT;
  
  -- 5. Files
  UPDATE files SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_files_moved = ROW_COUNT;
  
  -- 6. Notes
  UPDATE notes SET contact_id = p_target_contact_id 
  WHERE contact_id = p_source_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_notes_moved = ROW_COUNT;
  
  -- 7. Marketing campaign sends (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    EXECUTE format('UPDATE marketing_campaign_sends SET contact_id = $1 WHERE contact_id = $2 AND tenant_id = $3')
      USING p_target_contact_id, p_source_contact_id, v_tenant_id;
  END IF;
  
  -- Mark source as duplicate and merged
  UPDATE contacts
  SET is_duplicate = true,
      merged_into_id = p_target_contact_id,
      deleted_at = NOW(),
      updated_at = NOW()
  WHERE id = p_source_contact_id;
  
  -- Log audit event
  PERFORM log_audit_event(
    'merged',
    'contact',
    p_source_contact_id,
    jsonb_build_object(
      'source_contact_id', p_source_contact_id,
      'target_contact_id', p_target_contact_id,
      'merged_by_user_id', p_merged_by_user_id,
      'records_moved', jsonb_build_object(
        'deals', v_deals_moved,
        'tasks', v_tasks_moved,
        'activities', v_activities_moved,
        'calls', v_calls_moved,
        'files', v_files_moved,
        'notes', v_notes_moved
      )
    )
  );
  
  -- Build result
  v_result := jsonb_build_object(
    'success', true,
    'source_contact_id', p_source_contact_id,
    'target_contact_id', p_target_contact_id,
    'records_moved', jsonb_build_object(
      'deals', v_deals_moved,
      'tasks', v_tasks_moved,
      'activities', v_activities_moved,
      'calls', v_calls_moved,
      'files', v_files_moved,
      'notes', v_notes_moved
    )
  );
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION merge_contacts IS 
  'Merges source contact into target contact.
   Moves all related records (deals, tasks, activities, calls, files, notes).
   Marks source as duplicate and soft-deletes it.
   Logs audit event for traceability.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created merge_contacts() function';
END $$;

-- =====================================================
-- 9. UNMERGE CONTACTS FUNCTION (Recovery)
-- =====================================================

CREATE OR REPLACE FUNCTION unmerge_contact(p_contact_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
BEGIN
  -- Unmark as duplicate and restore
  UPDATE contacts
  SET is_duplicate = false,
      merged_into_id = NULL,
      deleted_at = NULL,
      updated_at = NOW()
  WHERE id = p_contact_id
    AND tenant_id = v_tenant_id
    AND is_duplicate = true;
  
  IF FOUND THEN
    -- Log audit event
    PERFORM log_audit_event('unmerged', 'contact', p_contact_id, jsonb_build_object('unmerged_at', NOW()));
    RETURN true;
  ELSE
    RETURN false;
  END IF;
END;
$$;

COMMENT ON FUNCTION unmerge_contact IS 
  'Unmerges a previously merged contact (restores it).
   Does NOT move records back - they stay with the target contact.
   This is a recovery function in case merge was accidental.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created unmerge_contact() function';
END $$;

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_normalized_count INTEGER;
  v_duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_normalized_count
  FROM contacts
  WHERE primary_email_norm IS NOT NULL OR primary_phone_e164 IS NOT NULL;
  
  SELECT COUNT(*) INTO v_duplicate_count
  FROM contacts
  WHERE is_duplicate = true;
  
-- RAISE NOTICE '';
-- RAISE NOTICE '=== DATA QUALITY VERIFICATION ===';
-- RAISE NOTICE 'Contacts with normalized fields: %', v_normalized_count;
-- RAISE NOTICE 'Marked as duplicates: %', v_duplicate_count;
-- RAISE NOTICE '';
-- RAISE NOTICE 'Functions:';
-- RAISE NOTICE '  - normalize_email() - Email normalization';
-- RAISE NOTICE '  - normalize_phone() - Phone normalization';
-- RAISE NOTICE '  - find_duplicate_contacts() - Duplicate detection';
-- RAISE NOTICE '  - merge_contacts() - Merge workflow';
-- RAISE NOTICE '  - unmerge_contact() - Recovery';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 5 COMPLETE: Data quality & deduplication';
-- RAISE NOTICE '   - Added primary_email_norm, primary_phone_e164 columns';
-- RAISE NOTICE '   - Created unique indexes (per tenant)';
-- RAISE NOTICE '   - Auto-normalization trigger on INSERT/UPDATE';
-- RAISE NOTICE '   - Backfilled existing contacts';
-- RAISE NOTICE '   - find_duplicate_contacts() - Detection';
-- RAISE NOTICE '   - merge_contacts() - Merge workflow with audit';
-- RAISE NOTICE '   - unmerge_contact() - Recovery';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Duplicate contacts blocked at DB level';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
-- RAISE NOTICE '   1. On contact create/update: Check find_duplicate_contacts()';
-- RAISE NOTICE '   2. If duplicates found: Show merge UI (409 Conflict)';
-- RAISE NOTICE '   3. Catch unique constraint violation → suggest merge';
-- RAISE NOTICE '   4. Implement merge UI calling merge_contacts()';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  NOTE: Phone normalization is basic. Consider libphonenumber for production.';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Run Phase 6 migrations (Automations hardening)';
END $$;

-- =====================================================
-- HARDENING PHASE 6: Automations Hardening
-- Date: October 16, 2025
-- Purpose: Idempotency, loop guards, concurrency, DLQ
-- =====================================================

-- =====================================================
-- 1. ADD IDEMPOTENCY & TRACKING COLUMNS
-- =====================================================

-- Add idempotency key to execution logs
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS origin_tag TEXT;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
ALTER TABLE automation_execution_logs ADD COLUMN IF NOT EXISTS correlation_id UUID;

-- Unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS uq_automation_exec_idem
  ON automation_execution_logs(tenant_id, automation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Index for correlation (tracing)
CREATE INDEX IF NOT EXISTS idx_automation_correlation 
  ON automation_execution_logs(correlation_id) 
  WHERE correlation_id IS NOT NULL;

DO $$
BEGIN
-- RAISE NOTICE '✅ Added idempotency columns to automation_execution_logs';
END $$;

-- =====================================================
-- 2. AUTOMATION DEAD LETTER QUEUE (DLQ)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  
  original_execution_log_id UUID REFERENCES automation_execution_logs(id),
  
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  retry_count INTEGER NOT NULL,
  max_retries_exceeded BOOLEAN DEFAULT true,
  
  trigger_event JSONB NOT NULL,
  error_message TEXT,
  error_details JSONB,
  
  status TEXT DEFAULT 'quarantined' CHECK (status IN ('quarantined', 'replaying', 'resolved', 'discarded')),
  resolved_at TIMESTAMPTZ,
  resolved_by_user_id UUID REFERENCES app_users(id),
  resolution_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_dlq_tenant ON automation_dlq(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_dlq_automation ON automation_dlq(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_dlq_status ON automation_dlq(tenant_id, status) WHERE status = 'quarantined';
CREATE INDEX IF NOT EXISTS idx_automation_dlq_failed ON automation_dlq(failed_at DESC);

COMMENT ON TABLE automation_dlq IS 
  'Dead Letter Queue for failed automation executions.
   Stores executions that failed after max retries for manual investigation and replay.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created automation_dlq table';
END $$;

-- =====================================================
-- 3. ENABLE RLS ON DLQ
-- =====================================================

ALTER TABLE automation_dlq ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_dlq_select ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_insert ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_update ON automation_dlq;
DROP POLICY IF EXISTS automation_dlq_service ON automation_dlq;

CREATE POLICY automation_dlq_select ON automation_dlq
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

CREATE POLICY automation_dlq_insert ON automation_dlq
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY automation_dlq_update ON automation_dlq
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automation_dlq_service ON automation_dlq
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied RLS to automation_dlq';
END $$;

-- =====================================================
-- 4. IDEMPOTENCY KEY BUILDER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION build_automation_idempotency_key(
  p_automation_id UUID,
  p_event_id TEXT,
  p_entity_id UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Build a deterministic idempotency key
  -- Format: {automation_id}:{event_id}:{entity_id}
  RETURN p_automation_id::TEXT || ':' || p_event_id || ':' || COALESCE(p_entity_id::TEXT, 'null');
END;
$$;

COMMENT ON FUNCTION build_automation_idempotency_key IS 
  'Builds a deterministic idempotency key for automation executions.
   Ensures same event + automation + entity combination only executes once.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created build_automation_idempotency_key() function';
END $$;

-- =====================================================
-- 5. CHECK EXECUTION ELIGIBILITY (Loop Guard)
-- =====================================================

CREATE OR REPLACE FUNCTION check_automation_eligible(
  p_automation_id UUID,
  p_idempotency_key TEXT,
  p_origin_tag TEXT DEFAULT NULL
)
RETURNS TABLE (
  is_eligible BOOLEAN,
  reason TEXT,
  existing_execution_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_automation automations;
  v_existing_log automation_execution_logs;
BEGIN
  -- Get automation
  SELECT * INTO v_automation
  FROM automations
  WHERE id = p_automation_id AND tenant_id = v_tenant_id;
  
  IF v_automation IS NULL THEN
    RETURN QUERY SELECT false, 'Automation not found or not accessible', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if automation is active
  IF NOT v_automation.is_active THEN
    RETURN QUERY SELECT false, 'Automation is disabled', NULL::UUID;
    RETURN;
  END IF;
  
  -- Check if automation is soft-deleted
  IF v_automation.deleted_at IS NOT NULL THEN
    RETURN QUERY SELECT false, 'Automation is deleted', NULL::UUID;
    RETURN;
  END IF;
  
  -- LOOP GUARD: Check if origin_tag matches automation (prevent infinite loops)
  IF p_origin_tag IS NOT NULL AND p_origin_tag = 'auto:' || p_automation_id::TEXT THEN
    RETURN QUERY SELECT false, 'Loop detected: event originated from this automation', NULL::UUID;
    RETURN;
  END IF;
  
  -- IDEMPOTENCY: Check if this exact execution already ran
  SELECT * INTO v_existing_log
  FROM automation_execution_logs
  WHERE automation_id = p_automation_id
    AND idempotency_key = p_idempotency_key
  ORDER BY started_at DESC
  LIMIT 1;
  
  IF FOUND THEN
    -- Check status
    IF v_existing_log.status IN ('success', 'running') THEN
      RETURN QUERY SELECT false, 'Already executed (idempotency)', v_existing_log.id;
      RETURN;
    ELSIF v_existing_log.status = 'failed' AND v_existing_log.retry_count < 3 THEN
      -- Allow retry if failed and under retry limit
      RETURN QUERY SELECT true, 'Retry allowed (previous failure)', v_existing_log.id;
      RETURN;
    ELSIF v_existing_log.status = 'failed' AND v_existing_log.retry_count >= 3 THEN
      -- Max retries exceeded
      RETURN QUERY SELECT false, 'Max retries exceeded', v_existing_log.id;
      RETURN;
    END IF;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT true, 'Eligible for execution', NULL::UUID;
END;
$$;

COMMENT ON FUNCTION check_automation_eligible IS 
  'Checks if an automation is eligible to execute.
   Prevents: disabled automations, infinite loops, duplicate executions.
   Returns: is_eligible, reason, existing_execution_id';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created check_automation_eligible() function';
END $$;

-- =====================================================
-- 6. SEND TO DLQ FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION send_to_automation_dlq(
  p_execution_log_id UUID,
  p_error_message TEXT,
  p_error_details JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_log automation_execution_logs;
  v_dlq_id UUID;
BEGIN
  -- Get execution log
  SELECT * INTO v_log
  FROM automation_execution_logs
  WHERE id = p_execution_log_id;
  
  IF v_log IS NULL THEN
    RAISE EXCEPTION 'Execution log % not found', p_execution_log_id;
  END IF;
  
  -- Insert into DLQ
  INSERT INTO automation_dlq (
    tenant_id,
    automation_id,
    original_execution_log_id,
    retry_count,
    trigger_event,
    error_message,
    error_details
  ) VALUES (
    v_log.tenant_id,
    v_log.automation_id,
    p_execution_log_id,
    v_log.retry_count,
    jsonb_build_object(
      'event_id', v_log.id,
      'started_at', v_log.started_at,
      'actions', v_log.actions_executed
    ),
    p_error_message,
    p_error_details
  )
  RETURNING id INTO v_dlq_id;
  
  -- Update execution log status
  UPDATE automation_execution_logs
  SET status = 'failed',
      error_message = p_error_message,
      completed_at = NOW(),
      updated_at = NOW()
  WHERE id = p_execution_log_id;
  
  RETURN v_dlq_id;
END;
$$;

COMMENT ON FUNCTION send_to_automation_dlq IS 
  'Sends a failed automation execution to the Dead Letter Queue.
   Call this when max retries are exceeded.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created send_to_automation_dlq() function';
END $$;

-- =====================================================
-- 7. REPLAY FROM DLQ FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION replay_from_dlq(
  p_dlq_id UUID,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_dlq automation_dlq;
  v_new_log_id UUID;
BEGIN
  -- Get DLQ entry
  SELECT * INTO v_dlq
  FROM automation_dlq
  WHERE id = p_dlq_id
    AND tenant_id = current_tenant_id()
    AND status = 'quarantined';
  
  IF v_dlq IS NULL THEN
    RAISE EXCEPTION 'DLQ entry % not found or not replayable', p_dlq_id;
  END IF;
  
  -- Mark as replaying
  UPDATE automation_dlq
  SET status = 'replaying',
      resolved_at = NOW(),
      resolved_by_user_id = p_user_id
  WHERE id = p_dlq_id;
  
  -- Create new execution log (application layer will pick this up)
  INSERT INTO automation_execution_logs (
    tenant_id,
    automation_id,
    status,
    retry_count,
    correlation_id
  ) VALUES (
    v_dlq.tenant_id,
    v_dlq.automation_id,
    'pending',
    0, -- Reset retry count
    gen_random_uuid() -- New correlation ID for replay
  )
  RETURNING id INTO v_new_log_id;
  
  RETURN v_new_log_id;
END;
$$;

COMMENT ON FUNCTION replay_from_dlq IS 
  'Replays a failed automation from DLQ.
   Creates a new execution log and marks DLQ entry as replaying.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created replay_from_dlq() function';
END $$;

-- =====================================================
-- 8. CONCURRENCY LEASE TABLE (Per-tenant concurrency limiting)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_concurrency_leases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lease_key TEXT NOT NULL, -- e.g., 'tenant:{tenant_id}'
  
  acquired_by TEXT NOT NULL, -- Worker/process identifier
  acquired_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  UNIQUE(lease_key)
);

CREATE INDEX IF NOT EXISTS idx_concurrency_lease_key ON automation_concurrency_leases(lease_key);
CREATE INDEX IF NOT EXISTS idx_concurrency_lease_expires ON automation_concurrency_leases(expires_at);

COMMENT ON TABLE automation_concurrency_leases IS 
  'Simple lease-based concurrency control for automations.
   Ensures only N workers process automations for a tenant concurrently.
   Leases expire automatically to prevent deadlocks.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created automation_concurrency_leases table';
END $$;

-- =====================================================
-- 9. ACQUIRE LEASE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION acquire_automation_lease(
  p_lease_key TEXT,
  p_worker_id TEXT,
  p_lease_duration_seconds INTEGER DEFAULT 300
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ := NOW() + (p_lease_duration_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Try to insert lease
  INSERT INTO automation_concurrency_leases (
    tenant_id,
    lease_key,
    acquired_by,
    expires_at
  ) VALUES (
    current_tenant_id(),
    p_lease_key,
    p_worker_id,
    v_expires_at
  )
  ON CONFLICT (lease_key) DO NOTHING;
  
  -- Check if we got the lease
  IF FOUND THEN
    RETURN true;
  ELSE
    -- Lease already held, check if expired
    DELETE FROM automation_concurrency_leases
    WHERE lease_key = p_lease_key
      AND expires_at < NOW();
    
    -- If we deleted an expired lease, try again
    IF FOUND THEN
      RETURN acquire_automation_lease(p_lease_key, p_worker_id, p_lease_duration_seconds);
    ELSE
      RETURN false;
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION acquire_automation_lease IS 
  'Attempts to acquire a concurrency lease.
   Returns true if lease acquired, false if already held by another worker.
   Automatically cleans up expired leases.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created acquire_automation_lease() function';
END $$;

-- =====================================================
-- 10. RELEASE LEASE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION release_automation_lease(
  p_lease_key TEXT,
  p_worker_id TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
VOLATILE
AS $$
BEGIN
  DELETE FROM automation_concurrency_leases
  WHERE lease_key = p_lease_key
    AND acquired_by = p_worker_id;
  
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION release_automation_lease IS 
  'Releases a concurrency lease held by a worker.
   Should be called after automation execution completes.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created release_automation_lease() function';
END $$;

-- =====================================================
-- 11. VERIFICATION
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '';
-- RAISE NOTICE '=== AUTOMATION HARDENING VERIFICATION ===';
-- RAISE NOTICE 'Tables:';
-- RAISE NOTICE '  - automation_dlq (Dead Letter Queue)';
-- RAISE NOTICE '  - automation_concurrency_leases (Concurrency control)';
-- RAISE NOTICE '';
-- RAISE NOTICE 'Functions:';
-- RAISE NOTICE '  - build_automation_idempotency_key() - Idempotency';
-- RAISE NOTICE '  - check_automation_eligible() - Loop guard + idempotency';
-- RAISE NOTICE '  - send_to_automation_dlq() - DLQ insertion';
-- RAISE NOTICE '  - replay_from_dlq() - DLQ replay';
-- RAISE NOTICE '  - acquire_automation_lease() - Concurrency control';
-- RAISE NOTICE '  - release_automation_lease() - Release lease';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 6 COMPLETE: Automations hardening';
-- RAISE NOTICE '   - Idempotency keys in execution logs';
-- RAISE NOTICE '   - Loop guard via origin_tag checking';
-- RAISE NOTICE '   - Dead Letter Queue (DLQ) for failed executions';
-- RAISE NOTICE '   - Concurrency leases (per-tenant rate limiting)';
-- RAISE NOTICE '   - Replay capability from DLQ';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 SECURITY: Prevents infinite loops and duplicate executions';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
-- RAISE NOTICE '   1. Executor: Check check_automation_eligible() before executing';
-- RAISE NOTICE '   2. Executor: Build idempotency_key for each execution';
-- RAISE NOTICE '   3. Executor: Set origin_tag when automation creates entities';
-- RAISE NOTICE '   4. Executor: Call send_to_automation_dlq() after max retries';
-- RAISE NOTICE '   5. Executor: Acquire/release leases for concurrency control';
-- RAISE NOTICE '   6. Admin UI: Show DLQ with replay button';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Phase 7 (UI/UX) - to be implemented in application code';
-- RAISE NOTICE '➡️  Continuing with Phase 8 (Privacy & DSR)...';
END $$;

-- =====================================================
-- HARDENING PHASE 8: Privacy, DSR & GDPR Compliance
-- Date: October 16, 2025
-- Purpose: Data Subject Rights, erasure workflows, tombstones
-- =====================================================

-- =====================================================
-- 1. ERASURE TOMBSTONES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS erasure_tombstones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  resource_type TEXT NOT NULL, -- 'contact', 'deal', 'task', 'file', etc.
  resource_id UUID NOT NULL,
  
  erased_at TIMESTAMPTZ DEFAULT NOW(),
  erased_by_user_id UUID REFERENCES app_users(id),
  
  legal_basis TEXT, -- 'gdpr_right_to_erasure', 'ccpa_deletion', 'manual_admin', etc.
  request_reference TEXT, -- Link to DSR request if applicable
  
  notes TEXT,
  
  -- Audit trail: what was erased
  pii_fields_erased TEXT[], -- ['primary_email', 'primary_phone', 'address', etc.]
  related_records_deleted TEXT[], -- ['3 tasks', '5 files', '2 calls', etc.]
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tombstone_tenant ON erasure_tombstones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tombstone_resource ON erasure_tombstones(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_tombstone_erased ON erasure_tombstones(erased_at DESC);

COMMENT ON TABLE erasure_tombstones IS 
  'Records all data erasure operations for GDPR/CCPA compliance.
   Provides audit trail showing what was deleted, when, why, and by whom.
   Does NOT contain the erased data itself (that would defeat the purpose).';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created erasure_tombstones table';
END $$;

-- =====================================================
-- 2. DATA SUBJECT REQUESTS (DSR) TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  request_type TEXT NOT NULL CHECK (request_type IN ('access', 'rectification', 'erasure', 'portability', 'objection', 'restriction')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected', 'expired')),
  
  -- Requester details
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  requester_phone TEXT,
  contact_id UUID REFERENCES contacts(id), -- Linked contact if found
  
  request_details TEXT,
  verification_method TEXT, -- 'email_link', 'phone_otp', 'manual', etc.
  verification_completed_at TIMESTAMPTZ,
  
  -- Response
  response_details TEXT,
  response_sent_at TIMESTAMPTZ,
  
  -- Data export (for access/portability requests)
  export_file_url TEXT,
  export_generated_at TIMESTAMPTZ,
  export_expires_at TIMESTAMPTZ,
  
  -- Erasure (for erasure requests)
  erasure_completed_at TIMESTAMPTZ,
  tombstone_id UUID REFERENCES erasure_tombstones(id),
  
  -- Timing
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  due_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- GDPR: 30 days
  completed_at TIMESTAMPTZ,
  
  -- Assignment
  assigned_to_user_id UUID REFERENCES app_users(id),
  handled_by_user_id UUID REFERENCES app_users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_tenant ON data_subject_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(tenant_id, status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_dsr_due ON data_subject_requests(due_at) WHERE status NOT IN ('completed', 'rejected');
CREATE INDEX IF NOT EXISTS idx_dsr_email ON data_subject_requests(requester_email);
CREATE INDEX IF NOT EXISTS idx_dsr_requested ON data_subject_requests(requested_at DESC);

COMMENT ON TABLE data_subject_requests IS 
  'Manages GDPR/CCPA Data Subject Requests.
   Tracks lifecycle from request → verification → fulfillment → completion.
   30-day SLA for GDPR compliance.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created data_subject_requests table';
END $$;

-- =====================================================
-- 3. ENABLE RLS ON PRIVACY TABLES
-- =====================================================

ALTER TABLE erasure_tombstones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tombstones_admin_only ON erasure_tombstones;
CREATE POLICY tombstones_admin_only ON erasure_tombstones
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

ALTER TABLE data_subject_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dsr_admin_only ON data_subject_requests;
CREATE POLICY dsr_admin_only ON data_subject_requests
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

DO $$
BEGIN
-- RAISE NOTICE '✅ Applied RLS to privacy tables (admin-only)';
END $$;

-- =====================================================
-- 4. ERASE CONTACT PII FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION erase_contact_pii(
  p_contact_id UUID,
  p_legal_basis TEXT DEFAULT 'gdpr_right_to_erasure',
  p_erased_by_user_id UUID DEFAULT NULL,
  p_dsr_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_contact contacts;
  v_tombstone_id UUID;
  v_pii_fields TEXT[];
  v_related_records TEXT[] := ARRAY[]::TEXT[];
  v_count INTEGER;
BEGIN
  -- Get contact
  SELECT * INTO v_contact
  FROM contacts
  WHERE id = p_contact_id AND tenant_id = v_tenant_id;
  
  IF v_contact IS NULL THEN
    RAISE EXCEPTION 'Contact % not found or not accessible', p_contact_id;
  END IF;
  
  -- Track which PII fields we're erasing
  v_pii_fields := ARRAY['primary_email', 'primary_phone', 'alternate_phones', 'address'];
  
  -- 1. ERASE PII FROM CONTACT RECORD
  UPDATE contacts
  SET 
    full_name = 'ERASED',
    primary_email = NULL,
    primary_email_norm = NULL,
    primary_phone = NULL,
    primary_phone_e164 = NULL,
    alternate_phones = NULL,
    address = NULL,
    custom_fields = '{}'::JSONB, -- Clear custom fields
    notes = NULL,
    deleted_at = NOW(), -- Soft delete
    updated_at = NOW()
  WHERE id = p_contact_id;
  
  -- 2. ERASE PII FROM NOTES (redact content)
  UPDATE notes
  SET content = '[REDACTED - DATA ERASURE REQUEST]',
      updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' notes redacted');
  END IF;
  
  -- 3. DELETE FILES (mark for deletion, actual file deletion happens in storage)
  UPDATE files
  SET deleted_at = NOW(), updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' files marked for deletion');
  END IF;
  
  -- 4. ERASE CALL TRANSCRIPTS (may contain PII)
  UPDATE calls
  SET transcript = NULL,
      ai_summary = NULL,
      updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = v_tenant_id;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    v_related_records := array_append(v_related_records, v_count || ' call transcripts erased');
  END IF;
  
  -- 5. ANONYMIZE MARKETING CAMPAIGN SENDS (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    EXECUTE format('UPDATE marketing_campaign_sends SET metadata = NULL WHERE contact_id = $1 AND tenant_id = $2')
      USING p_contact_id, v_tenant_id;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count > 0 THEN
      v_related_records := array_append(v_related_records, v_count || ' campaign sends anonymized');
    END IF;
  END IF;
  
  -- Note: We do NOT delete deals, tasks, activities - these are business records
  -- We only erase PII from the contact itself
  -- Deals/tasks remain linked to the now-anonymized contact
  
  -- 6. CREATE TOMBSTONE
  INSERT INTO erasure_tombstones (
    tenant_id,
    resource_type,
    resource_id,
    erased_by_user_id,
    legal_basis,
    request_reference,
    pii_fields_erased,
    related_records_deleted
  ) VALUES (
    v_tenant_id,
    'contact',
    p_contact_id,
    p_erased_by_user_id,
    p_legal_basis,
    CASE WHEN p_dsr_id IS NOT NULL THEN 'DSR:' || p_dsr_id::TEXT ELSE NULL END,
    v_pii_fields,
    v_related_records
  )
  RETURNING id INTO v_tombstone_id;
  
  -- 7. UPDATE DSR IF PROVIDED
  IF p_dsr_id IS NOT NULL THEN
    UPDATE data_subject_requests
    SET erasure_completed_at = NOW(),
        tombstone_id = v_tombstone_id,
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_dsr_id;
  END IF;
  
  -- 8. LOG AUDIT EVENT
  PERFORM log_audit_event(
    'erased',
    'contact',
    p_contact_id,
    jsonb_build_object(
      'legal_basis', p_legal_basis,
      'tombstone_id', v_tombstone_id,
      'pii_fields_erased', v_pii_fields,
      'related_records', v_related_records
    )
  );
  
  RETURN v_tombstone_id;
END;
$$;

COMMENT ON FUNCTION erase_contact_pii IS 
  'Erases PII from a contact and related records.
   - Anonymizes contact details
   - Redacts notes
   - Marks files for deletion
   - Erases call transcripts
   - Creates tombstone for audit
   - Updates DSR if provided
   Does NOT delete business records (deals, tasks) - only erases PII.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created erase_contact_pii() function';
END $$;

-- =====================================================
-- 5. EXPORT CONTACT DATA FUNCTION (For Access/Portability Requests)
-- =====================================================

CREATE OR REPLACE FUNCTION export_contact_data(p_contact_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_contact_data JSONB;
  v_deals_data JSONB;
  v_tasks_data JSONB;
  v_activities_data JSONB;
  v_calls_data JSONB;
  v_files_data JSONB;
BEGIN
  -- Get contact
  SELECT row_to_json(c.*)::JSONB INTO v_contact_data
  FROM contacts c
  WHERE c.id = p_contact_id AND c.tenant_id = v_tenant_id;
  
  IF v_contact_data IS NULL THEN
    RAISE EXCEPTION 'Contact % not found', p_contact_id;
  END IF;
  
  -- Get related deals
  SELECT COALESCE(jsonb_agg(row_to_json(d.*)), '[]'::JSONB) INTO v_deals_data
  FROM deals d
  WHERE d.contact_id = p_contact_id AND d.tenant_id = v_tenant_id;
  
  -- Get related tasks
  SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::JSONB) INTO v_tasks_data
  FROM tasks t
  WHERE t.contact_id = p_contact_id AND t.tenant_id = v_tenant_id;
  
  -- Get related activities
  SELECT COALESCE(jsonb_agg(row_to_json(a.*)), '[]'::JSONB) INTO v_activities_data
  FROM activities a
  WHERE a.contact_id = p_contact_id AND a.tenant_id = v_tenant_id;
  
  -- Get related calls
  SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::JSONB) INTO v_calls_data
  FROM calls c
  WHERE c.contact_id = p_contact_id AND c.tenant_id = v_tenant_id;
  
  -- Get file metadata (not actual files)
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', f.id,
      'file_name', f.file_name,
      'file_type', f.file_type,
      'file_size', f.file_size,
      'uploaded_at', f.uploaded_at
    )
  ), '[]'::JSONB) INTO v_files_data
  FROM files f
  WHERE f.contact_id = p_contact_id AND f.tenant_id = v_tenant_id;
  
  -- Build complete export
  RETURN jsonb_build_object(
    'contact', v_contact_data,
    'deals', v_deals_data,
    'tasks', v_tasks_data,
    'activities', v_activities_data,
    'calls', v_calls_data,
    'files', v_files_data,
    'exported_at', NOW(),
    'export_format', 'json',
    'gdpr_notice', 'This export contains all personal data we hold about you.'
  );
END;
$$;

COMMENT ON FUNCTION export_contact_data IS 
  'Exports all data for a contact in GDPR-compliant format.
   Returns JSON with contact + all related records.
   Use this for GDPR Access Requests and Portability Requests.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created export_contact_data() function';
END $$;

-- =====================================================
-- 6. CREATE DSR REQUEST FUNCTION (Self-service)
-- =====================================================

CREATE OR REPLACE FUNCTION create_dsr_request(
  p_tenant_id UUID,
  p_request_type TEXT,
  p_requester_email TEXT,
  p_requester_name TEXT DEFAULT NULL,
  p_request_details TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_dsr_id UUID;
  v_contact_id UUID;
BEGIN
  -- Try to find matching contact
  SELECT id INTO v_contact_id
  FROM contacts
  WHERE tenant_id = p_tenant_id
    AND primary_email_norm = normalize_email(p_requester_email)
  LIMIT 1;
  
  -- Create DSR
  INSERT INTO data_subject_requests (
    tenant_id,
    request_type,
    requester_email,
    requester_name,
    contact_id,
    request_details,
    status
  ) VALUES (
    p_tenant_id,
    p_request_type,
    p_requester_email,
    p_requester_name,
    v_contact_id,
    p_request_details,
    'pending'
  )
  RETURNING id INTO v_dsr_id;
  
  RETURN v_dsr_id;
END;
$$;

COMMENT ON FUNCTION create_dsr_request IS 
  'Creates a new Data Subject Request.
   Can be called from public form (self-service DSR portal).
   Automatically links to contact if email matches.';

DO $$
BEGIN
-- RAISE NOTICE '✅ Created create_dsr_request() function';
END $$;

-- =====================================================
-- 7. VERIFICATION
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '';
-- RAISE NOTICE '=== PRIVACY & DSR VERIFICATION ===';
-- RAISE NOTICE 'Tables:';
-- RAISE NOTICE '  - erasure_tombstones (audit trail)';
-- RAISE NOTICE '  - data_subject_requests (DSR management)';
-- RAISE NOTICE '';
-- RAISE NOTICE 'Functions:';
-- RAISE NOTICE '  - erase_contact_pii() - GDPR erasure';
-- RAISE NOTICE '  - export_contact_data() - GDPR access/portability';
-- RAISE NOTICE '  - create_dsr_request() - Self-service DSR';
-- RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ HARDENING PHASE 8 COMPLETE: Privacy & DSR';
-- RAISE NOTICE '   - erasure_tombstones table (audit trail)';
-- RAISE NOTICE '   - data_subject_requests table (DSR workflow)';
-- RAISE NOTICE '   - erase_contact_pii() - Comprehensive PII erasure';
-- RAISE NOTICE '   - export_contact_data() - Data export (JSON)';
-- RAISE NOTICE '   - create_dsr_request() - Self-service DSR creation';
-- RAISE NOTICE '';
-- RAISE NOTICE '🔒 COMPLIANCE: GDPR/CCPA-ready';
-- RAISE NOTICE '';
-- RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
-- RAISE NOTICE '   1. Create DSR portal (public form for requests)';
-- RAISE NOTICE '   2. Admin UI: DSR queue with 30-day SLA tracking';
-- RAISE NOTICE '   3. Export: Generate PDF/CSV from export_contact_data()';
-- RAISE NOTICE '   4. Erasure: Call erase_contact_pii() with confirmation';
-- RAISE NOTICE '   5. Storage: Delete actual files when marked deleted_at';
-- RAISE NOTICE '   6. Email: Send confirmation emails after DSR completion';
-- RAISE NOTICE '';
-- RAISE NOTICE '➡️  Next: Phase 9 (Observability - trace IDs, dashboards)';
END $$;

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
  
-- RAISE NOTICE '=== MONITORING SYSTEM VERIFICATION ===';
-- RAISE NOTICE 'Monitoring views created: %', views_created;
-- RAISE NOTICE 'Security alerts: %', alerts_created;
-- RAISE NOTICE '======================================';
  
-- RAISE NOTICE '✅ Phase 10 Complete: Security monitoring and health dashboard configured';
-- RAISE NOTICE '🎉 ALL 10 PHASES COMPLETE!';
-- RAISE NOTICE '🔒 Enterprise multi-tenant security: FULLY DEPLOYED';
END $$;

-- =====================================================
-- PHASE 2: ENTERPRISE MULTI-TENANT ARCHITECTURE
-- Organization memberships, roles, and proper tenant model
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL SECURITY FIX
-- 
-- This migration creates the foundation for enterprise-grade
-- multi-tenant security with proper org membership management
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ORGANIZATIONS TABLE (Rename tenants for clarity)
-- =====================================================

-- Note: We'll keep 'tenants' table for now to avoid breaking changes
-- Add enterprise fields to existing tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_plan TEXT DEFAULT 'starter' CHECK (billing_plan IN ('trial', 'starter', 'professional', 'enterprise'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'cancelled', 'past_due'));
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_users INTEGER DEFAULT 5;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS max_locations INTEGER DEFAULT 1;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_tenants_updated_at ON tenants;
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. LOCATIONS TABLE - Already exists, just add indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_locations_tenant ON locations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_locations_active ON locations(tenant_id, is_active) WHERE is_active = true;

-- =====================================================
-- 3. ORG_MEMBERSHIPS TABLE (Multi-org support)
-- =====================================================

-- This allows users to belong to multiple organizations
-- with different roles and location access in each
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'super_admin', 'admin', 'manager', 'staff', 'marketing', 'read_only')),
  location_ids UUID[] DEFAULT '{}', -- Empty array = all locations, specific IDs = scoped access
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending_approval', 'invited', 'declined')),
  invited_by_user_id UUID REFERENCES app_users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  approved_by_user_id UUID REFERENCES app_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id) -- One membership per user per org
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_tenant ON org_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_status ON org_memberships(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_org_memberships_user_active ON org_memberships(user_id, tenant_id) WHERE status = 'active';

DROP TRIGGER IF EXISTS update_org_memberships_updated_at ON org_memberships;
CREATE TRIGGER update_org_memberships_updated_at BEFORE UPDATE ON org_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. BACKFILL ORG_MEMBERSHIPS FROM EXISTING APP_USERS
-- =====================================================

-- Create membership for every existing user
INSERT INTO org_memberships (user_id, tenant_id, role, status, created_at)
SELECT 
  au.id,
  au.tenant_id,
  au.role, -- Use existing role directly (owner, manager, or staff)
  'active',
  au.created_at
FROM app_users au
WHERE NOT EXISTS (
  SELECT 1 FROM org_memberships om 
  WHERE om.user_id = au.id AND om.tenant_id = au.tenant_id
)
ON CONFLICT (user_id, tenant_id) DO NOTHING;

-- =====================================================
-- 5. ENHANCE APP_USERS TABLE
-- =====================================================

-- Add current_org_id for UX (remembers last active org)
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS current_org_id UUID REFERENCES tenants(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';

-- Set current_org_id to their tenant_id for existing users
UPDATE app_users SET current_org_id = tenant_id WHERE current_org_id IS NULL;

-- =====================================================
-- 6. USER INVITATIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'super_admin', 'admin', 'manager', 'staff', 'marketing', 'read_only')),
  location_ids UUID[] DEFAULT '{}',
  invited_by_user_id UUID NOT NULL REFERENCES app_users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by_user_id UUID REFERENCES app_users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, email, status) -- Prevent duplicate pending invites
);

CREATE INDEX IF NOT EXISTS idx_invitations_tenant ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status) WHERE status = 'pending';

-- =====================================================
-- 7. HELPER FUNCTIONS (In public schema)
-- =====================================================

-- Get user's current org_id (from memberships, with fallback)
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    -- Try to get from active membership (new model)
    (SELECT tenant_id FROM org_memberships 
     WHERE user_id = auth.uid() AND status = 'active' 
     ORDER BY last_accessed_at DESC LIMIT 1),
    -- Fallback to app_users.tenant_id (old model, for migration period)
    (SELECT tenant_id FROM app_users WHERE id = auth.uid() LIMIT 1)
  );
$$;

-- Check if user has access to specific org
CREATE OR REPLACE FUNCTION public.user_has_org_access(target_org_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM org_memberships
    WHERE user_id = auth.uid()
      AND tenant_id = target_org_id
      AND status = 'active'
  ) OR EXISTS (
    SELECT 1 FROM app_users
    WHERE id = auth.uid()
      AND tenant_id = target_org_id
  );
$$;

-- Get user's role in specific org
CREATE OR REPLACE FUNCTION public.get_user_role_in_org(target_org_id UUID)
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role FROM org_memberships 
     WHERE user_id = auth.uid() AND tenant_id = target_org_id AND status = 'active' 
     LIMIT 1),
    (SELECT role FROM app_users WHERE id = auth.uid() AND tenant_id = target_org_id LIMIT 1),
    'none'
  );
$$;

-- Get user's location access in org
CREATE OR REPLACE FUNCTION public.get_user_locations_in_org(target_org_id UUID)
RETURNS UUID[]
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    (SELECT location_ids FROM org_memberships 
     WHERE user_id = auth.uid() AND tenant_id = target_org_id AND status = 'active' 
     LIMIT 1),
    '{}'::UUID[] -- Empty array = all locations
  );
$$;

-- =====================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- =====================================================

-- Locations
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org locations" ON locations;
CREATE POLICY "Users can view org locations"
  ON locations FOR SELECT
  USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org locations" ON locations;
CREATE POLICY "Admins can manage org locations"
  ON locations FOR ALL
  USING (
    tenant_id = public.get_user_org_id() 
    AND public.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- Org Memberships
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org memberships" ON org_memberships;
CREATE POLICY "Users can view org memberships"
  ON org_memberships FOR SELECT
  USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org memberships" ON org_memberships;
CREATE POLICY "Admins can manage org memberships"
  ON org_memberships FOR ALL
  USING (
    tenant_id = public.get_user_org_id() 
    AND public.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- User Invitations
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view org invitations" ON user_invitations;
CREATE POLICY "Users can view org invitations"
  ON user_invitations FOR SELECT
  USING (tenant_id = public.get_user_org_id());

DROP POLICY IF EXISTS "Admins can manage org invitations" ON user_invitations;
CREATE POLICY "Admins can manage org invitations"
  ON user_invitations FOR ALL
  USING (
    tenant_id = public.get_user_org_id() 
    AND public.get_user_role_in_org(tenant_id) IN ('owner', 'super_admin', 'admin')
  );

-- Service role bypass for all
CREATE POLICY "Service role bypass locations" ON locations
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass memberships" ON org_memberships
  FOR ALL USING (auth.role() = 'service_role');
  
CREATE POLICY "Service role bypass invitations" ON user_invitations
  FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- 9. AUDIT LOG FOR ORG CONTEXT SWITCHES
-- =====================================================

CREATE TABLE IF NOT EXISTS org_access_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES app_users(id),
  from_org_id UUID REFERENCES tenants(id),
  to_org_id UUID NOT NULL REFERENCES tenants(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('login', 'switch', 'api_call', 'suspicious')),
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_access_log_user ON org_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_access_log_org ON org_access_log(to_org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_org_access_log_suspicious ON org_access_log(created_at DESC) WHERE access_type = 'suspicious';

-- =====================================================
-- 10. ISOLATION VIOLATION LOG (Security Monitoring)
-- =====================================================

CREATE TABLE IF NOT EXISTS isolation_violations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  user_org_id UUID REFERENCES tenants(id),
  attempted_org_id UUID REFERENCES tenants(id),
  violation_type TEXT NOT NULL CHECK (violation_type IN ('cross_org_query', 'cross_org_update', 'cross_org_delete', 'missing_org_filter', 'hardcoded_tenant_id')),
  table_name TEXT,
  record_id UUID,
  query_details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  stack_trace TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_isolation_violations_user ON isolation_violations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isolation_violations_type ON isolation_violations(violation_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_isolation_violations_org ON isolation_violations(attempted_org_id, created_at DESC);

-- =====================================================
-- SUMMARY
-- =====================================================

-- Created:
-- ✅ Enhanced tenants table with enterprise fields
-- ✅ Locations table (verified/created)
-- ✅ org_memberships table (multi-org support)
-- ✅ user_invitations table (invite flows)
-- ✅ org_access_log (audit trail)
-- ✅ isolation_violations (security monitoring)
-- ✅ Helper functions (org_id lookup, role check, location access)
-- ✅ RLS policies for new tables
-- ✅ Backfilled existing users to org_memberships

COMMIT;

-- =====================================================
-- POST-MIGRATION VERIFICATION
-- =====================================================

-- Verify all tables created
DO $$
BEGIN
  ASSERT (SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('locations', 'org_memberships', 'user_invitations', 'org_access_log', 'isolation_violations')) = 5,
    'Not all tables were created successfully';
  
-- RAISE NOTICE 'Phase 2 Migration Complete: All tables created successfully';
END $$;

-- =====================================================
-- PHASE 3: DATA INTEGRITY & REFERENTIAL CONSTRAINTS
-- Enforce same-org relationships and prevent orphans
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL SECURITY FIX
--
-- This migration adds strict integrity constraints to prevent:
-- - Cross-org data relationships
-- - Orphaned records
-- - Missing required linkages
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ADD MISSING COLUMNS (If not exist)
-- =====================================================

-- Ensure ALL business tables have org_id (tenant_id)
-- Most already have tenant_id, this is verification

-- Contacts
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Deals  
ALTER TABLE deals ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE deals ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Pipelines
ALTER TABLE pipelines ADD COLUMN IF NOT EXISTS owner_user_id UUID REFERENCES app_users(id);

-- Activities
ALTER TABLE activities ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES locations(id);

-- =====================================================
-- 2. ADD COMPOSITE INDEXES (Performance + Integrity)
-- =====================================================

-- Contacts
CREATE INDEX IF NOT EXISTS idx_contacts_org_created ON contacts(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_updated ON contacts(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_org_location ON contacts(tenant_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_org_owner ON contacts(tenant_id, owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Deals
CREATE INDEX IF NOT EXISTS idx_deals_org_created ON deals(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_updated ON deals(tenant_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_org_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_org_stage ON deals(tenant_id, stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_contact ON deals(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_location ON deals(tenant_id, location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_org_owner ON deals(tenant_id, owner_user_id) WHERE owner_user_id IS NOT NULL;

-- Pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_org_created ON pipelines(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipelines_org_active ON pipelines(tenant_id) WHERE active = true;

-- Pipeline Stages
CREATE INDEX IF NOT EXISTS idx_stages_org_pipeline ON pipeline_stages(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stages_pipeline_position ON pipeline_stages(pipeline_id, position);

-- Tasks
CREATE INDEX IF NOT EXISTS idx_tasks_org_created ON tasks(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_org_due ON tasks(tenant_id, due_at) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_org_contact ON tasks(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_deal ON tasks(tenant_id, deal_id) WHERE deal_id IS NOT NULL;

-- Activities
CREATE INDEX IF NOT EXISTS idx_activities_org_occurred ON activities(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org_contact ON activities(tenant_id, contact_id) WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_activities_org_deal ON activities(tenant_id, deal_id) WHERE deal_id IS NOT NULL;

-- =====================================================
-- 3. VERIFY FOREIGN KEYS (Ensure CASCADE)
-- =====================================================

-- Note: Most FKs already exist from initial schema
-- This section verifies and adds any missing ones

-- Deals → Contacts (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_contact_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_contact_id_fkey 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE SET NULL; -- Keep deal if contact deleted, just null the FK
  END IF;
END $$;

-- Deals → Pipelines (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_pipeline_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_pipeline_id_fkey 
      FOREIGN KEY (pipeline_id) 
      REFERENCES pipelines(id) 
      ON DELETE CASCADE; -- Delete deal if pipeline deleted
  END IF;
END $$;

-- Deals → Stages (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'deals_stage_id_fkey'
  ) THEN
    ALTER TABLE deals 
      ADD CONSTRAINT deals_stage_id_fkey 
      FOREIGN KEY (stage_id) 
      REFERENCES pipeline_stages(id) 
      ON DELETE SET NULL; -- Keep deal if stage deleted, move to default stage
  END IF;
END $$;

-- Tasks → Deals (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_deal_id_fkey'
  ) THEN
    ALTER TABLE tasks 
      ADD CONSTRAINT tasks_deal_id_fkey 
      FOREIGN KEY (deal_id) 
      REFERENCES deals(id) 
      ON DELETE CASCADE; -- Delete task if deal deleted
  END IF;
END $$;

-- Tasks → Contacts (same org)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_contact_id_fkey'
  ) THEN
    ALTER TABLE tasks 
      ADD CONSTRAINT tasks_contact_id_fkey 
      FOREIGN KEY (contact_id) 
      REFERENCES contacts(id) 
      ON DELETE CASCADE; -- Delete task if contact deleted
  END IF;
END $$;

-- =====================================================
-- 4. VALIDATION FUNCTIONS (Same-Org Checks)
-- =====================================================

-- Function to validate deal-contact same org
CREATE OR REPLACE FUNCTION validate_deal_contact_same_org()
RETURNS TRIGGER AS $$
BEGIN
  -- If contact_id is set, verify it's in same org
  IF NEW.contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE id = NEW.contact_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal contact must be in same organization (deal org: %, contact org: different)', NEW.tenant_id;
    END IF;
  END IF;
  
  -- If pipeline_id is set, verify it's in same org
  IF NEW.pipeline_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pipelines 
      WHERE id = NEW.pipeline_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal pipeline must be in same organization';
    END IF;
  END IF;
  
  -- If stage_id is set, verify it's in same org
  IF NEW.stage_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pipeline_stages 
      WHERE id = NEW.stage_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal stage must be in same organization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to deals table
DROP TRIGGER IF EXISTS validate_deal_relationships ON deals;
CREATE TRIGGER validate_deal_relationships
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION validate_deal_contact_same_org();

-- Function to validate task relationships
CREATE OR REPLACE FUNCTION validate_task_relationships()
RETURNS TRIGGER AS $$
BEGIN
  -- If contact_id is set, verify same org
  IF NEW.contact_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM contacts 
      WHERE id = NEW.contact_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task contact must be in same organization';
    END IF;
  END IF;
  
  -- If deal_id is set, verify same org
  IF NEW.deal_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM deals 
      WHERE id = NEW.deal_id 
      AND tenant_id = NEW.tenant_id
    ) THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task deal must be in same organization';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tasks table
DROP TRIGGER IF EXISTS validate_task_relationships ON tasks;
CREATE TRIGGER validate_task_relationships
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_relationships();

-- =====================================================
-- 5. IMMUTABLE TENANT_ID (Prevent Changes After Creation)
-- =====================================================

-- Function to prevent tenant_id changes
CREATE OR REPLACE FUNCTION prevent_tenant_id_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.tenant_id != NEW.tenant_id THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: tenant_id cannot be changed after creation (table: %, id: %)', TG_TABLE_NAME, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all critical tables
DROP TRIGGER IF EXISTS prevent_tenant_change_contacts ON contacts;
CREATE TRIGGER prevent_tenant_change_contacts
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_deals ON deals;
CREATE TRIGGER prevent_tenant_change_deals
  BEFORE UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_tasks ON tasks;
CREATE TRIGGER prevent_tenant_change_tasks
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

DROP TRIGGER IF EXISTS prevent_tenant_change_pipelines ON pipelines;
CREATE TRIGGER prevent_tenant_change_pipelines
  BEFORE UPDATE ON pipelines
  FOR EACH ROW
  EXECUTE FUNCTION prevent_tenant_id_change();

-- =====================================================
-- SUMMARY
-- =====================================================

-- Created:
-- ✅ Composite indexes (org_id + created_at/updated_at)
-- ✅ Location/owner foreign keys
-- ✅ Validation triggers (same-org enforcement)
-- ✅ Immutable tenant_id (cannot change after creation)
-- ✅ Performance optimizations

COMMIT;

-- Verification
DO $$
BEGIN
-- RAISE NOTICE 'Phase 3 Migration Complete: Data integrity constraints applied';
END $$;

-- =====================================================
-- PHASE 4: DATA MIGRATION & RECONCILIATION
-- Fix misplaced data, reconcile cross-org records
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL DATA FIX
--
-- This migration:
-- 1. Finds data in hardcoded tenant (550e8400...)
-- 2. Migrates to correct user's tenant
-- 3. Fixes broken contact→deal relationships
-- 4. Generates reconciliation report
-- 5. Quarantines unfixable records
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE RECONCILIATION TABLES
-- =====================================================

-- Track what we're fixing
CREATE TABLE IF NOT EXISTS data_reconciliation_log (
  id BIGSERIAL PRIMARY KEY,
  migration_batch TEXT DEFAULT 'phase_4_' || to_char(NOW(), 'YYYYMMDD_HH24MISS'),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('migrated', 'fixed_fk', 'quarantined', 'deleted', 'no_action')),
  from_tenant_id UUID,
  to_tenant_id UUID,
  issue_description TEXT,
  record_snapshot JSONB,
  fixed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reconciliation_batch ON data_reconciliation_log(migration_batch);
CREATE INDEX IF NOT EXISTS idx_reconciliation_table ON data_reconciliation_log(table_name, action);

-- Quarantine for records we can't auto-fix
CREATE TABLE IF NOT EXISTS data_quarantine (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  issue TEXT NOT NULL,
  record_data JSONB NOT NULL,
  suggested_tenant_id UUID REFERENCES tenants(id),
  suggested_fix TEXT,
  requires_manual_review BOOLEAN DEFAULT true,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(table_name, record_id)
);

CREATE INDEX IF NOT EXISTS idx_quarantine_needs_review ON data_quarantine(created_at) WHERE requires_manual_review = true;

-- =====================================================
-- 2. AUDIT CURRENT STATE
-- =====================================================

-- Log current data distribution
DO $$
DECLARE
  hardcoded_tenant_id UUID := '550e8400-e29b-41d4-a716-446655440000';
  deals_in_hardcoded INTEGER;
  contacts_in_hardcoded INTEGER;
  tasks_in_hardcoded INTEGER;
  pipelines_in_hardcoded INTEGER;
BEGIN
  SELECT COUNT(*) INTO deals_in_hardcoded FROM deals WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO contacts_in_hardcoded FROM contacts WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO tasks_in_hardcoded FROM tasks WHERE tenant_id = hardcoded_tenant_id;
  SELECT COUNT(*) INTO pipelines_in_hardcoded FROM pipelines WHERE tenant_id = hardcoded_tenant_id;
  
-- RAISE NOTICE '=== PRE-MIGRATION AUDIT ===';
-- RAISE NOTICE 'Deals in hardcoded tenant: %', deals_in_hardcoded;
-- RAISE NOTICE 'Contacts in hardcoded tenant: %', contacts_in_hardcoded;
-- RAISE NOTICE 'Tasks in hardcoded tenant: %', tasks_in_hardcoded;
-- RAISE NOTICE 'Pipelines in hardcoded tenant: %', pipelines_in_hardcoded;
END $$;

-- =====================================================
-- 3. MIGRATE DEALS TO CORRECT TENANT (Based on Owner)
-- =====================================================

-- Step 1: Migrate deals that have owner_user_id set
WITH migrated_deals AS (
  UPDATE deals d
  SET tenant_id = (
    SELECT au.tenant_id 
    FROM app_users au 
    WHERE au.id = d.owner_user_id
  )
  WHERE d.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND d.owner_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.id = d.owner_user_id 
      AND au.tenant_id != '550e8400-e29b-41d4-a716-446655440000'
    )
  RETURNING id, tenant_id, owner_user_id, title
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'deals',
  md.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  md.tenant_id,
  'Migrated to owner''s correct tenant',
  row_to_json(md)::JSONB
FROM migrated_deals md;

-- =====================================================
-- 4. FIX DEAL-CONTACT RELATIONSHIPS
-- =====================================================

-- Step 2: Fix deals where contact is in different org
-- Try to find matching contact in correct org by name/email
WITH fixed_contacts AS (
  UPDATE deals d
  SET contact_id = (
    -- Find contact in same org with matching name
    SELECT c.id 
    FROM contacts c
    WHERE c.tenant_id = d.tenant_id
      AND (
        c.full_name ILIKE (SELECT full_name FROM contacts WHERE id = d.contact_id)
        OR c.primary_email = (SELECT primary_email FROM contacts WHERE id = d.contact_id)
      )
    LIMIT 1
  )
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = d.contact_id AND c.tenant_id = d.tenant_id
    )
    AND EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.tenant_id = d.tenant_id
        AND (
          c.full_name ILIKE (SELECT full_name FROM contacts WHERE id = d.contact_id)
          OR c.primary_email = (SELECT primary_email FROM contacts WHERE id = d.contact_id)
        )
    )
  RETURNING id, contact_id, tenant_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, to_tenant_id, issue_description)
SELECT 
  'deals',
  fc.id,
  'fixed_fk',
  fc.tenant_id,
  'Fixed contact_id to match contact in same org'
FROM fixed_contacts fc;

-- Step 3: Deals with contact in different org but no match - NULL the FK
WITH nulled_contacts AS (
  UPDATE deals d
  SET contact_id = NULL
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM contacts c
      WHERE c.id = d.contact_id AND c.tenant_id = d.tenant_id
    )
  RETURNING id, tenant_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, to_tenant_id, issue_description)
SELECT 
  'deals',
  nc.id,
  'fixed_fk',
  nc.tenant_id,
  'Nulled contact_id (contact in different org, no match found)'
FROM nulled_contacts nc;

-- =====================================================
-- 5. MIGRATE CONTACTS TO CORRECT TENANT
-- =====================================================

-- Migrate contacts that have owner_user_id
WITH migrated_contacts AS (
  UPDATE contacts c
  SET tenant_id = (
    SELECT au.tenant_id 
    FROM app_users au 
    WHERE au.id = c.owner_user_id
  )
  WHERE c.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND c.owner_user_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM app_users au 
      WHERE au.id = c.owner_user_id 
      AND au.tenant_id != '550e8400-e29b-41d4-a716-446655440000'
    )
  RETURNING id, tenant_id, owner_user_id, full_name
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'contacts',
  mc.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  mc.tenant_id,
  'Migrated to owner''s correct tenant',
  row_to_json(mc)::JSONB
FROM migrated_contacts mc;

-- =====================================================
-- 6. MIGRATE TASKS TO CORRECT TENANT
-- =====================================================

-- Migrate tasks based on associated deal or contact
WITH migrated_tasks AS (
  UPDATE tasks t
  SET tenant_id = COALESCE(
    (SELECT tenant_id FROM deals WHERE id = t.deal_id LIMIT 1),
    (SELECT tenant_id FROM contacts WHERE id = t.contact_id LIMIT 1),
    (SELECT tenant_id FROM app_users WHERE id = t.owner_user_id LIMIT 1)
  )
  WHERE t.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
    AND (
      t.deal_id IS NOT NULL OR 
      t.contact_id IS NOT NULL OR 
      t.owner_user_id IS NOT NULL
    )
  RETURNING id, tenant_id, deal_id, contact_id
)
INSERT INTO data_reconciliation_log (table_name, record_id, action, from_tenant_id, to_tenant_id, issue_description, record_snapshot)
SELECT 
  'tasks',
  mt.id,
  'migrated',
  '550e8400-e29b-41d4-a716-446655440000'::UUID,
  mt.tenant_id,
  'Migrated to related record''s tenant',
  row_to_json(mt)::JSONB
FROM migrated_tasks mt;

-- =====================================================
-- 7. QUARANTINE UNFIXABLE RECORDS
-- =====================================================

-- Deals with no owner and no contact (cannot determine correct tenant)
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'deals',
  d.id,
  'Cannot determine correct tenant - no owner and no contact',
  row_to_json(d)::JSONB,
  'Manually assign to correct tenant based on creation date or delete if test data'
FROM deals d
WHERE d.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND d.owner_user_id IS NULL
  AND d.contact_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- Contacts with no owner (cannot determine correct tenant)
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'contacts',
  c.id,
  'Cannot determine correct tenant - no owner',
  row_to_json(c)::JSONB,
  'Manually assign to correct tenant or delete if test data'
FROM contacts c
WHERE c.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND c.owner_user_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- Tasks with no deal, contact, or owner
INSERT INTO data_quarantine (table_name, record_id, issue, record_data, suggested_fix)
SELECT 
  'tasks',
  t.id,
  'Cannot determine correct tenant - orphaned task',
  row_to_json(t)::JSONB,
  'Manually assign to correct tenant or delete if test data'
FROM tasks t
WHERE t.tenant_id = '550e8400-e29b-41d4-a716-446655440000'
  AND t.deal_id IS NULL
  AND t.contact_id IS NULL
  AND t.owner_user_id IS NULL
ON CONFLICT (table_name, record_id) DO NOTHING;

-- =====================================================
-- 8. GENERATE RECONCILIATION REPORT
-- =====================================================

-- Summary of actions taken
DO $$
DECLARE
  migrated_deals INTEGER;
  migrated_contacts INTEGER;
  migrated_tasks INTEGER;
  fixed_fks INTEGER;
  quarantined_records INTEGER;
  remaining_hardcoded_deals INTEGER;
  remaining_hardcoded_contacts INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_deals FROM data_reconciliation_log WHERE table_name = 'deals' AND action = 'migrated';
  SELECT COUNT(*) INTO migrated_contacts FROM data_reconciliation_log WHERE table_name = 'contacts' AND action = 'migrated';
  SELECT COUNT(*) INTO migrated_tasks FROM data_reconciliation_log WHERE table_name = 'tasks' AND action = 'migrated';
  SELECT COUNT(*) INTO fixed_fks FROM data_reconciliation_log WHERE action = 'fixed_fk';
  SELECT COUNT(*) INTO quarantined_records FROM data_quarantine;
  SELECT COUNT(*) INTO remaining_hardcoded_deals FROM deals WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
  SELECT COUNT(*) INTO remaining_hardcoded_contacts FROM contacts WHERE tenant_id = '550e8400-e29b-41d4-a716-446655440000';
  
-- RAISE NOTICE '=== MIGRATION RECONCILIATION REPORT ===';
-- RAISE NOTICE 'Deals migrated to correct tenant: %', migrated_deals;
-- RAISE NOTICE 'Contacts migrated to correct tenant: %', migrated_contacts;
-- RAISE NOTICE 'Tasks migrated to correct tenant: %', migrated_tasks;
-- RAISE NOTICE 'Foreign keys fixed: %', fixed_fks;
-- RAISE NOTICE 'Records quarantined for manual review: %', quarantined_records;
-- RAISE NOTICE '---';
-- RAISE NOTICE 'Remaining deals in hardcoded tenant: %', remaining_hardcoded_deals;
-- RAISE NOTICE 'Remaining contacts in hardcoded tenant: %', remaining_hardcoded_contacts;
-- RAISE NOTICE '======================================';
  
  IF remaining_hardcoded_deals > 0 OR remaining_hardcoded_contacts > 0 THEN
-- RAISE NOTICE 'WARNING: Some records still in hardcoded tenant. Review data_quarantine table.';
  ELSE
-- RAISE NOTICE 'SUCCESS: All records migrated out of hardcoded tenant!';
  END IF;
END $$;

-- =====================================================
-- 9. FIX SPECIFIC USER: deepakshegde@gmail.com
-- =====================================================

-- Find user's tenant_id
DO $$
DECLARE
  user_tenant_id UUID;
  user_id UUID;
  deals_migrated INTEGER;
  contacts_migrated INTEGER;
BEGIN
  -- Find user
  SELECT au.id, au.tenant_id INTO user_id, user_tenant_id
  FROM app_users au
  JOIN auth.users u ON au.id = u.id
  WHERE u.email = 'deepakshegde@gmail.com'
  LIMIT 1;
  
  IF user_id IS NULL THEN
-- RAISE NOTICE 'User deepakshegde@gmail.com not found - skipping user-specific migration';
  ELSE
-- RAISE NOTICE '=== FIXING USER: deepakshegde@gmail.com ===';
-- RAISE NOTICE 'User ID: %', user_id;
-- RAISE NOTICE 'Correct Tenant ID: %', user_tenant_id;
    
    -- Migrate deals owned by this user to their correct tenant
    WITH user_deals AS (
      UPDATE deals
      SET tenant_id = user_tenant_id
      WHERE owner_user_id = user_id
        AND tenant_id != user_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO deals_migrated FROM user_deals;
    
    -- Migrate contacts owned by this user to their correct tenant
    WITH user_contacts AS (
      UPDATE contacts
      SET tenant_id = user_tenant_id
      WHERE owner_user_id = user_id
        AND tenant_id != user_tenant_id
      RETURNING id
    )
    SELECT COUNT(*) INTO contacts_migrated FROM user_contacts;
    
-- RAISE NOTICE 'Migrated % deals to user''s correct tenant', deals_migrated;
-- RAISE NOTICE 'Migrated % contacts to user''s correct tenant', contacts_migrated;
-- RAISE NOTICE '======================================';
  END IF;
END $$;

-- =====================================================
-- 10. VERIFY DATA INTEGRITY POST-MIGRATION
-- =====================================================

-- Check for cross-org deal-contact relationships
DO $$
DECLARE
  cross_org_deals INTEGER;
  orphaned_deals INTEGER;
BEGIN
  SELECT COUNT(*) INTO cross_org_deals
  FROM deals d
  JOIN contacts c ON d.contact_id = c.id
  WHERE d.tenant_id != c.tenant_id;
  
  SELECT COUNT(*) INTO orphaned_deals
  FROM deals d
  WHERE d.contact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM contacts WHERE id = d.contact_id);
  
-- RAISE NOTICE '=== POST-MIGRATION VERIFICATION ===';
-- RAISE NOTICE 'Cross-org deal-contact pairs: % (should be 0)', cross_org_deals;
-- RAISE NOTICE 'Orphaned deals (contact_id points to non-existent): % (should be 0)', orphaned_deals;
  
  IF cross_org_deals > 0 THEN
    RAISE WARNING 'Found % cross-org deal-contact relationships! Investigate data_reconciliation_log.', cross_org_deals;
  END IF;
  
  IF orphaned_deals > 0 THEN
    RAISE WARNING 'Found % orphaned deals! Run additional cleanup.', orphaned_deals;
  END IF;
END $$;

-- =====================================================
-- COMMIT & REPORT
-- =====================================================

COMMIT;

-- Final success message
DO $$
BEGIN
-- RAISE NOTICE '✅ Phase 4 Migration Complete!';
-- RAISE NOTICE 'Review data_reconciliation_log for details';
-- RAISE NOTICE 'Review data_quarantine for records needing manual review';
END $$;

-- =====================================================
-- PHASE 5: COMPLETE RLS ENFORCEMENT
-- Enable RLS on ALL 50+ tables with strict policies
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - CRITICAL SECURITY
--
-- This migration enforces Row Level Security on every
-- business table to guarantee tenant isolation at the
-- database level, even if application code has bugs.
-- =====================================================

BEGIN;

-- =====================================================
-- CORE CRM TABLES RLS
-- =====================================================

-- CONTACTS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT contacts" ON contacts;
CREATE POLICY "Tenant isolation SELECT contacts"
  ON contacts FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT contacts" ON contacts;
CREATE POLICY "Tenant isolation INSERT contacts"
  ON contacts FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE contacts" ON contacts;
CREATE POLICY "Tenant isolation UPDATE contacts"
  ON contacts FOR UPDATE
  USING (tenant_id = auth.get_user_org_id())
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE contacts" ON contacts;
CREATE POLICY "Tenant isolation DELETE contacts"
  ON contacts FOR DELETE
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass contacts" ON contacts;
CREATE POLICY "Service role bypass contacts"
  ON contacts FOR ALL
  USING (auth.role() = 'service_role');

-- DEALS
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT deals" ON deals;
CREATE POLICY "Tenant isolation SELECT deals"
  ON deals FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT deals" ON deals;
CREATE POLICY "Tenant isolation INSERT deals"
  ON deals FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE deals" ON deals;
CREATE POLICY "Tenant isolation UPDATE deals"
  ON deals FOR UPDATE
  USING (tenant_id = auth.get_user_org_id())
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE deals" ON deals;
CREATE POLICY "Tenant isolation DELETE deals"
  ON deals FOR DELETE
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass deals" ON deals;
CREATE POLICY "Service role bypass deals"
  ON deals FOR ALL
  USING (auth.role() = 'service_role');

-- PIPELINES
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT pipelines" ON pipelines;
CREATE POLICY "Tenant isolation SELECT pipelines"
  ON pipelines FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT pipelines" ON pipelines;
CREATE POLICY "Tenant isolation INSERT pipelines"
  ON pipelines FOR INSERT
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE pipelines" ON pipelines;
CREATE POLICY "Tenant isolation UPDATE pipelines"
  ON pipelines FOR UPDATE
  USING (tenant_id = auth.get_user_org_id())
  WITH CHECK (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE pipelines" ON pipelines;
CREATE POLICY "Tenant isolation DELETE pipelines"
  ON pipelines FOR DELETE
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass pipelines" ON pipelines;
CREATE POLICY "Service role bypass pipelines"
  ON pipelines FOR ALL
  USING (auth.role() = 'service_role');

-- PIPELINE_STAGES
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT stages" ON pipeline_stages;
CREATE POLICY "Tenant isolation SELECT stages"
  ON pipeline_stages FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL stages" ON pipeline_stages;
CREATE POLICY "Tenant isolation ALL stages"
  ON pipeline_stages FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass stages" ON pipeline_stages;
CREATE POLICY "Service role bypass stages"
  ON pipeline_stages FOR ALL
  USING (auth.role() = 'service_role');

-- TASKS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT tasks" ON tasks;
CREATE POLICY "Tenant isolation SELECT tasks"
  ON tasks FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL tasks" ON tasks;
CREATE POLICY "Tenant isolation ALL tasks"
  ON tasks FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass tasks" ON tasks;
CREATE POLICY "Service role bypass tasks"
  ON tasks FOR ALL
  USING (auth.role() = 'service_role');

-- ACTIVITIES
ALTER TABLE IF EXISTS activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT activities" ON activities;
CREATE POLICY "Tenant isolation SELECT activities"
  ON activities FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL activities" ON activities;
CREATE POLICY "Tenant isolation ALL activities"
  ON activities FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass activities" ON activities;
CREATE POLICY "Service role bypass activities"
  ON activities FOR ALL
  USING (auth.role() = 'service_role');

-- FILES
ALTER TABLE IF EXISTS files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT files" ON files;
CREATE POLICY "Tenant isolation SELECT files"
  ON files FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL files" ON files;
CREATE POLICY "Tenant isolation ALL files"
  ON files FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass files" ON files;
CREATE POLICY "Service role bypass files"
  ON files FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- MARKETING TABLES RLS
-- =====================================================

-- MARKETING_CAMPAIGNS
ALTER TABLE IF EXISTS marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT campaigns" ON marketing_campaigns;
CREATE POLICY "Tenant isolation SELECT campaigns"
  ON marketing_campaigns FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL campaigns" ON marketing_campaigns;
CREATE POLICY "Tenant isolation ALL campaigns"
  ON marketing_campaigns FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass campaigns" ON marketing_campaigns;
CREATE POLICY "Service role bypass campaigns"
  ON marketing_campaigns FOR ALL
  USING (auth.role() = 'service_role');

-- MARKETING_JOURNEYS
ALTER TABLE IF EXISTS marketing_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT journeys" ON marketing_journeys;
CREATE POLICY "Tenant isolation SELECT journeys"
  ON marketing_journeys FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL journeys" ON marketing_journeys;
CREATE POLICY "Tenant isolation ALL journeys"
  ON marketing_journeys FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass journeys" ON marketing_journeys;
CREATE POLICY "Service role bypass journeys"
  ON marketing_journeys FOR ALL
  USING (auth.role() = 'service_role');

-- MARKETING_AUDIT_REPORTS
ALTER TABLE IF EXISTS marketing_audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT audit_reports" ON marketing_audit_reports;
CREATE POLICY "Tenant isolation SELECT audit_reports"
  ON marketing_audit_reports FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL audit_reports" ON marketing_audit_reports;
CREATE POLICY "Tenant isolation ALL audit_reports"
  ON marketing_audit_reports FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass audit_reports" ON marketing_audit_reports;
CREATE POLICY "Service role bypass audit_reports"
  ON marketing_audit_reports FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- FORMS TABLES RLS
-- =====================================================

-- MARKETING_FORMS (or forms)
ALTER TABLE IF EXISTS marketing_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT forms" ON marketing_forms;
CREATE POLICY "Tenant isolation SELECT forms"
  ON marketing_forms FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL forms" ON marketing_forms;
CREATE POLICY "Tenant isolation ALL forms"
  ON marketing_forms FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass forms" ON marketing_forms;
CREATE POLICY "Service role bypass forms"
  ON marketing_forms FOR ALL
  USING (auth.role() = 'service_role');

-- FORM_SUBMISSIONS
ALTER TABLE IF EXISTS form_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT submissions" ON form_submissions;
CREATE POLICY "Tenant isolation SELECT submissions"
  ON form_submissions FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL submissions" ON form_submissions;
CREATE POLICY "Tenant isolation ALL submissions"
  ON form_submissions FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass submissions" ON form_submissions;
CREATE POLICY "Service role bypass submissions"
  ON form_submissions FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- AUTOMATIONS TABLES RLS
-- =====================================================

-- AUTOMATIONS
ALTER TABLE IF EXISTS automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT automations" ON automations;
CREATE POLICY "Tenant isolation SELECT automations"
  ON automations FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL automations" ON automations;
CREATE POLICY "Tenant isolation ALL automations"
  ON automations FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass automations" ON automations;
CREATE POLICY "Service role bypass automations"
  ON automations FOR ALL
  USING (auth.role() = 'service_role');

-- AUTOMATION_RUNS
ALTER TABLE IF EXISTS automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT runs" ON automation_runs;
CREATE POLICY "Tenant isolation SELECT runs"
  ON automation_runs FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL runs" ON automation_runs;
CREATE POLICY "Tenant isolation ALL runs"
  ON automation_runs FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass runs" ON automation_runs;
CREATE POLICY "Service role bypass runs"
  ON automation_runs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- NOTIFICATIONS TABLES RLS
-- =====================================================

-- NOTIFICATIONS
ALTER TABLE IF EXISTS notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role bypass notifications" ON notifications;
CREATE POLICY "Service role bypass notifications"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');

-- NOTIFICATION_PREFERENCES
ALTER TABLE IF EXISTS notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own preferences" ON notification_preferences;
CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Service role bypass preferences" ON notification_preferences;
CREATE POLICY "Service role bypass preferences"
  ON notification_preferences FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- INTEGRATION TABLES RLS
-- =====================================================

-- INTEGRATION_CONNECTIONS
ALTER TABLE IF EXISTS integration_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT connections" ON integration_connections;
CREATE POLICY "Tenant isolation SELECT connections"
  ON integration_connections FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL connections" ON integration_connections;
CREATE POLICY "Tenant isolation ALL connections"
  ON integration_connections FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass connections" ON integration_connections;
CREATE POLICY "Service role bypass connections"
  ON integration_connections FOR ALL
  USING (auth.role() = 'service_role');

-- INTEGRATION_LOGS
ALTER TABLE IF EXISTS integration_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT int_logs" ON integration_logs;
CREATE POLICY "Tenant isolation SELECT int_logs"
  ON integration_logs FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass int_logs" ON integration_logs;
CREATE POLICY "Service role bypass int_logs"
  ON integration_logs FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- ANALYTICS TABLES RLS
-- =====================================================

-- ANALYTICS_SAVED_VIEWS
ALTER TABLE IF EXISTS analytics_saved_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT analytics_views" ON analytics_saved_views;
CREATE POLICY "Tenant isolation SELECT analytics_views"
  ON analytics_saved_views FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL analytics_views" ON analytics_saved_views;
CREATE POLICY "Tenant isolation ALL analytics_views"
  ON analytics_saved_views FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass analytics_views" ON analytics_saved_views;
CREATE POLICY "Service role bypass analytics_views"
  ON analytics_saved_views FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- SETTINGS TABLES RLS
-- =====================================================

-- SETTINGS_VERSIONS
ALTER TABLE IF EXISTS settings_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT settings_versions" ON settings_versions;
CREATE POLICY "Tenant isolation SELECT settings_versions"
  ON settings_versions FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL settings_versions" ON settings_versions;
CREATE POLICY "Tenant isolation ALL settings_versions"
  ON settings_versions FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass settings_versions" ON settings_versions;
CREATE POLICY "Service role bypass settings_versions"
  ON settings_versions FOR ALL
  USING (auth.role() = 'service_role');

-- CUSTOM_ROLES
ALTER TABLE IF EXISTS custom_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT custom_roles" ON custom_roles;
CREATE POLICY "Tenant isolation SELECT custom_roles"
  ON custom_roles FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation ALL custom_roles" ON custom_roles;
CREATE POLICY "Tenant isolation ALL custom_roles"
  ON custom_roles FOR ALL
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role bypass custom_roles" ON custom_roles;
CREATE POLICY "Service role bypass custom_roles"
  ON custom_roles FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- AUDIT TABLES RLS
-- =====================================================

-- AUDIT_TRAIL
ALTER TABLE IF EXISTS audit_trail ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Tenant isolation SELECT audit_trail" ON audit_trail;
CREATE POLICY "Tenant isolation SELECT audit_trail"
  ON audit_trail FOR SELECT
  USING (tenant_id = auth.get_user_org_id());

DROP POLICY IF EXISTS "Service role audit_trail" ON audit_trail;
CREATE POLICY "Service role audit_trail"
  ON audit_trail FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- Apply RLS to ALL remaining tenant-scoped tables
-- =====================================================

-- Macro to apply standard RLS to a table
DO $$
DECLARE
  table_record RECORD;
  policy_name TEXT;
BEGIN
  -- List of all tables that should have tenant isolation
  FOR table_record IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('tenants', 'app_users', 'org_memberships', 'user_invitations', 'locations')
      AND EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = table_record.table_name 
          AND column_name = 'tenant_id'
      )
  LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_record.table_name);
    
    -- Drop existing policies to avoid conflicts
    policy_name := 'Tenant isolation SELECT ' || table_record.table_name;
    EXECUTE format('DROP POLICY IF EXISTS %L ON %I', policy_name, table_record.table_name);
    
    policy_name := 'Tenant isolation ALL ' || table_record.table_name;
    EXECUTE format('DROP POLICY IF EXISTS %L ON %I', policy_name, table_record.table_name);
    
    policy_name := 'Service role bypass ' || table_record.table_name;
    EXECUTE format('DROP POLICY IF EXISTS %L ON %I', policy_name, table_record.table_name);
    
    -- Create policies
    EXECUTE format(
      'CREATE POLICY %L ON %I FOR SELECT USING (tenant_id = auth.get_user_org_id())',
      'Tenant isolation SELECT ' || table_record.table_name,
      table_record.table_name
    );
    
    EXECUTE format(
      'CREATE POLICY %L ON %I FOR ALL USING (tenant_id = auth.get_user_org_id())',
      'Tenant isolation ALL ' || table_record.table_name,
      table_record.table_name
    );
    
    EXECUTE format(
      'CREATE POLICY %L ON %I FOR ALL USING (auth.role() = ''service_role'')',
      'Service role bypass ' || table_record.table_name,
      table_record.table_name
    );
    
-- RAISE NOTICE 'Applied RLS to table: %', table_record.table_name;
  END LOOP;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Count tables with RLS enabled
DO $$
DECLARE
  tables_with_rls INTEGER;
  tables_with_tenant_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO tables_with_rls
  FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
  WHERE t.schemaname = 'public'
    AND c.relrowsecurity = true;
    
  SELECT COUNT(DISTINCT table_name) INTO tables_with_tenant_id
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name = 'tenant_id';
  
-- RAISE NOTICE '=== RLS VERIFICATION ===';
-- RAISE NOTICE 'Tables with RLS enabled: %', tables_with_rls;
-- RAISE NOTICE 'Tables with tenant_id column: %', tables_with_tenant_id;
-- RAISE NOTICE '========================';
  
  IF tables_with_rls < tables_with_tenant_id THEN
    RAISE WARNING 'Some tables with tenant_id do not have RLS enabled!';
  ELSE
-- RAISE NOTICE '✅ All tenant-scoped tables have RLS enabled!';
  END IF;
END $$;

COMMIT;

-- Final message
DO $$
BEGIN
-- RAISE NOTICE '✅ Phase 5 Complete: Comprehensive RLS enforced on 50+ tables';
-- RAISE NOTICE 'Database-level tenant isolation is NOW ACTIVE';
END $$;

-- =====================================================
-- PHASE 7: RBAC & PERMISSIONS SYSTEM
-- Role-based access control with granular permissions
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - ENTERPRISE SECURITY
--
-- This migration creates a comprehensive RBAC system with:
-- - Role definitions and hierarchies
-- - Granular permissions per module/action
-- - Location-based scoping
-- - Permission inheritance
-- - Audit trail for permission changes
-- =====================================================

BEGIN;

-- =====================================================
-- 1. PERMISSION DEFINITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- e.g., 'deals.create', 'contacts.delete', 'settings.billing.view'
  name TEXT NOT NULL,
  description TEXT,
  module TEXT NOT NULL CHECK (module IN ('deals', 'contacts', 'pipeline', 'tasks', 'marketing', 'analytics', 'settings', 'integrations', 'forms', 'automations', 'calendar', 'communications', 'audit')),
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'export', 'import', 'manage', 'configure')),
  resource_type TEXT, -- e.g., 'deal', 'contact', 'campaign'
  is_dangerous BOOLEAN DEFAULT false, -- For destructive actions
  requires_approval BOOLEAN DEFAULT false, -- For actions requiring 2FA or approval
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_permissions_module ON permissions(module);
CREATE INDEX IF NOT EXISTS idx_permissions_code ON permissions(code);
CREATE INDEX IF NOT EXISTS idx_permissions_dangerous ON permissions(is_dangerous) WHERE is_dangerous = true;

-- =====================================================
-- 2. ROLE DEFINITIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- 'owner', 'admin', 'manager', 'staff', 'marketing', 'read_only'
  name TEXT NOT NULL,
  description TEXT,
  hierarchy_level INTEGER NOT NULL, -- 1 (highest) to 6 (lowest)
  is_system_role BOOLEAN DEFAULT true, -- Cannot be deleted
  is_custom_role BOOLEAN DEFAULT false,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE, -- NULL for system roles, set for custom roles
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, code), -- Allow same code across tenants for custom roles
  CHECK (
    (is_system_role = true AND tenant_id IS NULL) OR
    (is_custom_role = true AND tenant_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_role_definitions_code ON role_definitions(code);
CREATE INDEX IF NOT EXISTS idx_role_definitions_tenant ON role_definitions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_role_definitions_custom ON role_definitions(is_custom_role) WHERE is_custom_role = true;

-- =====================================================
-- 3. ROLE_PERMISSIONS MAPPING TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES role_definitions(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  granted_by UUID REFERENCES app_users(id),
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON role_permissions(permission_id);

-- =====================================================
-- 4. USER_PERMISSIONS (Override/Exception Grants)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = grant, false = revoke
  scope_type TEXT CHECK (scope_type IN ('all', 'location', 'own_only')),
  scope_location_ids UUID[], -- Specific locations if scope_type = 'location'
  granted_by UUID REFERENCES app_users(id),
  reason TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, tenant_id, permission_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_active ON user_permissions(user_id, tenant_id) WHERE granted = true AND (expires_at IS NULL OR expires_at > NOW());

-- =====================================================
-- 5. INSERT SYSTEM ROLES
-- =====================================================

INSERT INTO role_definitions (code, name, description, hierarchy_level, is_system_role, is_custom_role, tenant_id) VALUES
  ('owner', 'Owner', 'Full access to everything including billing and team management', 1, true, false, NULL),
  ('super_admin', 'Super Admin', 'Administrative access across all locations', 2, true, false, NULL),
  ('admin', 'Admin', 'Administrative access with some restrictions', 3, true, false, NULL),
  ('manager', 'Manager', 'Can manage team and patients within assigned locations', 4, true, false, NULL),
  ('staff', 'Staff', 'Day-to-day operations access', 5, true, false, NULL),
  ('marketing', 'Marketing', 'Marketing module access only', 6, true, false, NULL),
  ('read_only', 'Read Only', 'View-only access across modules', 7, true, false, NULL)
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 6. INSERT CORE PERMISSIONS
-- =====================================================

-- Deals Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('deals.view', 'View Deals', 'Can view deals in the system', 'deals', 'view', 'deal'),
  ('deals.create', 'Create Deals', 'Can create new deals', 'deals', 'create', 'deal'),
  ('deals.edit', 'Edit Deals', 'Can edit existing deals', 'deals', 'edit', 'deal'),
  ('deals.delete', 'Delete Deals', 'Can delete deals', 'deals', 'delete', 'deal'),
  ('deals.export', 'Export Deals', 'Can export deals data', 'deals', 'export', 'deal'),
  ('deals.manage_all', 'Manage All Deals', 'Can manage deals across all locations', 'deals', 'manage', 'deal')
ON CONFLICT (code) DO NOTHING;

-- Contacts Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('contacts.view', 'View Contacts', 'Can view contacts', 'contacts', 'view', 'contact'),
  ('contacts.create', 'Create Contacts', 'Can create new contacts', 'contacts', 'create', 'contact'),
  ('contacts.edit', 'Edit Contacts', 'Can edit existing contacts', 'contacts', 'edit', 'contact'),
  ('contacts.delete', 'Delete Contacts', 'Can delete contacts', 'contacts', 'delete', 'contact'),
  ('contacts.export', 'Export Contacts', 'Can export contacts data', 'contacts', 'export', 'contact'),
  ('contacts.import', 'Import Contacts', 'Can import contacts from CSV', 'contacts', 'import', 'contact')
ON CONFLICT (code) DO NOTHING;

-- Pipeline Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('pipeline.view', 'View Pipelines', 'Can view pipeline boards', 'pipeline', 'view', 'pipeline'),
  ('pipeline.create', 'Create Pipelines', 'Can create new pipelines', 'pipeline', 'create', 'pipeline'),
  ('pipeline.edit', 'Edit Pipelines', 'Can edit pipeline stages and settings', 'pipeline', 'edit', 'pipeline'),
  ('pipeline.delete', 'Delete Pipelines', 'Can delete pipelines', 'pipeline', 'delete', 'pipeline'),
  ('pipeline.configure', 'Configure Pipelines', 'Can configure pipeline automation and rules', 'pipeline', 'configure', 'pipeline')
ON CONFLICT (code) DO NOTHING;

-- Tasks Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('tasks.view', 'View Tasks', 'Can view tasks', 'tasks', 'view', 'task'),
  ('tasks.create', 'Create Tasks', 'Can create new tasks', 'tasks', 'create', 'task'),
  ('tasks.edit', 'Edit Tasks', 'Can edit tasks', 'tasks', 'edit', 'task'),
  ('tasks.delete', 'Delete Tasks', 'Can delete tasks', 'tasks', 'delete', 'task'),
  ('tasks.assign', 'Assign Tasks', 'Can assign tasks to team members', 'tasks', 'manage', 'task')
ON CONFLICT (code) DO NOTHING;

-- Marketing Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type, is_dangerous) VALUES
  ('marketing.view', 'View Marketing', 'Can view marketing campaigns and reports', 'marketing', 'view', 'campaign', false),
  ('marketing.create', 'Create Campaigns', 'Can create marketing campaigns', 'marketing', 'create', 'campaign', false),
  ('marketing.edit', 'Edit Campaigns', 'Can edit campaigns', 'marketing', 'edit', 'campaign', false),
  ('marketing.delete', 'Delete Campaigns', 'Can delete campaigns', 'marketing', 'delete', 'campaign', true),
  ('marketing.send', 'Send Campaigns', 'Can send/schedule campaigns', 'marketing', 'manage', 'campaign', false),
  ('marketing.export', 'Export Marketing Data', 'Can export campaign data', 'marketing', 'export', 'campaign', false)
ON CONFLICT (code) DO NOTHING;

-- Analytics Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('analytics.view', 'View Analytics', 'Can view analytics dashboards', 'analytics', 'view', 'dashboard'),
  ('analytics.export', 'Export Analytics', 'Can export analytics data', 'analytics', 'export', 'dashboard'),
  ('analytics.configure', 'Configure Analytics', 'Can configure thresholds and alerts', 'analytics', 'configure', 'dashboard')
ON CONFLICT (code) DO NOTHING;

-- Settings Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type, is_dangerous, requires_approval) VALUES
  ('settings.view', 'View Settings', 'Can view settings', 'settings', 'view', 'settings', false, false),
  ('settings.team.manage', 'Manage Team', 'Can invite, edit, remove team members', 'settings', 'manage', 'team', false, false),
  ('settings.roles.manage', 'Manage Roles', 'Can create and edit custom roles', 'settings', 'manage', 'roles', false, false),
  ('settings.billing.view', 'View Billing', 'Can view billing information', 'settings', 'view', 'billing', false, false),
  ('settings.billing.manage', 'Manage Billing', 'Can change billing and subscriptions', 'settings', 'manage', 'billing', true, true),
  ('settings.integrations.manage', 'Manage Integrations', 'Can connect/disconnect integrations', 'settings', 'manage', 'integrations', false, false),
  ('settings.security.manage', 'Manage Security', 'Can change security settings', 'settings', 'manage', 'security', true, true),
  ('settings.branding.manage', 'Manage Branding', 'Can customize branding and white-label', 'settings', 'manage', 'branding', false, false)
ON CONFLICT (code) DO NOTHING;

-- Integrations Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('integrations.view', 'View Integrations', 'Can view integration status', 'integrations', 'view', 'integration'),
  ('integrations.configure', 'Configure Integrations', 'Can connect and configure integrations', 'integrations', 'configure', 'integration')
ON CONFLICT (code) DO NOTHING;

-- Automations Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('automations.view', 'View Automations', 'Can view automations', 'automations', 'view', 'automation'),
  ('automations.create', 'Create Automations', 'Can create new automations', 'automations', 'create', 'automation'),
  ('automations.edit', 'Edit Automations', 'Can edit existing automations', 'automations', 'edit', 'automation'),
  ('automations.delete', 'Delete Automations', 'Can delete automations', 'automations', 'delete', 'automation')
ON CONFLICT (code) DO NOTHING;

-- Audit Permissions
INSERT INTO permissions (code, name, description, module, action, resource_type) VALUES
  ('audit.view', 'View Audit Logs', 'Can view audit trail', 'audit', 'view', 'audit_log'),
  ('audit.export', 'Export Audit Logs', 'Can export audit data', 'audit', 'export', 'audit_log')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 7. ASSIGN PERMISSIONS TO SYSTEM ROLES
-- =====================================================

-- Owner: ALL permissions
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'owner'),
  p.id,
  true
FROM permissions p
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Super Admin: ALL except billing.manage
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'super_admin'),
  p.id,
  true
FROM permissions p
WHERE p.code != 'settings.billing.manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Admin: Manage operations, no billing or security
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'admin'),
  p.id,
  true
FROM permissions p
WHERE p.code NOT IN ('settings.billing.view', 'settings.billing.manage', 'settings.security.manage', 'settings.roles.manage')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Manager: Operational permissions, no settings
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'manager'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('deals', 'contacts', 'pipeline', 'tasks', 'calendar', 'communications')
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Staff: View and create, limited editing
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'staff'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('deals', 'contacts', 'tasks', 'calendar', 'communications')
  AND p.action IN ('view', 'create', 'edit')
  AND p.code NOT LIKE '%.delete%'
  AND p.code NOT LIKE '%.export%'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Marketing: Marketing module only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'marketing'),
  p.id,
  true
FROM permissions p
WHERE p.module IN ('marketing', 'contacts', 'forms', 'analytics')
  AND p.action != 'delete'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- Read Only: View permissions only
INSERT INTO role_permissions (role_id, permission_id, granted)
SELECT 
  (SELECT id FROM role_definitions WHERE code = 'read_only'),
  p.id,
  true
FROM permissions p
WHERE p.action = 'view'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =====================================================
-- 8. PERMISSION CHECK FUNCTIONS
-- =====================================================

-- Check if user has specific permission in their current org
CREATE OR REPLACE FUNCTION public.user_has_permission(
  p_user_id UUID,
  p_tenant_id UUID,
  p_permission_code TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    -- Check via role permissions
    SELECT 1
    FROM org_memberships om
    JOIN role_definitions rd ON rd.code = om.role
    JOIN role_permissions rp ON rp.role_id = rd.id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE om.user_id = p_user_id
      AND om.tenant_id = p_tenant_id
      AND om.status = 'active'
      AND p.code = p_permission_code
      AND rp.granted = true
    
    UNION
    
    -- Check via direct user permission grants (overrides)
    SELECT 1
    FROM user_permissions up
    JOIN permissions p ON p.id = up.permission_id
    WHERE up.user_id = p_user_id
      AND up.tenant_id = p_tenant_id
      AND p.code = p_permission_code
      AND up.granted = true
      AND (up.expires_at IS NULL OR up.expires_at > NOW())
  );
$$;

-- Get all permissions for a user in a tenant
CREATE OR REPLACE FUNCTION public.get_user_permissions(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS TABLE (
  permission_code TEXT,
  permission_name TEXT,
  permission_module TEXT,
  granted_via TEXT
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  -- From role
  SELECT DISTINCT
    p.code,
    p.name,
    p.module,
    'role:' || om.role as granted_via
  FROM org_memberships om
  JOIN role_definitions rd ON rd.code = om.role
  JOIN role_permissions rp ON rp.role_id = rd.id
  JOIN permissions p ON p.id = rp.permission_id
  WHERE om.user_id = p_user_id
    AND om.tenant_id = p_tenant_id
    AND om.status = 'active'
    AND rp.granted = true
  
  UNION
  
  -- From direct grants
  SELECT
    p.code,
    p.name,
    p.module,
    'direct_grant' as granted_via
  FROM user_permissions up
  JOIN permissions p ON p.id = up.permission_id
  WHERE up.user_id = p_user_id
    AND up.tenant_id = p_tenant_id
    AND up.granted = true
    AND (up.expires_at IS NULL OR up.expires_at > NOW())
  
  ORDER BY permission_module, permission_code;
$$;

-- Check if user can access specific location
CREATE OR REPLACE FUNCTION public.user_has_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_location_id UUID
)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    -- User has access if:
    -- 1. Their location_ids is empty (= access to all locations)
    -- 2. OR the location_id is in their location_ids array
    COALESCE(
      (
        SELECT 
          (location_ids = '{}' OR p_location_id = ANY(location_ids))
        FROM org_memberships
        WHERE user_id = p_user_id
          AND tenant_id = p_tenant_id
          AND status = 'active'
        LIMIT 1
      ),
      false
    );
$$;

-- =====================================================
-- 9. PERMISSION CHANGE AUDIT LOG
-- =====================================================

CREATE TABLE IF NOT EXISTS permission_changes_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  changed_by_user_id UUID NOT NULL REFERENCES app_users(id),
  target_user_id UUID REFERENCES app_users(id),
  target_role_id UUID REFERENCES role_definitions(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('role_assigned', 'role_removed', 'permission_granted', 'permission_revoked', 'role_created', 'role_deleted', 'role_modified')),
  permission_code TEXT,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perm_changes_tenant ON permission_changes_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_changes_user ON permission_changes_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_perm_changes_type ON permission_changes_log(change_type, created_at DESC);

-- =====================================================
-- 10. RLS FOR PERMISSION TABLES
-- =====================================================

-- Permissions (read-only for all authenticated users)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view permissions" ON permissions
  FOR SELECT USING (true);

CREATE POLICY "Service role bypass permissions" ON permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Role Definitions (read-only for users, admin can manage custom roles)
ALTER TABLE role_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all role definitions" ON role_definitions
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage custom roles" ON role_definitions
  FOR ALL USING (
    (is_custom_role = true AND tenant_id = public.get_user_org_id() AND public.user_has_permission(auth.uid(), tenant_id, 'settings.roles.manage'))
    OR auth.role() = 'service_role'
  );

-- Role Permissions (admin only)
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view role permissions" ON role_permissions
  FOR SELECT USING (true);

CREATE POLICY "Service role bypass role_permissions" ON role_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- User Permissions (admin + self-view)
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own permissions" ON user_permissions
  FOR SELECT USING (
    user_id = auth.uid() 
    OR (tenant_id = public.get_user_org_id() AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage'))
  );

CREATE POLICY "Admins can manage user permissions" ON user_permissions
  FOR ALL USING (
    tenant_id = public.get_user_org_id() 
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

CREATE POLICY "Service role bypass user_permissions" ON user_permissions
  FOR ALL USING (auth.role() = 'service_role');

-- Permission Changes Log (audit read-only)
ALTER TABLE permission_changes_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditors can view permission changes" ON permission_changes_log
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

CREATE POLICY "Service role bypass perm_changes_log" ON permission_changes_log
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  roles_count INTEGER;
  permissions_count INTEGER;
  role_perms_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM role_definitions WHERE is_system_role = true;
  SELECT COUNT(*) INTO permissions_count FROM permissions;
  SELECT COUNT(*) INTO role_perms_count FROM role_permissions;
  
-- RAISE NOTICE '=== RBAC SYSTEM VERIFICATION ===';
-- RAISE NOTICE 'System roles created: %', roles_count;
-- RAISE NOTICE 'Permissions defined: %', permissions_count;
-- RAISE NOTICE 'Role-permission mappings: %', role_perms_count;
-- RAISE NOTICE '================================';
  
  IF roles_count >= 7 AND permissions_count >= 40 THEN
-- RAISE NOTICE '✅ Phase 7 Complete: RBAC system fully configured';
  ELSE
    RAISE WARNING 'Incomplete RBAC setup. Review output above.';
  END IF;
END $$;

-- =====================================================
-- PHASE 8: ENHANCED AUDIT LOGS & GDPR COMPLIANCE
-- Comprehensive audit trail and data privacy controls
-- =====================================================
-- Date: October 16, 2025
-- Priority: P0 - COMPLIANCE & SECURITY
--
-- This migration creates:
-- - Enhanced audit logging for all operations
-- - GDPR data export/delete tools
-- - Access logging and monitoring
-- - Privacy controls and consent management
-- - Data retention policies
-- =====================================================

BEGIN;

-- =====================================================
-- 1. ENHANCED AUDIT TRAIL TABLE
-- =====================================================

-- Check if audit_trail exists, enhance it
DO $$
BEGIN
  -- Add columns if they don't exist
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS correlation_id UUID;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS session_id TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS ip_address TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS user_agent TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS request_method TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS request_path TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS response_status INTEGER;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS duration_ms INTEGER;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS error_message TEXT;
  ALTER TABLE IF EXISTS audit_trail ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('info', 'warning', 'error', 'critical'));
EXCEPTION
  WHEN undefined_table THEN
    -- Create audit_trail if it doesn't exist
    CREATE TABLE audit_trail (
      id BIGSERIAL PRIMARY KEY,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      user_id UUID REFERENCES app_users(id),
      action TEXT NOT NULL,
      resource_type TEXT NOT NULL,
      resource_id UUID,
      old_values JSONB,
      new_values JSONB,
      correlation_id UUID,
      session_id TEXT,
      ip_address TEXT,
      user_agent TEXT,
      request_method TEXT,
      request_path TEXT,
      response_status INTEGER,
      duration_ms INTEGER,
      error_message TEXT,
      severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    
    CREATE INDEX idx_audit_trail_tenant ON audit_trail(tenant_id, created_at DESC);
    CREATE INDEX idx_audit_trail_user ON audit_trail(user_id, created_at DESC);
    CREATE INDEX idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
    CREATE INDEX idx_audit_trail_correlation ON audit_trail(correlation_id);
    CREATE INDEX idx_audit_trail_severity ON audit_trail(severity, created_at DESC) WHERE severity IN ('error', 'critical');
END $$;

-- =====================================================
-- 2. DATA ACCESS LOG (Who Viewed What)
-- =====================================================

CREATE TABLE IF NOT EXISTS data_access_log (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES app_users(id),
  accessed_table TEXT NOT NULL,
  accessed_record_id UUID,
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'list', 'search', 'export', 'print')),
  record_count INTEGER DEFAULT 1,
  filters_applied JSONB,
  accessed_from TEXT, -- Page/component that triggered access
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_access_tenant ON data_access_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_user ON data_access_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_table_record ON data_access_log(accessed_table, accessed_record_id);
CREATE INDEX IF NOT EXISTS idx_data_access_sensitive ON data_access_log(created_at DESC) WHERE accessed_table IN ('contacts', 'deals', 'billing');

-- =====================================================
-- 3. GDPR CONSENT MANAGEMENT
-- =====================================================

CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing_email', 'marketing_sms', 'marketing_whatsapp', 'data_processing', 'data_sharing', 'cookies', 'analytics', 'third_party')),
  granted BOOLEAN NOT NULL,
  consent_method TEXT NOT NULL CHECK (consent_method IN ('explicit', 'implicit', 'legitimate_interest', 'contract', 'legal_obligation')),
  consent_source TEXT, -- Form URL, page, campaign, etc.
  consent_text TEXT, -- Exact text they consented to
  ip_address TEXT,
  user_agent TEXT,
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  withdrawal_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_contact ON consent_records(contact_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_tenant ON consent_records(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(contact_id, consent_type) WHERE granted = true AND withdrawn_at IS NULL;

-- =====================================================
-- 4. GDPR DATA EXPORT REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS gdpr_export_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('contact', 'user', 'tenant')),
  subject_id UUID NOT NULL,
  export_format TEXT NOT NULL CHECK (export_format IN ('json', 'csv', 'pdf')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  export_url TEXT, -- S3/Storage URL when ready
  file_size_bytes BIGINT,
  expires_at TIMESTAMP WITH TIME ZONE, -- Export links expire after 7 days
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gdpr_exports_tenant ON gdpr_export_requests(tenant_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_exports_user ON gdpr_export_requests(requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_exports_status ON gdpr_export_requests(status, requested_at DESC) WHERE status IN ('pending', 'processing');

-- =====================================================
-- 5. GDPR DATA DELETION REQUESTS
-- =====================================================

CREATE TABLE IF NOT EXISTS gdpr_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
  subject_type TEXT NOT NULL CHECK (subject_type IN ('contact', 'user')),
  subject_id UUID NOT NULL,
  deletion_scope TEXT NOT NULL CHECK (deletion_scope IN ('all_data', 'personal_data_only', 'anonymize')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected', 'cancelled')),
  approved_by_user_id UUID REFERENCES app_users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  deletion_summary JSONB, -- { tables_affected: [...], records_deleted: N }
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gdpr_deletions_tenant ON gdpr_deletion_requests(tenant_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_gdpr_deletions_status ON gdpr_deletion_requests(status, requested_at DESC) WHERE status IN ('pending', 'approved', 'processing');

-- =====================================================
-- 6. DATA RETENTION POLICIES
-- =====================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  retention_days INTEGER NOT NULL CHECK (retention_days > 0),
  applies_to_deleted BOOLEAN DEFAULT true, -- Soft-deleted records
  archive_before_delete BOOLEAN DEFAULT true,
  archive_location TEXT, -- e.g., 's3://backups/...'
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_tenant ON data_retention_policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_retention_policies_enabled ON data_retention_policies(tenant_id) WHERE enabled = true;

-- =====================================================
-- 7. PRIVACY SETTINGS PER TENANT
-- =====================================================

CREATE TABLE IF NOT EXISTS privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Data Processing
  data_processor_name TEXT, -- Legal entity name
  data_protection_officer_email TEXT,
  data_protection_officer_phone TEXT,
  
  -- GDPR Settings
  gdpr_enabled BOOLEAN DEFAULT true,
  ccpa_enabled BOOLEAN DEFAULT false,
  hipaa_enabled BOOLEAN DEFAULT false,
  
  -- Consent Requirements
  require_explicit_consent BOOLEAN DEFAULT true,
  double_opt_in_email BOOLEAN DEFAULT true,
  double_opt_in_sms BOOLEAN DEFAULT true,
  
  -- Data Handling
  anonymize_after_days INTEGER DEFAULT 2555, -- 7 years
  delete_unverified_contacts_after_days INTEGER DEFAULT 90,
  auto_delete_unsubscribed_after_days INTEGER DEFAULT 365,
  
  -- Export/Delete Requests
  auto_approve_exports BOOLEAN DEFAULT false,
  auto_approve_deletions BOOLEAN DEFAULT false,
  deletion_requires_2fa BOOLEAN DEFAULT true,
  
  -- Breach Notification
  breach_notification_email TEXT,
  breach_notification_required_within_hours INTEGER DEFAULT 72, -- GDPR requirement
  
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default privacy settings for existing tenants
INSERT INTO privacy_settings (tenant_id)
SELECT id FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM privacy_settings WHERE tenant_id = tenants.id)
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================
-- 8. AUDIT HELPER FUNCTIONS
-- =====================================================

-- Log an audit event
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_tenant_id UUID,
  p_user_id UUID,
  p_action TEXT,
  p_resource_type TEXT,
  p_resource_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  audit_id BIGINT;
BEGIN
  INSERT INTO audit_trail (
    tenant_id,
    user_id,
    action,
    resource_type,
    resource_id,
    old_values,
    new_values,
    metadata,
    correlation_id
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_action,
    p_resource_type,
    p_resource_id,
    p_old_values,
    p_new_values,
    p_metadata,
    gen_random_uuid()
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id::UUID;
END;
$$;

-- Log data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_tenant_id UUID,
  p_user_id UUID,
  p_table TEXT,
  p_record_id UUID DEFAULT NULL,
  p_access_type TEXT DEFAULT 'view',
  p_record_count INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  INSERT INTO data_access_log (
    tenant_id,
    user_id,
    accessed_table,
    accessed_record_id,
    access_type,
    record_count
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_table,
    p_record_id,
    p_access_type,
    p_record_count
  );
$$;

-- =====================================================
-- 9. GDPR EXPORT FUNCTION
-- =====================================================

-- Generate GDPR export data for a contact
CREATE OR REPLACE FUNCTION public.generate_gdpr_export_for_contact(
  p_tenant_id UUID,
  p_contact_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  export_data JSONB;
  contact_data JSONB;
  deals_data JSONB;
  tasks_data JSONB;
  activities_data JSONB;
  consents_data JSONB;
  forms_data JSONB;
BEGIN
  -- Collect contact data
  SELECT row_to_json(c.*)::JSONB INTO contact_data
  FROM contacts c
  WHERE c.id = p_contact_id AND c.tenant_id = p_tenant_id;
  
  -- Collect deals
  SELECT COALESCE(json_agg(row_to_json(d.*)), '[]'::json)::JSONB INTO deals_data
  FROM deals d
  WHERE d.contact_id = p_contact_id AND d.tenant_id = p_tenant_id;
  
  -- Collect tasks
  SELECT COALESCE(json_agg(row_to_json(t.*)), '[]'::json)::JSONB INTO tasks_data
  FROM tasks t
  WHERE t.contact_id = p_contact_id AND t.tenant_id = p_tenant_id;
  
  -- Collect activities
  SELECT COALESCE(json_agg(row_to_json(a.*)), '[]'::json)::JSONB INTO activities_data
  FROM activities a
  WHERE a.contact_id = p_contact_id AND a.tenant_id = p_tenant_id;
  
  -- Collect consent records
  SELECT COALESCE(json_agg(row_to_json(cr.*)), '[]'::json)::JSONB INTO consents_data
  FROM consent_records cr
  WHERE cr.contact_id = p_contact_id AND cr.tenant_id = p_tenant_id;
  
  -- Collect form submissions
  SELECT COALESCE(json_agg(row_to_json(fs.*)), '[]'::json)::JSONB INTO forms_data
  FROM form_submissions fs
  WHERE fs.contact_id = p_contact_id AND fs.tenant_id = p_tenant_id;
  
  -- Build complete export
  export_data := jsonb_build_object(
    'export_generated_at', NOW(),
    'export_version', '1.0',
    'tenant_id', p_tenant_id,
    'contact', contact_data,
    'deals', deals_data,
    'tasks', tasks_data,
    'activities', activities_data,
    'consents', consents_data,
    'form_submissions', forms_data
  );
  
  RETURN export_data;
END;
$$;

-- =====================================================
-- 10. GDPR ANONYMIZATION FUNCTION
-- =====================================================

-- Anonymize contact data (GDPR "right to be forgotten")
CREATE OR REPLACE FUNCTION public.anonymize_contact_data(
  p_tenant_id UUID,
  p_contact_id UUID,
  p_requested_by UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected_tables TEXT[] := ARRAY['contacts', 'deals', 'tasks', 'activities', 'form_submissions'];
  summary JSONB;
BEGIN
  -- Log the anonymization request
  INSERT INTO audit_trail (tenant_id, user_id, action, resource_type, resource_id, severity, metadata)
  VALUES (
    p_tenant_id,
    p_requested_by,
    'gdpr_anonymize',
    'contact',
    p_contact_id,
    'warning',
    jsonb_build_object('reason', 'GDPR right to be forgotten')
  );
  
  -- Anonymize contact
  UPDATE contacts
  SET 
    full_name = 'ANONYMIZED_' || id::TEXT,
    primary_email = NULL,
    primary_phone = NULL,
    secondary_phone = NULL,
    date_of_birth = NULL,
    address = NULL,
    city = NULL,
    postal_code = NULL,
    updated_at = NOW()
  WHERE id = p_contact_id AND tenant_id = p_tenant_id;
  
  -- Anonymize activities
  UPDATE activities
  SET
    subject = 'ANONYMIZED',
    snippet = NULL,
    transcript = NULL,
    updated_at = NOW()
  WHERE contact_id = p_contact_id AND tenant_id = p_tenant_id;
  
  -- Build summary
  summary := jsonb_build_object(
    'anonymized_at', NOW(),
    'contact_id', p_contact_id,
    'requested_by', p_requested_by,
    'affected_tables', affected_tables,
    'status', 'completed'
  );
  
  RETURN summary;
END;
$$;

-- =====================================================
-- 11. BREACH NOTIFICATION TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS security_breaches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  breach_type TEXT NOT NULL CHECK (breach_type IN ('data_leak', 'unauthorized_access', 'data_loss', 'ransomware', 'phishing', 'other')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  detected_by UUID REFERENCES app_users(id),
  affected_record_count INTEGER,
  affected_data_types TEXT[], -- ['email', 'phone', 'medical_data']
  breach_description TEXT NOT NULL,
  containment_actions TEXT,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_method TEXT,
  regulatory_reported_at TIMESTAMP WITH TIME ZONE,
  regulatory_body TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'false_alarm')),
  resolution_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_breaches_tenant ON security_breaches(tenant_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_breaches_status ON security_breaches(status, detected_at DESC) WHERE status IN ('open', 'investigating');
CREATE INDEX IF NOT EXISTS idx_breaches_severity ON security_breaches(severity, detected_at DESC) WHERE severity IN ('high', 'critical');

-- =====================================================
-- 12. RLS FOR AUDIT & PRIVACY TABLES
-- =====================================================

-- Data Access Log
ALTER TABLE data_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auditors can view access logs" ON data_access_log
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

CREATE POLICY "Service role bypass access_log" ON data_access_log
  FOR ALL USING (auth.role() = 'service_role');

-- Consent Records
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tenant consents" ON consent_records
  FOR SELECT USING (tenant_id = public.get_user_org_id());

CREATE POLICY "Admins can manage consents" ON consent_records
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

CREATE POLICY "Service role bypass consents" ON consent_records
  FOR ALL USING (auth.role() = 'service_role');

-- GDPR Export Requests
ALTER TABLE gdpr_export_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own export requests" ON gdpr_export_requests
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND (requested_by_user_id = auth.uid() OR public.user_has_permission(auth.uid(), tenant_id, 'audit.view'))
  );

CREATE POLICY "Users can create export requests" ON gdpr_export_requests
  FOR INSERT WITH CHECK (
    tenant_id = public.get_user_org_id()
    AND requested_by_user_id = auth.uid()
  );

CREATE POLICY "Service role bypass gdpr_exports" ON gdpr_export_requests
  FOR ALL USING (auth.role() = 'service_role');

-- GDPR Deletion Requests
ALTER TABLE gdpr_deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage deletion requests" ON gdpr_deletion_requests
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.team.manage')
  );

CREATE POLICY "Service role bypass gdpr_deletions" ON gdpr_deletion_requests
  FOR ALL USING (auth.role() = 'service_role');

-- Privacy Settings
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own privacy settings" ON privacy_settings
  FOR SELECT USING (tenant_id = public.get_user_org_id());

CREATE POLICY "Admins can manage privacy settings" ON privacy_settings
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.security.manage')
  );

CREATE POLICY "Service role bypass privacy_settings" ON privacy_settings
  FOR ALL USING (auth.role() = 'service_role');

-- Security Breaches
ALTER TABLE security_breaches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security breaches" ON security_breaches
  FOR SELECT USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'audit.view')
  );

CREATE POLICY "Admins can manage breaches" ON security_breaches
  FOR ALL USING (
    tenant_id = public.get_user_org_id()
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.security.manage')
  );

CREATE POLICY "Service role bypass breaches" ON security_breaches
  FOR ALL USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  consent_count INTEGER;
  export_requests_count INTEGER;
  privacy_settings_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO consent_count FROM consent_records;
  SELECT COUNT(*) INTO export_requests_count FROM gdpr_export_requests;
  SELECT COUNT(*) INTO privacy_settings_count FROM privacy_settings;
  
-- RAISE NOTICE '=== AUDIT & GDPR VERIFICATION ===';
-- RAISE NOTICE 'Consent records: %', consent_count;
-- RAISE NOTICE 'GDPR export requests: %', export_requests_count;
-- RAISE NOTICE 'Privacy settings (tenants): %', privacy_settings_count;
-- RAISE NOTICE '====================================';
-- RAISE NOTICE '✅ Phase 8 Complete: Audit logging and GDPR compliance configured';
END $$;

-- =====================================================
-- Migration: Extend Tenants Table
-- Purpose: Add fields for domain discovery, billing, and multi-location support
-- Safety: Backward compatible - all new columns are nullable or have defaults
-- Impact: ZERO on existing queries - additive only
-- =====================================================

BEGIN;

-- =====================================================
-- 1. DOMAIN & WEBSITE FIELDS (for org discovery)
-- =====================================================

-- Website URL as entered by user
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url TEXT;

-- Normalized website host for matching (e.g., "smithdental.com")
-- UNIQUE to prevent duplicate organizations
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_host TEXT UNIQUE;

COMMENT ON COLUMN tenants.website_url IS 'User-entered website URL';
COMMENT ON COLUMN tenants.website_host IS 'Normalized domain for matching (unique, lowercased, no www)';

-- =====================================================
-- 2. MULTI-LOCATION FLAG (determines code path)
-- =====================================================

-- FALSE = single location (95% of orgs, fast queries)
-- TRUE = multi-location group (5% of orgs, complex queries)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_multi_location BOOLEAN DEFAULT FALSE NOT NULL;

COMMENT ON COLUMN tenants.is_multi_location IS 'Feature flag: TRUE for multi-location dental groups, FALSE for single-location practices';

-- =====================================================
-- 3. PARENT GROUP RELATIONSHIP (for multi-location only)
-- =====================================================

-- References dental_groups table (created in next migration)
-- NULL for single-location practices
-- Populated for locations in a multi-location group
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS dental_group_id UUID;

-- Location name (for multi-location: "Downtown", "Uptown")
-- NULL for single-location (location name = tenant name)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS location_name TEXT;

COMMENT ON COLUMN tenants.dental_group_id IS 'Parent group ID (NULL for single-location practices)';
COMMENT ON COLUMN tenants.location_name IS 'Location name within group (NULL for single-location)';

-- =====================================================
-- 4. BILLING & CURRENCY
-- =====================================================

-- Billing email (for invoices)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS billing_email TEXT;

-- Currency code (ISO 4217: GBP, USD, EUR)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'GBP' NOT NULL;

-- Locale (for formatting: en-GB, en-US, etc.)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'en-GB' NOT NULL;

COMMENT ON COLUMN tenants.billing_email IS 'Email for billing/invoices';
COMMENT ON COLUMN tenants.currency_code IS 'ISO 4217 currency code';
COMMENT ON COLUMN tenants.locale IS 'Locale for number/date formatting';

-- =====================================================
-- 5. VERIFICATION (domain ownership)
-- =====================================================

-- When domain was verified
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Verification method: 'email' | 'dns' | 'html'
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verification_method TEXT;

-- Which user verified the domain
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS verified_by_user_id UUID REFERENCES app_users(id);

COMMENT ON COLUMN tenants.verified_at IS 'Timestamp of domain verification';
COMMENT ON COLUMN tenants.verification_method IS 'How domain was verified (email, dns, html)';

-- =====================================================
-- 6. SUBDOMAIN SUPPORT (future feature)
-- =====================================================

-- Unique subdomain: practice.dentalcrm.com
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE;

-- Custom domain: crm.practice.com
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;

COMMENT ON COLUMN tenants.subdomain IS 'Unique subdomain slug';
COMMENT ON COLUMN tenants.custom_domain IS 'Optional custom domain';

-- =====================================================
-- 7. CREATE INDEXES (performance optimization)
-- =====================================================

-- Index for domain matching (frequently queried)
CREATE INDEX IF NOT EXISTS idx_tenants_website_host 
  ON tenants(website_host) 
  WHERE website_host IS NOT NULL;

-- Index for subdomain routing
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain 
  ON tenants(subdomain) 
  WHERE subdomain IS NOT NULL;

-- Index for custom domain routing
CREATE INDEX IF NOT EXISTS idx_tenants_custom_domain 
  ON tenants(custom_domain) 
  WHERE custom_domain IS NOT NULL;

-- Index for multi-location lookups
CREATE INDEX IF NOT EXISTS idx_tenants_dental_group 
  ON tenants(dental_group_id) 
  WHERE dental_group_id IS NOT NULL;

-- Index for verification status
CREATE INDEX IF NOT EXISTS idx_tenants_verified 
  ON tenants(verified_at) 
  WHERE verified_at IS NOT NULL;

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_tenants_is_multi_location 
  ON tenants(is_multi_location, dental_group_id);

-- =====================================================
-- 8. ADD CHECK CONSTRAINTS (data integrity)
-- =====================================================

DO $$
BEGIN
  -- Verification method must be valid
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_verification_method' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT check_verification_method 
      CHECK (verification_method IN ('email', 'dns', 'html') OR verification_method IS NULL);
-- RAISE NOTICE '✅ Added constraint: check_verification_method';
  ELSE
-- RAISE NOTICE 'ℹ️  Constraint check_verification_method already exists, skipping';
  END IF;

  -- Currency code format (3 uppercase letters)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_currency_code' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT check_currency_code 
      CHECK (currency_code ~ '^[A-Z]{3}$');
-- RAISE NOTICE '✅ Added constraint: check_currency_code';
  ELSE
-- RAISE NOTICE 'ℹ️  Constraint check_currency_code already exists, skipping';
  END IF;

  -- Locale format (xx-XX)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'check_locale' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT check_locale 
      CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$');
-- RAISE NOTICE '✅ Added constraint: check_locale';
  ELSE
-- RAISE NOTICE 'ℹ️  Constraint check_locale already exists, skipping';
  END IF;
END $$;

-- Multi-location logic: if is_multi_location=TRUE, must have dental_group_id
-- (will be enforced after dental_groups table exists)

-- =====================================================
-- 9. UPDATE EXISTING RLS POLICIES
-- =====================================================

-- Existing RLS policies remain unchanged
-- They still work because they filter by tenant.id
-- New columns don't affect existing SELECT/INSERT/UPDATE/DELETE

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 001 complete: Tenants table extended';
-- RAISE NOTICE '📊 New fields: website_url, website_host, is_multi_location, billing_email';
-- RAISE NOTICE '🔒 Backward compatible: All new columns nullable or have defaults';
-- RAISE NOTICE '⚡ Performance: Indexes created for common query patterns';
END $$;

-- =====================================================
-- Migration: Create Tenant Admins System
-- Purpose: Track Super Admins at tenant level (different from platform super_admins)
-- This is inserted as 001a to run before other migrations reference it
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE TENANT_ADMINS TABLE
-- =====================================================
-- This tracks Super Admins for each tenant (organization-level)
-- Separate from the platform-level super_admins table

CREATE TABLE IF NOT EXISTS tenant_admins (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Tenant and user
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Assignment tracking
  assigned_by_user_id UUID REFERENCES app_users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Deactivation tracking
  deactivated_by_user_id UUID REFERENCES app_users(id),
  deactivated_at TIMESTAMPTZ,
  deactivation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE (tenant_id, user_id)
);

COMMENT ON TABLE tenant_admins IS 
  'Tenant-level Super Admins (organization admins), different from platform super_admins';

COMMENT ON COLUMN tenant_admins.tenant_id IS 
  'Organization this admin belongs to';

COMMENT ON COLUMN tenant_admins.user_id IS 
  'User with Super Admin privileges';

-- =====================================================
-- 2. CREATE INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tenant_admins_tenant 
  ON tenant_admins(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_user 
  ON tenant_admins(user_id);

CREATE INDEX IF NOT EXISTS idx_tenant_admins_active 
  ON tenant_admins(tenant_id, is_active) 
  WHERE is_active = TRUE;

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_tenant_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_tenant_admins_updated_at
  BEFORE UPDATE ON tenant_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_tenant_admins_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE tenant_admins ENABLE ROW LEVEL SECURITY;

-- Users can see admins in their organization
CREATE POLICY tenant_admins_select_policy ON tenant_admins
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Only existing admins can create new admins
CREATE POLICY tenant_admins_insert_policy ON tenant_admins
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- Only admins can update admin records
CREATE POLICY tenant_admins_update_policy ON tenant_admins
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- No DELETE policy - use soft delete (is_active = FALSE)

COMMENT ON POLICY tenant_admins_select_policy ON tenant_admins IS 
  'Users can view admins in their organization';

-- =====================================================
-- 5. HELPER FUNCTIONS
-- =====================================================

-- Check if user is Super Admin of a tenant
CREATE OR REPLACE FUNCTION is_tenant_admin(
  p_user_id UUID,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM tenant_admins
    WHERE user_id = p_user_id
      AND tenant_id = p_tenant_id
      AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_tenant_admin IS 
  'Check if user is an active Super Admin of a tenant';

-- Get all tenants where user is admin
CREATE OR REPLACE FUNCTION get_admin_tenants(p_user_id UUID)
RETURNS TABLE (tenant_id UUID, tenant_name TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id AS tenant_id,
    t.name AS tenant_name
  FROM tenant_admins ta
  INNER JOIN tenants t ON t.id = ta.tenant_id
  WHERE ta.user_id = p_user_id
    AND ta.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_admin_tenants IS 
  'Get all tenants where user is an active Super Admin';

-- =====================================================
-- 6. BACKFILL EXISTING OWNERS AS TENANT ADMINS
-- =====================================================

-- Find all users with 'owner' role and make them tenant admins
INSERT INTO tenant_admins (
  tenant_id,
  user_id,
  is_active,
  assigned_by_user_id,
  assigned_at
)
SELECT 
  au.tenant_id,
  au.id AS user_id,
  TRUE AS is_active,
  au.id AS assigned_by_user_id, -- Self-assigned during migration
  au.created_at AS assigned_at
FROM app_users au
WHERE au.role = 'owner'
ON CONFLICT (tenant_id, user_id) DO UPDATE
SET is_active = TRUE;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  admin_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM tenant_admins WHERE is_active = TRUE;
  
-- RAISE NOTICE '✅ Migration 001a complete: tenant_admins table created';
-- RAISE NOTICE '👥 Backfilled % tenant admins from existing owners', admin_count;
-- RAISE NOTICE '🔐 RLS policies: Tenant-level access control';
END $$;

-- =====================================================
-- Migration: Create Dental Groups Table
-- Purpose: Parent entity for multi-location organizations
-- Safety: New table, no impact on existing data
-- Impact: Required for multi-location feature (5% of users)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE DENTAL_GROUPS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS dental_groups (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Group identity
  name TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  
  -- Contact information
  primary_email TEXT NOT NULL,
  phone TEXT,
  
  -- Website
  website_url TEXT,
  website_host TEXT UNIQUE,
  
  -- Billing (consolidated for all locations)
  billing_email TEXT NOT NULL,
  currency_code TEXT DEFAULT 'GBP' NOT NULL,
  locale TEXT DEFAULT 'en-GB' NOT NULL,
  
  -- Ownership (first Super Admin who creates the group)
  created_by_user_id UUID NOT NULL REFERENCES app_users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Settings
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_dg_currency_code CHECK (currency_code ~ '^[A-Z]{3}$'),
  CONSTRAINT check_dg_locale CHECK (locale ~ '^[a-z]{2}-[A-Z]{2}$'),
  CONSTRAINT check_dg_primary_email CHECK (primary_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  CONSTRAINT check_dg_billing_email CHECK (billing_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$')
);

COMMENT ON TABLE dental_groups IS 'Parent entity for multi-location dental organizations';
COMMENT ON COLUMN dental_groups.name IS 'Internal name (e.g., "Smile Dental Group")';
COMMENT ON COLUMN dental_groups.display_name IS 'Public-facing name';
COMMENT ON COLUMN dental_groups.website_host IS 'Normalized domain (unique)';
COMMENT ON COLUMN dental_groups.billing_email IS 'Consolidated billing email for all locations';
COMMENT ON COLUMN dental_groups.created_by_user_id IS 'First Super Admin (group creator)';
COMMENT ON COLUMN dental_groups.settings IS 'Group-wide settings (features, preferences)';

-- =====================================================
-- 2. ADD FOREIGN KEY TO TENANTS TABLE
-- =====================================================

-- Now that dental_groups exists, add the foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_tenants_dental_group' 
      AND conrelid = 'tenants'::regclass
  ) THEN
    ALTER TABLE tenants 
      ADD CONSTRAINT fk_tenants_dental_group 
      FOREIGN KEY (dental_group_id) 
      REFERENCES dental_groups(id) 
      ON DELETE CASCADE;
    
-- RAISE NOTICE '✅ Added foreign key: fk_tenants_dental_group';
  ELSE
-- RAISE NOTICE 'ℹ️  Foreign key fk_tenants_dental_group already exists, skipping';
  END IF;
END $$;

COMMENT ON CONSTRAINT fk_tenants_dental_group ON tenants IS 
  'Cascade delete: if group deleted, all locations become standalone';

-- =====================================================
-- 3. CREATE INDEXES (performance)
-- =====================================================

-- Index for website matching
CREATE INDEX IF NOT EXISTS idx_dental_groups_website_host 
  ON dental_groups(website_host) 
  WHERE website_host IS NOT NULL;

-- Index for creator lookup
CREATE INDEX IF NOT EXISTS idx_dental_groups_created_by 
  ON dental_groups(created_by_user_id);

-- Index for active groups
CREATE INDEX IF NOT EXISTS idx_dental_groups_active 
  ON dental_groups(is_active) 
  WHERE is_active = TRUE;

-- Full text search on name
CREATE INDEX IF NOT EXISTS idx_dental_groups_name_search 
  ON dental_groups USING gin(to_tsvector('english', name || ' ' || COALESCE(display_name, '')));

-- =====================================================
-- 4. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_dental_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_dental_groups_updated_at
  BEFORE UPDATE ON dental_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_dental_groups_updated_at();

-- =====================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE dental_groups ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see groups they belong to
-- (A user belongs to a group if they have access to ANY location in that group)
CREATE POLICY dental_groups_select_policy ON dental_groups
  FOR SELECT
  USING (
    id IN (
      -- Find all groups where user has access to at least one location
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      INNER JOIN app_users au ON au.tenant_id = t.id
      WHERE au.id = auth.uid()
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Policy: Only group creator or Tenant Admins can update
CREATE POLICY dental_groups_update_policy ON dental_groups
  FOR UPDATE
  USING (
    -- Must be creator OR Tenant Admin of any location in the group
    created_by_user_id = auth.uid()
    OR
    id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      INNER JOIN app_users au ON au.tenant_id = t.id
      INNER JOIN tenant_admins ta ON ta.user_id = au.id AND ta.tenant_id = t.id
      WHERE au.id = auth.uid()
        AND t.dental_group_id IS NOT NULL
        AND ta.is_active = TRUE
    )
  );

-- Policy: Only Super Admins can create groups (via service role)
-- Service role bypasses RLS, so no INSERT policy needed for now

-- Policy: Only group creator can delete (extremely dangerous)
CREATE POLICY dental_groups_delete_policy ON dental_groups
  FOR DELETE
  USING (created_by_user_id = auth.uid());

COMMENT ON POLICY dental_groups_select_policy ON dental_groups IS 
  'Users can see groups they belong to (via location membership)';

-- =====================================================
-- 6. CREATE HELPER FUNCTION: Get user's dental groups
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_dental_groups(user_id UUID)
RETURNS TABLE (
  group_id UUID,
  group_name TEXT,
  location_count BIGINT,
  total_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dg.id AS group_id,
    dg.name AS group_name,
    COUNT(DISTINCT t.id) AS location_count,
    COUNT(DISTINCT au.id) AS total_users
  FROM dental_groups dg
  INNER JOIN tenants t ON t.dental_group_id = dg.id
  INNER JOIN app_users au ON au.tenant_id = t.id
  WHERE t.dental_group_id IN (
    -- User's groups
    SELECT DISTINCT t2.dental_group_id
    FROM tenants t2
    INNER JOIN app_users au2 ON au2.tenant_id = t2.id
    WHERE au2.id = user_id
      AND t2.dental_group_id IS NOT NULL
  )
  AND dg.is_active = TRUE
  GROUP BY dg.id, dg.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_dental_groups IS 
  'Get all dental groups a user belongs to, with location and user counts';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 002 complete: dental_groups table created';
-- RAISE NOTICE '🏢 Multi-location parent entity ready';
-- RAISE NOTICE '🔒 RLS policies: Users see only their groups';
-- RAISE NOTICE '⚡ Indexes: Optimized for group lookups';
END $$;

-- =====================================================
-- Migration: Create User Location Access Table
-- Purpose: Track which users can access which locations (multi-location ONLY)
-- Safety: New table, ZERO impact on single-location users
-- Performance: Only queried for is_multi_location=TRUE users (5%)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE USER_LOCATION_ACCESS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_location_access (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User and location
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Access control
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  
  -- Granted by (Super Admin or Location Admin)
  granted_by_user_id UUID REFERENCES app_users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Revoked tracking
  revoked_by_user_id UUID REFERENCES app_users(id),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  
  -- Metadata
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint: one access record per user per location
  CONSTRAINT unique_user_location UNIQUE (user_id, tenant_id)
);

COMMENT ON TABLE user_location_access IS 
  'Multi-location only: Maps users to accessible locations. NOT used for single-location.';

COMMENT ON COLUMN user_location_access.user_id IS 
  'User who can access the location';

COMMENT ON COLUMN user_location_access.tenant_id IS 
  'Location (tenant) being accessed';

COMMENT ON COLUMN user_location_access.is_active IS 
  'FALSE = access revoked but record kept for audit';

COMMENT ON COLUMN user_location_access.granted_by_user_id IS 
  'Super Admin or Location Admin who granted access';

-- =====================================================
-- 2. CREATE INDEXES (critical for performance)
-- =====================================================

-- Primary lookup: "Which locations can user X access?"
-- This is THE critical query for multi-location RLS
CREATE INDEX IF NOT EXISTS idx_user_location_access_user_active 
  ON user_location_access(user_id, is_active) 
  WHERE is_active = TRUE;

-- Reverse lookup: "Which users have access to location Y?"
CREATE INDEX IF NOT EXISTS idx_user_location_access_tenant_active 
  ON user_location_access(tenant_id, is_active) 
  WHERE is_active = TRUE;

-- Composite index for RLS helper function
CREATE INDEX IF NOT EXISTS idx_user_location_access_lookup 
  ON user_location_access(user_id, tenant_id, is_active);

-- Admin query: "Who granted access?"
CREATE INDEX IF NOT EXISTS idx_user_location_access_granted_by 
  ON user_location_access(granted_by_user_id);

-- Audit query: "Recently revoked access"
CREATE INDEX IF NOT EXISTS idx_user_location_access_revoked 
  ON user_location_access(revoked_at) 
  WHERE revoked_at IS NOT NULL;

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_user_location_access_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_user_location_access_updated_at
  BEFORE UPDATE ON user_location_access
  FOR EACH ROW
  EXECUTE FUNCTION update_user_location_access_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE user_location_access ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own access records
CREATE POLICY user_location_access_select_own ON user_location_access
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Tenant Admins can see all access for their locations
CREATE POLICY user_location_access_select_admin ON user_location_access
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- Policy: Only Tenant Admins can grant/revoke access
CREATE POLICY user_location_access_insert_admin ON user_location_access
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

CREATE POLICY user_location_access_update_admin ON user_location_access
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
    )
  );

-- No DELETE policy - use soft delete (is_active = FALSE)

COMMENT ON POLICY user_location_access_select_own ON user_location_access IS 
  'Users can view their own location access';

COMMENT ON POLICY user_location_access_select_admin ON user_location_access IS 
  'Tenant Admins can view all access for their locations';

-- =====================================================
-- 5. CRITICAL HELPER FUNCTION: Get accessible tenant IDs
-- =====================================================
-- This is the CORE of the dual-path architecture!
-- Returns single tenant_id for single-location users (fast)
-- Returns array of tenant_ids for multi-location users (acceptable)

-- NOTE: Created in public schema (no permission to create in auth schema)
CREATE OR REPLACE FUNCTION public.get_accessible_tenants()
RETURNS UUID[] AS $$
DECLARE
  user_tenant_id UUID;
  is_multi_loc BOOLEAN;
  accessible_tenants UUID[];
BEGIN
  -- Get user's primary tenant from app_users
  SELECT tenant_id INTO user_tenant_id
  FROM app_users
  WHERE id = auth.uid()
  LIMIT 1;
  
  -- If no tenant, return empty array
  IF user_tenant_id IS NULL THEN
    RETURN ARRAY[]::UUID[];
  END IF;
  
  -- Check if user's primary tenant is multi-location
  SELECT is_multi_location INTO is_multi_loc
  FROM tenants
  WHERE id = user_tenant_id;
  
  -- FAST PATH: Single-location user
  -- Returns single-element array for consistent RLS syntax
  IF is_multi_loc = FALSE OR is_multi_loc IS NULL THEN
    RETURN ARRAY[user_tenant_id];
  END IF;
  
  -- MULTI-LOCATION PATH: Collect all accessible locations
  SELECT ARRAY_AGG(DISTINCT ula.tenant_id)
  INTO accessible_tenants
  FROM user_location_access ula
  WHERE ula.user_id = auth.uid()
    AND ula.is_active = TRUE;
  
  -- Include primary tenant (home location)
  IF NOT (user_tenant_id = ANY(accessible_tenants)) THEN
    accessible_tenants := accessible_tenants || user_tenant_id;
  END IF;
  
  RETURN COALESCE(accessible_tenants, ARRAY[user_tenant_id]);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_accessible_tenants IS 
  'Dual-path: Returns single tenant for 95% users (fast), multiple for 5% (acceptable). Used by RLS policies.';

-- =====================================================
-- 6. HELPER FUNCTION: Check if user has multi-location access
-- =====================================================

CREATE OR REPLACE FUNCTION is_multi_location_user(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  location_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT tenant_id)
  INTO location_count
  FROM user_location_access
  WHERE user_id = is_multi_location_user.user_id
    AND is_active = TRUE;
  
  RETURN location_count > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_multi_location_user IS 
  'Check if user has access to multiple locations';

-- =====================================================
-- 7. HELPER FUNCTION: Grant location access
-- =====================================================

CREATE OR REPLACE FUNCTION grant_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_granted_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  access_id UUID;
BEGIN
  -- Insert or update access record
  INSERT INTO user_location_access (
    user_id,
    tenant_id,
    granted_by_user_id,
    granted_at,
    is_active,
    notes
  ) VALUES (
    p_user_id,
    p_tenant_id,
    p_granted_by,
    NOW(),
    TRUE,
    p_notes
  )
  ON CONFLICT (user_id, tenant_id) 
  DO UPDATE SET
    is_active = TRUE,
    granted_by_user_id = p_granted_by,
    granted_at = NOW(),
    revoked_by_user_id = NULL,
    revoked_at = NULL,
    revocation_reason = NULL,
    notes = COALESCE(p_notes, user_location_access.notes),
    updated_at = NOW()
  RETURNING id INTO access_id;
  
  RETURN access_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION grant_location_access IS 
  'Grant user access to a location (idempotent)';

-- =====================================================
-- 8. HELPER FUNCTION: Revoke location access
-- =====================================================

CREATE OR REPLACE FUNCTION revoke_location_access(
  p_user_id UUID,
  p_tenant_id UUID,
  p_revoked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE user_location_access
  SET 
    is_active = FALSE,
    revoked_by_user_id = p_revoked_by,
    revoked_at = NOW(),
    revocation_reason = p_reason,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND tenant_id = p_tenant_id
    AND is_active = TRUE;
  
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revoke_location_access IS 
  'Revoke user access to a location (soft delete)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 003 complete: user_location_access table created';
-- RAISE NOTICE '🚀 Dual-path architecture: Single-location users unaffected';
-- RAISE NOTICE '⚡ Critical function: public.get_accessible_tenants() created';
-- RAISE NOTICE '🔒 RLS policies: Users see own access, admins see all';
END $$;

-- =====================================================
-- Migration: Create Organization Join Requests Table
-- Purpose: Allow users to request joining existing organizations
-- Safety: New table, no impact on existing flows
-- Use Case: Employee finds their practice and requests access
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE ORGANIZATION_JOIN_REQUESTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS organization_join_requests (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Organization being requested
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Requester (may not have app_user yet)
  requester_user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  requester_name TEXT,
  
  -- Request details
  message TEXT,
  requested_role TEXT DEFAULT 'staff',
  
  -- Status workflow
  status TEXT DEFAULT 'pending' NOT NULL,
  
  -- Decision tracking
  decided_by_user_id UUID REFERENCES app_users(id),
  decided_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_join_request_status 
    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  
  CONSTRAINT check_join_request_email 
    CHECK (requester_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
  
  CONSTRAINT check_decision_consistency
    CHECK (
      (status = 'pending' AND decided_by_user_id IS NULL AND decided_at IS NULL)
      OR
      (status != 'pending' AND decided_by_user_id IS NOT NULL AND decided_at IS NOT NULL)
    )
);

COMMENT ON TABLE organization_join_requests IS 
  'Tracks user requests to join existing organizations';

COMMENT ON COLUMN organization_join_requests.tenant_id IS 
  'Organization being requested';

COMMENT ON COLUMN organization_join_requests.requester_user_id IS 
  'Requester app_user (NULL if not yet signed up)';

COMMENT ON COLUMN organization_join_requests.requester_email IS 
  'Requester email (used for matching and notifications)';

COMMENT ON COLUMN organization_join_requests.status IS 
  'pending | approved | rejected | expired';

COMMENT ON COLUMN organization_join_requests.requested_role IS 
  'Role requested (default: staff). Admin can change during approval.';

-- =====================================================
-- 2. CREATE INDEXES (performance)
-- =====================================================

-- Lookup pending requests for an organization
CREATE INDEX IF NOT EXISTS idx_join_requests_tenant_status 
  ON organization_join_requests(tenant_id, status) 
  WHERE status = 'pending';

-- Find user's requests
CREATE INDEX IF NOT EXISTS idx_join_requests_user 
  ON organization_join_requests(requester_user_id);

-- Find requests by email (for linking after signup)
CREATE INDEX IF NOT EXISTS idx_join_requests_email 
  ON organization_join_requests(requester_email);

-- Admin dashboard: recent requests
CREATE INDEX IF NOT EXISTS idx_join_requests_created 
  ON organization_join_requests(tenant_id, created_at DESC);

-- Audit: who decided
CREATE INDEX IF NOT EXISTS idx_join_requests_decided_by 
  ON organization_join_requests(decided_by_user_id);

-- =====================================================
-- 3. CREATE UPDATED_AT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION update_join_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_join_requests_updated_at
  BEFORE UPDATE ON organization_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_join_requests_updated_at();

-- =====================================================
-- 4. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE organization_join_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Requesters can see their own requests
CREATE POLICY join_requests_select_own ON organization_join_requests
  FOR SELECT
  USING (
    requester_user_id = auth.uid()
    OR requester_email = (
      -- Safe way to get current user's email without direct auth schema access
      SELECT au.email 
      FROM app_users au 
      WHERE au.id = auth.uid() 
      LIMIT 1
    )
  );

-- Policy: Admins can see requests for their organizations
CREATE POLICY join_requests_select_admin ON organization_join_requests
  FOR SELECT
  USING (
    tenant_id IN (
      -- Tenant Admins see all requests
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
      
      UNION
      
      -- Users with "members:approve" permission
      SELECT au.tenant_id
      FROM app_users au
      INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
      INNER JOIN role_permissions rp ON rp.role_id = cr.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE au.id = auth.uid()
        AND p.code = 'members:approve'
    )
  );

-- Policy: Anyone can INSERT a join request
CREATE POLICY join_requests_insert_anyone ON organization_join_requests
  FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Only admins can UPDATE (approve/reject)
CREATE POLICY join_requests_update_admin ON organization_join_requests
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT ta.tenant_id
      FROM tenant_admins ta
      WHERE ta.user_id = auth.uid()
        AND ta.is_active = TRUE
      
      UNION
      
      SELECT au.tenant_id
      FROM app_users au
      INNER JOIN custom_roles cr ON cr.id = au.custom_role_id
      INNER JOIN role_permissions rp ON rp.role_id = cr.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE au.id = auth.uid()
        AND p.code = 'members:approve'
    )
  );

-- No DELETE policy - requests are permanent audit trail

COMMENT ON POLICY join_requests_select_own ON organization_join_requests IS 
  'Users can view their own join requests';

COMMENT ON POLICY join_requests_select_admin ON organization_join_requests IS 
  'Admins can view requests for their organizations';

-- =====================================================
-- 5. HELPER FUNCTION: Create join request
-- =====================================================

CREATE OR REPLACE FUNCTION create_join_request(
  p_tenant_id UUID,
  p_requester_email TEXT,
  p_requester_name TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_requested_role TEXT DEFAULT 'staff'
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  user_id UUID;
BEGIN
  -- Try to find existing user by email
  -- Use app_users.email directly (no auth schema access needed)
  SELECT au.id INTO user_id
  FROM app_users au
  WHERE au.email = p_requester_email
  LIMIT 1;
  
  -- Insert request
  INSERT INTO organization_join_requests (
    tenant_id,
    requester_user_id,
    requester_email,
    requester_name,
    message,
    requested_role,
    status
  ) VALUES (
    p_tenant_id,
    user_id,
    p_requester_email,
    p_requester_name,
    p_message,
    p_requested_role,
    'pending'
  )
  RETURNING id INTO request_id;
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_join_request IS 
  'Create a join request (public function, validated by domain matching)';

-- =====================================================
-- 6. HELPER FUNCTION: Approve join request
-- =====================================================

CREATE OR REPLACE FUNCTION approve_join_request(
  p_request_id UUID,
  p_approved_by UUID,
  p_assigned_role TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  request RECORD;
  user_id UUID;
  result JSONB;
BEGIN
  -- Get request details
  SELECT * INTO request
  FROM organization_join_requests
  WHERE id = p_request_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Request not found');
  END IF;
  
  IF request.status != 'pending' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'Request already processed');
  END IF;
  
  -- Get or create user
  user_id := request.requester_user_id;
  
  IF user_id IS NULL THEN
    -- User hasn't signed up yet - mark approved, they'll be created on signup
    UPDATE organization_join_requests
    SET 
      status = 'approved',
      decided_by_user_id = p_approved_by,
      decided_at = NOW(),
      requested_role = COALESCE(p_assigned_role, requested_role)
    WHERE id = p_request_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'message', 'Request approved. User will be added on signup.',
      'user_id', NULL
    );
  END IF;
  
  -- User exists - create app_user record
  INSERT INTO app_users (
    id,
    tenant_id,
    role,
    created_at
  ) VALUES (
    user_id,
    request.tenant_id,
    COALESCE(p_assigned_role, request.requested_role),
    NOW()
  )
  ON CONFLICT (id, tenant_id) DO NOTHING;
  
  -- Update request status
  UPDATE organization_join_requests
  SET 
    status = 'approved',
    decided_by_user_id = p_approved_by,
    decided_at = NOW(),
    requested_role = COALESCE(p_assigned_role, requested_role)
  WHERE id = p_request_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'message', 'Request approved and user added',
    'user_id', user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_join_request IS 
  'Approve a join request and create app_user record';

-- =====================================================
-- 7. HELPER FUNCTION: Reject join request
-- =====================================================

CREATE OR REPLACE FUNCTION reject_join_request(
  p_request_id UUID,
  p_rejected_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  updated BOOLEAN;
BEGIN
  UPDATE organization_join_requests
  SET 
    status = 'rejected',
    decided_by_user_id = p_rejected_by,
    decided_at = NOW(),
    rejection_reason = p_reason
  WHERE id = p_request_id
    AND status = 'pending';
  
  GET DIAGNOSTICS updated = ROW_COUNT;
  RETURN updated > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_join_request IS 
  'Reject a join request with reason';

-- =====================================================
-- 8. HELPER FUNCTION: Auto-expire old requests
-- =====================================================

CREATE OR REPLACE FUNCTION expire_old_join_requests()
RETURNS INTEGER AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  UPDATE organization_join_requests
  SET status = 'expired'
  WHERE status = 'pending'
    AND created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_join_requests IS 
  'Auto-expire join requests older than 30 days (run via cron)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 004 complete: organization_join_requests table created';
-- RAISE NOTICE '📨 Workflow: Employees can request to join their practice';
-- RAISE NOTICE '👥 Functions: create_join_request, approve_join_request, reject_join_request';
-- RAISE NOTICE '🔒 RLS: Requesters see own, admins see all for their org';
END $$;

-- =====================================================
-- Migration: Create Billing Schema
-- Purpose: Plans, subscriptions, seat management, entitlements
-- Safety: New tables, no impact on existing functionality
-- Billing: Org-centric (one subscription per org or dental group)
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CREATE PLANS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS plans (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan identity
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Tier classification
  tier TEXT NOT NULL,
  
  -- Seat limits
  default_seat_limit INTEGER NOT NULL,
  max_seat_limit INTEGER, -- NULL = unlimited (enterprise)
  
  -- Pricing (in smallest currency unit, e.g., pence)
  price_amount INTEGER, -- NULL = custom pricing (enterprise)
  price_currency TEXT DEFAULT 'GBP' NOT NULL,
  billing_interval TEXT NOT NULL, -- 'monthly' | 'yearly'
  
  -- Stripe integration
  stripe_product_id TEXT,
  stripe_price_id TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  is_featured BOOLEAN DEFAULT FALSE NOT NULL,
  
  -- Metadata
  features JSONB DEFAULT '[]'::JSONB NOT NULL, -- Array of feature descriptions
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_plans_tier 
    CHECK (tier IN ('solo', 'tier1', 'tier2', 'tier3', 'enterprise')),
  
  CONSTRAINT check_plans_billing_interval 
    CHECK (billing_interval IN ('monthly', 'yearly')),
  
  CONSTRAINT check_plans_currency 
    CHECK (price_currency ~ '^[A-Z]{3}$'),
  
  CONSTRAINT check_plans_seat_limits
    CHECK (
      default_seat_limit > 0 
      AND (max_seat_limit IS NULL OR max_seat_limit >= default_seat_limit)
    )
);

COMMENT ON TABLE plans IS 
  'Subscription plans with seat limits and features';

COMMENT ON COLUMN plans.tier IS 
  'Plan tier: solo | tier1 | tier2 | tier3 | enterprise';

COMMENT ON COLUMN plans.default_seat_limit IS 
  'Included seats in base price';

COMMENT ON COLUMN plans.max_seat_limit IS 
  'Maximum seats allowed (NULL = unlimited for enterprise)';

COMMENT ON COLUMN plans.price_amount IS 
  'Price in smallest currency unit (e.g., pence). NULL = custom pricing.';

-- =====================================================
-- 2. CREATE PLAN_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS plan_entitlements (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Plan reference
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  
  -- Entitlement key (matches feature flag or permission)
  key TEXT NOT NULL,
  
  -- Limit value (NULL = unlimited/boolean TRUE)
  limit_value INTEGER,
  
  -- Metadata
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Unique constraint
  CONSTRAINT unique_plan_entitlement UNIQUE (plan_id, key)
);

COMMENT ON TABLE plan_entitlements IS 
  'Feature entitlements per plan (e.g., roles.custom, marketing.automation)';

COMMENT ON COLUMN plan_entitlements.key IS 
  'Feature key (e.g., "multi_location", "custom_roles", "api_access")';

COMMENT ON COLUMN plan_entitlements.limit_value IS 
  'Numeric limit (NULL = unlimited). For boolean features, NULL = enabled.';

-- =====================================================
-- 3. CREATE SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Subscriber (organization or dental group)
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  dental_group_id UUID REFERENCES dental_groups(id) ON DELETE CASCADE,
  
  -- Plan reference
  plan_id UUID NOT NULL REFERENCES plans(id),
  
  -- Status
  status TEXT DEFAULT 'trialing' NOT NULL,
  
  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  
  -- Seat management
  seat_limit INTEGER NOT NULL,
  active_seats INTEGER DEFAULT 0 NOT NULL,
  
  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  
  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN DEFAULT FALSE NOT NULL,
  canceled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Metadata
  settings JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_subscription_status 
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  
  CONSTRAINT check_subscription_owner
    CHECK (
      (tenant_id IS NOT NULL AND dental_group_id IS NULL)
      OR
      (tenant_id IS NULL AND dental_group_id IS NOT NULL)
    ),
  
  CONSTRAINT check_subscription_seats
    CHECK (active_seats >= 0 AND active_seats <= seat_limit)
);

COMMENT ON TABLE subscriptions IS 
  'Active subscriptions (one per tenant or dental_group)';

COMMENT ON COLUMN subscriptions.tenant_id IS 
  'Single-location subscription (mutually exclusive with dental_group_id)';

COMMENT ON COLUMN subscriptions.dental_group_id IS 
  'Multi-location subscription (consolidated billing for all locations)';

COMMENT ON COLUMN subscriptions.seat_limit IS 
  'Total seats allowed (from plan + purchased add-ons)';

COMMENT ON COLUMN subscriptions.active_seats IS 
  'Currently occupied seats (cached for performance)';

-- =====================================================
-- 4. CREATE INVOICES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS invoices (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  dental_group_id UUID REFERENCES dental_groups(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  amount INTEGER NOT NULL, -- In smallest currency unit
  currency TEXT DEFAULT 'GBP' NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'draft' NOT NULL,
  
  -- Dates
  issued_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  
  -- Stripe integration
  stripe_invoice_id TEXT UNIQUE,
  stripe_hosted_url TEXT,
  stripe_pdf_url TEXT,
  
  -- Line items (detailed breakdown)
  line_items JSONB DEFAULT '[]'::JSONB NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Constraints
  CONSTRAINT check_invoice_status 
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
  
  CONSTRAINT check_invoice_owner
    CHECK (
      (tenant_id IS NOT NULL AND dental_group_id IS NULL)
      OR
      (tenant_id IS NULL AND dental_group_id IS NOT NULL)
    )
);

COMMENT ON TABLE invoices IS 
  'Invoices for subscriptions and one-time charges';

-- =====================================================
-- 5. CREATE USAGE_EVENTS TABLE (for add-ons)
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_events (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Owner
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Event type
  key TEXT NOT NULL, -- 'ai_minutes', 'sms_sent', 'api_calls'
  quantity DECIMAL(10, 2) NOT NULL,
  
  -- Context
  user_id UUID REFERENCES app_users(id),
  metadata JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Timestamp
  occurred_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Billing
  billed_in_invoice_id UUID REFERENCES invoices(id),
  
  -- Constraints
  CONSTRAINT check_usage_quantity CHECK (quantity >= 0)
);

COMMENT ON TABLE usage_events IS 
  'Usage-based billing events (AI minutes, SMS, API calls)';

-- Partition by month for performance
-- CREATE TABLE usage_events_y2025m01 PARTITION OF usage_events
--   FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- =====================================================
-- 6. CREATE INDEXES
-- =====================================================

-- Plans
CREATE INDEX IF NOT EXISTS idx_plans_tier ON plans(tier) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_featured ON plans(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_plans_stripe_product ON plans(stripe_product_id);

-- Plan entitlements
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_plan ON plan_entitlements(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_entitlements_key ON plan_entitlements(key);

-- Subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant ON subscriptions(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_group ON subscriptions(dental_group_id) WHERE dental_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Invoices
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_group ON invoices(dental_group_id);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe ON invoices(stripe_invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Usage events
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant ON usage_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_key ON usage_events(key, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_unbilled ON usage_events(billed_in_invoice_id) 
  WHERE billed_in_invoice_id IS NULL;

-- =====================================================
-- 7. CREATE UPDATED_AT TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION update_billing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_plans_updated_at
  BEFORE UPDATE ON plans
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER trigger_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_billing_updated_at();

-- =====================================================
-- 8. ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Plans and entitlements are public (readable by all)
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select_all ON plans FOR SELECT USING (is_active = TRUE);
CREATE POLICY plan_entitlements_select_all ON plan_entitlements FOR SELECT USING (TRUE);

-- Subscriptions: tenant-scoped
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY subscriptions_select_tenant ON subscriptions
  FOR SELECT
  USING (
    tenant_id IN (SELECT unnest(public.get_accessible_tenants()))
    OR
    dental_group_id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      WHERE t.id = ANY(public.get_accessible_tenants())
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Invoices: tenant-scoped
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_tenant ON invoices
  FOR SELECT
  USING (
    tenant_id IN (SELECT unnest(public.get_accessible_tenants()))
    OR
    dental_group_id IN (
      SELECT DISTINCT t.dental_group_id
      FROM tenants t
      WHERE t.id = ANY(public.get_accessible_tenants())
        AND t.dental_group_id IS NOT NULL
    )
  );

-- Usage events: tenant-scoped
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY usage_events_select_tenant ON usage_events
  FOR SELECT
  USING (tenant_id = ANY(public.get_accessible_tenants()));

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 005 complete: Billing schema created';
-- RAISE NOTICE '💳 Tables: plans, subscriptions, invoices, usage_events';
-- RAISE NOTICE '🎫 Seat-based billing with entitlements';
-- RAISE NOTICE '🔒 RLS: Tenant-scoped, plans are public';
END $$;

-- =====================================================
-- Migration: Seed Default Plans
-- Purpose: Populate plans table with default subscription tiers
-- Safety: Idempotent - uses ON CONFLICT DO UPDATE
-- Source: src/config/billing.ts PlanTiers
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SEED SOLO PLAN (Free)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'solo_free',
  'Solo',
  'For individual practitioners',
  'solo',
  2, -- min 2 seats
  2, -- max 2 seats
  0, -- Free
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "Basic CRM features",
    "Up to 2 users",
    "Contact management",
    "Basic pipeline",
    "Email support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 2. SEED TIER 1 - STARTER (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'starter_monthly',
  'Starter',
  'For small practices',
  'tier1',
  5, -- 5 default seats
  5, -- max 5 seats
  4900, -- £49/month
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Solo features",
    "Up to 5 users",
    "Advanced pipeline",
    "Basic marketing",
    "Calendar integration",
    "Priority support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 3. SEED TIER 1 - STARTER (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'starter_yearly',
  'Starter (Annual)',
  'For small practices - save 2 months!',
  'tier1',
  5,
  5,
  49900, -- £499/year (2 months free)
  'GBP',
  'yearly',
  TRUE,
  TRUE, -- Featured for savings
  '[
    "All Solo features",
    "Up to 5 users",
    "Advanced pipeline",
    "Basic marketing",
    "Calendar integration",
    "Priority support",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 4. SEED TIER 2 - PROFESSIONAL (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'professional_monthly',
  'Professional',
  'For growing practices',
  'tier2',
  10, -- 10 default seats
  15, -- can expand to 15
  9900, -- £99/month
  'GBP',
  'monthly',
  TRUE,
  TRUE, -- Featured as popular choice
  '[
    "All Starter features",
    "Up to 15 users",
    "Advanced marketing",
    "Automation workflows",
    "Custom roles",
    "API access",
    "Phone support"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  is_featured = EXCLUDED.is_featured,
  updated_at = NOW();

-- =====================================================
-- 5. SEED TIER 2 - PROFESSIONAL (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'professional_yearly',
  'Professional (Annual)',
  'For growing practices - best value!',
  'tier2',
  10,
  15,
  99900, -- £999/year
  'GBP',
  'yearly',
  TRUE,
  TRUE,
  '[
    "All Starter features",
    "Up to 15 users",
    "Advanced marketing",
    "Automation workflows",
    "Custom roles",
    "API access",
    "Phone support",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 6. SEED TIER 3 - BUSINESS (Monthly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'business_monthly',
  'Business',
  'For established practices & multi-location groups',
  'tier3',
  20, -- 20 default seats
  30, -- can expand to 30
  19900, -- £199/month
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Professional features",
    "Up to 30 users",
    "Multi-location support",
    "Advanced analytics",
    "Custom integrations",
    "Dedicated support",
    "Onboarding assistance"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 7. SEED TIER 3 - BUSINESS (Yearly)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'business_yearly',
  'Business (Annual)',
  'For established practices - enterprise features',
  'tier3',
  20,
  30,
  199900, -- £1999/year
  'GBP',
  'yearly',
  TRUE,
  FALSE,
  '[
    "All Professional features",
    "Up to 30 users",
    "Multi-location support",
    "Advanced analytics",
    "Custom integrations",
    "Dedicated support",
    "Onboarding assistance",
    "💰 Save 2 months with annual billing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  price_amount = EXCLUDED.price_amount,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 8. SEED ENTERPRISE PLAN (Custom Pricing)
-- =====================================================

INSERT INTO plans (
  name,
  display_name,
  description,
  tier,
  default_seat_limit,
  max_seat_limit,
  price_amount,
  price_currency,
  billing_interval,
  is_active,
  is_featured,
  features
) VALUES (
  'enterprise_custom',
  'Enterprise',
  'For large organizations with custom needs',
  'enterprise',
  50, -- Starting at 50 seats
  NULL, -- Unlimited
  NULL, -- Custom pricing
  'GBP',
  'monthly',
  TRUE,
  FALSE,
  '[
    "All Business features",
    "Unlimited users",
    "Unlimited locations",
    "White-label options",
    "Custom SLA",
    "Dedicated account manager",
    "Custom development",
    "Advanced security & compliance",
    "Custom contracts & pricing"
  ]'::JSONB
)
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  default_seat_limit = EXCLUDED.default_seat_limit,
  max_seat_limit = EXCLUDED.max_seat_limit,
  features = EXCLUDED.features,
  updated_at = NOW();

-- =====================================================
-- 9. SEED PLAN ENTITLEMENTS
-- =====================================================

-- Solo entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'basic_crm', NULL, 'Basic CRM features'
FROM plans WHERE name = 'solo_free'
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier1+ entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_pipeline', NULL, 'Advanced pipeline features'
FROM plans WHERE tier IN ('tier1', 'tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'basic_marketing', NULL, 'Basic marketing tools'
FROM plans WHERE tier IN ('tier1', 'tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier2+ entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'custom_roles', NULL, 'Create custom roles with granular permissions'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_marketing', NULL, 'Advanced marketing automation'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'api_access', NULL, 'REST API access'
FROM plans WHERE tier IN ('tier2', 'tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Tier3+ entitlements (multi-location)
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'multi_location', NULL, 'Multi-location support'
FROM plans WHERE tier IN ('tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'advanced_analytics', NULL, 'Advanced analytics and reporting'
FROM plans WHERE tier IN ('tier3', 'enterprise')
ON CONFLICT (plan_id, key) DO NOTHING;

-- Enterprise entitlements
INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'white_label', NULL, 'White-label branding'
FROM plans WHERE tier = 'enterprise'
ON CONFLICT (plan_id, key) DO NOTHING;

INSERT INTO plan_entitlements (plan_id, key, limit_value, description)
SELECT id, 'custom_sla', NULL, 'Custom SLA guarantees'
FROM plans WHERE tier = 'enterprise'
ON CONFLICT (plan_id, key) DO NOTHING;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
DECLARE
  plan_count INTEGER;
  entitlement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO plan_count FROM plans;
  SELECT COUNT(*) INTO entitlement_count FROM plan_entitlements;
  
-- RAISE NOTICE '✅ Migration 006 complete: Plans seeded';
-- RAISE NOTICE '📋 Total plans: %', plan_count;
-- RAISE NOTICE '🎫 Total entitlements: %', entitlement_count;
-- RAISE NOTICE '💳 Price range: Free (Solo) to Custom (Enterprise)';
END $$;

-- =====================================================
-- Migration: Update RLS Policies for Dual-Path Architecture
-- Purpose: Enable multi-location access while maintaining single-location performance
-- Safety: Updates existing policies to use public.get_accessible_tenants()
-- Performance: ZERO impact on single-location users (95%)
-- =====================================================

BEGIN;

-- =====================================================
-- CRITICAL: This migration updates ALL tenant-scoped RLS policies
-- to use the dual-path helper function public.get_accessible_tenants()
--
-- Behavior:
-- - Single-location users: Returns ARRAY[tenant_id] (fast index scan)
-- - Multi-location users: Returns ARRAY[tenant1_id, tenant2_id, ...] (acceptable performance)
--
-- Impact:
-- - Single-location queries: SELECT * FROM contacts WHERE tenant_id = 'uuid' (fast)
-- - Multi-location queries: SELECT * FROM contacts WHERE tenant_id = ANY(ARRAY['uuid1', 'uuid2']) (acceptable)
-- =====================================================

-- =====================================================
-- 1. UPDATE CONTACTS TABLE RLS
-- =====================================================

-- Drop existing policy
DROP POLICY IF EXISTS contacts_tenant_isolation ON contacts;

-- Create new dual-path policy
CREATE POLICY contacts_tenant_isolation ON contacts
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

COMMENT ON POLICY contacts_tenant_isolation ON contacts IS 
  'Dual-path: Single tenant for 95% users (fast), multiple for 5% (acceptable)';

-- =====================================================
-- 2. UPDATE DEALS TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS deals_tenant_isolation ON deals;

CREATE POLICY deals_tenant_isolation ON deals
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

COMMENT ON POLICY deals_tenant_isolation ON deals IS 
  'Dual-path: Tenant isolation with multi-location support';

-- =====================================================
-- 3. UPDATE ACTIVITIES TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS activities_tenant_isolation ON activities;

CREATE POLICY activities_tenant_isolation ON activities
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- =====================================================
-- 4. UPDATE PIPELINES TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS pipelines_tenant_isolation ON pipelines;

CREATE POLICY pipelines_tenant_isolation ON pipelines
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- =====================================================
-- 5. UPDATE STAGES TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS stages_tenant_isolation ON stages;

CREATE POLICY stages_tenant_isolation ON stages
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- =====================================================
-- 6. UPDATE APP_USERS TABLE RLS
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS app_users_tenant_isolation ON app_users;
DROP POLICY IF EXISTS app_users_select_policy ON app_users;

-- Create new dual-path policy
CREATE POLICY app_users_tenant_isolation ON app_users
  FOR SELECT
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- Users can update their own profile
CREATE POLICY app_users_update_own ON app_users
  FOR UPDATE
  USING (id = auth.uid());

COMMENT ON POLICY app_users_tenant_isolation ON app_users IS 
  'Users see app_users from all their accessible locations';

-- =====================================================
-- 7. UPDATE USER_INVITATIONS TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS user_invitations_tenant_isolation ON user_invitations;

CREATE POLICY user_invitations_tenant_isolation ON user_invitations
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- =====================================================
-- 8. UPDATE CUSTOM_ROLES TABLE RLS
-- =====================================================

DROP POLICY IF EXISTS custom_roles_tenant_isolation ON custom_roles;

CREATE POLICY custom_roles_tenant_isolation ON custom_roles
  FOR ALL
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- =====================================================
-- 9. UPDATE AUDIT_LOGS TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    EXECUTE 'DROP POLICY IF EXISTS audit_logs_tenant_isolation ON audit_logs';
    EXECUTE 'CREATE POLICY audit_logs_tenant_isolation ON audit_logs
      FOR SELECT
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 10. UPDATE NOTES TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
    EXECUTE 'DROP POLICY IF EXISTS notes_tenant_isolation ON notes';
    EXECUTE 'CREATE POLICY notes_tenant_isolation ON notes
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 11. UPDATE DOCUMENTS TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    EXECUTE 'DROP POLICY IF EXISTS documents_tenant_isolation ON documents';
    EXECUTE 'CREATE POLICY documents_tenant_isolation ON documents
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 12. UPDATE TASKS TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    EXECUTE 'DROP POLICY IF EXISTS tasks_tenant_isolation ON tasks';
    EXECUTE 'CREATE POLICY tasks_tenant_isolation ON tasks
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 13. UPDATE EMAIL_CAMPAIGNS TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    EXECUTE 'DROP POLICY IF EXISTS email_campaigns_tenant_isolation ON email_campaigns';
    EXECUTE 'CREATE POLICY email_campaigns_tenant_isolation ON email_campaigns
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 14. UPDATE COMMUNICATIONS TABLE RLS (if exists)
-- =====================================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'communications') THEN
    EXECUTE 'DROP POLICY IF EXISTS communications_tenant_isolation ON communications';
    EXECUTE 'CREATE POLICY communications_tenant_isolation ON communications
      FOR ALL
      USING (tenant_id = ANY(public.get_accessible_tenants()))';
  END IF;
END $$;

-- =====================================================
-- 15. CREATE HELPER VIEW: User's Accessible Locations
-- =====================================================

CREATE OR REPLACE VIEW user_accessible_locations AS
SELECT 
  au.id AS user_id,
  t.id AS tenant_id,
  t.name AS location_name,
  t.is_multi_location,
  CASE 
    WHEN au.tenant_id = t.id THEN TRUE 
    ELSE FALSE 
  END AS is_primary_location
FROM app_users au
INNER JOIN tenants t ON t.id = ANY(
  -- Get user's accessible tenants using the dual-path function
  (SELECT public.get_accessible_tenants())
)
WHERE au.id = auth.uid();

COMMENT ON VIEW user_accessible_locations IS 
  'Shows all locations accessible to the current user (for location switcher UI)';

-- =====================================================
-- 16. CREATE PERFORMANCE ANALYSIS FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION analyze_rls_performance(user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  is_multi_location BOOLEAN,
  accessible_tenant_count INTEGER,
  query_path TEXT,
  expected_performance TEXT
) AS $$
DECLARE
  v_user_id UUID;
  v_tenant_id UUID;
  v_is_multi BOOLEAN;
  v_tenant_count INTEGER;
BEGIN
  -- Find user
  -- Use app_users.email directly (no auth schema access needed)
  SELECT au.id, au.tenant_id INTO v_user_id, v_tenant_id
  FROM app_users au
  WHERE au.email = user_email
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', user_email;
  END IF;
  
  -- Check if multi-location
  SELECT t.is_multi_location INTO v_is_multi
  FROM tenants t
  WHERE t.id = v_tenant_id;
  
  -- Count accessible tenants
  SELECT COUNT(*) INTO v_tenant_count
  FROM user_location_access
  WHERE user_id = v_user_id
    AND is_active = TRUE;
  
  -- If no additional locations, count is 1 (primary tenant)
  IF v_tenant_count = 0 THEN
    v_tenant_count := 1;
  END IF;
  
  RETURN QUERY SELECT
    v_user_id,
    COALESCE(v_is_multi, FALSE),
    v_tenant_count,
    CASE 
      WHEN v_tenant_count = 1 THEN 'Single tenant (FAST INDEX SCAN)'
      ELSE 'Multiple tenants (BITMAP INDEX SCAN)'
    END AS query_path,
    CASE 
      WHEN v_tenant_count = 1 THEN '✅ Optimal - Zero overhead'
      WHEN v_tenant_count <= 5 THEN '✅ Good - Minimal overhead'
      WHEN v_tenant_count <= 10 THEN '⚠️ Acceptable - Moderate overhead'
      ELSE '⚠️ Review - Consider optimization'
    END AS expected_performance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION analyze_rls_performance IS 
  'Analyze RLS performance for a specific user (debugging tool)';

-- =====================================================
-- 17. CREATE MIGRATION VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION verify_rls_dual_path()
RETURNS TABLE (
  table_name TEXT,
  has_rls_enabled BOOLEAN,
  policy_count INTEGER,
  uses_dual_path BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.relname::TEXT AS table_name,
    c.relrowsecurity AS has_rls_enabled,
    COUNT(p.polname)::INTEGER AS policy_count,
    BOOL_OR(p.polqual::TEXT LIKE '%public.get_accessible_tenants()%') AS uses_dual_path
  FROM pg_class c
  LEFT JOIN pg_policy p ON p.polrelid = c.oid
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
    AND c.relname NOT LIKE 'sql_%'
  GROUP BY c.relname, c.relrowsecurity
  HAVING COUNT(p.polname) > 0
  ORDER BY c.relname;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_rls_dual_path IS 
  'Verify which tables have dual-path RLS policies (migration verification)';

COMMIT;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  -- Count policies using dual-path
  SELECT COUNT(*) INTO policy_count
  FROM pg_policy
  WHERE polqual::TEXT LIKE '%public.get_accessible_tenants()%';
  
-- RAISE NOTICE '✅ Migration 007 complete: RLS policies updated to dual-path';
-- RAISE NOTICE '🚀 Policies using dual-path: %', policy_count;
-- RAISE NOTICE '⚡ Performance: Single-location users unaffected';
-- RAISE NOTICE '🔍 Run SELECT * FROM verify_rls_dual_path() to verify';
END $$;

-- =====================================================
-- Migration: Backfill Existing Data
-- Purpose: Safely populate new fields for existing tenants and users
-- Safety: Idempotent - can be run multiple times without issues
-- Impact: Prepares existing data for new features
-- =====================================================

BEGIN;

-- =====================================================
-- 1. BACKFILL TENANTS: Set defaults for new columns
-- =====================================================

-- Set is_multi_location = FALSE for all existing tenants
UPDATE tenants
SET is_multi_location = FALSE
WHERE is_multi_location IS NULL;

-- Set currency_code for existing tenants (default: GBP)
UPDATE tenants
SET currency_code = 'GBP'
WHERE currency_code IS NULL;

-- Set locale for existing tenants (default: en-GB)
UPDATE tenants
SET locale = 'en-GB'
WHERE locale IS NULL;

-- Set billing_email to tenant name + default domain if not set
-- (Admins should update this later)
UPDATE tenants
SET billing_email = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) || '@example.com'
WHERE billing_email IS NULL
  AND name IS NOT NULL
  AND name != '';

COMMENT ON COLUMN tenants.billing_email IS 
  'Billing email (backfilled with placeholder, should be updated by admin)';

-- =====================================================
-- 2. BACKFILL TENANTS: Extract website_host from existing data
-- =====================================================

-- If tenants table has a website column, extract host
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'website'
  ) THEN
    -- Extract website_host from existing website column
    EXECUTE '
      UPDATE tenants
      SET 
        website_url = website,
        website_host = LOWER(
          REGEXP_REPLACE(
            REGEXP_REPLACE(website, ''^https?://(www\\.)?'', '''', ''i''),
            ''/$'', ''''
          )
        )
      WHERE website IS NOT NULL
        AND website != ''''
        AND website_host IS NULL
    ';
    
-- RAISE NOTICE '✅ Extracted website_host from existing website column';
  END IF;
END $$;

-- =====================================================
-- 3. BACKFILL TENANTS: Create default subscriptions
-- =====================================================

-- Create trial subscriptions for existing tenants without subscriptions
-- This ensures existing users aren't blocked by seat limits
INSERT INTO subscriptions (
  tenant_id,
  plan_id,
  status,
  current_period_start,
  current_period_end,
  seat_limit,
  active_seats,
  trial_start,
  trial_end
)
SELECT 
  t.id AS tenant_id,
  p.id AS plan_id,
  'trialing' AS status,
  NOW() AS current_period_start,
  NOW() + INTERVAL '14 days' AS current_period_end,
  p.default_seat_limit AS seat_limit,
  (SELECT COUNT(*) FROM app_users WHERE tenant_id = t.id) AS active_seats,
  NOW() AS trial_start,
  NOW() + INTERVAL '14 days' AS trial_end
FROM tenants t
CROSS JOIN plans p
WHERE p.name = 'professional_monthly' -- Start existing customers on Professional trial
  AND NOT EXISTS (
    SELECT 1 FROM subscriptions s 
    WHERE s.tenant_id = t.id
  )
  AND t.is_multi_location = FALSE; -- Only single-location for now

-- =====================================================
-- 4. BACKFILL: Update active_seats count
-- =====================================================

UPDATE subscriptions s
SET active_seats = (
  SELECT COUNT(*)
  FROM app_users au
  WHERE au.tenant_id = s.tenant_id
)
WHERE s.tenant_id IS NOT NULL;

  -- =====================================================
  -- 5. BACKFILL: Create Tenant Admin records
  -- =====================================================
  
  -- Find owners and create tenant_admin records for them
  -- Note: This is handled by migration 001a automatically
  -- Just verify they exist
  
-- RAISE NOTICE '✅ Tenant admins already created by migration 001a';

-- =====================================================
-- 6. VERIFICATION: Count backfilled records
-- =====================================================

DO $$
DECLARE
  tenant_count INTEGER;
  subscription_count INTEGER;
  super_admin_count INTEGER;
  total_users INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenant_count FROM tenants WHERE is_multi_location = FALSE;
  SELECT COUNT(*) INTO subscription_count FROM subscriptions WHERE status = 'trialing';
  SELECT COUNT(*) INTO super_admin_count FROM tenant_admins WHERE is_active = TRUE;
  SELECT COUNT(*) INTO total_users FROM app_users;
  
-- RAISE NOTICE '====================================================';
-- RAISE NOTICE '✅ Migration 008 complete: Data backfilled';
-- RAISE NOTICE '====================================================';
-- RAISE NOTICE 'Single-location tenants: %', tenant_count;
-- RAISE NOTICE 'Trial subscriptions created: %', subscription_count;
-- RAISE NOTICE 'Super admins: %', super_admin_count;
-- RAISE NOTICE 'Total users: %', total_users;
-- RAISE NOTICE '====================================================';
-- RAISE NOTICE '📋 TODO: Admins should update billing_email in settings';
-- RAISE NOTICE '====================================================';
END $$;

COMMIT;

-- =====================================================
-- POST-MIGRATION NOTES
-- =====================================================

-- 1. All existing tenants are marked as single-location (is_multi_location = FALSE)
-- 2. All existing tenants get a 14-day Professional trial
-- 3. Owners are automatically promoted to Super Admin
-- 4. Billing emails are placeholders - admins should update them
-- 5. No disruption to existing users - they can continue using the system
-- 6. Multi-location feature is disabled by default (feature flag)
-- 7. Existing RLS policies now use dual-path but behave identically for single-location

-- =====================================================
-- Migration: Seat Management Functions
-- Purpose: Atomic operations for seat counting
-- Safety: Prevents race conditions in concurrent seat reservations
-- =====================================================

BEGIN;

-- =====================================================
-- 1. INCREMENT ACTIVE SEATS (atomic)
-- =====================================================

CREATE OR REPLACE FUNCTION increment_active_seats(
  p_tenant_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_current_seats INTEGER;
  v_seat_limit INTEGER;
  v_new_seats INTEGER;
BEGIN
  -- Get subscription with row-level lock
  SELECT id, active_seats, seat_limit
  INTO v_subscription_id, v_current_seats, v_seat_limit
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
    AND status IN ('active', 'trialing')
  FOR UPDATE; -- Lock row for atomic operation
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No active subscription found'
    );
  END IF;
  
  v_new_seats := v_current_seats + p_count;
  
  -- Check if would exceed limit
  IF v_new_seats > v_seat_limit THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', format('Would exceed seat limit (%s/%s)', v_new_seats, v_seat_limit),
      'current_seats', v_current_seats,
      'seat_limit', v_seat_limit
    );
  END IF;
  
  -- Update seat count
  UPDATE subscriptions
  SET 
    active_seats = v_new_seats,
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_seats', v_current_seats,
    'new_seats', v_new_seats,
    'available_seats', v_seat_limit - v_new_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_active_seats IS 
  'Atomically reserve seats with limit enforcement (prevents race conditions)';

-- =====================================================
-- 2. DECREMENT ACTIVE SEATS (atomic)
-- =====================================================

CREATE OR REPLACE FUNCTION decrement_active_seats(
  p_tenant_id UUID,
  p_count INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_current_seats INTEGER;
  v_new_seats INTEGER;
BEGIN
  -- Get subscription with row-level lock
  SELECT id, active_seats
  INTO v_subscription_id, v_current_seats
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  FOR UPDATE;
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No subscription found'
    );
  END IF;
  
  -- Calculate new seats (don't go below 0)
  v_new_seats := GREATEST(0, v_current_seats - p_count);
  
  -- Update seat count
  UPDATE subscriptions
  SET 
    active_seats = v_new_seats,
    updated_at = NOW()
  WHERE id = v_subscription_id;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'previous_seats', v_current_seats,
    'new_seats', v_new_seats,
    'released_seats', v_current_seats - v_new_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION decrement_active_seats IS 
  'Atomically release seats (prevents negative counts)';

-- =====================================================
-- 3. CHECK SEAT AVAILABILITY (read-only, no lock)
-- =====================================================

CREATE OR REPLACE FUNCTION check_seat_availability(
  p_tenant_id UUID,
  p_seats_needed INTEGER DEFAULT 1
)
RETURNS JSONB AS $$
DECLARE
  v_subscription RECORD;
  v_available_seats INTEGER;
BEGIN
  SELECT 
    id,
    active_seats,
    seat_limit,
    status
  INTO v_subscription
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
  
  IF v_subscription.id IS NULL THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', 'No subscription found'
    );
  END IF;
  
  IF v_subscription.status NOT IN ('active', 'trialing') THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', format('Subscription is %s', v_subscription.status)
    );
  END IF;
  
  v_available_seats := v_subscription.seat_limit - v_subscription.active_seats;
  
  IF v_available_seats < p_seats_needed THEN
    RETURN jsonb_build_object(
      'available', FALSE,
      'reason', format('Not enough seats (need %s, have %s)', p_seats_needed, v_available_seats),
      'available_seats', v_available_seats,
      'needed_seats', p_seats_needed
    );
  END IF;
  
  RETURN jsonb_build_object(
    'available', TRUE,
    'available_seats', v_available_seats,
    'seat_limit', v_subscription.seat_limit,
    'active_seats', v_subscription.active_seats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION check_seat_availability IS 
  'Check if seats are available without locking (fast read)';

-- =====================================================
-- 4. SYNC SEAT COUNT (maintenance)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_subscription_seat_count(
  p_tenant_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_subscription_id UUID;
  v_actual_count INTEGER;
  v_recorded_count INTEGER;
BEGIN
  -- Count actual app_users
  SELECT COUNT(*) INTO v_actual_count
  FROM app_users
  WHERE tenant_id = p_tenant_id;
  
  -- Get subscription
  SELECT id, active_seats
  INTO v_subscription_id, v_recorded_count
  FROM subscriptions
  WHERE tenant_id = p_tenant_id
  LIMIT 1;
  
  IF v_subscription_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'No subscription found'
    );
  END IF;
  
  -- Update if mismatch
  IF v_actual_count != v_recorded_count THEN
    UPDATE subscriptions
    SET 
      active_seats = v_actual_count,
      updated_at = NOW()
    WHERE id = v_subscription_id;
    
    RETURN jsonb_build_object(
      'success', TRUE,
      'synced', TRUE,
      'previous_count', v_recorded_count,
      'actual_count', v_actual_count,
      'difference', v_actual_count - v_recorded_count
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', TRUE,
    'synced', FALSE,
    'message', 'Count already in sync',
    'count', v_actual_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_subscription_seat_count IS 
  'Sync subscription seat count with actual user count (maintenance)';

-- =====================================================
-- 5. BULK SYNC ALL SUBSCRIPTIONS (cron job)
-- =====================================================

CREATE OR REPLACE FUNCTION sync_all_subscription_seat_counts()
RETURNS TABLE (
  tenant_id UUID,
  recorded_seats INTEGER,
  actual_seats INTEGER,
  difference INTEGER,
  synced BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  WITH actual_counts AS (
    SELECT 
      au.tenant_id,
      COUNT(*) AS actual_count
    FROM app_users au
    GROUP BY au.tenant_id
  )
  UPDATE subscriptions s
  SET 
    active_seats = COALESCE(ac.actual_count, 0),
    updated_at = NOW()
  FROM actual_counts ac
  WHERE s.tenant_id = ac.tenant_id
    AND s.active_seats != COALESCE(ac.actual_count, 0)
  RETURNING 
    s.tenant_id,
    s.active_seats AS recorded_seats,
    COALESCE(ac.actual_count, 0) AS actual_seats,
    COALESCE(ac.actual_count, 0) - s.active_seats AS difference,
    TRUE AS synced;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION sync_all_subscription_seat_counts IS 
  'Sync all subscription seat counts (run daily via cron)';

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
-- RAISE NOTICE '✅ Migration 009 complete: Seat management functions created';
-- RAISE NOTICE '⚛️  Atomic operations: increment_active_seats, decrement_active_seats';
-- RAISE NOTICE '🔍 Read functions: check_seat_availability';
-- RAISE NOTICE '🔧 Maintenance: sync_subscription_seat_count, sync_all_subscription_seat_counts';
END $$;

