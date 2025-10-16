-- =====================================================
-- TASK AUTOMATION RULES
-- Migration: Task escalation, dependencies, and auto-management
-- =====================================================

-- Task Escalation Rules
CREATE TABLE IF NOT EXISTS task_escalation_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Rule criteria
    priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    overdue_hours INTEGER NOT NULL DEFAULT 24,
    
    -- Escalation actions
    escalate_to_role TEXT NOT NULL CHECK (escalate_to_role IN ('manager', 'owner', 'director')),
    notify_assignee BOOLEAN DEFAULT true,
    notify_escalation_target BOOLEAN DEFAULT true,
    auto_increase_priority BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_escalation_tenant ON task_escalation_rules(tenant_id);
CREATE INDEX idx_task_escalation_priority ON task_escalation_rules(priority);
CREATE INDEX idx_task_escalation_active ON task_escalation_rules(is_active) WHERE is_active = true;

-- Task Dependencies (Sequential task chains)
CREATE TABLE IF NOT EXISTS task_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Parent-child relationship
    parent_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_task_template JSONB NOT NULL, -- Template for child task
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_dependencies_tenant ON task_dependencies(tenant_id);
CREATE INDEX idx_task_dependencies_parent ON task_dependencies(parent_task_id);

-- Task Reminder Settings (per tenant)
CREATE TABLE IF NOT EXISTS task_reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Reminder windows
    remind_1h_before BOOLEAN DEFAULT true,
    remind_4h_before BOOLEAN DEFAULT true,
    remind_24h_before BOOLEAN DEFAULT true,
    
    -- Channels
    email_enabled BOOLEAN DEFAULT true,
    sms_enabled BOOLEAN DEFAULT false,
    push_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Business hours
    respect_business_hours BOOLEAN DEFAULT true,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(tenant_id)
);

-- RLS Policies
ALTER TABLE task_escalation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's task escalation rules"
    ON task_escalation_rules FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage task escalation rules"
    ON task_escalation_rules FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Users can view their tenant's task dependencies"
    ON task_dependencies FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can manage task dependencies"
    ON task_dependencies FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Users can view their tenant's reminder settings"
    ON task_reminder_settings FOR SELECT
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins can manage reminder settings"
    ON task_reminder_settings FOR ALL
    USING (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ))
    WITH CHECK (tenant_id IN (
        SELECT tenant_id FROM app_users 
        WHERE id = auth.uid() AND role IN ('owner', 'admin')
    ));

-- Default escalation rules
INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'urgent', 2, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'urgent')
ON CONFLICT DO NOTHING;

INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'high', 4, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'high')
ON CONFLICT DO NOTHING;

INSERT INTO task_escalation_rules (tenant_id, priority, overdue_hours, escalate_to_role)
SELECT id, 'normal', 24, 'manager' FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_escalation_rules WHERE tenant_id = tenants.id AND priority = 'normal')
ON CONFLICT DO NOTHING;

-- Default reminder settings for all tenants
INSERT INTO task_reminder_settings (tenant_id)
SELECT id FROM tenants
WHERE NOT EXISTS (SELECT 1 FROM task_reminder_settings WHERE tenant_id = tenants.id)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE task_escalation_rules IS 'Rules for escalating overdue tasks to managers';
COMMENT ON TABLE task_dependencies IS 'Sequential task chains - create task B when task A completes';
COMMENT ON TABLE task_reminder_settings IS 'Per-tenant settings for task reminder notifications';

