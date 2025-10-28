-- ============================================================================
-- Step 9: Advanced Analytics - Org Usage & Location Metrics
-- ============================================================================
--
-- Comprehensive analytics views and functions for:
-- - Organization usage metrics
-- - Location analytics
-- - User engagement tracking
-- - Multi-org adoption metrics
-- - Performance insights
--
-- ============================================================================

-- ============================================================================
-- 1. Organization Usage Metrics View
-- ============================================================================

CREATE OR REPLACE VIEW org_usage_metrics AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    t.created_at as org_created_at,
    
    -- User metrics
    COUNT(DISTINCT utm.user_id) FILTER (WHERE utm.status = 'active') as active_users,
    COUNT(DISTINCT utm.user_id) FILTER (WHERE utm.role = 'owner') as owner_count,
    COUNT(DISTINCT utm.user_id) FILTER (WHERE utm.role = 'admin') as admin_count,
    
    -- Data metrics
    (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id) as total_contacts,
    (SELECT COUNT(*) FROM deals WHERE tenant_id = t.id) as total_deals,
    (SELECT COUNT(*) FROM tasks WHERE tenant_id = t.id) as total_tasks,
    (SELECT COUNT(*) FROM activities WHERE tenant_id = t.id) as total_activities,
    
    -- Location metrics
    (SELECT COUNT(*) FROM locations WHERE tenant_id = t.id) as total_locations,
    (SELECT COUNT(*) FROM locations WHERE tenant_id = t.id AND is_primary) as primary_locations,
    
    -- Activity metrics (last 30 days)
    (SELECT COUNT(*) FROM audits 
     WHERE tenant_id = t.id 
     AND created_at > NOW() - INTERVAL '30 days') as activities_last_30d,
    
    -- User engagement (last 7 days)
    (SELECT COUNT(DISTINCT user_id) FROM audits 
     WHERE tenant_id = t.id 
     AND created_at > NOW() - INTERVAL '7 days') as active_users_last_7d,
    
    -- Storage metrics
    (SELECT COALESCE(SUM(CAST(metadata->>'file_size' AS BIGINT)), 0) 
     FROM files WHERE tenant_id = t.id) as total_storage_bytes,
    
    -- Last activity timestamp
    (SELECT MAX(created_at) FROM audits WHERE tenant_id = t.id) as last_activity_at,
    
    -- Validation status
    t.validation_status,
    t.grace_period_ends_at,
    
    -- Calculated metrics
    CASE 
        WHEN (SELECT MAX(created_at) FROM audits WHERE tenant_id = t.id) > NOW() - INTERVAL '7 days' 
        THEN 'active'
        WHEN (SELECT MAX(created_at) FROM audits WHERE tenant_id = t.id) > NOW() - INTERVAL '30 days' 
        THEN 'moderate'
        ELSE 'inactive'
    END as activity_level,
    
    -- Growth metrics
    (SELECT COUNT(*) FROM contacts WHERE tenant_id = t.id 
     AND created_at > NOW() - INTERVAL '30 days') as contacts_growth_30d,
    (SELECT COUNT(*) FROM deals WHERE tenant_id = t.id 
     AND created_at > NOW() - INTERVAL '30 days') as deals_growth_30d

FROM tenants t
LEFT JOIN user_tenant_memberships utm ON t.id = utm.tenant_id
GROUP BY t.id, t.name, t.created_at, t.validation_status, t.grace_period_ends_at;

COMMENT ON VIEW org_usage_metrics IS 
'Comprehensive organization usage metrics including users, data, locations, and activity.';

-- ============================================================================
-- 2. Location Analytics View
-- ============================================================================

