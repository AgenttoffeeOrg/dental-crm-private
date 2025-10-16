-- =====================================================
-- AUTOMATION EVENT LOG & REPLAY
-- Migration: Automation Event System
-- =====================================================

-- Table: automation_event_log
-- Stores all events for audit trail and replay functionality
CREATE TABLE IF NOT EXISTS automation_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL, -- e.g., 'DEAL.CREATED', 'TASK.OVERDUE'
    event_data JSONB NOT NULL, -- Full event payload
    
    -- Triggered automations
    triggered_automation_ids UUID[] DEFAULT '{}',
    automation_run_ids UUID[] DEFAULT '{}',
    
    -- Replay tracking
    replayed_from_id UUID REFERENCES automation_event_log(id) ON DELETE SET NULL,
    replay_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Indexing
    INDEX idx_automation_event_log_tenant (tenant_id),
    INDEX idx_automation_event_log_type (event_type),
    INDEX idx_automation_event_log_created (created_at DESC),
    INDEX idx_automation_event_log_tenant_type (tenant_id, event_type)
);

-- RLS Policies
ALTER TABLE automation_event_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's event logs"
    ON automation_event_log FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

-- Admins can insert event logs (system use)
CREATE POLICY "System can insert event logs"
    ON automation_event_log FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTION: Get Recent Events
-- =====================================================

CREATE OR REPLACE FUNCTION get_recent_automation_events(
    p_tenant_id UUID,
    p_event_type TEXT DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
    id UUID,
    event_type TEXT,
    event_data JSONB,
    triggered_automation_ids UUID[],
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        e.id,
        e.event_type,
        e.event_data,
        e.triggered_automation_ids,
        e.created_at
    FROM automation_event_log e
    WHERE e.tenant_id = p_tenant_id
    AND (p_event_type IS NULL OR e.event_type = p_event_type)
    ORDER BY e.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Replay Event
-- =====================================================

CREATE OR REPLACE FUNCTION replay_automation_event(
    p_event_log_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_new_event_id UUID;
    v_event_type TEXT;
    v_event_data JSONB;
    v_tenant_id UUID;
BEGIN
    -- Get original event
    SELECT event_type, event_data, tenant_id
    INTO v_event_type, v_event_data, v_tenant_id
    FROM automation_event_log
    WHERE id = p_event_log_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Event log not found: %', p_event_log_id;
    END IF;
    
    -- Create new event log entry
    INSERT INTO automation_event_log (
        tenant_id,
        event_type,
        event_data,
        replayed_from_id
    ) VALUES (
        v_tenant_id,
        v_event_type,
        v_event_data,
        p_event_log_id
    )
    RETURNING id INTO v_new_event_id;
    
    -- Increment replay count on original
    UPDATE automation_event_log
    SET replay_count = replay_count + 1
    WHERE id = p_event_log_id;
    
    RETURN v_new_event_id;
END;
$$;

-- =====================================================
-- CLEANUP: Auto-delete old event logs (retention policy)
-- =====================================================

CREATE OR REPLACE FUNCTION cleanup_old_automation_event_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Delete event logs older than 90 days
    DELETE FROM automation_event_log
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    RAISE NOTICE 'Cleaned up old automation event logs';
END;
$$;

-- Schedule cleanup (call via cron job or manually)
-- Example: SELECT cleanup_old_automation_event_logs();

COMMENT ON TABLE automation_event_log IS 'Stores all CRM events for audit trail and replay functionality';
COMMENT ON FUNCTION get_recent_automation_events IS 'Retrieve recent events for a tenant, optionally filtered by type';
COMMENT ON FUNCTION replay_automation_event IS 'Replay a previous event to trigger automations again';
COMMENT ON FUNCTION cleanup_old_automation_event_logs IS 'Delete event logs older than 90 days (retention policy)';

