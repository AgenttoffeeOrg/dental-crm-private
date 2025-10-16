-- =====================================================
-- DATA MIGRATION: Marketing Journeys → Automations
-- Migration: Copy existing marketing journeys to new automations table
-- =====================================================

-- This migration copies data from marketing_journeys to the new automations table
-- with category = 'marketing', preserving all existing functionality

-- =====================================================
-- MIGRATE MARKETING JOURNEYS
-- =====================================================

INSERT INTO automations (
    id, -- Preserve IDs for backward compatibility
    tenant_id,
    category,
    name,
    description,
    status,
    trigger_type,
    trigger_config,
    graph_json,
    exit_conditions,
    max_duration_days,
    total_runs,
    successful_runs,
    failed_runs,
    active_runs,
    tags,
    created_by_user_id,
    activated_at,
    activated_by_user_id,
    created_at,
    updated_at
)
SELECT 
    id,
    tenant_id,
    'marketing'::TEXT as category, -- ALL existing journeys are marketing category
    name,
    description,
    status,
    entry_trigger_type as trigger_type,
    entry_trigger_config as trigger_config,
    graph_json,
    exit_conditions,
    max_duration_days,
    total_entered as total_runs,
    total_completed as successful_runs,
    total_exited as failed_runs,
    total_active as active_runs,
    tags,
    created_by_user_id,
    activated_at,
    activated_by_user_id,
    created_at,
    updated_at
FROM marketing_journeys
WHERE NOT EXISTS (
    SELECT 1 FROM automations WHERE automations.id = marketing_journeys.id
);

-- Count migrated records
DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM automations WHERE category = 'marketing';
    RAISE NOTICE 'Migrated % marketing journeys to automations table', v_count;
END $$;

-- =====================================================
-- MIGRATE JOURNEY NODES
-- =====================================================

INSERT INTO automation_nodes (
    id,
    automation_id,
    node_key,
    node_type,
    position_x,
    position_y,
    config_json,
    action_type,
    wait_duration_value,
    wait_duration_unit,
    condition_config,
    total_processed,
    total_success,
    total_failed,
    created_at
)
SELECT 
    n.id,
    n.journey_id as automation_id,
    n.node_key,
    n.node_type,
    n.position_x,
    n.position_y,
    n.config_json,
    n.action_type,
    n.wait_duration_value,
    n.wait_duration_type as wait_duration_unit,
    n.branch_conditions as condition_config,
    n.total_processed,
    n.total_success,
    n.total_failed,
    n.created_at
FROM marketing_journey_nodes n
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = n.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_nodes WHERE automation_nodes.id = n.id
);

-- =====================================================
-- MIGRATE JOURNEY EDGES
-- =====================================================

INSERT INTO automation_edges (
    id,
    automation_id,
    source_node_key,
    target_node_key,
    label,
    condition_index,
    created_at
)
SELECT 
    e.id,
    e.journey_id as automation_id,
    e.source_node_key,
    e.target_node_key,
    e.label,
    e.condition_index,
    e.created_at
FROM marketing_journey_edges e
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = e.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_edges WHERE automation_edges.id = e.id
);

-- =====================================================
-- MIGRATE JOURNEY RUNS
-- =====================================================

INSERT INTO automation_runs (
    id,
    tenant_id,
    automation_id,
    contact_id,
    state,
    current_node_key,
    nodes_completed,
    waiting_until,
    started_at,
    completed_at,
    updated_at
)
SELECT 
    r.id,
    r.tenant_id,
    r.journey_id as automation_id,
    r.contact_id,
    r.state,
    r.current_node_key,
    r.nodes_completed,
    r.waiting_until,
    r.entered_at as started_at,
    r.completed_at,
    r.updated_at
FROM marketing_journey_runs r
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = r.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_runs WHERE automation_runs.id = r.id
);

-- =====================================================
-- MIGRATE JOURNEY LOGS
-- =====================================================

INSERT INTO automation_execution_logs (
    id,
    tenant_id,
    automation_id,
    run_id,
    node_key,
    node_type,
    status,
    error_message,
    execution_time_ms,
    executed_at
)
SELECT 
    l.id,
    l.tenant_id,
    l.journey_id as automation_id,
    l.run_id,
    l.node_key,
    l.node_type,
    l.status,
    l.error_message,
    l.execution_time_ms,
    l.created_at as executed_at
FROM marketing_journey_logs l
WHERE EXISTS (SELECT 1 FROM automations WHERE automations.id = l.journey_id)
AND NOT EXISTS (
    SELECT 1 FROM automation_execution_logs WHERE automation_execution_logs.id = l.id
);

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
    v_automations INTEGER;
    v_nodes INTEGER;
    v_edges INTEGER;
    v_runs INTEGER;
    v_logs INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_automations FROM automations WHERE category = 'marketing';
    SELECT COUNT(*) INTO v_nodes FROM automation_nodes;
    SELECT COUNT(*) INTO v_edges FROM automation_edges;
    SELECT COUNT(*) INTO v_runs FROM automation_runs;
    SELECT COUNT(*) INTO v_logs FROM automation_execution_logs;
    
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MIGRATION COMPLETE';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Automations: %', v_automations;
    RAISE NOTICE 'Nodes: %', v_nodes;
    RAISE NOTICE 'Edges: %', v_edges;
    RAISE NOTICE 'Runs: %', v_runs;
    RAISE NOTICE 'Logs: %', v_logs;
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'marketing_journeys table preserved for backward compatibility';
    RAISE NOTICE 'New automations table ready for Deal/Pipeline/Task categories';
END $$;

COMMENT ON TABLE automations IS 'All automation workflows migrated from marketing_journeys plus new Deal/Pipeline/Task automations';

