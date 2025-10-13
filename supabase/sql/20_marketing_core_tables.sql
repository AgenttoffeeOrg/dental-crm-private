-- =====================================================
-- MARKETING MODULE - CORE TABLES
-- Migration 20: Audiences, Segments, Tags, Templates
-- =====================================================

-- Marketing Audiences (Logical groupings of contacts)
CREATE TABLE marketing_audiences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_by_user_id UUID REFERENCES app_users(id),
    is_active BOOLEAN DEFAULT TRUE,
    contact_count INTEGER DEFAULT 0, -- Cached count
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_audiences_tenant ON marketing_audiences(tenant_id);
CREATE INDEX idx_marketing_audiences_active ON marketing_audiences(tenant_id, is_active);

-- Marketing Segments (Saved filters/queries)
CREATE TABLE marketing_segments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    audience_id UUID REFERENCES marketing_audiences(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    -- Filter definition as JSON (field conditions, tags, behaviors)
    definition_json JSONB NOT NULL DEFAULT '{}',
    is_saved BOOLEAN DEFAULT TRUE,
    is_dynamic BOOLEAN DEFAULT TRUE, -- Refreshes membership automatically
    contact_count INTEGER DEFAULT 0, -- Cached count
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_segments_tenant ON marketing_segments(tenant_id);
CREATE INDEX idx_marketing_segments_audience ON marketing_segments(audience_id);
CREATE INDEX idx_marketing_segments_definition ON marketing_segments USING GIN (definition_json);

-- Marketing Tags (Maps to contacts.tags array)
CREATE TABLE marketing_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#6B7280', -- Hex color for UI
    category TEXT, -- Group tags (e.g., 'source', 'interest', 'behavior')
    usage_count INTEGER DEFAULT 0, -- How many contacts have this tag
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_marketing_tags_tenant ON marketing_tags(tenant_id);
CREATE INDEX idx_marketing_tags_category ON marketing_tags(tenant_id, category);

-- Contact Segment Membership (Cached for performance)
CREATE TABLE contact_segment_membership (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    segment_id UUID NOT NULL REFERENCES marketing_segments(id) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_qualified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(contact_id, segment_id)
);

CREATE INDEX idx_segment_membership_contact ON contact_segment_membership(contact_id);
CREATE INDEX idx_segment_membership_segment ON contact_segment_membership(segment_id);
CREATE INDEX idx_segment_membership_tenant ON contact_segment_membership(tenant_id);

-- Marketing Templates (Email/SMS content templates)
CREATE TABLE marketing_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('email', 'sms')),
    
    -- Email-specific
    subject_line TEXT,
    preheader TEXT,
    from_name TEXT,
    from_email TEXT,
    
    -- Template content
    content_html TEXT, -- Final HTML
    content_json JSONB, -- Drag-drop blocks structure
    content_text TEXT, -- Plain text version
    
    -- Template metadata
    thumbnail_url TEXT,
    category TEXT, -- 'welcome', 'promotional', 'newsletter', etc.
    is_public BOOLEAN DEFAULT FALSE, -- Shared in template library
    usage_count INTEGER DEFAULT 0,
    
    -- AI metadata
    ai_generated BOOLEAN DEFAULT FALSE,
    ai_prompt TEXT,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_templates_tenant ON marketing_templates(tenant_id);
CREATE INDEX idx_marketing_templates_type ON marketing_templates(type);
CREATE INDEX idx_marketing_templates_category ON marketing_templates(tenant_id, category);

-- Template Versions (Track changes)
CREATE TABLE marketing_template_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES marketing_templates(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    content_json JSONB NOT NULL,
    content_html TEXT,
    changed_by_user_id UUID REFERENCES app_users(id),
    change_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(template_id, version_number)
);

CREATE INDEX idx_template_versions_template ON marketing_template_versions(template_id);

-- Marketing Module Settings (Feature flags, provider configs)
CREATE TABLE marketing_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Feature flags
    enable_journeys BOOLEAN DEFAULT TRUE,
    enable_ab_testing BOOLEAN DEFAULT TRUE,
    enable_sms BOOLEAN DEFAULT FALSE,
    enable_landing_pages BOOLEAN DEFAULT TRUE,
    enable_ai_features BOOLEAN DEFAULT TRUE,
    
    -- Provider settings
    mail_provider TEXT DEFAULT 'noop', -- 'sendgrid', 'mailgun', 'ses', 'noop'
    mail_provider_api_key TEXT,
    mail_provider_domain TEXT,
    mail_default_from_email TEXT,
    mail_default_from_name TEXT,
    
    sms_provider TEXT DEFAULT 'noop', -- 'twilio', 'noop'
    sms_provider_api_key TEXT,
    sms_provider_phone_number TEXT,
    
    -- Limits & throttling
    max_sends_per_hour INTEGER DEFAULT 1000,
    max_sends_per_day INTEGER DEFAULT 10000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id)
);

-- Insert default settings for existing tenant
INSERT INTO marketing_settings (tenant_id) 
SELECT id FROM tenants 
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE marketing_audiences IS 'Logical groupings of contacts for marketing campaigns';
COMMENT ON TABLE marketing_segments IS 'Saved filter definitions that dynamically select contacts';
COMMENT ON TABLE marketing_tags IS 'Tag definitions that map to contacts.tags array';
COMMENT ON TABLE marketing_templates IS 'Email and SMS content templates with drag-drop structure';
COMMENT ON TABLE marketing_settings IS 'Module-level configuration and feature flags';