CREATE OR REPLACE VIEW location_analytics AS
SELECT 
    l.id as location_id,
    l.tenant_id,
    l.name as location_name,
    l.is_primary,
    l.created_at,
    
    -- User metrics
    (SELECT COUNT(DISTINCT ml.user_id) 
     FROM membership_locations ml 
     WHERE ml.location_id = l.id) as assigned_users,
    
    -- Data metrics (location-scoped)
    (SELECT COUNT(*) FROM contacts WHERE location_id = l.id) as contacts_count,
    (SELECT COUNT(*) FROM deals WHERE location_id = l.id) as deals_count,
    (SELECT COUNT(*) FROM tasks WHERE location_id = l.id) as tasks_count,
    (SELECT COUNT(*) FROM activities WHERE location_id = l.id) as activities_count,
    
    -- Pipeline metrics
    (SELECT COUNT(*) FROM pipelines WHERE location_id = l.id) as pipelines_count,
    
    -- Activity (last 30 days)
    (SELECT COUNT(*) FROM audits a
     WHERE a.metadata->>'location_id' = l.id::text
     AND a.created_at > NOW() - INTERVAL '30 days') as activities_last_30d,
    
    -- Performance metrics
    (SELECT AVG(CAST(metadata->>'value' AS DECIMAL))
     FROM deals
     WHERE location_id = l.id AND status = 'won') as avg_deal_value,
    
    (SELECT COUNT(*) FROM deals 
     WHERE location_id = l.id AND status = 'won') as won_deals_count,
    
    -- Last activity
    (SELECT MAX(created_at) FROM audits a
     WHERE a.metadata->>'location_id' = l.id::text) as last_activity_at

FROM locations l;

COMMENT ON VIEW location_analytics IS 
'Location-specific analytics including users, data, and performance metrics.';

-- ============================================================================
-- 3. Multi-Org Adoption Metrics
-- ============================================================================

CREATE OR REPLACE VIEW multiorg_adoption_metrics AS
SELECT 
    DATE_TRUNC('day', NOW()) as report_date,
    
    -- Total users
    (SELECT COUNT(*) FROM app_users) as total_users,
    
    -- Multi-org users
    (SELECT COUNT(DISTINCT user_id) 
     FROM (
         SELECT user_id, COUNT(*) as org_count
         FROM user_tenant_memberships
         WHERE status = 'active'
         GROUP BY user_id
         HAVING COUNT(*) > 1
     ) multi_org) as multi_org_users,
    
    -- Adoption rate
    ROUND(
        100.0 * (SELECT COUNT(DISTINCT user_id) 
                 FROM (
                     SELECT user_id, COUNT(*) as org_count
                     FROM user_tenant_memberships
                     WHERE status = 'active'
                     GROUP BY user_id
                     HAVING COUNT(*) > 1
                 ) multi_org) 
        / NULLIF((SELECT COUNT(*) FROM app_users), 0),
        2
    ) as adoption_rate_pct,
    
    -- Average orgs per multi-org user
    (SELECT ROUND(AVG(org_count), 2)
     FROM (
         SELECT user_id, COUNT(*) as org_count
         FROM user_tenant_memberships
         WHERE status = 'active'
         GROUP BY user_id
         HAVING COUNT(*) > 1
     ) multi_org) as avg_orgs_per_multiorg_user,
    
    -- Context switches (last 30 days)
    (SELECT COUNT(*) FROM user_context_history
     WHERE created_at > NOW() - INTERVAL '30 days') as context_switches_30d,
    
    -- Active switchers (last 7 days)
    (SELECT COUNT(DISTINCT user_id) FROM user_context_history
     WHERE created_at > NOW() - INTERVAL '7 days') as active_switchers_7d,
    
    -- Pinned org count
    (SELECT COUNT(*) FROM user_org_preferences
     WHERE is_pinned) as total_pinned_orgs,
    
    -- Feature flag status
    (SELECT enabled FROM feature_flags WHERE key = 'multi_org_enabled') as multi_org_enabled,
    (SELECT enabled FROM feature_flags WHERE key = 'location_roles_enabled') as location_roles_enabled;

COMMENT ON VIEW multiorg_adoption_metrics IS 
'Metrics tracking multi-organization feature adoption and usage.';

