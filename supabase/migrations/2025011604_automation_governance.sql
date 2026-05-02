-- =====================================================
-- AUTOMATION GOVERNANCE
-- Migration: Approval workflow, versioning, and enterprise controls
-- =====================================================

-- Automation Approvals (Draft → Review → Publish)
CREATE TABLE IF NOT EXISTS automation_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Approval details
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewer_user_id UUID REFERENCES app_users(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    comments TEXT,
    
    -- Request details
    requested_by_user_id UUID NOT NULL REFERENCES app_users(id),
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    changes_summary TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_automation_approvals_tenant ON automation_approvals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_automation ON automation_approvals(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_status ON automation_approvals(status);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_reviewer ON automation_approvals(reviewer_user_id);

-- Automation Versions (Version history + rollback)
CREATE TABLE IF NOT EXISTS automation_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Version details
    version_number INTEGER NOT NULL,
    graph_json JSONB NOT NULL, -- Snapshot of nodes/edges
    trigger_config JSONB,
    status_at_version TEXT, -- draft, active, etc.
    
    -- Change tracking
    published_by_user_id UUID REFERENCES app_users(id),
    published_at TIMESTAMP WITH TIME ZONE,
    change_notes TEXT,
    
    -- Rollback tracking
    rolled_back_from_version INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(automation_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_automation_versions_tenant ON automation_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_versions_automation ON automation_versions(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_versions_number ON automation_versions(version_number DESC);
CREATE INDEX IF NOT EXISTS idx_automation_versions_published ON automation_versions(published_at DESC);

-- Automation Rate Limits (Prevent spam)
CREATE TABLE IF NOT EXISTS automation_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Rate limit configuration
    max_executions_per_hour INTEGER DEFAULT 100,
    max_executions_per_day INTEGER DEFAULT 1000,
    max_emails_per_day INTEGER DEFAULT 500,
    max_sms_per_day INTEGER DEFAULT 100,
    
    -- Current usage (resets periodically)
    current_hour_executions INTEGER DEFAULT 0,
    current_day_executions INTEGER DEFAULT 0,
    current_day_emails INTEGER DEFAULT 0,
    current_day_sms INTEGER DEFAULT 0,
    
    -- Reset timestamps
    hour_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
    day_reset_at TIMESTAMP WITH TIME ZONE DEFAULT (DATE_TRUNC('day', NOW()) + INTERVAL '1 day'),
    
    -- Status
    is_paused_due_to_limits BOOLEAN DEFAULT false,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id, automation_id)
);

CREATE INDEX IF NOT EXISTS idx_automation_rate_limits_tenant ON automation_rate_limits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_rate_limits_automation ON automation_rate_limits(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_rate_limits_paused ON automation_rate_limits(is_paused_due_to_limits) WHERE is_paused_due_to_limits = true;

-- Consent Audit Log (GDPR/CCPA compliance)
CREATE TABLE IF NOT EXISTS automation_consent_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Consent check details
    action_type TEXT NOT NULL, -- 'send_email', 'send_sms', etc.
    consent_status TEXT NOT NULL CHECK (consent_status IN ('granted', 'denied', 'not_required')),
    consent_source TEXT, -- Where consent was obtained
    
    -- Action result
    action_taken BOOLEAN NOT NULL, -- true if sent, false if blocked
    blocked_reason TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consent_audit_tenant ON automation_consent_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_automation ON automation_consent_audit(automation_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_contact ON automation_consent_audit(contact_id);
CREATE INDEX IF NOT EXISTS idx_consent_audit_created ON automation_consent_audit(created_at DESC);

-- RLS Policies
ALTER TABLE automation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_consent_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's approvals" ON automation_approvals;
CREATE POLICY "Users can view their tenant's approvals" ON automation_approvals FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can request approvals" ON automation_approvals;
CREATE POLICY "Users can request approvals" ON automation_approvals FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Managers can approve/reject" ON automation_approvals;
CREATE POLICY "Managers can approve/reject" ON automation_approvals FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin', 'manager')
    ));

DROP POLICY IF EXISTS "Users can view automation versions" ON automation_versions;
CREATE POLICY "Users can view automation versions" ON automation_versions FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can create versions" ON automation_versions;
CREATE POLICY "Users can create versions" ON automation_versions FOR INSERT
    WITH CHECK (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can view rate limits" ON automation_rate_limits;
CREATE POLICY "Users can view rate limits" ON automation_rate_limits FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can manage rate limits" ON automation_rate_limits;
CREATE POLICY "System can manage rate limits" ON automation_rate_limits FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view consent audit" ON automation_consent_audit;
CREATE POLICY "Users can view consent audit" ON automation_consent_audit FOR SELECT
    USING (tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can insert consent audit" ON automation_consent_audit;
CREATE POLICY "System can insert consent audit" ON automation_consent_audit FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Create new version on publish
CREATE OR REPLACE FUNCTION create_automation_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_next_version INTEGER;
BEGIN
    -- Get next version number
    SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM automation_versions
    WHERE automation_id = NEW.id;
    
    -- Insert new version
    INSERT INTO automation_versions (
        tenant_id,
        automation_id,
        version_number,
        graph_json,
        trigger_config,
        status_at_version,
        published_at
    ) VALUES (
        NEW.tenant_id,
        NEW.id,
        v_next_version,
        NEW.graph_json,
        NEW.entry_trigger_config,
        NEW.status,
        CASE WHEN NEW.status = 'active' THEN NOW() ELSE NULL END
    );
    
    RETURN NEW;
END;
$$;

-- Trigger to auto-create versions
CREATE OR REPLACE TRIGGER automation_version_trigger
    AFTER UPDATE ON marketing_journeys
    FOR EACH ROW
    WHEN (OLD.graph_json IS DISTINCT FROM NEW.graph_json OR OLD.status = 'draft' AND NEW.status = 'active')
    EXECUTE FUNCTION create_automation_version();

-- Check and reset rate limits
CREATE OR REPLACE FUNCTION reset_automation_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Reset hourly limits
    UPDATE automation_rate_limits
    SET current_hour_executions = 0,
        hour_reset_at = NOW() + INTERVAL '1 hour'
    WHERE hour_reset_at <= NOW();
    
    -- Reset daily limits
    UPDATE automation_rate_limits
    SET current_day_executions = 0,
        current_day_emails = 0,
        current_day_sms = 0,
        day_reset_at = DATE_TRUNC('day', NOW()) + INTERVAL '1 day',
        is_paused_due_to_limits = false
    WHERE day_reset_at <= NOW();
    
    RAISE NOTICE 'Rate limits reset';
END;
$$;

COMMENT ON TABLE automation_approvals IS 'Approval workflow for automation publishing';
COMMENT ON TABLE automation_versions IS 'Version history for automations with rollback support';
COMMENT ON TABLE automation_rate_limits IS 'Rate limits to prevent automation spam';
COMMENT ON TABLE automation_consent_audit IS 'GDPR/CCPA compliance - tracks consent checks before sending';

