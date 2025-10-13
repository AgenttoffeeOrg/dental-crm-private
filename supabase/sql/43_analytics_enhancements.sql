-- =====================================================
-- ANALYTICS ENHANCEMENTS - ADVANCED INTELLIGENCE
-- =====================================================
-- Version: 2.0
-- Date: October 13, 2025
-- Purpose: Add advanced analytics capabilities for enterprise intelligence
-- =====================================================

BEGIN;

-- =====================================================
-- 1. NEW TABLES FOR TRACKING
-- =====================================================

-- Deal Stage History (track when deals move between stages)
CREATE TABLE IF NOT EXISTS deal_stage_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  from_stage_id UUID REFERENCES pipeline_stages(id),
  to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id),
  from_stage_name TEXT,
  to_stage_name TEXT,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  moved_by_user_id UUID REFERENCES app_users(id),
  time_in_previous_stage_days INTEGER,
  deal_value_at_move_cents INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_stage_history_deal ON deal_stage_history(deal_id);
CREATE INDEX idx_deal_stage_history_tenant ON deal_stage_history(tenant_id);
CREATE INDEX idx_deal_stage_history_moved_at ON deal_stage_history(moved_at);

COMMENT ON TABLE deal_stage_history IS 'Track deal movement through pipeline stages for velocity analysis';

-- Deal Win/Loss Reasons
CREATE TABLE IF NOT EXISTS deal_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('won', 'lost')),
  primary_reason TEXT,
  secondary_reasons TEXT[],
  competitor TEXT,
  notes TEXT,
  outcome_value_cents INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by_user_id UUID REFERENCES app_users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_outcomes_deal ON deal_outcomes(deal_id);
CREATE INDEX idx_deal_outcomes_tenant_outcome ON deal_outcomes(tenant_id, outcome);

COMMENT ON TABLE deal_outcomes IS 'Track why deals are won or lost for intelligence gathering';

-- Contact Engagement Log (for scoring)
CREATE TABLE IF NOT EXISTS contact_engagement_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- email_open, link_click, form_submit, call_answered, etc.
  event_source TEXT, -- campaign_id, activity_id, etc.
  engagement_score INTEGER DEFAULT 0,
  metadata JSONB,
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_contact_engagement_contact ON contact_engagement_events(contact_id);
CREATE INDEX idx_contact_engagement_tenant_type ON contact_engagement_events(tenant_id, event_type);
CREATE INDEX idx_contact_engagement_occurred ON contact_engagement_events(occurred_at);

COMMENT ON TABLE contact_engagement_events IS 'Track all contact engagements for scoring and analytics';

-- Forecast Snapshots (track prediction accuracy)
CREATE TABLE IF NOT EXISTS revenue_forecast_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  forecast_created_at DATE NOT NULL DEFAULT CURRENT_DATE,
  target_month DATE NOT NULL,
  
  -- Predictions
  predicted_revenue_cents INTEGER NOT NULL,
  confidence_level DECIMAL(3,2), -- 0.80 = 80% confidence
  prediction_method TEXT, -- 'ml', 'linear', 'weighted_pipeline'
  
  -- Actual (filled in later)
  actual_revenue_cents INTEGER,
  accuracy_percentage DECIMAL(5,2), -- Calculated later
  
  -- Context
  open_pipeline_value_cents INTEGER,
  weighted_pipeline_value_cents INTEGER,
  assumptions JSONB,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_forecast_tenant_target ON revenue_forecast_snapshots(tenant_id, target_month);
CREATE INDEX idx_forecast_created_at ON revenue_forecast_snapshots(forecast_created_at);

COMMENT ON TABLE revenue_forecast_snapshots IS 'Store revenue predictions to track forecasting accuracy';

-- =====================================================
-- 2. NEW ANALYTICS VIEWS
-- =====================================================