-- ============================================================================
-- 4. User Engagement Analytics Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_engagement_metrics(
    p_tenant_id UUID,
    p_days_back INT DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    daily_active_users INT,
    new_users INT,
    context_switches INT,
    actions_performed INT,
    avg_actions_per_user DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    WITH date_series AS (
        SELECT generate_series(
            CURRENT_DATE - p_days_back,
            CURRENT_DATE,
            '1 day'::interval
        )::date as date
    ),
    daily_metrics AS (
        SELECT 
            DATE(a.created_at) as date,
            COUNT(DISTINCT a.user_id) as daily_active_users,
            COUNT(*) as actions_performed
        FROM audits a
        WHERE a.tenant_id = p_tenant_id
        AND a.created_at >= CURRENT_DATE - p_days_back
        GROUP BY DATE(a.created_at)
    ),
    new_users_daily AS (
        SELECT 
            DATE(utm.joined_at) as date,
            COUNT(*) as new_users
        FROM user_tenant_memberships utm
        WHERE utm.tenant_id = p_tenant_id
        AND utm.joined_at >= CURRENT_DATE - p_days_back
        GROUP BY DATE(utm.joined_at)
    ),
    context_switches_daily AS (
        SELECT 
            DATE(uch.created_at) as date,
            COUNT(*) as context_switches
        FROM user_context_history uch
        WHERE uch.to_tenant_id = p_tenant_id
        AND uch.created_at >= CURRENT_DATE - p_days_back
        GROUP BY DATE(uch.created_at)
    )
    SELECT 
        ds.date,
        COALESCE(dm.daily_active_users, 0)::INT,
        COALESCE(nu.new_users, 0)::INT,
        COALESCE(cs.context_switches, 0)::INT,
        COALESCE(dm.actions_performed, 0)::INT,
        ROUND(
            COALESCE(dm.actions_performed, 0)::DECIMAL / 
            NULLIF(COALESCE(dm.daily_active_users, 0), 0),
            2
        ) as avg_actions_per_user
    FROM date_series ds
    LEFT JOIN daily_metrics dm ON ds.date = dm.date
    LEFT JOIN new_users_daily nu ON ds.date = nu.date
    LEFT JOIN context_switches_daily cs ON ds.date = cs.date
    ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_engagement_metrics IS 
'Get daily user engagement metrics for a tenant over specified time period.';

-- ============================================================================
-- 5. Top Organizations Report Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_top_organizations(
    p_metric TEXT DEFAULT 'active_users',
    p_limit INT DEFAULT 10
)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    metric_value BIGINT,
    rank INT
) AS $$
BEGIN
    RETURN QUERY
    EXECUTE format('
        SELECT 
            tenant_id,
            tenant_name,
            %I as metric_value,
            ROW_NUMBER() OVER (ORDER BY %I DESC)::INT as rank
        FROM org_usage_metrics
        ORDER BY %I DESC
        LIMIT $1
    ', p_metric, p_metric, p_metric)
    USING p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_top_organizations IS 
'Get top N organizations by specified metric (active_users, total_contacts, total_deals, etc.).';

-- ============================================================================
-- 6. Performance Benchmarks View
-- ============================================================================

CREATE OR REPLACE VIEW system_performance_benchmarks AS
SELECT 
    -- Database metrics
    (SELECT COUNT(*) FROM tenants) as total_tenants,
    (SELECT COUNT(*) FROM app_users) as total_users,
    (SELECT COUNT(*) FROM user_tenant_memberships) as total_memberships,
    
    -- Data growth
    (SELECT COUNT(*) FROM contacts) as total_contacts,
    (SELECT COUNT(*) FROM deals) as total_deals,
    (SELECT COUNT(*) FROM tasks) as total_tasks,
    
    -- Multi-org metrics
    (SELECT COUNT(DISTINCT user_id) 
     FROM (SELECT user_id FROM user_tenant_memberships 
           GROUP BY user_id HAVING COUNT(*) > 1) m) as multi_org_users,
    
    -- Activity metrics (last 24h)
    (SELECT COUNT(*) FROM audits 
     WHERE created_at > NOW() - INTERVAL '24 hours') as actions_last_24h,
    
    (SELECT COUNT(*) FROM user_context_history 
     WHERE created_at > NOW() - INTERVAL '24 hours') as context_switches_24h,
    
    -- Performance metrics
    (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 2)
     FROM cutover_log WHERE completed_at IS NOT NULL) as avg_migration_time_ms,
    
    -- Storage
    (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
    
    -- Current timestamp
    NOW() as generated_at;

COMMENT ON VIEW system_performance_benchmarks IS 
'System-wide performance benchmarks and key metrics.';

-- ============================================================================
-- 7. Analytics Summary Function
-- ============================================================================

CREATE OR REPLACE FUNCTION get_analytics_summary(
    p_tenant_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    -- If tenant_id provided, return tenant-specific summary
    IF p_tenant_id IS NOT NULL THEN
        SELECT jsonb_build_object(
            'tenant', jsonb_build_object(
                'id', tenant_id,
                'name', tenant_name,
                'activity_level', activity_level,
                'active_users', active_users,
                'total_contacts', total_contacts,
                'total_deals', total_deals,
                'total_locations', total_locations,
                'last_activity_at', last_activity_at
            ),
            'growth', jsonb_build_object(
                'contacts_30d', contacts_growth_30d,
                'deals_30d', deals_growth_30d,
                'active_users_7d', active_users_last_7d
            ),
            'locations', (
                SELECT jsonb_agg(jsonb_build_object(
                    'id', location_id,
                    'name', location_name,
                    'contacts', contacts_count,
                    'deals', deals_count,
                    'users', assigned_users
                ))
                FROM location_analytics
                WHERE tenant_id = p_tenant_id
            )
        ) INTO result
        FROM org_usage_metrics
        WHERE tenant_id = p_tenant_id;
    ELSE
        -- System-wide summary
        SELECT jsonb_build_object(
            'system', (SELECT row_to_json(system_performance_benchmarks.*) 
                       FROM system_performance_benchmarks),
            'multiorg_adoption', (SELECT row_to_json(multiorg_adoption_metrics.*) 
                                  FROM multiorg_adoption_metrics),
            'top_orgs_by_users', (SELECT jsonb_agg(row_to_json(t.*)) 
                                  FROM get_top_organizations('active_users', 5) t),
            'top_orgs_by_contacts', (SELECT jsonb_agg(row_to_json(t.*)) 
                                     FROM get_top_organizations('total_contacts', 5) t)
        ) INTO result;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_analytics_summary IS 
'Get comprehensive analytics summary for a tenant or system-wide.
Pass tenant_id for tenant-specific or NULL for system-wide.';

-- ============================================================================
-- 8. Create Analytics Indexes for Performance
-- ============================================================================

-- Index for date-range queries on audits
CREATE INDEX IF NOT EXISTS idx_audits_created_at_tenant 
ON audits(tenant_id, created_at DESC);

-- Index for user engagement queries
CREATE INDEX IF NOT EXISTS idx_audits_user_created_at 
ON audits(user_id, created_at DESC);

-- Index for context switch analytics
CREATE INDEX IF NOT EXISTS idx_context_history_tenant_date 
ON user_context_history(to_tenant_id, created_at DESC);

-- Index for location analytics
CREATE INDEX IF NOT EXISTS idx_membership_locations_location 
ON membership_locations(location_id);

RAISE NOTICE '';
RAISE NOTICE '✅ Advanced Analytics installed successfully';
RAISE NOTICE '';
RAISE NOTICE 'Available Views:';
RAISE NOTICE '  - org_usage_metrics';
RAISE NOTICE '  - location_analytics';
RAISE NOTICE '  - multiorg_adoption_metrics';
RAISE NOTICE '  - system_performance_benchmarks';
RAISE NOTICE '';
RAISE NOTICE 'Available Functions:';
RAISE NOTICE '  - get_user_engagement_metrics(tenant_id, days_back)';
RAISE NOTICE '  - get_top_organizations(metric, limit)';
RAISE NOTICE '  - get_analytics_summary(tenant_id)';
RAISE NOTICE '';
RAISE NOTICE 'Example Usage:';
RAISE NOTICE '  SELECT * FROM org_usage_metrics;';
RAISE NOTICE '  SELECT * FROM get_analytics_summary(NULL);  -- System-wide';
RAISE NOTICE '';


