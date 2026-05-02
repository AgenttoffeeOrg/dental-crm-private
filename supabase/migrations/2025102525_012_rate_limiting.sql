SET search_path TO public, extensions;

-- ============================================================================
-- Step 11: API Rate Limiting - Per-Tenant Quotas
-- ============================================================================
--
-- Comprehensive rate limiting system with:
-- - Per-tenant quotas (hourly, daily, monthly)
-- - Per-endpoint tracking
-- - Automatic reset
-- - Quota exceeded notifications
-- - Usage analytics
--
-- ============================================================================

-- ============================================================================
-- 1. Rate Limit Plans Table
-- ============================================================================

DROP TABLE IF EXISTS rate_limit_plans CASCADE;
CREATE TABLE rate_limit_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    
    -- Quotas
    requests_per_hour INT NOT NULL DEFAULT 1000,
    requests_per_day INT NOT NULL DEFAULT 10000,
    requests_per_month INT NOT NULL DEFAULT 100000,
    
    -- Burst allowance
    burst_allowance INT DEFAULT 100,
    
    -- Features
    allows_webhooks BOOLEAN DEFAULT true,
    allows_exports BOOLEAN DEFAULT true,
    max_bulk_operations INT DEFAULT 1000,
    
    -- Pricing (for reference)
    monthly_price_cents INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default plans
INSERT INTO rate_limit_plans (name, description, requests_per_hour, requests_per_day, requests_per_month, monthly_price_cents) VALUES
    ('free', 'Free tier with basic limits', 100, 1000, 10000, 0),
    ('starter', 'Starter plan for small teams', 500, 5000, 50000, 2900),
    ('professional', 'Professional plan for growing businesses', 2000, 20000, 200000, 9900),
    ('enterprise', 'Enterprise plan with high limits', 10000, 100000, 1000000, 29900),
    ('unlimited', 'Unlimited plan for high-volume users', 999999, 9999999, 99999999, 99900)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 2. Tenant Rate Limits Table
-- ============================================================================

