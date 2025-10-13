-- =====================================================
-- ANALYTICS SYSTEM - CRM & MARKETING
-- =====================================================
-- Version: 1.0
-- Date: October 13, 2025
-- Purpose: Comprehensive analytics views and functions for business intelligence
-- =====================================================

BEGIN;

-- =====================================================
-- 1. CRM ANALYTICS VIEWS
-- =====================================================

-- Lead Source Performance
CREATE OR REPLACE VIEW crm_lead_source_analytics AS
SELECT
  c.tenant_id,
  c.source as lead_source,
  COUNT(DISTINCT c.id) as total_contacts,
  COUNT(DISTINCT d.id) as deals_created,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT c.id) > 0 
    THEN (COUNT(DISTINCT d.id)::DECIMAL / COUNT(DISTINCT c.id)::DECIMAL) * 100 
    ELSE 0 
  END as contact_to_deal_conversion_rate,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN (COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT d.id)::DECIMAL) * 100 
    ELSE 0 
  END as deal_win_rate,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents
FROM contacts c
LEFT JOIN deals d ON c.id = d.contact_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
WHERE c.source IS NOT NULL
GROUP BY c.tenant_id, c.source;

COMMENT ON VIEW crm_lead_source_analytics IS 'Lead source performance: contacts, deals, win rate, revenue by source';

-- Sales Performance by User
CREATE OR REPLACE VIEW crm_sales_performance_by_user AS
SELECT
  d.tenant_id,
  d.owner_user_id,
  au.full_name as user_name,
  au.role as user_role,
  COUNT(DISTINCT d.id) as total_deals,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%lost%') as deals_lost,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_pipeline_value_cents,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT d.id) > 0 
    THEN (COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')::DECIMAL / COUNT(DISTINCT d.id)::DECIMAL) * 100 
    ELSE 0 
  END as win_rate,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents,
  COUNT(DISTINCT a.id) as total_activities,
  COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'call') as total_calls,
  COUNT(DISTINCT a.id) FILTER (WHERE a.type = 'email') as total_emails
FROM deals d
LEFT JOIN app_users au ON d.owner_user_id = au.id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN activities a ON d.id = a.deal_id
WHERE d.owner_user_id IS NOT NULL
GROUP BY d.tenant_id, d.owner_user_id, au.full_name, au.role;

COMMENT ON VIEW crm_sales_performance_by_user IS 'Sales rep performance: deals, win rate, revenue, activities per user';

-- Pipeline Stage Analytics
CREATE OR REPLACE VIEW crm_pipeline_stage_analytics AS
SELECT
  ps.tenant_id,
  ps.pipeline_id,
  p.name as pipeline_name,
  ps.id as stage_id,
  ps.name as stage_name,
  ps.position as stage_position,
  COUNT(DISTINCT d.id) as current_deals,
  COALESCE(SUM(d.value_estimate_cents), 0) as total_value_cents,
  COALESCE(AVG(d.value_estimate_cents), 0) as avg_deal_value_cents,
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as deals_last_30_days,
  COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - d.created_at)) / 86400), 0) as avg_days_in_stage
FROM pipeline_stages ps
LEFT JOIN pipelines p ON ps.pipeline_id = p.id
LEFT JOIN deals d ON ps.id = d.stage_id
GROUP BY ps.tenant_id, ps.pipeline_id, p.name, ps.id, ps.name, ps.position
ORDER BY ps.pipeline_id, ps.position;

COMMENT ON VIEW crm_pipeline_stage_analytics IS 'Pipeline stage metrics: deal count, value, velocity per stage';

