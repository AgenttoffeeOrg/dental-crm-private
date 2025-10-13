-- =====================================================
-- SUPER ADMIN SYSTEM
-- For platform owner to monitor all practices & users
-- =====================================================

BEGIN;

-- =====================================================
-- 1. SUPER ADMINS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL, -- Separate auth from main app
  role TEXT DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support', 'analyst')),
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ANALYTICS EVENTS TABLE
-- Track all user actions across all practices
-- =====================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Who & Where
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  
  -- What
  event_type TEXT NOT NULL, -- 'page_view', 'button_click', 'feature_used', 'form_submit'
  event_name TEXT NOT NULL, -- 'view_pipeline', 'create_contact', 'send_email'
  event_category TEXT, -- 'navigation', 'crm', 'marketing', 'settings'
  
  -- Details
  page_url TEXT,
  referrer TEXT,
  element_id TEXT, -- Button/element that was clicked
  element_text TEXT, -- Button label
  metadata JSONB, -- Any additional data
  
  -- Context
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  
  -- Performance
  page_load_time_ms INTEGER,
  
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS analytics_events_tenant_id_idx ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS analytics_events_user_id_idx ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS analytics_events_event_type_idx ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS analytics_events_occurred_at_idx ON analytics_events(occurred_at DESC);
CREATE INDEX IF NOT EXISTS analytics_events_session_id_idx ON analytics_events(session_id);

-- =====================================================
-- 3. USER SESSIONS TABLE
-- Track login sessions and duration
-- =====================================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  session_id TEXT UNIQUE NOT NULL,
  
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  
  -- Session data
  user_agent TEXT,
  ip_address INET,
  country TEXT,
  city TEXT,
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  browser TEXT,
  os TEXT,
  
  -- Activity
  pages_viewed INTEGER DEFAULT 0,
  actions_taken INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS user_sessions_tenant_id_idx ON user_sessions(tenant_id);
CREATE INDEX IF NOT EXISTS user_sessions_started_at_idx ON user_sessions(started_at DESC);

-- =====================================================
-- 4. FEATURE USAGE TABLE
-- Aggregate feature usage stats
-- =====================================================
CREATE TABLE IF NOT EXISTS feature_usage_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  feature_name TEXT NOT NULL, -- 'pipeline', 'contacts', 'marketing_campaigns', etc.
  feature_category TEXT, -- 'crm', 'marketing', 'analytics', 'settings'
  
  -- Aggregated stats
  total_uses INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  unique_tenants INTEGER DEFAULT 0,
  
  -- Time period
  date DATE NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(feature_name, date)
);

-- =====================================================
-- 5. SYSTEM ERROR LOGS
-- Track all errors for monitoring
-- =====================================================
CREATE TABLE IF NOT EXISTS system_error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  error_type TEXT NOT NULL, -- 'javascript', 'api', 'database'
  error_message TEXT NOT NULL,
  error_stack TEXT,
  
  -- Context
  page_url TEXT,
  user_agent TEXT,
  
  -- Additional data
  metadata JSONB,
  
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS error_logs_occurred_at_idx ON system_error_logs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS error_logs_error_type_idx ON system_error_logs(error_type);

-- =====================================================
-- 6. ANALYTICS VIEWS
-- Pre-computed analytics for fast queries
-- =====================================================

-- Daily Active Users per practice
CREATE OR REPLACE VIEW daily_active_users AS
SELECT
  tenant_id,
  DATE(occurred_at) as date,
  COUNT(DISTINCT user_id) as active_users
FROM analytics_events
WHERE event_type = 'page_view'
GROUP BY tenant_id, DATE(occurred_at);

-- Feature Adoption Rates
CREATE OR REPLACE VIEW feature_adoption AS
SELECT
  event_name as feature_name,
  COUNT(DISTINCT tenant_id) as practices_using,
  COUNT(DISTINCT user_id) as users_using,
  COUNT(*) as total_uses,
  (COUNT(DISTINCT tenant_id)::DECIMAL / NULLIF((SELECT COUNT(*) FROM tenants), 0) * 100) as adoption_rate_percent
FROM analytics_events
WHERE event_type = 'feature_used'
GROUP BY event_name
ORDER BY total_uses DESC;

-- Practice Growth Over Time
CREATE OR REPLACE VIEW practice_growth AS
SELECT
  DATE(created_at) as signup_date,
  COUNT(*) as new_signups,
  SUM(COUNT(*)) OVER (ORDER BY DATE(created_at)) as cumulative_total
FROM tenants
GROUP BY DATE(created_at)
ORDER BY signup_date DESC;

-- User Engagement Summary
CREATE OR REPLACE VIEW user_engagement_summary AS
SELECT
  u.id as user_id,
  u.full_name,
  u.email,
  u.tenant_id,
  t.name as practice_name,
  COUNT(DISTINCT DATE(ae.occurred_at)) as days_active_last_30,
  COUNT(ae.id) FILTER (WHERE ae.occurred_at >= NOW() - INTERVAL '7 days') as events_last_7_days,
  MAX(ae.occurred_at) as last_active_at
FROM app_users u
LEFT JOIN tenants t ON u.tenant_id = t.id
LEFT JOIN analytics_events ae ON u.id = ae.user_id
WHERE ae.occurred_at >= NOW() - INTERVAL '30 days' OR ae.occurred_at IS NULL
GROUP BY u.id, u.full_name, u.email, u.tenant_id, t.name;

-- =====================================================
-- 7. SUPER ADMIN FUNCTIONS
-- =====================================================

-- Get platform-wide stats
CREATE OR REPLACE FUNCTION get_platform_stats()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_practices', (SELECT COUNT(*) FROM tenants),
    'total_users', (SELECT COUNT(*) FROM app_users),
    'active_users_today', (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE DATE(occurred_at) = CURRENT_DATE),
    'total_deals', (SELECT COUNT(*) FROM deals),
    'total_contacts', (SELECT COUNT(*) FROM contacts),
    'total_revenue_cents', (SELECT COALESCE(SUM(value_estimate_cents), 0) FROM deals),
    'signups_this_month', (SELECT COUNT(*) FROM tenants WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', NOW())),
    'events_last_24h', (SELECT COUNT(*) FROM analytics_events WHERE occurred_at >= NOW() - INTERVAL '24 hours')
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Super Admin system tables created successfully!';
  RAISE NOTICE '📊 Analytics tracking ready';
  RAISE NOTICE '🔐 Separate super admin auth configured';
END $$;

