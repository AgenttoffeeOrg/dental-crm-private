-- =====================================================
-- MARKETING MODULE - FORMS & LANDING PAGES
-- Migration 23: Lead Capture System
-- =====================================================

-- Marketing Forms
CREATE TABLE marketing_forms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Form basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'archived')) DEFAULT 'draft',
    
    -- Form structure
    fields_json JSONB NOT NULL DEFAULT '[]', -- Array of field definitions
    -- Each field: { id, type, label, fieldName (maps to Contact column), required, placeholder, options }
    
    -- Design & styling
    theme TEXT DEFAULT 'default',
    custom_css TEXT,
    button_text TEXT DEFAULT 'Submit',
    
    -- Success behavior
    success_message TEXT DEFAULT 'Thank you! We''ll be in touch soon.',
    redirect_url TEXT,
    send_confirmation_email BOOLEAN DEFAULT FALSE,
    confirmation_template_id UUID REFERENCES marketing_templates(id),
    
    -- Auto-actions on submit
    auto_add_tags TEXT[] DEFAULT '{}',
    auto_add_to_segment_id UUID REFERENCES marketing_segments(id),
    auto_start_journey_id UUID REFERENCES marketing_journeys(id),
    assign_to_user_id UUID REFERENCES app_users(id), -- Auto-assign contact
    
    -- Security & validation
    enable_recaptcha BOOLEAN DEFAULT FALSE,
    recaptcha_site_key TEXT,
    enable_honeypot BOOLEAN DEFAULT TRUE,
    require_double_opt_in BOOLEAN DEFAULT FALSE,
    
    -- Stats
    total_views INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    total_spam_blocked INTEGER DEFAULT 0,
    conversion_rate FLOAT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    public_url_slug TEXT, -- For hosted forms
    embed_code TEXT, -- Generated iframe/script
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, public_url_slug)
);

CREATE INDEX idx_marketing_forms_tenant ON marketing_forms(tenant_id);
CREATE INDEX idx_marketing_forms_status ON marketing_forms(status);
CREATE INDEX idx_marketing_forms_slug ON marketing_forms(public_url_slug) WHERE is_published = TRUE;

-- Form Submissions
CREATE TABLE marketing_form_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    form_id UUID NOT NULL REFERENCES marketing_forms(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL, -- Linked contact (created or matched)
    
    -- Submission data
    payload JSONB NOT NULL, -- Raw form data
    source_url TEXT, -- Page where form was embedded
    referrer_url TEXT,
    
    -- Contact resolution
    contact_created BOOLEAN DEFAULT FALSE,
    contact_updated BOOLEAN DEFAULT FALSE,
    duplicate_submission BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    ip_address TEXT,
    user_agent TEXT,
    location_country TEXT,
    location_city TEXT,
    
    -- Spam detection
    is_spam BOOLEAN DEFAULT FALSE,
    spam_score FLOAT,
    honeypot_triggered BOOLEAN DEFAULT FALSE,
    
    -- Processing status
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_form_submissions_form ON marketing_form_submissions(form_id);
CREATE INDEX idx_form_submissions_contact ON marketing_form_submissions(contact_id);
CREATE INDEX idx_form_submissions_tenant ON marketing_form_submissions(tenant_id);
CREATE INDEX idx_form_submissions_spam ON marketing_form_submissions(is_spam);
CREATE INDEX idx_form_submissions_submitted ON marketing_form_submissions(submitted_at);

-- Landing Pages
CREATE TABLE marketing_landing_pages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Page basics
    name TEXT NOT NULL,
    title TEXT NOT NULL, -- HTML title
    description TEXT, -- Meta description
    
    -- Content
    headline TEXT,
    subheadline TEXT,
    body_content TEXT,
    content_blocks_json JSONB, -- Structured content
    
    -- Form integration
    form_id UUID REFERENCES marketing_forms(id) ON DELETE SET NULL,
    show_form BOOLEAN DEFAULT TRUE,
    
    -- Design
    theme TEXT DEFAULT 'default',
    template TEXT DEFAULT 'basic',
    hero_image_url TEXT,
    logo_url TEXT,
    background_color TEXT DEFAULT '#FFFFFF',
    primary_color TEXT DEFAULT '#3B82F6',
    custom_css TEXT,
    custom_head_code TEXT, -- For analytics scripts
    
    -- SEO
    meta_keywords TEXT[],
    og_image_url TEXT,
    
    -- Publishing
    is_published BOOLEAN DEFAULT FALSE,
    public_url_slug TEXT,
    custom_domain TEXT,
    
    -- Stats
    total_views INTEGER DEFAULT 0,
    total_submissions INTEGER DEFAULT 0,
    conversion_rate FLOAT,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    published_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(tenant_id, public_url_slug)
);

CREATE INDEX idx_landing_pages_tenant ON marketing_landing_pages(tenant_id);
CREATE INDEX idx_landing_pages_slug ON marketing_landing_pages(public_url_slug) WHERE is_published = TRUE;
CREATE INDEX idx_landing_pages_form ON marketing_landing_pages(form_id);

-- Landing Page Views (Analytics)
CREATE TABLE marketing_landing_page_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    landing_page_id UUID NOT NULL REFERENCES marketing_landing_pages(id) ON DELETE CASCADE,
    
    -- Visitor tracking
    session_id TEXT,
    ip_address TEXT,
    user_agent TEXT,
    referrer_url TEXT,
    
    -- Conversion
    converted BOOLEAN DEFAULT FALSE,
    submission_id UUID REFERENCES marketing_form_submissions(id),
    
    -- Metadata
    device_type TEXT,
    location_country TEXT,
    location_city TEXT,
    
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_landing_page_views_page ON marketing_landing_page_views(landing_page_id);
CREATE INDEX idx_landing_page_views_session ON marketing_landing_page_views(session_id);
CREATE INDEX idx_landing_page_views_viewed ON marketing_landing_page_views(viewed_at);

COMMENT ON TABLE marketing_journeys IS 'Automated marketing workflows with visual canvas builder';
COMMENT ON TABLE marketing_journey_nodes IS 'Individual workflow nodes: triggers, actions, waits, branches';
COMMENT ON TABLE marketing_journey_runs IS 'Contact progress and state within active journeys';
COMMENT ON TABLE marketing_forms IS 'Lead capture forms with field mapping to contacts';
COMMENT ON TABLE marketing_landing_pages IS 'Themeable landing pages with embedded forms';