-- Revenue Analytics by Month
CREATE OR REPLACE VIEW crm_revenue_by_month AS
SELECT
  d.tenant_id,
  DATE_TRUNC('month', d.created_at) as month,
  COUNT(DISTINCT d.id) as deals_created,
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as deals_won,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as revenue_cents,
  COALESCE(AVG(d.value_estimate_cents) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%'), 0) as avg_deal_value_cents
FROM deals d
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
GROUP BY d.tenant_id, DATE_TRUNC('month', d.created_at)
ORDER BY month DESC;

COMMENT ON VIEW crm_revenue_by_month IS 'Monthly revenue trends and deal creation metrics';

-- =====================================================
-- 2. MARKETING ANALYTICS VIEWS
-- =====================================================

-- Marketing ROI Summary
CREATE OR REPLACE VIEW marketing_roi_summary AS
SELECT
  mc.tenant_id,
  mc.type as channel,
  COUNT(DISTINCT mc.id) as total_campaigns,
  COALESCE(SUM(mc.total_sends), 0) as total_sent,
  COALESCE(SUM(mc.total_opens), 0) as total_opened,
  COALESCE(SUM(mc.total_clicks), 0) as total_clicked,
  CASE 
    WHEN SUM(mc.total_sends) > 0 
    THEN (SUM(mc.total_opens)::DECIMAL / SUM(mc.total_sends)::DECIMAL) * 100 
    ELSE 0 
  END as avg_open_rate,
  CASE 
    WHEN SUM(mc.total_sends) > 0 
    THEN (SUM(mc.total_clicks)::DECIMAL / SUM(mc.total_sends)::DECIMAL) * 100 
    ELSE 0 
  END as avg_click_rate,
  COUNT(DISTINCT ma.contact_id) as leads_generated,
  COUNT(DISTINCT ma.deal_id) as deals_created,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents
FROM marketing_campaigns mc
LEFT JOIN marketing_attribution ma ON mc.id = ma.first_touch_campaign_id OR mc.id = ma.last_touch_campaign_id
GROUP BY mc.tenant_id, mc.type;

COMMENT ON VIEW marketing_roi_summary IS 'Marketing ROI: sends, engagement, leads, deals, revenue by channel';

-- Campaign Attribution Performance
CREATE OR REPLACE VIEW marketing_campaign_attribution AS
SELECT
  mc.tenant_id,
  mc.id as campaign_id,
  mc.name as campaign_name,
  mc.type as channel,
  mc.status,
  mc.total_sends as sent_count,
  mc.total_opens as opened_count,
  mc.total_clicks as clicked_count,
  COUNT(DISTINCT ma.contact_id) FILTER (WHERE ma.first_touch_campaign_id = mc.id) as first_touch_leads,
  COUNT(DISTINCT ma.contact_id) FILTER (WHERE ma.last_touch_campaign_id = mc.id) as last_touch_leads,
  COUNT(DISTINCT ma.deal_id) as total_deals,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents,
  mc.created_at as campaign_date
FROM marketing_campaigns mc
LEFT JOIN marketing_attribution ma ON mc.id = ma.first_touch_campaign_id OR mc.id = ma.last_touch_campaign_id
GROUP BY mc.tenant_id, mc.id, mc.name, mc.type, mc.status, mc.total_sends, mc.total_opens, mc.total_clicks, mc.created_at;

COMMENT ON VIEW marketing_campaign_attribution IS 'Individual campaign performance with attribution and revenue';

-- Marketing Cost & CAC Analysis
CREATE OR REPLACE VIEW marketing_cac_analysis AS
SELECT
  ma.tenant_id,
  DATE_TRUNC('month', ma.created_at) as month,
  COUNT(DISTINCT ma.contact_id) as total_leads,
  COUNT(DISTINCT ma.deal_id) as total_deals,
  COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) as deals_won,
  COALESCE(SUM(ma.campaign_cost_cents), 0) as total_marketing_spend_cents,
  COALESCE(SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as revenue_generated_cents,
  CASE 
    WHEN COUNT(DISTINCT ma.contact_id) > 0 
    THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.contact_id)::DECIMAL 
    ELSE 0 
  END as cost_per_lead_cents,
  CASE 
    WHEN COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) > 0 
    THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL 
    ELSE 0 
  END as customer_acquisition_cost_cents,
  CASE 
    WHEN SUM(ma.campaign_cost_cents) > 0 
    THEN (SUM(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / SUM(ma.campaign_cost_cents)::DECIMAL)
    ELSE 0 
  END as roi_multiplier,
  CASE 
    WHEN COUNT(DISTINCT ma.contact_id) > 0 
    THEN (COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / COUNT(DISTINCT ma.contact_id)::DECIMAL) * 100 
    ELSE 0 
  END as lead_to_customer_conversion_rate
FROM marketing_attribution ma
GROUP BY ma.tenant_id, DATE_TRUNC('month', ma.created_at)
ORDER BY month DESC;

COMMENT ON VIEW marketing_cac_analysis IS 'Customer Acquisition Cost and marketing ROI analysis by month';

-- =====================================================
-- 3. EXECUTIVE DASHBOARD VIEW
-- =====================================================

CREATE OR REPLACE VIEW executive_dashboard_kpis AS
SELECT
  t.id as tenant_id,
  t.name as practice_name,
  
  -- Contact Metrics (Last 30 days)
  COUNT(DISTINCT c.id) FILTER (WHERE c.created_at >= NOW() - INTERVAL '30 days') as new_contacts_30d,
  COUNT(DISTINCT c.id) as total_contacts,
  
  -- Deal Metrics (Last 30 days)
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days') as new_deals_30d,
  COUNT(DISTINCT d.id) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days' AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')) as deals_won_30d,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE d.created_at >= NOW() - INTERVAL '30 days' AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%')), 0) as revenue_30d_cents,
  
  -- Pipeline Metrics
  COUNT(DISTINCT d.id) FILTER (WHERE ps.name NOT ILIKE '%won%' AND ps.name NOT ILIKE '%lost%' AND ps.name NOT ILIKE '%closed%') as active_pipeline_deals,
  COALESCE(SUM(d.value_estimate_cents) FILTER (WHERE ps.name NOT ILIKE '%won%' AND ps.name NOT ILIKE '%lost%' AND ps.name NOT ILIKE '%closed%'), 0) as active_pipeline_value_cents,
  
  -- Activity Metrics (Last 30 days)
  COUNT(DISTINCT a.id) FILTER (WHERE a.occurred_at >= NOW() - INTERVAL '30 days') as total_activities_30d,
  
  -- Marketing Metrics (Last 30 days - if marketing enabled)
  COUNT(DISTINCT mc.id) FILTER (WHERE mc.created_at >= NOW() - INTERVAL '30 days') as campaigns_sent_30d,
  COALESCE(SUM(mc.total_sends) FILTER (WHERE mc.created_at >= NOW() - INTERVAL '30 days'), 0) as marketing_messages_sent_30d,
  
  -- Team Metrics
  COUNT(DISTINCT au.id) as team_size,
  COUNT(DISTINCT au.id) FILTER (WHERE au.role = 'owner') as owner_count,
  COUNT(DISTINCT au.id) FILTER (WHERE au.role = 'staff') as staff_count

