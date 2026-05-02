-- =====================================================
-- EXTENDED AUTOMATION TRIGGERS
-- Migration: Add new trigger types for Deal/Pipeline/Task automations
-- =====================================================

-- Update marketing_journeys table to support new trigger types
-- Note: This extends the existing CHECK constraint for entry_trigger_type

-- First, drop the old constraint if it exists
ALTER TABLE marketing_journeys 
DROP CONSTRAINT IF EXISTS marketing_journeys_entry_trigger_type_check;

-- Add new constraint with expanded trigger types
ALTER TABLE marketing_journeys
DROP CONSTRAINT IF EXISTS marketing_journeys_entry_trigger_type_check;
ALTER TABLE marketing_journeys
ADD CONSTRAINT marketing_journeys_entry_trigger_type_check CHECK (entry_trigger_type IN (
    -- EXISTING MARKETING TRIGGERS
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
    'manual',
    'email_opened',
    'unsubscribed',
    
    -- NEW DEAL TRIGGERS
    'deal_created',
    'deal_updated',
    'deal_stage_change',
    'deal_won',
    'deal_lost',
    'deal_aging',
    'deal_value_threshold',
    'deal_assigned',
    
    -- NEW TASK TRIGGERS
    'task_created',
    'task_updated',
    'task_completed',
    'task_assigned',
    'task_overdue',
    'task_due_soon',
    
    -- NEW CONTACT TRIGGERS
    'contact_updated',
    'contact_assigned',
    'contact_inactive',
    'contact_high_value',
    'contact_milestone',
    
    -- NEW PIPELINE TRIGGERS
    'pipeline_capacity_reached',
    'pipeline_velocity_slow',
    'pipeline_bottleneck',
    'stage_sla_breached',
    
    -- NEW INTEGRATION TRIGGERS
    'integration_token_expiring',
    'integration_token_expired',
    'integration_sync_failed',
    'integration_rate_limit_hit',
    
    -- NEW ANALYTICS TRIGGERS
    'kpi_breach',
    'goal_achieved',
    'anomaly_detected',
    
    -- NEW CALL TRIGGERS
    'call_missed',
    'voicemail_received',
    'call_completed',
    
    -- NEW AI TRIGGERS
    'ai_suggestion'
));

-- =====================================================
-- NEW TABLE: Automation Triggers Metadata
-- Stores metadata about available trigger types for UI
-- =====================================================

CREATE TABLE IF NOT EXISTS automation_trigger_metadata (
    trigger_type TEXT PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('deal', 'task', 'contact', 'pipeline', 'marketing', 'integration', 'analytics', 'call', 'ai')),
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT, -- Icon name for UI
    required_fields JSONB, -- Required configuration fields
    optional_fields JSONB, -- Optional configuration fields
    example_config JSONB, -- Example trigger configuration
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- SEED: Populate Trigger Metadata
-- =====================================================

INSERT INTO automation_trigger_metadata (trigger_type, category, display_name, description, icon, required_fields, optional_fields, example_config) VALUES

-- DEAL TRIGGERS
('deal_created', 'deal', 'Deal Created', 'Triggers when a new deal is created', 'DollarSign', '[]'::jsonb, '["pipeline_id", "min_value", "source"]'::jsonb, '{"pipeline_id": "abc123", "min_value": 50000}'::jsonb),
('deal_won', 'deal', 'Deal Won', 'Triggers when a deal is marked as won', 'CheckCircle', '[]'::jsonb, '["min_value"]'::jsonb, '{"min_value": 10000}'::jsonb),
('deal_lost', 'deal', 'Deal Lost', 'Triggers when a deal is marked as lost', 'XCircle', '[]'::jsonb, '["lost_reason"]'::jsonb, '{"lost_reason": "price"}'::jsonb),
('deal_aging', 'deal', 'Deal Aging', 'Triggers when a deal has been inactive for X days', 'Clock', '["days"]'::jsonb, '[]'::jsonb, '{"days": 7}'::jsonb),
('deal_stage_change', 'deal', 'Deal Stage Changed', 'Triggers when a deal moves to a specific stage', 'ArrowRight', '[]'::jsonb, '["to_stage_id", "from_stage_id"]'::jsonb, '{"to_stage_id": "abc123"}'::jsonb),
('deal_value_threshold', 'deal', 'Deal Value Threshold', 'Triggers when deal value crosses a threshold', 'TrendingUp', '["threshold"]'::jsonb, '[]'::jsonb, '{"threshold": 100000}'::jsonb),