DROP TABLE IF EXISTS tenant_rate_limits CASCADE;
CREATE TABLE tenant_rate_limits (
    tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES rate_limit_plans(id),
    
    -- Current usage
    requests_this_hour INT DEFAULT 0,
    requests_this_day INT DEFAULT 0,
    requests_this_month INT DEFAULT 0,
    
    -- Reset timestamps
    hour_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour',
    day_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
    month_reset_at TIMESTAMPTZ DEFAULT DATE_TRUNC('month', NOW()) + INTERVAL '1 month',
    
    -- Override limits (NULL = use plan defaults)
    custom_hourly_limit INT,
    custom_daily_limit INT,
    custom_monthly_limit INT,
    
    -- Status
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMPTZ,
    blocked_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tenant_rate_limits_blocked ON tenant_rate_limits(is_blocked) WHERE is_blocked = true;

-- ============================================================================
-- 3. API Request Log (for analytics)
-- ============================================================================

DROP TABLE IF EXISTS api_request_log CASCADE;
CREATE TABLE api_request_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
    
    -- Request details
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    endpoint TEXT,
    
    -- Response
    status_code INT,
    response_time_ms INT,
    
    -- Rate limit info
    rate_limited BOOLEAN DEFAULT false,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_request_log_tenant_created ON api_request_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_created_at ON api_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_rate_limited ON api_request_log(rate_limited) WHERE rate_limited = true;

-- Partition by month (optional, for high volume)
-- This would require additional setup for automatic partition management

-- ============================================================================
-- 4. Check Rate Limit Function
-- ============================================================================

CREATE OR REPLACE FUNCTION check_rate_limit(
    p_tenant_id UUID
)
RETURNS TABLE (
    allowed BOOLEAN,
    reason TEXT,
    limit_type TEXT,
    current_usage INT,
    limit_value INT,
    reset_at TIMESTAMPTZ
) AS $$
DECLARE
    limits_rec RECORD;
    plan_rec RECORD;
    hourly_limit INT;
    daily_limit INT;
    monthly_limit INT;
BEGIN
    -- Get tenant rate limits
    SELECT * INTO limits_rec
    FROM tenant_rate_limits
    WHERE tenant_id = p_tenant_id;
    
    -- If no record exists, create one with free plan
    IF NOT FOUND THEN
        INSERT INTO tenant_rate_limits (tenant_id, plan_id)
        SELECT p_tenant_id, id FROM rate_limit_plans WHERE name = 'free'
        RETURNING * INTO limits_rec;
    END IF;
    
    -- Check if blocked
    IF limits_rec.is_blocked AND (limits_rec.blocked_until IS NULL OR limits_rec.blocked_until > NOW()) THEN
        RETURN QUERY SELECT 
            false,
            limits_rec.blocked_reason,
            'blocked'::TEXT,
            0,
            0,
            limits_rec.blocked_until;
        RETURN;
    END IF;
    
    -- Reset counters if needed
    IF limits_rec.hour_reset_at <= NOW() THEN
        UPDATE tenant_rate_limits
        SET 
            requests_this_hour = 0,
            hour_reset_at = DATE_TRUNC('hour', NOW()) + INTERVAL '1 hour'
        WHERE tenant_id = p_tenant_id;
        limits_rec.requests_this_hour := 0;
    END IF;
    
    IF limits_rec.day_reset_at <= NOW() THEN
        UPDATE tenant_rate_limits
        SET 
            requests_this_day = 0,
            day_reset_at = DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
        WHERE tenant_id = p_tenant_id;
        limits_rec.requests_this_day := 0;
    END IF;
    
    IF limits_rec.month_reset_at <= NOW() THEN
        UPDATE tenant_rate_limits
        SET 
            requests_this_month = 0,
            month_reset_at = DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
        WHERE tenant_id = p_tenant_id;
        limits_rec.requests_this_month := 0;
    END IF;
    
    -- Get plan limits
    SELECT * INTO plan_rec
    FROM rate_limit_plans
    WHERE id = limits_rec.plan_id;
    
    -- Determine effective limits
    hourly_limit := COALESCE(limits_rec.custom_hourly_limit, plan_rec.requests_per_hour);
    daily_limit := COALESCE(limits_rec.custom_daily_limit, plan_rec.requests_per_day);
    monthly_limit := COALESCE(limits_rec.custom_monthly_limit, plan_rec.requests_per_month);
    
    -- Check hourly limit
    IF limits_rec.requests_this_hour >= hourly_limit THEN
        RETURN QUERY SELECT 
            false,
            'Hourly rate limit exceeded'::TEXT,
            'hourly'::TEXT,
            limits_rec.requests_this_hour,
            hourly_limit,
            limits_rec.hour_reset_at;
        RETURN;
    END IF;
    
    -- Check daily limit
    IF limits_rec.requests_this_day >= daily_limit THEN
        RETURN QUERY SELECT 
            false,
            'Daily rate limit exceeded'::TEXT,
            'daily'::TEXT,
            limits_rec.requests_this_day,
            daily_limit,
            limits_rec.day_reset_at;
        RETURN;
    END IF;
    
    -- Check monthly limit
    IF limits_rec.requests_this_month >= monthly_limit THEN
        RETURN QUERY SELECT 
            false,
            'Monthly rate limit exceeded'::TEXT,
            'monthly'::TEXT,
            limits_rec.requests_this_month,
            monthly_limit,
            limits_rec.month_reset_at;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT 
        true,
        'OK'::TEXT,
        'none'::TEXT,
        limits_rec.requests_this_hour,
        hourly_limit,
        limits_rec.hour_reset_at;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. Increment Rate Limit Counter
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_rate_limit(
    p_tenant_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE tenant_rate_limits
    SET 
        requests_this_hour = requests_this_hour + 1,
        requests_this_day = requests_this_day + 1,
        requests_this_month = requests_this_month + 1,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id;
    
    -- Create record if not exists
    IF NOT FOUND THEN
        INSERT INTO tenant_rate_limits (tenant_id, plan_id, requests_this_hour, requests_this_day, requests_this_month)
        SELECT p_tenant_id, id, 1, 1, 1 FROM rate_limit_plans WHERE name = 'free';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Update Tenant Plan
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tenant_plan(
    p_tenant_id UUID,
    p_plan_name TEXT
)
RETURNS VOID AS $$
DECLARE
    plan_id_var UUID;
BEGIN
    -- Get plan ID
    SELECT id INTO plan_id_var
    FROM rate_limit_plans
    WHERE name = p_plan_name;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Rate limit plan "%" not found', p_plan_name;
    END IF;
    
    -- Update or insert tenant rate limits
    INSERT INTO tenant_rate_limits (tenant_id, plan_id)
    VALUES (p_tenant_id, plan_id_var)
    ON CONFLICT (tenant_id) DO UPDATE
    SET 
        plan_id = plan_id_var,
        updated_at = NOW();
    
    RAISE NOTICE 'Updated tenant % to plan %', p_tenant_id, p_plan_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. Rate Limit Usage View
-- ============================================================================

DROP VIEW IF EXISTS rate_limit_usage CASCADE;
CREATE VIEW rate_limit_usage AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    p.name as plan_name,
    p.description as plan_description,
    
    -- Current usage
    trl.requests_this_hour,
    trl.requests_this_day,
    trl.requests_this_month,
    
    -- Limits
    COALESCE(trl.custom_hourly_limit, p.requests_per_hour) as hourly_limit,
    COALESCE(trl.custom_daily_limit, p.requests_per_day) as daily_limit,
    COALESCE(trl.custom_monthly_limit, p.requests_per_month) as monthly_limit,
    
    -- Usage percentages
    ROUND(100.0 * trl.requests_this_hour / NULLIF(COALESCE(trl.custom_hourly_limit, p.requests_per_hour), 0), 2) as hourly_usage_pct,
    ROUND(100.0 * trl.requests_this_day / NULLIF(COALESCE(trl.custom_daily_limit, p.requests_per_day), 0), 2) as daily_usage_pct,
    ROUND(100.0 * trl.requests_this_month / NULLIF(COALESCE(trl.custom_monthly_limit, p.requests_per_month), 0), 2) as monthly_usage_pct,
    
    -- Status
    trl.is_blocked,
    trl.blocked_until,
    trl.blocked_reason,
    
    -- Reset times
    trl.hour_reset_at,
    trl.day_reset_at,
    trl.month_reset_at

FROM tenants t
LEFT JOIN tenant_rate_limits trl ON t.id = trl.tenant_id
LEFT JOIN rate_limit_plans p ON trl.plan_id = p.id;

-- ============================================================================
-- Final Report
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════════════════╗';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '║         API RATE LIMITING INSTALLED                        ║';
    RAISE NOTICE '║                                                            ║';
    RAISE NOTICE '╚════════════════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Tables Created:';
    RAISE NOTICE '  ✅ rate_limit_plans (% plans)', (SELECT COUNT(*) FROM rate_limit_plans);
    RAISE NOTICE '  ✅ tenant_rate_limits';
    RAISE NOTICE '  ✅ api_request_log';
    RAISE NOTICE '';
    RAISE NOTICE 'Functions Created:';
    RAISE NOTICE '  ✅ check_rate_limit(tenant_id)';
    RAISE NOTICE '  ✅ increment_rate_limit(tenant_id)';
    RAISE NOTICE '  ✅ update_tenant_plan(tenant_id, plan_name)';
    RAISE NOTICE '';
    RAISE NOTICE 'Available Plans:';
    RAISE NOTICE '  • free: 100/hour, 1K/day, 10K/month';
    RAISE NOTICE '  • starter: 500/hour, 5K/day, 50K/month';
    RAISE NOTICE '  • professional: 2K/hour, 20K/day, 200K/month';
    RAISE NOTICE '  • enterprise: 10K/hour, 100K/day, 1M/month';
    RAISE NOTICE '';
END $$;