FROM tenants t
LEFT JOIN contacts c ON t.id = c.tenant_id
LEFT JOIN deals d ON t.id = d.tenant_id
LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
LEFT JOIN activities a ON t.id = a.tenant_id
LEFT JOIN marketing_campaigns mc ON t.id = mc.tenant_id AND t.marketing_enabled = TRUE
LEFT JOIN app_users au ON t.id = au.tenant_id
GROUP BY t.id, t.name;

COMMENT ON VIEW executive_dashboard_kpis IS 'Executive KPIs: contacts, deals, revenue, activities, marketing, team';

-- =====================================================
-- 4. CUSTOM ANALYTICS TABLES
-- =====================================================

-- Saved Custom Reports
CREATE TABLE IF NOT EXISTS custom_analytics_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  description TEXT,
  report_type TEXT NOT NULL CHECK (report_type IN ('crm', 'marketing', 'combined')),
  
  -- Report Configuration
  metrics_config JSONB NOT NULL, -- Which metrics to show
  filters_config JSONB, -- Filters to apply
  date_range_type TEXT CHECK (date_range_type IN ('last_7_days', 'last_30_days', 'last_90_days', 'last_year', 'custom', 'all_time')),
  custom_date_start DATE,
  custom_date_end DATE,
  
  -- Grouping & Sorting
  group_by TEXT, -- e.g., 'source', 'user', 'month'
  sort_by TEXT,
  sort_direction TEXT CHECK (sort_direction IN ('asc', 'desc')),
  
  -- Visualization
  chart_type TEXT CHECK (chart_type IN ('bar', 'line', 'pie', 'table', 'number')),
  
  -- Sharing & Scheduling
  is_shared BOOLEAN DEFAULT FALSE,
  shared_with_user_ids UUID[],
  schedule_enabled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', NULL)),
  schedule_recipients TEXT[], -- Email addresses
  last_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_by_user_id UUID REFERENCES app_users(id),
  is_favorite BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_custom_reports_tenant ON custom_analytics_reports(tenant_id);
CREATE INDEX idx_custom_reports_type ON custom_analytics_reports(report_type);
CREATE INDEX idx_custom_reports_favorite ON custom_analytics_reports(is_favorite) WHERE is_favorite = TRUE;

COMMENT ON TABLE custom_analytics_reports IS 'User-created custom analytics reports and dashboards';

-- =====================================================
-- 5. ANALYTICS HELPER FUNCTIONS
-- =====================================================

-- Calculate CAC (Customer Acquisition Cost)
CREATE OR REPLACE FUNCTION calculate_cac(
  tenant_id_param UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_marketing_spend_cents BIGINT,
  total_customers_acquired INTEGER,
  cac_cents DECIMAL(10,2),
  avg_ltv_cents DECIMAL(10,2),
  ltv_to_cac_ratio DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(ma.campaign_cost_cents), 0)::BIGINT as total_marketing_spend_cents,
    COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::INTEGER as total_customers_acquired,
    CASE 
      WHEN COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE) > 0 
      THEN SUM(ma.campaign_cost_cents)::DECIMAL / COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL
      ELSE 0 
    END as cac_cents,
    COALESCE(AVG(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE), 0) as avg_ltv_cents,
    CASE 
      WHEN SUM(ma.campaign_cost_cents) > 0 
      THEN (AVG(ma.deal_value_cents) FILTER (WHERE ma.deal_won = TRUE)::DECIMAL / (SUM(ma.campaign_cost_cents)::DECIMAL / NULLIF(COUNT(DISTINCT ma.deal_id) FILTER (WHERE ma.deal_won = TRUE), 0)::DECIMAL))
      ELSE 0 
    END as ltv_to_cac_ratio
  FROM marketing_attribution ma
  WHERE ma.tenant_id = tenant_id_param
    AND (start_date IS NULL OR ma.created_at >= start_date)
    AND (end_date IS NULL OR ma.created_at <= end_date);