-- TASK TRIGGERS
('task_created', 'task', 'Task Created', 'Triggers when a new task is created', 'CheckSquare', '[]'::jsonb, '["priority", "task_type"]'::jsonb, '{"priority": "high"}'::jsonb),
('task_completed', 'task', 'Task Completed', 'Triggers when a task is completed', 'Check', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
('task_overdue', 'task', 'Task Overdue', 'Triggers when a task becomes overdue', 'AlertCircle', '[]'::jsonb, '["hours_overdue"]'::jsonb, '{"hours_overdue": 24}'::jsonb),
('task_assigned', 'task', 'Task Assigned', 'Triggers when a task is assigned to someone', 'UserPlus', '[]'::jsonb, '["to_user_id"]'::jsonb, '{"to_user_id": "user123"}'::jsonb),

-- CONTACT TRIGGERS
('contact_created', 'contact', 'Contact Created', 'Triggers when a new contact is created', 'User', '[]'::jsonb, '["source"]'::jsonb, '{"source": "website"}'::jsonb),
('contact_inactive', 'contact', 'Contact Inactive', 'Triggers when a contact has been inactive for X days', 'UserMinus', '["days"]'::jsonb, '[]'::jsonb, '{"days": 30}'::jsonb),
('contact_high_value', 'contact', 'Contact High Value', 'Triggers when a contact becomes high-value', 'Star', '["min_total_value"]'::jsonb, '[]'::jsonb, '{"min_total_value": 50000}'::jsonb),

-- PIPELINE TRIGGERS
('pipeline_capacity_reached', 'pipeline', 'Pipeline Capacity Reached', 'Triggers when pipeline reaches capacity', 'AlertTriangle', '["pipeline_id", "threshold_percent"]'::jsonb, '[]'::jsonb, '{"pipeline_id": "abc123", "threshold_percent": 80}'::jsonb),
('stage_sla_breached', 'pipeline', 'Stage SLA Breached', 'Triggers when a deal breaches stage SLA', 'Clock', '["stage_id", "max_days"]'::jsonb, '[]'::jsonb, '{"stage_id": "abc123", "max_days": 5}'::jsonb),

-- MARKETING TRIGGERS
('form_submitted', 'marketing', 'Form Submitted', 'Triggers when a form is submitted', 'FileText', '[]'::jsonb, '["form_id"]'::jsonb, '{"form_id": "form123"}'::jsonb),
('email_opened', 'marketing', 'Email Opened', 'Triggers when a marketing email is opened', 'Mail', '[]'::jsonb, '["campaign_id"]'::jsonb, '{"campaign_id": "camp123"}'::jsonb),
('link_clicked', 'marketing', 'Link Clicked', 'Triggers when a link in an email is clicked', 'MousePointer', '[]'::jsonb, '["url_contains"]'::jsonb, '{"url_contains": "pricing"}'::jsonb),

-- INTEGRATION TRIGGERS
('integration_token_expiring', 'integration', 'Token Expiring', 'Triggers when an integration token is about to expire', 'Key', '["integration_type", "hours_before"]'::jsonb, '[]'::jsonb, '{"integration_type": "google", "hours_before": 24}'::jsonb),
('integration_sync_failed', 'integration', 'Sync Failed', 'Triggers when an integration sync fails', 'AlertOctagon', '["integration_type"]'::jsonb, '[]'::jsonb, '{"integration_type": "pms"}'::jsonb),

-- ANALYTICS TRIGGERS
('kpi_breach', 'analytics', 'KPI Breach', 'Triggers when a KPI breaches threshold', 'BarChart', '["kpi_name", "threshold"]'::jsonb, '["breach_type"]'::jsonb, '{"kpi_name": "conversion_rate", "threshold": 20, "breach_type": "below"}'::jsonb),
('goal_achieved', 'analytics', 'Goal Achieved', 'Triggers when a goal is achieved', 'Target', '["goal_id"]'::jsonb, '[]'::jsonb, '{"goal_id": "goal123"}'::jsonb),

-- CALL TRIGGERS
('call_missed', 'call', 'Missed Call', 'Triggers when a call is missed', 'PhoneMissed', '[]'::jsonb, '[]'::jsonb, '{}'::jsonb),
('voicemail_received', 'call', 'Voicemail Received', 'Triggers when a voicemail is received', 'Voicemail', '[]'::jsonb, '["min_duration"]'::jsonb, '{"min_duration": 5}'::jsonb)

ON CONFLICT (trigger_type) DO NOTHING;

-- =====================================================
-- HELPER FUNCTION: Get Available Triggers by Category
-- =====================================================

CREATE OR REPLACE FUNCTION get_automation_triggers_by_category(p_category TEXT DEFAULT NULL)
RETURNS TABLE (
    trigger_type TEXT,
    category TEXT,
    display_name TEXT,
    description TEXT,
    icon TEXT,
    required_fields JSONB,
    optional_fields JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.trigger_type,
        t.category,
        t.display_name,
        t.description,
        t.icon,
        t.required_fields,
        t.optional_fields
    FROM automation_trigger_metadata t
    WHERE (p_category IS NULL OR t.category = p_category)
    AND t.is_active = true
    ORDER BY t.category, t.display_name;
END;
$$;

COMMENT ON TABLE automation_trigger_metadata IS 'Metadata about available automation trigger types for UI/UX';
COMMENT ON FUNCTION get_automation_triggers_by_category IS 'Retrieve available automation triggers, optionally filtered by category';

