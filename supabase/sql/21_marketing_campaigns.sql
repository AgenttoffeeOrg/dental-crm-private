-- =====================================================
-- MARKETING MODULE - CAMPAIGNS & TRACKING
-- Migration 21: Campaigns, Variants, Sends, Events
-- =====================================================

-- Marketing Campaigns
CREATE TABLE marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Campaign basics
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('email', 'email_ab', 'sms', 'rss_email')),
    status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')) DEFAULT 'draft',
    
    -- Targeting
    segment_id UUID REFERENCES marketing_segments(id),
    audience_id UUID REFERENCES marketing_audiences(id),
    target_count INTEGER, -- Cached recipient count
    
    -- Content (for single-variant campaigns)
    template_id UUID REFERENCES marketing_templates(id),
    subject_line TEXT,
    preheader TEXT,
    from_name TEXT,
    from_email TEXT,
    reply_to_email TEXT,
    
    -- Scheduling
    schedule_at TIMESTAMP WITH TIME ZONE,
    send_started_at TIMESTAMP WITH TIME ZONE,
    send_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- A/B Testing
    is_ab_test BOOLEAN DEFAULT FALSE,
    ab_test_type TEXT CHECK (ab_test_type IN ('subject', 'from_name', 'content', NULL)),
    ab_test_split_pct INTEGER DEFAULT 50, -- % for variant A (rest goes to B)
    ab_winner_variant_id UUID, -- Selected winner
    ab_winner_selected_at TIMESTAMP WITH TIME ZONE,
    
    -- Stats (cached for performance)
    total_sends INTEGER DEFAULT 0,
    total_delivered INTEGER DEFAULT 0,
    total_bounces INTEGER DEFAULT 0,
    total_opens INTEGER DEFAULT 0,
    total_unique_opens INTEGER DEFAULT 0,
    total_clicks INTEGER DEFAULT 0,
    total_unique_clicks INTEGER DEFAULT 0,
    total_unsubscribes INTEGER DEFAULT 0,
    total_spam_reports INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_campaigns_tenant ON marketing_campaigns(tenant_id);
CREATE INDEX idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_marketing_campaigns_type ON marketing_campaigns(type);
CREATE INDEX idx_marketing_campaigns_schedule ON marketing_campaigns(schedule_at) WHERE status = 'scheduled';
CREATE INDEX idx_marketing_campaigns_segment ON marketing_campaigns(segment_id);

-- Campaign Variants (for A/B testing)
CREATE TABLE marketing_campaign_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    variant_key TEXT NOT NULL, -- 'A', 'B', 'C', etc.
    
    -- Variant-specific content
    template_id UUID REFERENCES marketing_templates(id),
    subject_line TEXT,
    from_name TEXT,
    content_json JSONB, -- Override blocks if needed
    
    -- Variant distribution
    send_split_pct INTEGER DEFAULT 50, -- % of total to send this variant
    
    -- Variant stats
    sends INTEGER DEFAULT 0,
    delivered INTEGER DEFAULT 0,
    opens INTEGER DEFAULT 0,
    unique_opens INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0,
    unique_clicks INTEGER DEFAULT 0,
    unsubscribes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, variant_key)
);

CREATE INDEX idx_campaign_variants_campaign ON marketing_campaign_variants(campaign_id);

-- Marketing Sends (Log of each email/SMS sent)
CREATE TABLE marketing_sends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES marketing_campaign_variants(id) ON DELETE SET NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Send details
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    provider TEXT, -- 'sendgrid', 'mailgun', 'twilio', etc.
    provider_message_id TEXT, -- External ID from provider
    
    -- Status tracking
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'bounced', 'failed')) DEFAULT 'sent',
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint', NULL)),
    bounce_reason TEXT,
    delivered_at TIMESTAMP WITH TIME ZONE,
    
    -- Engagement tracking
    opened_at TIMESTAMP WITH TIME ZONE,
    first_click_at TIMESTAMP WITH TIME ZONE,
    open_count INTEGER DEFAULT 0,
    click_count INTEGER DEFAULT 0,
    
    -- Content snapshot
    subject_line TEXT,
    from_email TEXT,
    to_email TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_sends_tenant ON marketing_sends(tenant_id);