-- Cohort Analysis View (Retention by acquisition month)
CREATE OR REPLACE VIEW cohort_retention_analysis AS
SELECT
  c.tenant_id,
  DATE_TRUNC('month', c.created_at) as cohort_month,
  COUNT(DISTINCT c.id) as cohort_size,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '1 month' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '2 months') as active_month_1,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '2 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '3 months') as active_month_2,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '3 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '4 months') as active_month_3,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '6 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '7 months') as active_month_6,
  COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '12 months' 
    AND a.occurred_at < DATE_TRUNC('month', c.created_at) + INTERVAL '13 months') as active_month_12,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN ROUND((COUNT(DISTINCT c.id) FILTER (WHERE a.occurred_at >= DATE_TRUNC('month', c.created_at) + INTERVAL '12 months')::DECIMAL 
      / COUNT(DISTINCT c.id)::DECIMAL) * 100, 1)
    ELSE 0 
  END as retention_rate_12m
FROM contacts c
LEFT JOIN activities a ON c.id = a.contact_id AND a.tenant_id = c.tenant_id
WHERE c.created_at >= NOW() - INTERVAL '24 months'
GROUP BY c.tenant_id, DATE_TRUNC('month', c.created_at)
ORDER BY cohort_month DESC;

COMMENT ON VIEW cohort_retention_analysis IS 'Track patient retention by acquisition cohort';

-- Customer Lifetime Value by Source
CREATE OR REPLACE VIEW customer_ltv_by_source AS
SELECT
  c.tenant_id,
  c.source,
  COUNT(DISTINCT c.id) as total_customers,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as total_revenue_cents,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) / COUNT(DISTINCT c.id)
    ELSE 0 
  END as avg_ltv_cents,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400), 0) as avg_customer_age_days,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT c.id)::DECIMAL
    ELSE 0 
  END as deals_per_customer
FROM contacts c
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE c.source IS NOT NULL
GROUP BY c.tenant_id, c.source;

COMMENT ON VIEW customer_ltv_by_source IS 'Calculate lifetime value by acquisition source';

-- Win/Loss Reasons Summary
CREATE OR REPLACE VIEW win_loss_analysis AS
SELECT
  outcomes.tenant_id,
  outcomes.outcome,
  outcomes.primary_reason,
  COUNT(*) as count,
  COALESCE(AVG(outcomes.outcome_value_cents), 0) as avg_deal_value_cents,
  COALESCE(SUM(outcomes.outcome_value_cents), 0) as total_value_cents,
  outcomes.competitor,
  ROUND(COUNT(*)::DECIMAL / SUM(COUNT(*)) OVER (PARTITION BY outcomes.tenant_id, outcomes.outcome) * 100, 1) as percentage_of_outcome
FROM deal_outcomes outcomes
WHERE outcomes.recorded_at >= NOW() - INTERVAL '12 months'
GROUP BY outcomes.tenant_id, outcomes.outcome, outcomes.primary_reason, outcomes.competitor
ORDER BY outcomes.tenant_id, outcomes.outcome, count DESC;

COMMENT ON VIEW win_loss_analysis IS 'Analyze patterns in won and lost deals';

-- Pipeline Velocity Metrics
CREATE OR REPLACE VIEW pipeline_velocity_detailed AS
SELECT
  dsh.tenant_id,
  dsh.from_stage_name,
  dsh.to_stage_name,
  COUNT(*) as total_transitions,
  ROUND(AVG(dsh.time_in_previous_stage_days), 1) as avg_days_in_stage,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY dsh.time_in_previous_stage_days) as median_days_in_stage,
  MIN(dsh.time_in_previous_stage_days) as min_days,
  MAX(dsh.time_in_previous_stage_days) as max_days,
  COUNT(*) FILTER (WHERE dsh.time_in_previous_stage_days > 30) as stuck_deals_count,
  COALESCE(AVG(dsh.deal_value_at_move_cents), 0) as avg_deal_value_cents
