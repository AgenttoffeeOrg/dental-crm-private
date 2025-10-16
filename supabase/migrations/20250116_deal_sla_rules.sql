-- =====================================================
-- DEAL SLA RULES
-- Migration: Deal SLA monitoring and enforcement
-- =====================================================

CREATE TABLE IF NOT EXISTS deal_sla_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Scope (optional - if null, applies to all)
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    stage_id UUID REFERENCES pipeline_stages(id) ON DELETE CASCADE,
    
    -- SLA Thresholds
    max_days_inactive INTEGER NOT NULL DEFAULT 7,
    max_days_in_stage INTEGER NOT NULL DEFAULT 14,
    
    -- Actions on breach
    escalation_enabled BOOLEAN DEFAULT true,
    notify_owner BOOLEAN DEFAULT true,
    notify_manager BOOLEAN DEFAULT true,
    auto_create_task BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deal_sla_rules_tenant ON deal_sla_rules(tenant_id);
CREATE INDEX idx_deal_sla_rules_pipeline ON deal_sla_rules(pipeline_id) WHERE pipeline_id IS NOT NULL;
CREATE INDEX idx_deal_sla_rules_stage ON deal_sla_rules(stage_id) WHERE stage_id IS NOT NULL;
CREATE INDEX idx_deal_sla_rules_active ON deal_sla_rules(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE deal_sla_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's SLA rules"
    ON deal_sla_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage SLA rules"
    ON deal_sla_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Default SLA rules for new tenants
INSERT INTO deal_sla_rules (tenant_id, max_days_inactive, max_days_in_stage, is_active)
SELECT id, 7, 14, true
FROM tenants
WHERE NOT EXISTS (
    SELECT 1 FROM deal_sla_rules WHERE tenant_id = tenants.id
)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE deal_sla_rules IS 'SLA rules for deal inactivity and stage duration monitoring';

