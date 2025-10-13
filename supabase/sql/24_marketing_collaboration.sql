-- =====================================================
-- MARKETING MODULE - COLLABORATION & AI
-- Migration 24: Comments, Approvals, AI Suggestions
-- =====================================================

-- Marketing Comments (Team collaboration)
CREATE TABLE marketing_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What is being commented on
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'journey', 'template', 'form', 'landing_page')),
    entity_id UUID NOT NULL,
    
    -- Comment content
    comment TEXT NOT NULL,
    mentions TEXT[] DEFAULT '{}', -- User IDs mentioned with @
    
    -- Thread support
    parent_comment_id UUID REFERENCES marketing_comments(id) ON DELETE CASCADE,
    is_reply BOOLEAN DEFAULT FALSE,
    
    -- Status
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_by_user_id UUID REFERENCES app_users(id),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Author
    user_id UUID NOT NULL REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_comments_entity ON marketing_comments(entity_type, entity_id);
CREATE INDEX idx_marketing_comments_tenant ON marketing_comments(tenant_id);
CREATE INDEX idx_marketing_comments_user ON marketing_comments(user_id);
CREATE INDEX idx_marketing_comments_parent ON marketing_comments(parent_comment_id);

-- Marketing Approvals (Draft review workflow)
CREATE TABLE marketing_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What needs approval
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'journey', 'template')),
    entity_id UUID NOT NULL,
    
    -- Approval request
    requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT,
    
    -- Approval decision
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
    reviewed_by_user_id UUID REFERENCES app_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    
    -- Notification
    notified_users UUID[] DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_approvals_entity ON marketing_approvals(entity_type, entity_id);
CREATE INDEX idx_marketing_approvals_status ON marketing_approvals(status);
CREATE INDEX idx_marketing_approvals_requested_by ON marketing_approvals(requested_by_user_id);

-- Marketing AI Suggestions (AI-generated content)
CREATE TABLE marketing_ai_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- What it's for
    entity_type TEXT NOT NULL CHECK (entity_type IN ('campaign', 'template', 'subject_line')),
    entity_id UUID,
    
    -- Suggestion type
    suggestion_type TEXT NOT NULL CHECK (suggestion_type IN (
        'subject_line',
        'preheader',
        'content_block',
        'send_time',
        'segment',
        'personalization',
        'tone_adjustment'
    )),
    
    -- AI output
    original_content TEXT,
    suggested_content TEXT NOT NULL,
    confidence_score FLOAT, -- 0-1
    reasoning TEXT, -- Why AI suggested this
    
    -- User action
    accepted BOOLEAN DEFAULT FALSE,
    accepted_by_user_id UUID REFERENCES app_users(id),
    accepted_at TIMESTAMP WITH TIME ZONE,
    
    -- AI metadata
    ai_model TEXT DEFAULT 'gpt-4-turbo',
    ai_prompt TEXT,
    ai_tokens_used INTEGER,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_ai_suggestions_entity ON marketing_ai_suggestions(entity_type, entity_id);
CREATE INDEX idx_ai_suggestions_type ON marketing_ai_suggestions(suggestion_type);
CREATE INDEX idx_ai_suggestions_accepted ON marketing_ai_suggestions(accepted);

-- Marketing Activity Log (Module-wide audit trail)
CREATE TABLE marketing_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES app_users(id),
    
    -- Activity details
    action_type TEXT NOT NULL, -- 'created', 'updated', 'deleted', 'sent', 'scheduled', etc.
    entity_type TEXT NOT NULL, -- 'campaign', 'journey', 'template', etc.
    entity_id UUID,
    entity_name TEXT,
    
    -- Change details
    before_state JSONB,
    after_state JSONB,
    description TEXT,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_activity_tenant ON marketing_activity_log(tenant_id);
CREATE INDEX idx_marketing_activity_user ON marketing_activity_log(user_id);
CREATE INDEX idx_marketing_activity_entity ON marketing_activity_log(entity_type, entity_id);
CREATE INDEX idx_marketing_activity_occurred ON marketing_activity_log(occurred_at);

-- Marketing Reports (Saved custom reports)
CREATE TABLE marketing_saved_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    report_type TEXT NOT NULL CHECK (report_type IN ('campaign', 'journey', 'audience', 'engagement', 'custom')),
    
    -- Report configuration
    filters_json JSONB,
    metrics JSON B,
    date_range_type TEXT CHECK (date_range_type IN ('last_7_days', 'last_30_days', 'last_90_days', 'custom')),
    date_range_start DATE,
    date_range_end DATE,
    
    -- Scheduling (auto-send reports)
    schedule_enabled BOOLEAN DEFAULT FALSE,
    schedule_frequency TEXT CHECK (schedule_frequency IN ('daily', 'weekly', 'monthly', NULL)),
    schedule_recipients TEXT[], -- Email addresses
    last_sent_at TIMESTAMP WITH TIME ZONE,
    
    created_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_saved_reports_tenant ON marketing_saved_reports(tenant_id);
CREATE INDEX idx_saved_reports_type ON marketing_saved_reports(report_type);

-- Marketing Webhooks (For external integrations - future)
CREATE TABLE marketing_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    endpoint_url TEXT NOT NULL,
    secret_key TEXT,
    
    -- Trigger events
    trigger_events TEXT[] DEFAULT '{}', -- Array of event types to send
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    total_calls INTEGER DEFAULT 0,
    total_failures INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_webhooks_tenant ON marketing_webhooks(tenant_id);

COMMENT ON TABLE marketing_forms IS 'Lead capture forms with field mapping and auto-actions';
COMMENT ON TABLE marketing_form_submissions IS 'Form submission records with spam detection';
COMMENT ON TABLE marketing_landing_pages IS 'Hosted landing pages with themes and form integration';
COMMENT ON TABLE marketing_comments IS 'Team comments on campaigns, journeys, templates';
COMMENT ON TABLE marketing_approvals IS 'Approval workflow for campaign/journey launches';
COMMENT ON TABLE marketing_ai_suggestions IS 'AI-generated content suggestions and optimizations';