FROM deal_stage_history dsh
WHERE dsh.moved_at >= NOW() - INTERVAL '6 months'
GROUP BY dsh.tenant_id, dsh.from_stage_name, dsh.to_stage_name
ORDER BY dsh.tenant_id, avg_days_in_stage DESC;

COMMENT ON VIEW pipeline_velocity_detailed IS 'Detailed pipeline velocity and bottleneck analysis';

-- Activity Effectiveness View
CREATE OR REPLACE VIEW activity_effectiveness_metrics AS
SELECT
  a.tenant_id,
  a.type as activity_type,
  a.agent_user_id,
  au.full_name as agent_name,
  COUNT(DISTINCT a.id) as total_activities,
  COUNT(DISTINCT a.contact_id) as unique_contacts,
  COUNT(DISTINCT a.deal_id) as unique_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won_after_activity,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN ROUND((COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL 
      / COUNT(DISTINCT d.id)::DECIMAL) * 100, 1)
    ELSE 0 
  END as win_rate_after_activity,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_influenced_cents
FROM activities a
LEFT JOIN app_users au ON a.agent_user_id = au.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE a.occurred_at >= NOW() - INTERVAL '6 months'
GROUP BY a.tenant_id, a.type, a.agent_user_id, au.full_name
ORDER BY deals_won_after_activity DESC;

COMMENT ON VIEW activity_effectiveness_metrics IS 'Measure which activities drive the most results';

-- Contact Engagement Scores
CREATE OR REPLACE VIEW contact_engagement_scores AS
SELECT
  c.id as contact_id,
  c.tenant_id,
  c.full_name,
  c.primary_email,
  c.source,
  COALESCE(SUM(cee.engagement_score), 0) as total_engagement_score,
  COUNT(DISTINCT cee.id) as total_engagement_events,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.occurred_at >= NOW() - INTERVAL '30 days') as engagement_events_30d,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'email_open') as email_opens,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'link_click') as link_clicks,
  COUNT(DISTINCT cee.id) FILTER (WHERE cee.event_type = 'form_submit') as form_submits,
  MAX(cee.occurred_at) as last_engagement_at,
  CASE
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 100 THEN 'hot'
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 50 THEN 'warm'
    WHEN COALESCE(SUM(cee.engagement_score), 0) >= 20 THEN 'lukewarm'
    ELSE 'cold'
  END as engagement_level
FROM contacts c
LEFT JOIN contact_engagement_events cee ON c.id = cee.contact_id
GROUP BY c.id, c.tenant_id, c.full_name, c.primary_email, c.source;

COMMENT ON VIEW contact_engagement_scores IS 'Calculate engagement scores for lead prioritization';

-- Revenue Forecast Base Data (using created_at as proxy for forecasting)
CREATE OR REPLACE VIEW revenue_forecast_base AS
SELECT
  d.tenant_id,
  DATE_TRUNC('month', d.created_at) as deal_month,
  ps.name as stage_name,
  COUNT(DISTINCT d.id) as deal_count,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  CASE
    WHEN ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' THEN 1.0
    WHEN ps.name ILIKE '%negotiation%' OR ps.name ILIKE '%proposal%' THEN 0.7
    WHEN ps.name ILIKE '%qualified%' THEN 0.4
    WHEN ps.name ILIKE '%contact%' OR ps.name ILIKE '%lead%' THEN 0.2
    ELSE 0.3
  END as stage_probability,
  COALESCE(SUM(d.value_estimate_cents), 0) * 
    CASE
      WHEN ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' THEN 1.0
      WHEN ps.name ILIKE '%negotiation%' OR ps.name ILIKE '%proposal%' THEN 0.7
      WHEN ps.name ILIKE '%qualified%' THEN 0.4
      WHEN ps.name ILIKE '%contact%' OR ps.name ILIKE '%lead%' THEN 0.2
      ELSE 0.3
    END as weighted_value_cents
FROM deals d
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE d.created_at >= NOW() - INTERVAL '12 months'
GROUP BY d.tenant_id, DATE_TRUNC('month', d.created_at), ps.name;

