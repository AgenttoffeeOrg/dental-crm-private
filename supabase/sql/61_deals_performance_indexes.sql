-- 61_deals_performance_indexes.sql
-- Performance optimization indexes for deals queries

-- Core indexes for deals table filtering and sorting
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline ON deals(tenant_id, pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_stage ON deals(tenant_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_owner ON deals(tenant_id, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_contact ON deals(tenant_id, contact_id);

-- Sorting indexes
CREATE INDEX IF NOT EXISTS idx_deals_value ON deals(value_estimate_cents DESC);
CREATE INDEX IF NOT EXISTS idx_deals_updated_at ON deals(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_created_at ON deals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_last_activity ON deals(last_activity_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_tenant_pipeline_stage ON deals(tenant_id, pipeline_id, stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_owner_updated ON deals(tenant_id, owner_user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_deals_tenant_value ON deals(tenant_id, value_estimate_cents DESC);

-- Full-text search index for deal title
CREATE INDEX IF NOT EXISTS idx_deals_title_search ON deals USING gin(to_tsvector('english', title));

-- Marketing source indexes (for attribution queries)
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source_type ON deals(marketing_source_type) WHERE marketing_source_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_deals_marketing_source_id ON deals(marketing_source_id) WHERE marketing_source_id IS NOT NULL;

-- Performance indexes for contacts table (for deals queries with joins)
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_name ON contacts(tenant_id, full_name);
CREATE INDEX IF NOT EXISTS idx_contacts_full_name_search ON contacts USING gin(to_tsvector('english', full_name));

-- Performance indexes for pipeline_stages
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline_position ON pipeline_stages(pipeline_id, position);

-- Performance indexes for pipelines
CREATE INDEX IF NOT EXISTS idx_pipelines_tenant ON pipelines(tenant_id);

-- Analyze tables for query planner optimization
ANALYZE deals;
ANALYZE contacts;
ANALYZE pipeline_stages;
ANALYZE pipelines;
ANALYZE app_users;

-- Create materialized view for deal analytics (optional, for faster dashboard queries)
CREATE MATERIALIZED VIEW IF NOT EXISTS deal_analytics_summary AS
SELECT 
  d.tenant_id,
  d.pipeline_id,
  d.stage_id,
  d.owner_user_id,
  COUNT(*) as deal_count,
  SUM(d.value_estimate_cents) as total_value,
  AVG(d.value_estimate_cents) as avg_value,
  MIN(d.created_at) as oldest_deal,
  MAX(d.updated_at) as newest_update,
  COUNT(CASE WHEN d.updated_at > NOW() - INTERVAL '7 days' THEN 1 END) as deals_updated_this_week,
  COUNT(CASE WHEN d.updated_at < NOW() - INTERVAL '14 days' THEN 1 END) as stuck_deals
FROM deals d
GROUP BY d.tenant_id, d.pipeline_id, d.stage_id, d.owner_user_id;

-- Index on materialized view
CREATE INDEX IF NOT EXISTS idx_deal_analytics_tenant ON deal_analytics_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deal_analytics_pipeline ON deal_analytics_summary(pipeline_id);

-- Function to refresh the materialized view (call this periodically or on-demand)
CREATE OR REPLACE FUNCTION refresh_deal_analytics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY deal_analytics_summary;
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to refresh analytics periodically
-- (You can also refresh this via a cron job or on-demand)

COMMENT ON INDEX idx_deals_tenant_pipeline IS 'Optimizes pipeline-specific deal queries';
COMMENT ON INDEX idx_deals_tenant_stage IS 'Optimizes stage-specific deal queries';
COMMENT ON INDEX idx_deals_title_search IS 'Enables fast full-text search on deal titles';
COMMENT ON MATERIALIZED VIEW deal_analytics_summary IS 'Pre-computed analytics for faster dashboard queries';

