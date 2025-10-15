-- ============================================
-- MARKETING AUDIT MODULE - DATABASE SCHEMA
-- ============================================

-- 1. MARKETING_AUDIT_RUNS TABLE
CREATE TABLE IF NOT EXISTS marketing_audit_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  domain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  
  composite_score DECIMAL(5,2) CHECK (composite_score BETWEEN 0 AND 100),
  technical_score DECIMAL(5,2) CHECK (technical_score BETWEEN 0 AND 100),
  local_score DECIMAL(5,2) CHECK (local_score BETWEEN 0 AND 100),
  content_score DECIMAL(5,2) CHECK (content_score BETWEEN 0 AND 100),
  analytics_score DECIMAL(5,2) CHECK (analytics_score BETWEEN 0 AND 100),
  conversion_score DECIMAL(5,2) CHECK (conversion_score BETWEEN 0 AND 100),
  
  run_type TEXT DEFAULT 'manual' CHECK (run_type IN ('manual', 'scheduled', 'triggered')),
  peer_group_id UUID,
  percentile_rank DECIMAL(5,2),
  error_message TEXT,
  
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_audit_runs_practice ON marketing_audit_runs(practice_id);
CREATE INDEX idx_audit_runs_tenant ON marketing_audit_runs(tenant_id);
CREATE INDEX idx_audit_runs_status ON marketing_audit_runs(status);
CREATE INDEX idx_audit_runs_completed_at ON marketing_audit_runs(completed_at DESC);

-- 2. AUDIT_METRICS TABLE
CREATE TABLE IF NOT EXISTS audit_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(10,4),
  source TEXT NOT NULL,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_metrics_run ON audit_metrics(run_id);
CREATE INDEX idx_metrics_category ON audit_metrics(category);

-- 3. AUDIT_RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS audit_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  impact TEXT NOT NULL CHECK (impact IN ('high', 'medium', 'low')),
  effort TEXT NOT NULL CHECK (effort IN ('high', 'medium', 'low')),
  confidence TEXT DEFAULT 'medium' CHECK (confidence IN ('high', 'medium', 'low')),
  priority_score INTEGER DEFAULT 50,
  status TEXT DEFAULT 'pending',
  task_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_recommendations_run ON audit_recommendations(run_id);
CREATE INDEX idx_recommendations_priority ON audit_recommendations(priority_score DESC);

-- 4. AUDIT_COMPETITORS TABLE
CREATE TABLE IF NOT EXISTS audit_competitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  competitor_name TEXT NOT NULL,
  competitor_domain TEXT,
  composite_score DECIMAL(5,2),
  metrics JSONB DEFAULT '{}'::jsonb,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_competitors_run ON audit_competitors(run_id);

-- 5. AUDIT_PEER_GROUPS TABLE
CREATE TABLE IF NOT EXISTS audit_peer_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  name TEXT NOT NULL,
  auto_discover BOOLEAN DEFAULT true,
  category TEXT,
  radius_miles INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  UNIQUE (practice_id, name)
);

CREATE INDEX idx_peer_groups_practice ON audit_peer_groups(practice_id);

-- 6. AUDIT_SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS audit_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  enabled BOOLEAN DEFAULT true,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_schedules_next_run ON audit_schedules(next_run_at) WHERE enabled = true;

-- 7. API_CREDENTIALS TABLE
CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_id UUID NOT NULL,
  provider TEXT NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL,
  UNIQUE (practice_id, provider)
);

CREATE INDEX idx_credentials_practice ON api_credentials(practice_id);

-- 8. AUDIT_ALERTS TABLE
CREATE TABLE IF NOT EXISTS audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES marketing_audit_runs(id) ON DELETE CASCADE,
  practice_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  acknowledged BOOLEAN DEFAULT false,
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id UUID NOT NULL
);

CREATE INDEX idx_alerts_practice ON audit_alerts(practice_id);
CREATE INDEX idx_alerts_unacknowledged ON audit_alerts(practice_id) WHERE acknowledged = false;

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE marketing_audit_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_competitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_peer_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_alerts ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES
CREATE POLICY audit_runs_policy ON marketing_audit_runs
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_metrics_policy ON audit_metrics
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_recommendations_policy ON audit_recommendations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_competitors_policy ON audit_competitors
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_peer_groups_policy ON audit_peer_groups
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_schedules_policy ON audit_schedules
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY api_credentials_policy ON api_credentials
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY audit_alerts_policy ON audit_alerts
  FOR ALL USING (auth.uid() IS NOT NULL);