CREATE INDEX idx_marketing_sends_campaign ON marketing_sends(campaign_id);
CREATE INDEX idx_marketing_sends_contact ON marketing_sends(contact_id);
CREATE INDEX idx_marketing_sends_status ON marketing_sends(status);
CREATE INDEX idx_marketing_sends_provider_id ON marketing_sends(provider_message_id);

-- Marketing Events (Opens, Clicks, Bounces, Unsubscribes)
CREATE TABLE marketing_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    send_id UUID REFERENCES marketing_sends(id) ON DELETE CASCADE,
    
    -- Event type
    event_type TEXT NOT NULL CHECK (event_type IN ('delivered', 'open', 'click', 'bounce', 'unsubscribe', 'spam_report')),
    
    -- Event details
    link_url TEXT, -- For click events
    link_label TEXT,
    bounce_type TEXT CHECK (bounce_type IN ('hard', 'soft', 'complaint', NULL)),
    bounce_reason TEXT,
    
    -- Metadata
    user_agent TEXT,
    ip_address TEXT,
    location_country TEXT,
    location_city TEXT,
    device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet', 'unknown')),
    email_client TEXT,
    
    -- Provider data
    provider_event_id TEXT,
    raw_data JSONB, -- Full webhook payload
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_events_tenant ON marketing_events(tenant_id);
CREATE INDEX idx_marketing_events_campaign ON marketing_events(campaign_id);
CREATE INDEX idx_marketing_events_contact ON marketing_events(contact_id);
CREATE INDEX idx_marketing_events_type ON marketing_events(event_type);
CREATE INDEX idx_marketing_events_occurred ON marketing_events(occurred_at);

-- Unsubscribes (Preference center)
CREATE TABLE marketing_unsubscribes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Unsubscribe scope
    unsubscribe_type TEXT NOT NULL CHECK (unsubscribe_type IN ('all', 'campaign_type', 'specific_audience')),
    campaign_type TEXT CHECK (campaign_type IN ('email', 'sms', NULL)),
    audience_id UUID REFERENCES marketing_audiences(id) ON DELETE CASCADE,
    
    -- Metadata
    reason TEXT,
    campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL, -- What caused it
    unsubscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(contact_id, unsubscribe_type, campaign_type, audience_id)
);

CREATE INDEX idx_marketing_unsubscribes_contact ON marketing_unsubscribes(contact_id);
CREATE INDEX idx_marketing_unsubscribes_tenant ON marketing_unsubscribes(tenant_id);

-- Suppression List (Bounced/Complained contacts)
CREATE TABLE marketing_suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    email TEXT, -- Can suppress even if contact deleted
    phone TEXT,
    
    reason TEXT NOT NULL CHECK (reason IN ('hard_bounce', 'spam_complaint', 'invalid', 'manual')),
    source_campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE SET NULL,
    notes TEXT,
    
    suppressed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, email, phone)
);

CREATE INDEX idx_suppression_list_email ON marketing_suppression_list(email);
CREATE INDEX idx_suppression_list_phone ON marketing_suppression_list(phone);
CREATE INDEX idx_suppression_list_tenant ON marketing_suppression_list(tenant_id);

COMMENT ON TABLE marketing_campaigns IS 'Email and SMS marketing campaigns with A/B testing support';
COMMENT ON TABLE marketing_sends IS 'Individual send records for tracking per contact';
COMMENT ON TABLE marketing_events IS 'Granular event tracking: opens, clicks, bounces, unsubscribes';
COMMENT ON TABLE marketing_unsubscribes IS 'Unsubscribe preferences per contact';
COMMENT ON TABLE marketing_suppression_list IS 'Suppressed contacts due to bounces or complaints';