COMMENT ON VIEW revenue_forecast_base IS 'Base data for revenue forecasting calculations using historical patterns';

-- Deal Size Distribution
CREATE OR REPLACE VIEW deal_size_distribution AS
SELECT
  tenant_id,
  CASE
    WHEN value_estimate_cents < 100000 THEN '$0-$1K'
    WHEN value_estimate_cents < 500000 THEN '$1K-$5K'
    WHEN value_estimate_cents < 1000000 THEN '$5K-$10K'
    WHEN value_estimate_cents < 2500000 THEN '$10K-$25K'
    WHEN value_estimate_cents < 5000000 THEN '$25K-$50K'
    ELSE '$50K+'
  END as deal_size_range,
  COUNT(*) as deal_count,
  COALESCE(AVG(value_estimate_cents), 0) as avg_value_cents,
  COALESCE(SUM(value_estimate_cents), 0) as total_value_cents
FROM deals
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY tenant_id, 
  CASE
    WHEN value_estimate_cents < 100000 THEN '$0-$1K'
    WHEN value_estimate_cents < 500000 THEN '$1K-$5K'
    WHEN value_estimate_cents < 1000000 THEN '$5K-$10K'
    WHEN value_estimate_cents < 2500000 THEN '$10K-$25K'
    WHEN value_estimate_cents < 5000000 THEN '$25K-$50K'
    ELSE '$50K+'
  END
ORDER BY tenant_id, MIN(value_estimate_cents);

COMMENT ON VIEW deal_size_distribution IS 'Analyze distribution of deal sizes';

-- Conversion Funnel Analysis
CREATE OR REPLACE VIEW conversion_funnel_metrics AS
SELECT
  p.tenant_id,
  p.id as pipeline_id,
  p.name as pipeline_name,
  ps.id as stage_id,
  ps.name as stage_name,
  ps.position as stage_position,
  COUNT(DISTINCT d.id) as deals_in_stage,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position) as previous_stage_count,
  CASE 
    WHEN LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position) > 0 
    THEN ROUND((COUNT(DISTINCT d.id)::DECIMAL / 
      LAG(COUNT(DISTINCT d.id)) OVER (PARTITION BY p.id ORDER BY ps.position)::DECIMAL) * 100, 1)
    ELSE 100.0
  END as conversion_rate_from_previous
FROM pipelines p
LEFT JOIN pipeline_stages ps ON p.id = ps.pipeline_id
LEFT JOIN deals d ON ps.id = d.stage_id
GROUP BY p.tenant_id, p.id, p.name, ps.id, ps.name, ps.position
ORDER BY p.id, ps.position;

COMMENT ON VIEW conversion_funnel_metrics IS 'Track conversion rates through pipeline stages';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Calculate Business Health Score
CREATE OR REPLACE FUNCTION calculate_business_health_score(p_tenant_id UUID)
RETURNS TABLE (
  overall_score INTEGER,
  revenue_growth_score INTEGER,
  pipeline_health_score INTEGER,
  activity_score INTEGER,
  win_rate_score INTEGER,
  recommendations TEXT[]
) AS $$
DECLARE
  v_revenue_current DECIMAL;
  v_revenue_previous DECIMAL;
  v_revenue_growth DECIMAL;
  v_pipeline_value DECIMAL;
  v_activity_count INTEGER;
  v_win_rate DECIMAL;
