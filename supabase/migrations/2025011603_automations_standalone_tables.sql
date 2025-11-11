-- =====================================================
-- AUTOMATIONS - STANDALONE TABLES (OPTION B)
-- Migration: Create clean automation tables separate from marketing
-- =====================================================

-- =====================================================
-- 1. AUTOMATIONS TABLE (Main workflow definitions)
-- =====================================================

CREATE TABLE IF NOT EXISTS automations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Category (4 types - this is the KEY field for tab separation)
    category TEXT NOT NULL CHECK (category IN ('deal', 'pipeline', 'task', 'marketing')),
    
    -- Automation basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
    
    -- Trigger configuration
    trigger_type TEXT NOT NULL, -- References automation_trigger_metadata
    trigger_config JSONB DEFAULT '{}',
    
    -- Visual workflow (nodes and edges as JSON)
    graph_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    
    -- Exit conditions
    exit_conditions JSONB,
    max_duration_days INTEGER,
    
    -- Statistics
    total_runs INTEGER DEFAULT 0,
    successful_runs INTEGER DEFAULT 0,
    failed_runs INTEGER DEFAULT 0,
    active_runs INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    is_template BOOLEAN DEFAULT false,
    template_id UUID, -- If created from template
    
    -- Ownership
    created_by_user_id UUID REFERENCES app_users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by_user_id UUID REFERENCES app_users(id),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_automations_tenant ON automations(tenant_id);
CREATE INDEX idx_automations_category ON automations(category);
CREATE INDEX idx_automations_status ON automations(status);
CREATE INDEX idx_automations_trigger_type ON automations(trigger_type);
CREATE INDEX idx_automations_tenant_category ON automations(tenant_id, category);
CREATE INDEX idx_automations_tenant_status ON automations(tenant_id, status);
CREATE INDEX idx_automations_is_template ON automations(is_template) WHERE is_template = true;

-- =====================================================
-- 2. AUTOMATION NODES (Individual steps)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Node identification
    node_key TEXT NOT NULL, -- Unique within automation (e.g., 'trigger_1', 'action_email_2')
    node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'action', 'wait', 'condition', 'split', 'merge')),
    
    -- Visual position
    position_x FLOAT,
    position_y FLOAT,
    
    -- Node configuration
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- For action nodes
    action_type TEXT, -- 'send_email', 'create_task', 'move_deal_stage', etc.
    
    -- For wait nodes
    wait_duration_value INTEGER,
    wait_duration_unit TEXT CHECK (wait_duration_unit IN ('minutes', 'hours', 'days', 'weeks')),
    
    -- For condition nodes
    condition_config JSONB,
    
    -- Statistics
    total_processed INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    avg_execution_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(automation_id, node_key)
);

CREATE INDEX idx_automation_nodes_automation ON automation_nodes(automation_id);
CREATE INDEX idx_automation_nodes_type ON automation_nodes(node_type);

-- =====================================================
-- 3. AUTOMATION EDGES (Connections between nodes)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Edge definition
    source_node_key TEXT NOT NULL,
    target_node_key TEXT NOT NULL,
    
    -- Edge metadata
    label TEXT, -- For condition edges: 'Yes', 'No', 'High Value', etc.
    condition_index INTEGER, -- Which condition branch (0, 1, 2...)
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_edges_automation ON automation_edges(automation_id);
CREATE INDEX idx_automation_edges_source ON automation_edges(source_node_key);
CREATE INDEX idx_automation_edges_target ON automation_edges(target_node_key);

-- =====================================================
-- 4. AUTOMATION RUNS (Execution tracking)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    
    -- Target record (what this automation is running on)
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    deal_id UUID, -- Optional, depends on automation type
    task_id UUID, -- Optional
    
    -- Run state
    state TEXT NOT NULL CHECK (state IN ('running', 'waiting', 'completed', 'failed', 'cancelled')) DEFAULT 'running',
    current_node_key TEXT, -- Which node we're at
    
    -- Progress tracking
    nodes_completed TEXT[] DEFAULT '{}',
    nodes_failed TEXT[] DEFAULT '{}',
    
    -- Wait state (if paused)
    waiting_until TIMESTAMP WITH TIME ZONE,
    waiting_reason TEXT,
    
    -- Completion
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    failure_reason TEXT,
    
    -- Performance
    total_execution_time_ms INTEGER,
    
    -- Timestamps
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_runs_tenant ON automation_runs(tenant_id);
CREATE INDEX idx_automation_runs_automation ON automation_runs(automation_id);
CREATE INDEX idx_automation_runs_contact ON automation_runs(contact_id);
CREATE INDEX idx_automation_runs_state ON automation_runs(state);
CREATE INDEX idx_automation_runs_waiting ON automation_runs(waiting_until) WHERE state = 'waiting';
CREATE INDEX idx_automation_runs_started ON automation_runs(started_at DESC);

