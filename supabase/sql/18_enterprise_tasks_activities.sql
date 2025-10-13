-- ============================================================================
-- ENTERPRISE TASKS & ACTIVITIES ENHANCEMENT
-- ============================================================================
-- This migration ADDS features to existing tables (non-breaking)
-- Your current data stays 100% safe!
-- ============================================================================

-- ============================================================================
-- PART 1: ENHANCE TASKS TABLE
-- ============================================================================

-- Add new task columns (all optional, won't break existing data)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_type TEXT DEFAULT 'todo' 
  CHECK (task_type IN ('call', 'email', 'todo', 'meeting', 'follow_up'));

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reminder_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT FALSE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurring_rule_id UUID;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_duration_minutes INTEGER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_duration_minutes INTEGER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add index for parent_task_id (for subtasks)
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);

-- Add index for recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(is_recurring, recurring_rule_id) WHERE is_recurring = TRUE;

-- Add index for reminders
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_at ON tasks(reminder_at) WHERE reminder_at IS NOT NULL;


-- ============================================================================
-- PART 2: ENHANCE ACTIVITIES TABLE
-- ============================================================================

-- First, drop the old constraint (if it exists)
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;

-- Add new activity types (sms, meeting)
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
  CHECK (type IN ('call', 'email', 'whatsapp', 'note', 'sms', 'meeting'));

-- Add outcome column for calls
ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome TEXT 
  CHECK (outcome IN ('connected', 'voicemail', 'no_answer', 'busy', 'wrong_number', 'completed', 'cancelled'));

-- Add duration for calls/meetings
ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;

-- Add attendees for meetings (JSONB array)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS attendees JSONB DEFAULT '[]';

-- Add mentions (array of user IDs)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS mentions UUID[];

-- Add parent activity ID (for email threads, reply chains)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_activity_id UUID REFERENCES activities(id) ON DELETE SET NULL;

-- Add edit tracking
ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE activities ADD COLUMN IF NOT EXISTS edited_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

-- Add rich content (for formatted notes, email HTML)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS rich_content TEXT;

-- Add metadata (flexible JSONB for future fields)
ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_activities_outcome ON activities(outcome) WHERE outcome IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_parent_id ON activities(parent_activity_id) WHERE parent_activity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_activities_mentions ON activities USING GIN(mentions);


-- ============================================================================
-- PART 3: NEW TABLES FOR ADVANCED FEATURES
-- ============================================================================

-- Task Templates (pre-configured task blueprints)
CREATE TABLE IF NOT EXISTS task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL CHECK (task_type IN ('call', 'email', 'todo', 'meeting', 'follow_up')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  estimated_duration_minutes INTEGER,
  default_notes TEXT,
  trigger_stage_id UUID, -- Optional: auto-create when deal enters this stage
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_templates_tenant ON task_templates(tenant_id);
CREATE INDEX idx_task_templates_trigger_stage ON task_templates(trigger_stage_id) WHERE trigger_stage_id IS NOT NULL;


-- Recurring Task Rules
CREATE TABLE IF NOT EXISTS recurring_task_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
  interval INTEGER DEFAULT 1, -- e.g., every 2 weeks = weekly + interval 2
  days_of_week INTEGER[], -- 0=Sunday, 6=Saturday
  day_of_month INTEGER, -- 1-31
  end_date DATE,
  max_occurrences INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);


-- Task Dependencies (Task B depends on Task A)
CREATE TABLE IF NOT EXISTS task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The task that's blocked
  depends_on_task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE, -- The task it depends on
  dependency_type TEXT DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE INDEX idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);


-- Association Links (many-to-many for tasks/activities to deals/contacts)
CREATE TABLE IF NOT EXISTS association_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('task', 'activity')),
  source_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('deal', 'contact', 'company')),
  target_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_type, source_id, target_type, target_id)
);

CREATE INDEX idx_association_links_source ON association_links(source_type, source_id);
CREATE INDEX idx_association_links_target ON association_links(target_type, target_id);


-- Activity Templates (call scripts, email templates, meeting agendas)
CREATE TABLE IF NOT EXISTS activity_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'note', 'meeting')),
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- List of available variables like {{contact_name}}, {{deal_value}}
  category TEXT, -- e.g., "Sales", "Support", "Follow-up"
  is_active BOOLEAN DEFAULT TRUE,
  created_by_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_templates_tenant ON activity_templates(tenant_id);
CREATE INDEX idx_activity_templates_type ON activity_templates(activity_type);


-- Task Comments (for collaboration)
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions UUID[], -- Array of user IDs mentioned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_task_comments_task ON task_comments(task_id);
CREATE INDEX idx_task_comments_mentions ON task_comments USING GIN(mentions);


-- ============================================================================
-- PART 4: UPDATE TYPE DEFINITIONS
-- ============================================================================

-- Add more AI artifact kinds
ALTER TABLE ai_artifacts DROP CONSTRAINT IF EXISTS ai_artifacts_kind_check;
ALTER TABLE ai_artifacts ADD CONSTRAINT ai_artifacts_kind_check 
  CHECK (kind IN ('transcript', 'summary', 'intent', 'treatments', 'actions', 'conversation_analysis', 'sentiment', 'urgency', 'likelihood_score'));


-- ============================================================================
-- PART 5: USEFUL VIEWS FOR ANALYTICS
-- ============================================================================

-- View: Tasks with associations
CREATE OR REPLACE VIEW tasks_with_associations AS
SELECT 
  t.*,
  c.full_name as contact_name,
  d.title as deal_title,
  u.full_name as assignee_name,
  COALESCE(
    (SELECT COUNT(*) FROM tasks WHERE parent_task_id = t.id), 0
  ) as subtask_count,
  COALESCE(
    (SELECT COUNT(*) FROM task_comments WHERE task_id = t.id), 0
  ) as comment_count
FROM tasks t
LEFT JOIN contacts c ON t.contact_id = c.id
LEFT JOIN deals d ON t.deal_id = d.id
LEFT JOIN app_users u ON t.assignee_user_id = u.id;


-- View: Activities with associations
CREATE OR REPLACE VIEW activities_with_associations AS
SELECT 
  a.*,
  c.full_name as contact_name,
  d.title as deal_title,
  u.full_name as agent_name,
  COALESCE(
    (SELECT COUNT(*) FROM activity_files af WHERE af.activity_id = a.id), 0
  ) as file_count,
  COALESCE(
    (SELECT COUNT(*) FROM ai_artifacts ai WHERE ai.activity_id = a.id), 0
  ) as artifact_count
FROM activities a
LEFT JOIN contacts c ON a.contact_id = c.id
LEFT JOIN deals d ON a.deal_id = d.id
LEFT JOIN app_users u ON a.agent_user_id = u.id;


-- ============================================================================
-- DONE! 
-- ============================================================================
-- ✅ All existing data preserved
-- ✅ New columns added (all optional)
-- ✅ New tables created for advanced features
-- ✅ Indexes added for performance
-- ✅ Views created for easy querying
-- ============================================================================


