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
CREATE INDEX IF NOT EXISTS idx_audit_runs_practice ON marketing_audit_runs(practice_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_tenant ON marketing_audit_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_runs_status ON marketing_audit_runs(status);
CREATE INDEX IF NOT EXISTS idx_audit_runs_started_at ON marketing_audit_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_runs_completed_at ON marketing_audit_runs(completed_at DESC) WHERE completed_at IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_metrics_run ON audit_metrics(run_id);
CREATE INDEX IF NOT EXISTS idx_metrics_category ON audit_metrics(category);
CREATE INDEX IF NOT EXISTS idx_metrics_metric_name ON audit_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_collected_at ON audit_metrics(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_trending ON audit_metrics(metric_name, collected_at DESC) WHERE category IS NOT NULL;

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
CREATE INDEX IF NOT EXISTS idx_recommendations_run ON audit_recommendations(run_id);
CREATE INDEX IF NOT EXISTS idx_recommendations_status ON audit_recommendations(status);
CREATE INDEX IF NOT EXISTS idx_recommendations_priority ON audit_recommendations(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_recommendations_task ON audit_recommendations(task_id) WHERE task_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_recommendations_category ON audit_recommendations(category);

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
CREATE INDEX IF NOT EXISTS idx_competitors_run ON audit_competitors(run_id);
CREATE INDEX IF NOT EXISTS idx_competitors_rank ON audit_competitors(rank);
CREATE INDEX IF NOT EXISTS idx_competitors_place_id ON audit_competitors(competitor_place_id);

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
CREATE INDEX IF NOT EXISTS idx_peer_groups_practice ON audit_peer_groups(practice_id);
CREATE INDEX IF NOT EXISTS idx_peer_groups_default ON audit_peer_groups(practice_id, is_default) WHERE is_default = true;

-- Add foreign key for peer_group_id in marketing_audit_runs
ALTER TABLE marketing_audit_runs 
  DROP CONSTRAINT IF EXISTS fk_peer_group;
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
CREATE INDEX IF NOT EXISTS idx_schedules_next_run ON audit_schedules(next_run_at) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_schedules_practice ON audit_schedules(practice_id);

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
CREATE INDEX IF NOT EXISTS idx_credentials_practice ON api_credentials(practice_id);
CREATE INDEX IF NOT EXISTS idx_credentials_expires ON api_credentials(expires_at) WHERE status = 'active';

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
CREATE INDEX IF NOT EXISTS idx_alerts_practice ON audit_alerts(practice_id);
CREATE INDEX IF NOT EXISTS idx_alerts_run ON audit_alerts(run_id);
CREATE INDEX IF NOT EXISTS idx_alerts_unacknowledged ON audit_alerts(practice_id, triggered_at DESC) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON audit_alerts(severity, triggered_at DESC);

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
DROP POLICY IF EXISTS audit_runs_read ON marketing_audit_runs;
CREATE POLICY audit_runs_read ON marketing_audit_runs
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_metrics_read ON audit_metrics;
CREATE POLICY audit_metrics_read ON audit_metrics
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_recommendations_read ON audit_recommendations;
CREATE POLICY audit_recommendations_read ON audit_recommendations
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_competitors_read ON audit_competitors;
CREATE POLICY audit_competitors_read ON audit_competitors
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_peer_groups_read ON audit_peer_groups;
CREATE POLICY audit_peer_groups_read ON audit_peer_groups
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_schedules_read ON audit_schedules;
CREATE POLICY audit_schedules_read ON audit_schedules
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS api_credentials_read ON api_credentials;
CREATE POLICY api_credentials_read ON api_credentials
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_alerts_read ON audit_alerts;
CREATE POLICY audit_alerts_read ON audit_alerts
  FOR SELECT USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

-- Write policies (authenticated users only)
DROP POLICY IF EXISTS audit_runs_write ON marketing_audit_runs;
CREATE POLICY audit_runs_write ON marketing_audit_runs
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_metrics_write ON audit_metrics;
CREATE POLICY audit_metrics_write ON audit_metrics
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_recommendations_write ON audit_recommendations;
CREATE POLICY audit_recommendations_write ON audit_recommendations
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_competitors_write ON audit_competitors;
CREATE POLICY audit_competitors_write ON audit_competitors
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_peer_groups_write ON audit_peer_groups;
CREATE POLICY audit_peer_groups_write ON audit_peer_groups
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_schedules_write ON audit_schedules;
CREATE POLICY audit_schedules_write ON audit_schedules
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS api_credentials_write ON api_credentials;
CREATE POLICY api_credentials_write ON api_credentials
  FOR ALL USING (tenant_id = current_setting('app.current_tenant_id', true)::UUID);

DROP POLICY IF EXISTS audit_alerts_write ON audit_alerts;
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
CREATE OR REPLACE TRIGGER update_audit_runs_updated_at
  BEFORE UPDATE ON marketing_audit_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_recommendations_updated_at
  BEFORE UPDATE ON audit_recommendations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_peer_groups_updated_at
  BEFORE UPDATE ON audit_peer_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_schedules_updated_at
  BEFORE UPDATE ON audit_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER update_credentials_updated_at
  BEFORE UPDATE ON api_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VIEWS
-- ============================================

-- View for latest audit per practice
DROP VIEW IF EXISTS latest_audit_runs CASCADE;
CREATE VIEW latest_audit_runs AS
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

