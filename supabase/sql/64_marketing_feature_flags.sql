-- 64_marketing_feature_flags.sql
-- Feature Flag System for Marketing Module Upselling

-- Feature Definitions (Master List of All Features)
CREATE TABLE IF NOT EXISTS feature_definitions (
    feature_key TEXT PRIMARY KEY,
    feature_name TEXT NOT NULL,
    description TEXT NOT NULL,
    plan_tier_required TEXT NOT NULL CHECK (plan_tier_required IN ('starter', 'pro', 'enterprise')),
    category TEXT CHECK (category IN ('advanced', 'analytics', 'automation', 'integration', 'ai')),
    icon_name TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    monthly_price_cents INTEGER, -- Price premium for this feature
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tenant Feature Flags (Per-Tenant Enabled Features)
CREATE TABLE IF NOT EXISTS tenant_feature_flags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    feature_key TEXT NOT NULL REFERENCES feature_definitions(feature_key),
    
    -- Status
    is_enabled BOOLEAN DEFAULT FALSE,
    enabled_at TIMESTAMP WITH TIME ZONE,
    disabled_at TIMESTAMP WITH TIME ZONE,
    
    -- Trial
    is_trial BOOLEAN DEFAULT FALSE,
    trial_started_at TIMESTAMP WITH TIME ZONE,
    trial_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Billing
    plan_tier TEXT CHECK (plan_tier IN ('starter', 'pro', 'enterprise')),
    
    -- Metadata
    enabled_by_user_id UUID REFERENCES app_users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, feature_key)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_tenant ON tenant_feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_enabled ON tenant_feature_flags(tenant_id, is_enabled);
CREATE INDEX IF NOT EXISTS idx_tenant_feature_flags_trial ON tenant_feature_flags(is_trial, trial_expires_at);

-- RLS Policies
ALTER TABLE feature_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can view feature definitions
CREATE POLICY "Feature definitions are public"
    ON feature_definitions FOR SELECT
    USING (true);

-- Users can view their tenant's feature flags
CREATE POLICY "Users can view own tenant feature flags"
    ON tenant_feature_flags FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Only owners can modify feature flags
CREATE POLICY "Owners can manage feature flags"
    ON tenant_feature_flags FOR ALL
    USING (
        tenant_id IN (
            SELECT tenant_id FROM app_users 
            WHERE id = auth.uid() AND role = 'owner'
        )
    );

-- Insert Feature Definitions
INSERT INTO feature_definitions (feature_key, feature_name, description, plan_tier_required, category, icon_name, sort_order, monthly_price_cents) VALUES
('email_warmup', 'Email Warmup Automation', 'Automatically build domain reputation with gradual send volume increases. Prevents spam filtering and improves deliverability.', 'enterprise', 'advanced', 'TrendingUp', 1, 5000),
('click_heatmaps', 'Click Heatmaps', 'Visual heatmaps showing exactly where recipients click in your emails. Optimize layout for maximum engagement.', 'pro', 'analytics', 'MousePointer', 2, 1500),
('ai_send_time', 'AI Send Time Optimization', 'Machine learning predicts the optimal send time for each individual contact. Increases open rates by 20-30%.', 'enterprise', 'ai', 'Brain', 3, 6000),
('dynamic_content', 'Dynamic Content Blocks', 'Show different content to different contacts in the same campaign based on tags, deals, or custom fields.', 'pro', 'advanced', 'Sparkles', 4, 2000),
('advanced_analytics', 'Advanced Analytics Suite', 'Deep-dive campaign analytics with custom reports, cohort analysis, and predictive insights.', 'pro', 'analytics', 'BarChart3', 5, 1000),
('social_media', 'Social Media Publishing', 'Schedule and publish posts to Facebook, Instagram, LinkedIn, and Twitter directly from the CRM.', 'pro', 'integration', 'Share2', 6, 1500),
('ab_testing', 'A/B Testing', 'Test subject lines, content, and send times to optimize campaign performance with automatic winner selection.', 'starter', 'advanced', 'TestTube', 7, 0),
('automation_journeys', 'Marketing Automation', 'Build sophisticated multi-step journeys with triggers, conditions, delays, and goal tracking.', 'pro', 'automation', 'Workflow', 8, 2500),
('sms_campaigns', 'SMS Campaigns', 'Send SMS campaigns via Twilio with delivery tracking and opt-out management.', 'starter', 'integration', 'MessageSquare', 9, 0),
('whatsapp_campaigns', 'WhatsApp Campaigns', 'Send WhatsApp campaigns using WhatsApp Business API with template management.', 'pro', 'integration', 'MessageCircle', 10, 2000)
ON CONFLICT (feature_key) DO NOTHING;

-- Function to check if feature is enabled for tenant
CREATE OR REPLACE FUNCTION is_feature_enabled(p_tenant_id UUID, p_feature_key TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_is_enabled BOOLEAN;
    v_is_trial BOOLEAN;
    v_trial_expired BOOLEAN;
BEGIN
    SELECT 
        tff.is_enabled,
        tff.is_trial,
        CASE 
            WHEN tff.is_trial AND tff.trial_expires_at < NOW() THEN TRUE
            ELSE FALSE
        END
    INTO v_is_enabled, v_is_trial, v_trial_expired
    FROM tenant_feature_flags tff
    WHERE tff.tenant_id = p_tenant_id
    AND tff.feature_key = p_feature_key;
    
    -- If not found, feature is disabled
    IF v_is_enabled IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- If trial expired, disable
    IF v_is_trial AND v_trial_expired THEN
        RETURN FALSE;
    END IF;
    
    RETURN v_is_enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get feature access level for tenant
CREATE OR REPLACE FUNCTION get_tenant_plan_tier(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_plan TEXT;
BEGIN
    SELECT marketing_plan INTO v_plan
    FROM tenants
    WHERE id = p_tenant_id;
    
    RETURN COALESCE(v_plan, 'starter');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE feature_definitions IS 'Master list of all available marketing features with plan requirements';
COMMENT ON TABLE tenant_feature_flags IS 'Per-tenant feature enablement with trial support for upselling';
COMMENT ON FUNCTION is_feature_enabled IS 'Check if a specific feature is enabled for a tenant (handles trials)';

