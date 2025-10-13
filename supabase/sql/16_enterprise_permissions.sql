-- ============================================================
-- ENTERPRISE PERMISSION SYSTEM
-- Complete custom roles, granular permissions, and audit trail
-- ============================================================

-- ============================================================
-- 1. CUSTOM ROLES SYSTEM
-- ============================================================

-- Custom Roles Table (replacces hardcoded roles)
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Receptionist", "Treatment Coordinator", "Senior Dentist"
  description TEXT,
  is_admin BOOLEAN DEFAULT false, -- Can access audit trail, manage roles
  is_system_role BOOLEAN DEFAULT false, -- Cannot be deleted (Owner role)
  color TEXT DEFAULT '#6366f1', -- For UI display
  icon TEXT, -- Icon name or emoji
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS custom_roles_tenant_id_idx ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS custom_roles_active_idx ON custom_roles(active);

-- ============================================================
-- 2. GRANULAR PERMISSIONS SYSTEM
-- ============================================================

-- Permission Definitions (Master List of ALL possible permissions)
CREATE TABLE IF NOT EXISTS permission_definitions (
  key TEXT PRIMARY KEY, -- e.g., "deals.view_all", "deals.edit_own", "pipelines.delete"
  category TEXT NOT NULL, -- "deals", "contacts", "pipelines", "tasks", "settings", "analytics"
  subcategory TEXT, -- "viewing", "editing", "deletion", "management"
  label TEXT NOT NULL, -- Human-readable label
  description TEXT, -- What this permission allows
  requires_ownership BOOLEAN DEFAULT false, -- If true, user must own the resource
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS permission_definitions_category_idx ON permission_definitions(category);

-- Role Permissions (Junction table: What can each role do?)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true, -- true = allowed, false = explicitly denied
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

CREATE INDEX IF NOT EXISTS role_permissions_role_id_idx ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS role_permissions_permission_key_idx ON role_permissions(permission_key);

-- ============================================================
-- 3. USER PROFILES SYSTEM
-- ============================================================

-- User Profiles (Assignable templates with preset permissions & settings)
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "New Staff Onboarding", "Manager Standard", "Front Desk"
  description TEXT,
  role_id UUID REFERENCES custom_roles(id), -- Default role for this profile
  settings JSONB DEFAULT '{}', -- Preset preferences, dashboard layout, etc.
  created_by_user_id UUID REFERENCES app_users(id),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS user_profiles_tenant_id_idx ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS user_profiles_role_id_idx ON user_profiles(role_id);

-- ============================================================
-- 4. ENHANCED APP_USERS
-- ============================================================

-- Add profile assignment to users
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES user_profiles(id);
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS custom_role_id UUID REFERENCES custom_roles(id);
ALTER TABLE app_users DROP COLUMN IF EXISTS role; -- Remove old hardcoded role column

CREATE INDEX IF NOT EXISTS app_users_profile_id_idx ON app_users(profile_id);
CREATE INDEX IF NOT EXISTS app_users_custom_role_id_idx ON app_users(custom_role_id);

-- ============================================================
-- 5. COMPREHENSIVE AUDIT TRAIL
-- ============================================================

-- Enhanced Audit Trail (Logs EVERYTHING)
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  
  -- Action details
  action_type TEXT NOT NULL, -- "create", "update", "delete", "assign", "move", etc.
  action_category TEXT NOT NULL, -- "deal", "contact", "pipeline", "user", "setting"
  action_description TEXT, -- Human-readable: "Updated deal title from X to Y"
  
  -- Entity details
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT, -- Snapshot of name at time of action
  
  -- State tracking (before/after)
  before_state JSONB, -- Full state before change
  after_state JSONB, -- Full state after change
  changed_fields TEXT[], -- Array of field names that changed
  
  -- Context
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  
  -- Visibility & Security
  visible_to_admin_only BOOLEAN DEFAULT false,
  sensitive_data BOOLEAN DEFAULT false, -- Contains PII or sensitive info
  
  -- Metadata
  tags TEXT[], -- For filtering/searching
  severity TEXT DEFAULT 'info', -- "info", "warning", "critical"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS audit_trail_tenant_id_idx ON audit_trail(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_user_id_idx ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS audit_trail_entity_idx ON audit_trail(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_trail_action_category_idx ON audit_trail(action_category);
CREATE INDEX IF NOT EXISTS audit_trail_created_at_idx ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_trail_severity_idx ON audit_trail(severity);
CREATE INDEX IF NOT EXISTS audit_trail_admin_only_idx ON audit_trail(visible_to_admin_only) WHERE visible_to_admin_only = true;

-- ============================================================
-- 6. COMPREHENSIVE SETTINGS STORAGE
-- ============================================================

-- Pipeline Settings (Every possible pipeline configuration)
CREATE TABLE IF NOT EXISTS pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- General Settings
  icon TEXT,
  color TEXT,
  visibility TEXT DEFAULT 'everyone', -- "everyone", "admins_only", "specific_roles"
  visible_to_role_ids UUID[], -- Array of role IDs if visibility is "specific_roles"
  
  -- Automation Settings
  auto_assignment_enabled BOOLEAN DEFAULT false,
  auto_assignment_rules JSONB, -- Rules for auto-assigning deals
  
  -- Stage Settings
  enforce_stage_order BOOLEAN DEFAULT false, -- Prevent skipping stages
  stage_time_limits JSONB, -- SLA per stage: { "stage_id": days }
  required_fields_per_stage JSONB, -- { "stage_id": ["field1", "field2"] }
  
  -- Notifications
  notify_on_stage_change BOOLEAN DEFAULT false,
  notify_on_stuck_deal BOOLEAN DEFAULT true,
  stuck_deal_threshold_days INTEGER DEFAULT 14,
  email_templates_per_stage JSONB, -- { "stage_id": "template_id" }
  
  -- Deal Rules
  duplicate_prevention BOOLEAN DEFAULT true,
  value_min_threshold_cents INTEGER,
  value_max_threshold_cents INTEGER,
  require_treatment_tags BOOLEAN DEFAULT false,
  
  -- Integrations
  webhook_url TEXT,
  webhook_events TEXT[], -- Which events trigger webhook
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pipeline_id)
);

CREATE INDEX IF NOT EXISTS pipeline_settings_pipeline_id_idx ON pipeline_settings(pipeline_id);

-- Deal Settings (Global rules for all deals)
CREATE TABLE IF NOT EXISTS deal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Field Settings
  required_fields TEXT[], -- Global required fields
  custom_fields JSONB, -- User-defined custom fields
  field_visibility_by_role JSONB, -- { "role_id": ["field1", "field2"] }
  
  -- Validation Rules
  value_min_cents INTEGER DEFAULT 0,
  value_max_cents INTEGER,
  allow_zero_value BOOLEAN DEFAULT true,
  currency_options TEXT[] DEFAULT ARRAY['GBP', 'USD', 'EUR'],
  default_currency TEXT DEFAULT 'GBP',
  
  -- Behavior Settings
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[] DEFAULT ARRAY['contact_id', 'title'],
  auto_archive_after_days INTEGER,
  auto_close_lost_after_days INTEGER,
  
  -- Tag Settings
  required_treatment_tags BOOLEAN DEFAULT false,
  min_treatment_tags INTEGER DEFAULT 0,
  max_treatment_tags INTEGER,
  allowed_treatment_tags TEXT[], -- Restrict to specific tags
  
  -- Assignment Settings
  allow_unassigned BOOLEAN DEFAULT true,
  auto_assign_new_deals BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'manual', -- "manual", "round_robin", "by_value", "by_source"
  
  -- Lifecycle Settings
  default_stage_id UUID,
  won_stage_ids UUID[], -- Array of stage IDs that count as "won"
  lost_stage_ids UUID[], -- Array of stage IDs that count as "lost"
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS deal_settings_tenant_id_idx ON deal_settings(tenant_id);

-- Contact Settings
CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Field Settings
  required_fields TEXT[] DEFAULT ARRAY['full_name', 'primary_phone'],
  custom_fields JSONB,
  
  -- Validation
  validate_email BOOLEAN DEFAULT true,
  validate_phone BOOLEAN DEFAULT true,
  phone_format TEXT DEFAULT 'UK', -- Format validation
  
  -- Duplicate Detection
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[] DEFAULT ARRAY['primary_email', 'primary_phone'],
  auto_merge_duplicates BOOLEAN DEFAULT false,
  
  -- Privacy & Compliance
  require_consent BOOLEAN DEFAULT false,
  gdpr_enabled BOOLEAN DEFAULT true,
  data_retention_days INTEGER,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS contact_settings_tenant_id_idx ON contact_settings(tenant_id);

-- Task Settings
CREATE TABLE IF NOT EXISTS task_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Default Settings
  default_priority TEXT DEFAULT 'normal',
  default_assignee_strategy TEXT DEFAULT 'manual', -- "manual", "creator", "deal_owner"
  
  -- Auto-creation Rules
  auto_create_on_deal_stage JSONB, -- { "stage_id": { "title": "...", "priority": "..." } }
  auto_create_on_contact_created BOOLEAN DEFAULT false,
  
  -- Reminders
  reminder_before_due_hours INTEGER DEFAULT 24,
  overdue_alert_enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

CREATE INDEX IF NOT EXISTS task_settings_tenant_id_idx ON task_settings(tenant_id);

-- ============================================================
-- 7. INSERT DEFAULT PERMISSION DEFINITIONS
-- ============================================================

INSERT INTO permission_definitions (key, category, subcategory, label, description, requires_ownership, display_order) VALUES
-- DEALS
('deals.view_all', 'deals', 'viewing', 'View All Deals', 'Can view all deals in the practice', false, 1),
('deals.view_team', 'deals', 'viewing', 'View Team Deals', 'Can view deals owned by team members', false, 2),
('deals.view_own', 'deals', 'viewing', 'View Own Deals', 'Can view only their own deals', true, 3),
('deals.create', 'deals', 'creation', 'Create Deals', 'Can create new deals', false, 10),
('deals.edit_all', 'deals', 'editing', 'Edit All Deals', 'Can edit any deal', false, 20),
('deals.edit_own', 'deals', 'editing', 'Edit Own Deals', 'Can edit only their own deals', true, 21),
('deals.edit_title', 'deals', 'editing', 'Edit Deal Title', 'Can change deal titles', false, 22),
('deals.edit_value', 'deals', 'editing', 'Edit Deal Value', 'Can change deal values', false, 23),
('deals.edit_stage', 'deals', 'editing', 'Move Deal Stages', 'Can move deals between stages', false, 24),
('deals.edit_tags', 'deals', 'editing', 'Edit Treatment Tags', 'Can add/remove treatment tags', false, 25),
('deals.delete_all', 'deals', 'deletion', 'Delete All Deals', 'Can delete any deal', false, 30),
('deals.delete_own', 'deals', 'deletion', 'Delete Own Deals', 'Can delete only their own deals', true, 31),
('deals.assign_to_others', 'deals', 'assignment', 'Assign to Others', 'Can assign deals to other users', false, 40),
('deals.assign_to_self', 'deals', 'assignment', 'Assign to Self', 'Can claim unassigned deals', false, 41),
('deals.unassign', 'deals', 'assignment', 'Unassign Deals', 'Can remove assignment from deals', false, 42),
('deals.export', 'deals', 'data', 'Export Deals', 'Can export deal data', false, 50),
('deals.import', 'deals', 'data', 'Import Deals', 'Can import deal data', false, 51),
('deals.bulk_edit', 'deals', 'advanced', 'Bulk Edit Deals', 'Can edit multiple deals at once', false, 60),
('deals.bulk_delete', 'deals', 'advanced', 'Bulk Delete Deals', 'Can delete multiple deals at once', false, 61),

-- CONTACTS
('contacts.view_all', 'contacts', 'viewing', 'View All Contacts', 'Can view all contacts', false, 100),
('contacts.create', 'contacts', 'creation', 'Create Contacts', 'Can create new contacts', false, 110),
('contacts.edit_all', 'contacts', 'editing', 'Edit All Contacts', 'Can edit any contact', false, 120),
('contacts.edit_personal_info', 'contacts', 'editing', 'Edit Personal Info', 'Can edit contact personal details', false, 121),
('contacts.edit_medical_info', 'contacts', 'editing', 'Edit Medical Info', 'Can edit medical/dental history', false, 122),
('contacts.delete', 'contacts', 'deletion', 'Delete Contacts', 'Can delete contacts', false, 130),
('contacts.merge', 'contacts', 'advanced', 'Merge Duplicates', 'Can merge duplicate contacts', false, 140),
('contacts.export', 'contacts', 'data', 'Export Contacts', 'Can export contact data', false, 150),
('contacts.import', 'contacts', 'data', 'Import Contacts', 'Can import contact data', false, 151),

-- PIPELINES
('pipelines.view', 'pipelines', 'viewing', 'View Pipelines', 'Can view pipeline boards', false, 200),
('pipelines.create', 'pipelines', 'creation', 'Create Pipelines', 'Can create new pipelines', false, 210),
('pipelines.edit', 'pipelines', 'editing', 'Edit Pipelines', 'Can edit pipeline details', false, 220),
('pipelines.edit_stages', 'pipelines', 'editing', 'Manage Stages', 'Can add/edit/remove stages', false, 221),
('pipelines.reorder_stages', 'pipelines', 'editing', 'Reorder Stages', 'Can change stage order', false, 222),
('pipelines.delete', 'pipelines', 'deletion', 'Delete Pipelines', 'Can delete pipelines', false, 230),
('pipelines.configure_automation', 'pipelines', 'advanced', 'Configure Automation', 'Can set up pipeline automation rules', false, 240),
('pipelines.set_default', 'pipelines', 'management', 'Set Default Pipeline', 'Can mark pipeline as default', false, 250),

-- TASKS
('tasks.view_all', 'tasks', 'viewing', 'View All Tasks', 'Can view all tasks', false, 300),
('tasks.view_assigned', 'tasks', 'viewing', 'View Assigned Tasks', 'Can view only assigned tasks', true, 301),
('tasks.create', 'tasks', 'creation', 'Create Tasks', 'Can create new tasks', false, 310),
('tasks.edit_all', 'tasks', 'editing', 'Edit All Tasks', 'Can edit any task', false, 320),
('tasks.edit_own', 'tasks', 'editing', 'Edit Own Tasks', 'Can edit only assigned tasks', true, 321),
('tasks.delete_all', 'tasks', 'deletion', 'Delete All Tasks', 'Can delete any task', false, 330),
('tasks.delete_own', 'tasks', 'deletion', 'Delete Own Tasks', 'Can delete only assigned tasks', true, 331),
('tasks.assign_to_others', 'tasks', 'assignment', 'Assign to Others', 'Can assign tasks to other users', false, 340),
('tasks.complete', 'tasks', 'actions', 'Complete Tasks', 'Can mark tasks as complete', false, 350),

-- ACTIVITIES & COMMUNICATIONS
('activities.view_all', 'activities', 'viewing', 'View All Activities', 'Can view all communications', false, 400),
('activities.view_assigned_deals', 'activities', 'viewing', 'View Deal Activities', 'Can view activities for assigned deals', true, 401),
('activities.create', 'activities', 'creation', 'Log Activities', 'Can create activity records', false, 410),
('activities.edit', 'activities', 'editing', 'Edit Activities', 'Can edit activity records', false, 420),
('activities.delete', 'activities', 'deletion', 'Delete Activities', 'Can delete activity records', false, 430),

-- USERS & TEAM
('users.view_all', 'users', 'viewing', 'View All Users', 'Can see all team members', false, 500),
('users.invite', 'users', 'management', 'Invite Users', 'Can send team invitations', false, 510),
('users.edit_profile', 'users', 'management', 'Edit User Profiles', 'Can edit other users profiles', false, 520),
('users.edit_own_profile', 'users', 'management', 'Edit Own Profile', 'Can edit their own profile', true, 521),
('users.assign_roles', 'users', 'management', 'Assign Roles', 'Can change user roles', false, 530),
('users.deactivate', 'users', 'management', 'Deactivate Users', 'Can deactivate team members', false, 540),
('users.delete', 'users', 'management', 'Delete Users', 'Can permanently delete users', false, 550),

-- ROLES & PERMISSIONS
('roles.view', 'roles', 'viewing', 'View Roles', 'Can see custom roles', false, 600),
('roles.create', 'roles', 'management', 'Create Roles', 'Can create custom roles', false, 610),
('roles.edit', 'roles', 'management', 'Edit Roles', 'Can edit role details', false, 620),
('roles.edit_permissions', 'roles', 'management', 'Edit Permissions', 'Can change role permissions', false, 621),
('roles.delete', 'roles', 'management', 'Delete Roles', 'Can delete custom roles', false, 630),

-- SETTINGS
('settings.view_all', 'settings', 'viewing', 'View All Settings', 'Can access settings page', false, 700),
('settings.edit_pipeline', 'settings', 'editing', 'Edit Pipeline Settings', 'Can configure pipeline settings', false, 710),
('settings.edit_deal', 'settings', 'editing', 'Edit Deal Settings', 'Can configure deal settings', false, 711),
('settings.edit_contact', 'settings', 'editing', 'Edit Contact Settings', 'Can configure contact settings', false, 712),
('settings.edit_task', 'settings', 'editing', 'Edit Task Settings', 'Can configure task settings', false, 713),
('settings.edit_integrations', 'settings', 'editing', 'Edit Integrations', 'Can configure external integrations', false, 720),
('settings.edit_notifications', 'settings', 'editing', 'Edit Notifications', 'Can configure notification settings', false, 730),

-- ANALYTICS & REPORTING
('analytics.view_own', 'analytics', 'viewing', 'View Own Analytics', 'Can view their own performance', true, 800),
('analytics.view_team', 'analytics', 'viewing', 'View Team Analytics', 'Can view team performance', false, 810),
('analytics.view_all', 'analytics', 'viewing', 'View All Analytics', 'Can view all practice analytics', false, 820),
('analytics.export', 'analytics', 'data', 'Export Reports', 'Can export analytics reports', false, 830),

-- AUDIT & SECURITY
('audit.view', 'audit', 'viewing', 'View Audit Trail', 'Can view audit logs', false, 900),
('audit.view_sensitive', 'audit', 'viewing', 'View Sensitive Audit Data', 'Can view admin-only audit logs', false, 910),
('audit.export', 'audit', 'data', 'Export Audit Logs', 'Can export audit trail', false, 920),
('audit.delete', 'audit', 'management', 'Delete Audit Records', 'Can delete audit logs (dangerous!)', false, 930)

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 8. CREATE DEFAULT ROLES WITH PERMISSIONS
-- ============================================================

-- Insert default Owner role (system role)
INSERT INTO custom_roles (name, description, is_admin, is_system_role, color, display_order, tenant_id)
SELECT 
  'Practice Owner',
  'Full access to everything. Cannot be deleted.',
  true,
  true,
  '#9333ea',
  1,
  id
FROM tenants
ON CONFLICT (tenant_id, name) DO NOTHING;

-- Grant ALL permissions to Owner role
INSERT INTO role_permissions (role_id, permission_key, granted)
SELECT 
  cr.id,
  pd.key,
  true
FROM custom_roles cr
CROSS JOIN permission_definitions pd
WHERE cr.name = 'Practice Owner' AND cr.is_system_role = true
ON CONFLICT (role_id, permission_key) DO NOTHING;

-- ============================================================
-- COMMENTS & DOCUMENTATION
-- ============================================================

COMMENT ON TABLE custom_roles IS 'User-defined roles with custom names and permissions';
COMMENT ON TABLE permission_definitions IS 'Master list of all possible permissions in the system';
COMMENT ON TABLE role_permissions IS 'Junction table defining which permissions each role has';
COMMENT ON TABLE user_profiles IS 'Assignable user profile templates with preset settings';
COMMENT ON TABLE audit_trail IS 'Comprehensive audit log tracking every action with before/after states';
COMMENT ON TABLE pipeline_settings IS 'Complete configuration for each pipeline including automation';
COMMENT ON TABLE deal_settings IS 'Global deal management rules and validation';
COMMENT ON TABLE contact_settings IS 'Global contact management rules and validation';
COMMENT ON TABLE task_settings IS 'Global task management rules and automation';


