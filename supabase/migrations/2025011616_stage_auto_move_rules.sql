SET search_path TO public, extensions;

-- =====================================================
-- STAGE AUTO-MOVE RULES
-- Migration: Automatic deal stage transitions
-- =====================================================

DROP TABLE IF EXISTS stage_auto_move_rules CASCADE;
CREATE TABLE stage_auto_move_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Pipeline and stages
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    from_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    to_stage_id UUID NOT NULL REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    
    -- Trigger configuration
    trigger_type TEXT NOT NULL CHECK (trigger_type IN (
        'task_completed',
        'time_based',
        'field_change',
        'email_opened',
        'manual'
    )),
    trigger_config JSONB NOT NULL DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure from and to stages are different
    CONSTRAINT different_stages CHECK (from_stage_id != to_stage_id)
);

CREATE INDEX IF NOT EXISTS idx_stage_auto_move_tenant ON stage_auto_move_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stage_auto_move_pipeline ON stage_auto_move_rules(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_stage_auto_move_from_stage ON stage_auto_move_rules(from_stage_id);
CREATE INDEX IF NOT EXISTS idx_stage_auto_move_active ON stage_auto_move_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_stage_auto_move_trigger ON stage_auto_move_rules(trigger_type);

-- RLS Policies
ALTER TABLE stage_auto_move_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their tenant's auto-move rules" ON stage_auto_move_rules;
CREATE POLICY "Users can view their tenant's auto-move rules" ON stage_auto_move_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS "Admins can manage auto-move rules" ON stage_auto_move_rules;
CREATE POLICY "Admins can manage auto-move rules" ON stage_auto_move_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Example auto-move rules (commented out - add as needed)
-- INSERT INTO stage_auto_move_rules (tenant_id, pipeline_id, from_stage_id, to_stage_id, trigger_type, trigger_config)
-- VALUES (
--     '<tenant_id>',
--     '<pipeline_id>',
--     '<from_stage_id>',
--     '<to_stage_id>',
--     'task_completed',
--     '{"task_title_contains": "Send Proposal"}'::jsonb
-- );

COMMENT ON TABLE stage_auto_move_rules IS 'Rules for automatically moving deals between stages based on triggers';
COMMENT ON COLUMN stage_auto_move_rules.trigger_type IS 'task_completed: When a specific task is completed; time_based: After X days in stage; field_change: When a deal field changes; email_opened: When email is opened';
COMMENT ON COLUMN stage_auto_move_rules.trigger_config IS 'Configuration specific to trigger type (e.g., {task_title_contains, days_in_stage, requires_inactivity})';