END;
$$ LANGUAGE plpgsql;

-- Calculate pipeline velocity (avg days to close)
CREATE OR REPLACE FUNCTION calculate_pipeline_velocity(
  tenant_id_param UUID,
  pipeline_id_param UUID DEFAULT NULL
)
RETURNS TABLE(
  avg_days_to_close DECIMAL(10,2),
  median_days_to_close DECIMAL(10,2),
  fastest_deal_days INTEGER,
  slowest_deal_days INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH deal_durations AS (
    SELECT
      EXTRACT(EPOCH FROM (d.updated_at - d.created_at)) / 86400 as days_to_close
    FROM deals d
    JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE d.tenant_id = tenant_id_param
      AND (pipeline_id_param IS NULL OR ps.pipeline_id = pipeline_id_param)
      AND (ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%' OR ps.name ILIKE '%lost%')
  )
  SELECT
    COALESCE(AVG(days_to_close), 0)::DECIMAL(10,2),
    COALESCE(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY days_to_close), 0)::DECIMAL(10,2),
    COALESCE(MIN(days_to_close), 0)::INTEGER,
    COALESCE(MAX(days_to_close), 0)::INTEGER
  FROM deal_durations;
END;
$$ LANGUAGE plpgsql;

-- Get conversion funnel metrics
CREATE OR REPLACE FUNCTION get_conversion_funnel(
  tenant_id_param UUID,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL
)
RETURNS TABLE(
  total_contacts INTEGER,
  contacts_with_deals INTEGER,
  deals_created INTEGER,
  deals_won INTEGER,
  contact_to_deal_rate DECIMAL(5,2),
  deal_win_rate DECIMAL(5,2),
  overall_conversion_rate DECIMAL(5,2)
) AS $$
BEGIN
  RETURN QUERY
  WITH funnel_data AS (
    SELECT
      COUNT(DISTINCT c.id) as contacts,
      COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN c.id END) as contacts_with_deals,
      COUNT(DISTINCT d.id) as deals,
      COUNT(DISTINCT d.id) FILTER (WHERE ps.name ILIKE '%won%' OR ps.name ILIKE '%closed%') as won_deals
    FROM contacts c
    LEFT JOIN deals d ON c.id = d.contact_id
    LEFT JOIN pipeline_stages ps ON d.stage_id = ps.id
    WHERE c.tenant_id = tenant_id_param
      AND (start_date IS NULL OR c.created_at >= start_date)
      AND (end_date IS NULL OR c.created_at <= end_date)
  )
  SELECT
    contacts::INTEGER,
    contacts_with_deals::INTEGER,
    deals::INTEGER,
    won_deals::INTEGER,
    CASE WHEN contacts > 0 THEN (deals::DECIMAL / contacts::DECIMAL) * 100 ELSE 0 END as contact_to_deal_rate,
    CASE WHEN deals > 0 THEN (won_deals::DECIMAL / deals::DECIMAL) * 100 ELSE 0 END as deal_win_rate,
    CASE WHEN contacts > 0 THEN (won_deals::DECIMAL / contacts::DECIMAL) * 100 ELSE 0 END as overall_conversion_rate
  FROM funnel_data;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- SELECT * FROM crm_lead_source_analytics LIMIT 10;
-- SELECT * FROM crm_sales_performance_by_user LIMIT 10;
-- SELECT * FROM crm_pipeline_stage_analytics LIMIT 10;
-- SELECT * FROM marketing_roi_summary;
-- SELECT * FROM marketing_campaign_attribution ORDER BY revenue_generated_cents DESC LIMIT 10;
-- SELECT * FROM marketing_cac_analysis ORDER BY month DESC LIMIT 12;
-- SELECT * FROM executive_dashboard_kpis;
-- SELECT * FROM calculate_cac('550e8400-e29b-41d4-a716-446655440000', '2025-01-01', '2025-12-31');
-- SELECT * FROM calculate_pipeline_velocity('550e8400-e29b-41d4-a716-446655440000');
-- SELECT * FROM get_conversion_funnel('550e8400-e29b-41d4-a716-446655440000', '2025-01-01', '2025-12-31');

