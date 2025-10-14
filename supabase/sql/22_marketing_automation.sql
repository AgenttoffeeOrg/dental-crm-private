-- =====================================================
-- MARKETING MODULE - AUTOMATION & JOURNEYS
-- Migration 22: Customer Journey Builder
-- =====================================================

-- Marketing Journeys (Automation workflows)
CREATE TABLE marketing_journeys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Journey basics
    name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK (status IN ('draft', 'active', 'paused', 'archived')) DEFAULT 'draft',
    
    -- Journey graph (nodes and connections as JSON)
    graph_json JSONB NOT NULL DEFAULT '{"nodes": [], "edges": []}',
    
    -- Entry conditions
    entry_trigger_type TEXT NOT NULL CHECK (entry_trigger_type IN (
        'contact_created',
        'tag_added',
        'tag_removed',
        'segment_entry',
        'segment_exit',
        'link_clicked',
        'form_submitted',
        'birthday',
        'anniversary',
        'inactivity_days',
        'manual'
    )),
    entry_trigger_config JSONB, -- Specific trigger settings
    
    -- Exit conditions
    exit_conditions JSONB, -- Array of conditions to stop journey
    max_duration_days INTEGER, -- Auto-stop after X days
    
    -- Stats
    total_entered INTEGER DEFAULT 0,
    total_completed INTEGER DEFAULT 0,
    total_active INTEGER DEFAULT 0,
    total_exited INTEGER DEFAULT 0,
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    created_by_user_id UUID REFERENCES app_users(id),
    activated_at TIMESTAMP WITH TIME ZONE,
    activated_by_user_id UUID REFERENCES app_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_marketing_journeys_tenant ON marketing_journeys(tenant_id);
CREATE INDEX idx_marketing_journeys_status ON marketing_journeys(status);
CREATE INDEX idx_marketing_journeys_trigger ON marketing_journeys(entry_trigger_type);

-- Journey Nodes (Individual steps in a journey)
CREATE TABLE marketing_journey_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    -- Node identification
    node_key TEXT NOT NULL, -- Unique within journey (e.g., 'trigger_1', 'email_2')
    node_type TEXT NOT NULL CHECK (node_type IN ('trigger', 'action', 'wait', 'branch')),
    
    -- Node position in canvas
    position_x FLOAT,
    position_y FLOAT,
    
    -- Node configuration
    config_json JSONB NOT NULL DEFAULT '{}',
    
    -- For action nodes
    action_type TEXT CHECK (action_type IN ('send_email', 'send_sms', 'add_tag', 'remove_tag', 'update_field', 'webhook', NULL)),
    template_id UUID REFERENCES marketing_templates(id),
    
    -- For wait nodes
    wait_duration_type TEXT CHECK (wait_duration_type IN ('hours', 'days', 'until_time', 'until_date', NULL)),
    wait_duration_value INTEGER,
    wait_until_time TIME,
    wait_until_date DATE,
    
    -- For branch nodes
    branch_conditions JSONB, -- Array of conditions
    
    -- Stats
    total_processed INTEGER DEFAULT 0,
    total_success INTEGER DEFAULT 0,
    total_failed INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(journey_id, node_key)
);

CREATE INDEX idx_journey_nodes_journey ON marketing_journey_nodes(journey_id);
CREATE INDEX idx_journey_nodes_type ON marketing_journey_nodes(node_type);

-- Journey Node Connections (Edges)
CREATE TABLE marketing_journey_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    source_node_key TEXT NOT NULL,
    target_node_key TEXT NOT NULL,
    
    -- Edge metadata
    label TEXT, -- For branch edges: 'Yes', 'No', etc.
    condition_index INTEGER, -- Which condition this edge represents
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journey_edges_journey ON marketing_journey_edges(journey_id);

-- Journey Runs (Contact progress through journeys)
CREATE TABLE marketing_journey_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Run state
    state TEXT NOT NULL CHECK (state IN ('active', 'waiting', 'completed', 'exited', 'failed')) DEFAULT 'active',
    current_node_key TEXT, -- Which node contact is at
    
    -- Progress tracking
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    exited_at TIMESTAMP WITH TIME ZONE,
    exit_reason TEXT,
    
    -- Node history
    nodes_completed TEXT[] DEFAULT '{}', -- Array of completed node keys
    
    -- Wait state
    waiting_until TIMESTAMP WITH TIME ZONE,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(journey_id, contact_id, state) -- Contact can only be in journey once
);

CREATE INDEX idx_journey_runs_tenant ON marketing_journey_runs(tenant_id);
CREATE INDEX idx_journey_runs_journey ON marketing_journey_runs(journey_id);
CREATE INDEX idx_journey_runs_contact ON marketing_journey_runs(contact_id);
CREATE INDEX idx_journey_runs_state ON marketing_journey_runs(state);
CREATE INDEX idx_journey_runs_waiting ON marketing_journey_runs(waiting_until) WHERE state = 'waiting';

-- Journey Execution Log (Detailed audit trail)
CREATE TABLE marketing_journey_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    run_id UUID REFERENCES marketing_journey_runs(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    
    -- Log details
    log_type TEXT NOT NULL CHECK (log_type IN ('entered', 'node_executed', 'branch_taken', 'completed', 'exited', 'error')),
    node_key TEXT,
    
    message TEXT,
    metadata JSONB,
    error_details TEXT,
    
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journey_logs_journey ON marketing_journey_logs(journey_id);
CREATE INDEX idx_journey_logs_run ON marketing_journey_logs(run_id);
CREATE INDEX idx_journey_logs_contact ON marketing_journey_logs(contact_id);
CREATE INDEX idx_journey_logs_occurred ON marketing_journey_logs(occurred_at);

-- Journey Goals (Conversion tracking)
CREATE TABLE marketing_journey_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    journey_id UUID NOT NULL REFERENCES marketing_journeys(id) ON DELETE CASCADE,
    
    goal_type TEXT NOT NULL CHECK (goal_type IN ('email_opened', 'link_clicked', 'form_submitted', 'tag_added', 'deal_created', 'custom')),
    goal_config JSONB, -- Specific goal criteria
    
    -- Stats
    total_achieved INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_journey_goals_journey ON marketing_journey_goals(journey_id);

COMMENT ON TABLE marketing_journeys IS 'Automated marketing workflows with triggers and actions';
COMMENT ON TABLE marketing_journey_nodes IS 'Individual nodes in a journey (trigger, action, wait, branch)';
COMMENT ON TABLE marketing_journey_runs IS 'Tracks each contact progress through journeys';
COMMENT ON TABLE marketing_journey_logs IS 'Detailed execution log for debugging and analytics';