-- =====================================================
-- 5. AUTOMATION EXECUTION LOGS (Detailed audit trail)
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    automation_id UUID NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    
    -- Node execution details
    node_id UUID REFERENCES automation_nodes(id) ON DELETE SET NULL,
    node_key TEXT NOT NULL,
    node_type TEXT NOT NULL,
    
    -- Execution result
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
    error_message TEXT,
    execution_time_ms INTEGER,
    
    -- Action output (for auditing)
    action_output JSONB, -- What was sent/created/updated
    
    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_automation_execution_logs_tenant ON automation_execution_logs(tenant_id);
CREATE INDEX idx_automation_execution_logs_automation ON automation_execution_logs(automation_id);
CREATE INDEX idx_automation_execution_logs_run ON automation_execution_logs(run_id);
CREATE INDEX idx_automation_execution_logs_status ON automation_execution_logs(status);
CREATE INDEX idx_automation_execution_logs_executed ON automation_execution_logs(executed_at DESC);

-- =====================================================
-- RLS POLICIES (Row-Level Security)
-- =====================================================

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

-- Automations policies
CREATE POLICY "Users can view their tenant's automations"
    ON automations FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can create automations"
    ON automations FOR INSERT
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can update their automations"
    ON automations FOR UPDATE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can delete automations"
    ON automations FOR DELETE
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Automation nodes policies
CREATE POLICY "Users can view automation nodes"
    ON automation_nodes FOR SELECT
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can manage automation nodes"
    ON automation_nodes FOR ALL
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ))
    WITH CHECK (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

-- Automation edges policies
CREATE POLICY "Users can view automation edges"
    ON automation_edges FOR SELECT
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

CREATE POLICY "Users can manage automation edges"
    ON automation_edges FOR ALL
    USING (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ))
    WITH CHECK (automation_id IN (
        SELECT id FROM automations 
        WHERE tenant_id IN (SELECT tenant_id FROM app_users WHERE id = auth.uid())
    ));

-- Automation runs policies
CREATE POLICY "Users can view their automation runs"
    ON automation_runs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "System can manage automation runs"
    ON automation_runs FOR ALL
    USING (true)
    WITH CHECK (true);

-- Execution logs policies
CREATE POLICY "Users can view execution logs"
    ON automation_execution_logs FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "System can insert execution logs"
    ON automation_execution_logs FOR INSERT
    WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Get automations by category
CREATE OR REPLACE FUNCTION get_automations_by_category(
    p_tenant_id UUID,
    p_category TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    category TEXT,
    trigger_type TEXT,
    status TEXT,
    total_runs INTEGER,
    successful_runs INTEGER,
    created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.name,
        a.description,
        a.category,
        a.trigger_type,
        a.status,
        a.total_runs,
        a.successful_runs,
        a.created_at
    FROM automations a
    WHERE a.tenant_id = p_tenant_id
    AND (p_category IS NULL OR a.category = p_category)
    AND (p_status IS NULL OR a.status = p_status)
    ORDER BY a.created_at DESC;
END;
$$;

-- Get automation statistics by category
CREATE OR REPLACE FUNCTION get_automation_stats_by_category(p_tenant_id UUID)
RETURNS TABLE (
    category TEXT,
    total_automations BIGINT,
    active_automations BIGINT,
    total_runs BIGINT,
    success_rate NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.category,
        COUNT(*)::BIGINT as total_automations,
        COUNT(*) FILTER (WHERE a.status = 'active')::BIGINT as active_automations,
        COALESCE(SUM(a.total_runs), 0)::BIGINT as total_runs,
        CASE 
            WHEN SUM(a.total_runs) > 0 THEN 
                ROUND((SUM(a.successful_runs)::NUMERIC / SUM(a.total_runs)::NUMERIC) * 100, 2)
            ELSE 0
        END as success_rate
    FROM automations a
    WHERE a.tenant_id = p_tenant_id
    GROUP BY a.category
    ORDER BY a.category;
END;
$$;

COMMENT ON TABLE automations IS 'Standalone automation workflows for Deal, Pipeline, Task, and Marketing categories';
COMMENT ON COLUMN automations.category IS 'Automation category: deal, pipeline, task, or marketing (controls tab visibility)';
COMMENT ON TABLE automation_nodes IS 'Individual nodes/steps in an automation workflow';
COMMENT ON TABLE automation_edges IS 'Connections between automation nodes';
COMMENT ON TABLE automation_runs IS 'Execution instances of automations';
COMMENT ON TABLE automation_execution_logs IS 'Detailed log of each node execution';
COMMENT ON FUNCTION get_automations_by_category IS 'Retrieve automations filtered by category and status';
COMMENT ON FUNCTION get_automation_stats_by_category IS 'Get statistics for each automation category (for tab badges)';