BEGIN
  -- Calculate current month revenue
  SELECT COALESCE(SUM(value_estimate_cents), 0) / 100.0
  INTO v_revenue_current
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')
    AND d.created_at >= DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate previous month revenue
  SELECT COALESCE(SUM(value_estimate_cents), 0) / 100.0
  INTO v_revenue_previous
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')
    AND d.created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
    AND d.created_at < DATE_TRUNC('month', CURRENT_DATE);

  -- Calculate growth rate
  IF v_revenue_previous > 0 THEN
    v_revenue_growth := ((v_revenue_current - v_revenue_previous) / v_revenue_previous) * 100;
  ELSE
    v_revenue_growth := 0;
  END IF;

  -- Revenue growth score (0-100)
  revenue_growth_score := LEAST(100, GREATEST(0, 50 + (v_revenue_growth * 2)));

  -- Get pipeline value and activity metrics
  SELECT 
    COALESCE(SUM(d.value_estimate_cents), 0) / 100.0,
    COUNT(DISTINCT a.id)
  INTO v_pipeline_value, v_activity_count
  FROM deals d
  LEFT JOIN activities a ON d.id = a.deal_id 
    AND a.occurred_at >= CURRENT_DATE - INTERVAL '30 days'
  WHERE d.tenant_id = p_tenant_id;

  -- Pipeline health score
  pipeline_health_score := LEAST(100, GREATEST(0, (v_pipeline_value / 100000) * 100));

  -- Activity score
  activity_score := LEAST(100, GREATEST(0, (v_activity_count / 100.0) * 100));

  -- Win rate
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 
      THEN (COUNT(*) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(*)::DECIMAL) * 100
      ELSE 0 
    END
  INTO v_win_rate
  FROM deals d
  JOIN pipeline_stages ps ON d.stage_id = ps.id
  WHERE d.tenant_id = p_tenant_id
    AND d.created_at >= CURRENT_DATE - INTERVAL '90 days';

  win_rate_score := LEAST(100, GREATEST(0, v_win_rate * 1.5));

  -- Overall score (weighted average)
  overall_score := ROUND(
    (revenue_growth_score * 0.3) + 
    (pipeline_health_score * 0.25) + 
    (activity_score * 0.20) + 
    (win_rate_score * 0.25)
  );

  -- Generate recommendations
  recommendations := ARRAY[]::TEXT[];
  
  IF revenue_growth_score < 50 THEN
    recommendations := array_append(recommendations, 'Revenue growth is below target. Review pricing and upsell strategies.');
  END IF;
  
  IF pipeline_health_score < 60 THEN
    recommendations := array_append(recommendations, 'Pipeline value is low. Increase lead generation efforts.');
  END IF;
  
  IF activity_score < 60 THEN
    recommendations := array_append(recommendations, 'Team activity is below average. Ensure consistent follow-up.');
  END IF;
  
  IF win_rate_score < 50 THEN
    recommendations := array_append(recommendations, 'Win rate needs improvement. Review qualification criteria and sales process.');
  END IF;

  RETURN QUERY SELECT 
    calculate_business_health_score.overall_score,
    calculate_business_health_score.revenue_growth_score,
    calculate_business_health_score.pipeline_health_score,
    calculate_business_health_score.activity_score,
    calculate_business_health_score.win_rate_score,
    calculate_business_health_score.recommendations;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_business_health_score IS 'Calculate overall business health score with component metrics';

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Deals indexes for analytics
CREATE INDEX IF NOT EXISTS idx_deals_created_value ON deals(tenant_id, created_at, value_estimate_cents);
CREATE INDEX IF NOT EXISTS idx_deals_stage_value ON deals(tenant_id, stage_id, value_estimate_cents);

-- Activities indexes for analytics
CREATE INDEX IF NOT EXISTS idx_activities_occurred_type ON activities(tenant_id, occurred_at, type);
CREATE INDEX IF NOT EXISTS idx_activities_contact_occurred ON activities(contact_id, occurred_at);

-- Contacts indexes
CREATE INDEX IF NOT EXISTS idx_contacts_created_source ON contacts(tenant_id, created_at, source);

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
DO $$
BEGIN
  RAISE NOTICE '✅ Analytics enhancements installed successfully!';
  RAISE NOTICE '   - 4 new tables created';
  RAISE NOTICE '   - 10 new analytics views created';
  RAISE NOTICE '   - 1 helper function created';
  RAISE NOTICE '   - Performance indexes added';
END $$;

