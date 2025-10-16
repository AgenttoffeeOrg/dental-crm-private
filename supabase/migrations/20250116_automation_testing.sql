-- =====================================================
-- AUTOMATION TESTING & SIMULATION
-- Migration: Test runs, validation, and simulation results
-- =====================================================

-- Automation Test Runs
CREATE TABLE IF NOT EXISTS automation_test_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Test details
    test_type TEXT NOT NULL CHECK (test_type IN ('simulation', 'dry_run', 'validation')),
    success BOOLEAN NOT NULL,
    execution_path JSONB, -- Array of nodes executed
    preview_messages JSONB, -- Emails/SMS that would be sent
    validation_errors JSONB, -- Any validation issues found
    execution_time_ms INTEGER,
    
    -- Test context
    test_contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    tested_by_user_id UUID REFERENCES app_users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_test_runs_tenant ON automation_test_runs(tenant_id);
CREATE INDEX idx_automation_test_runs_automation ON automation_test_runs(automation_id);
CREATE INDEX idx_automation_test_runs_type ON automation_test_runs(test_type);
CREATE INDEX idx_automation_test_runs_created ON automation_test_runs(created_at DESC);

-- RLS Policies
ALTER TABLE automation_test_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's test runs"
    ON automation_test_runs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create test runs"
    ON automation_test_runs FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

-- =====================================================
-- HELPER FUNCTION: Get Test History
-- =====================================================

CREATE OR REPLACE FUNCTION get_automation_test_history(
    p_automation_id UUID,
    p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
    id UUID,
    test_type TEXT,
    success BOOLEAN,
    execution_time_ms INTEGER,
    preview_messages JSONB,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.test_type,
        t.success,
        t.execution_time_ms,
        t.preview_messages,
        t.created_at
    FROM automation_test_runs t
    WHERE t.automation_id = p_automation_id
    ORDER BY t.created_at DESC
    LIMIT p_limit;
END;
$$;

-- =====================================================
-- HELPER FUNCTION: Compare Test Runs
-- =====================================================

CREATE OR REPLACE FUNCTION compare_automation_test_runs(
    p_test_run_1 UUID,
    p_test_run_2 UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_run1 RECORD;
    v_run2 RECORD;
    v_result JSONB;
BEGIN
    -- Get both test runs
    SELECT * INTO v_run1 FROM automation_test_runs WHERE id = p_test_run_1;
    SELECT * INTO v_run2 FROM automation_test_runs WHERE id = p_test_run_2;
    
    IF NOT FOUND THEN
        RETURN '{"error": "Test run not found"}'::jsonb;
    END IF;
    
    -- Build comparison
    v_result := jsonb_build_object(
        'run1', jsonb_build_object(
            'id', v_run1.id,
            'success', v_run1.success,
            'execution_time_ms', v_run1.execution_time_ms,
            'created_at', v_run1.created_at
        ),
        'run2', jsonb_build_object(
            'id', v_run2.id,
            'success', v_run2.success,
            'execution_time_ms', v_run2.execution_time_ms,
            'created_at', v_run2.created_at
        ),
        'differences', jsonb_build_object(
            'success_changed', v_run1.success != v_run2.success,
            'execution_time_diff_ms', v_run2.execution_time_ms - v_run1.execution_time_ms,
            'path_changed', v_run1.execution_path != v_run2.execution_path
        )
    );
    
    RETURN v_result;
END;
$$;

COMMENT ON TABLE automation_test_runs IS 'Test runs and simulation results for automations';
COMMENT ON FUNCTION get_automation_test_history IS 'Retrieve test history for an automation';
COMMENT ON FUNCTION compare_automation_test_runs IS 'Compare two test runs to see what changed';

