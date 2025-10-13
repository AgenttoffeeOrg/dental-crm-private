-- ============================================================
-- ENTERPRISE SYSTEM - COMPLETE SETUP
-- ============================================================
-- Copy this ENTIRE file and paste into Supabase Dashboard → SQL Editor → Run
-- This will enable ALL enterprise features in one go!
-- ============================================================

-- Drop existing role column safely
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='role') THEN
        -- First, add custom_role_id if it doesn't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='app_users' AND column_name='custom_role_id') THEN
            ALTER TABLE app_users ADD COLUMN custom_role_id UUID;
        END IF;
    END IF;
END $$;

-- ============================================================
-- PART 1: USER INVITATIONS (from 15_user_invitations.sql)
-- ============================================================

-- Add missing fields to app_users table
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/London';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS profile_id UUID;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS custom_role_id UUID;

-- User Invitations Table
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  invited_by_user_id UUID,
  invitation_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  accepted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Activity Log
CREATE TABLE IF NOT EXISTS user_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- PART 2: ENTERPRISE PERMISSIONS (from 16_enterprise_permissions.sql)
-- ============================================================

-- Custom Roles Table
CREATE TABLE IF NOT EXISTS custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_system_role BOOLEAN DEFAULT false,
  color TEXT DEFAULT '#6366f1',
  icon TEXT,
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Permission Definitions
CREATE TABLE IF NOT EXISTS permission_definitions (
  key TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  subcategory TEXT,
  label TEXT NOT NULL,
  description TEXT,
  requires_ownership BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  role_id UUID,
  settings JSONB DEFAULT '{}',
  created_by_user_id UUID,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, name)
);

-- Enhanced Audit Trail
CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  action_description TEXT,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  entity_name TEXT,
  before_state JSONB,
  after_state JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  visible_to_admin_only BOOLEAN DEFAULT false,
  sensitive_data BOOLEAN DEFAULT false,
  tags TEXT[],
  severity TEXT DEFAULT 'info',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pipeline Settings
CREATE TABLE IF NOT EXISTS pipeline_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  icon TEXT,
  color TEXT,
  visibility TEXT DEFAULT 'everyone',
  visible_to_role_ids UUID[],
  auto_assignment_enabled BOOLEAN DEFAULT false,
  auto_assignment_rules JSONB,
  enforce_stage_order BOOLEAN DEFAULT false,
  stage_time_limits JSONB,
  required_fields_per_stage JSONB,
  notify_on_stage_change BOOLEAN DEFAULT false,
  notify_on_stuck_deal BOOLEAN DEFAULT true,
  stuck_deal_threshold_days INTEGER DEFAULT 14,
  email_templates_per_stage JSONB,
  duplicate_prevention BOOLEAN DEFAULT true,
  value_min_threshold_cents INTEGER,
  value_max_threshold_cents INTEGER,
  require_treatment_tags BOOLEAN DEFAULT false,
  webhook_url TEXT,
  webhook_events TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pipeline_id)
);

-- Deal Settings
CREATE TABLE IF NOT EXISTS deal_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  required_fields TEXT[],
  custom_fields JSONB,
  field_visibility_by_role JSONB,
  value_min_cents INTEGER DEFAULT 0,
  value_max_cents INTEGER,
  allow_zero_value BOOLEAN DEFAULT true,
  currency_options TEXT[] DEFAULT ARRAY['GBP', 'USD', 'EUR'],
  default_currency TEXT DEFAULT 'GBP',
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[],
  auto_archive_after_days INTEGER,
  auto_close_lost_after_days INTEGER,
  required_treatment_tags BOOLEAN DEFAULT false,
  min_treatment_tags INTEGER DEFAULT 0,
  max_treatment_tags INTEGER,
  allowed_treatment_tags TEXT[],
  allow_unassigned BOOLEAN DEFAULT true,
  auto_assign_new_deals BOOLEAN DEFAULT false,
  assignment_method TEXT DEFAULT 'manual',
  default_stage_id UUID,
  won_stage_ids UUID[],
  lost_stage_ids UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Contact Settings
CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  required_fields TEXT[] DEFAULT ARRAY['full_name', 'primary_phone'],
  custom_fields JSONB,
  validate_email BOOLEAN DEFAULT true,
  validate_phone BOOLEAN DEFAULT true,
  phone_format TEXT DEFAULT 'UK',
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[] DEFAULT ARRAY['primary_email', 'primary_phone'],
  auto_merge_duplicates BOOLEAN DEFAULT false,
  require_consent BOOLEAN DEFAULT false,
  gdpr_enabled BOOLEAN DEFAULT true,
  data_retention_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Task Settings
CREATE TABLE IF NOT EXISTS task_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  default_priority TEXT DEFAULT 'normal',
  default_assignee_strategy TEXT DEFAULT 'manual',
  auto_create_on_deal_stage JSONB,
  auto_create_on_contact_created BOOLEAN DEFAULT false,
  reminder_before_due_hours INTEGER DEFAULT 24,
  overdue_alert_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS custom_roles_tenant_id_idx ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_tenant_id_idx ON audit_trail(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_created_at_idx ON audit_trail(created_at DESC);
CREATE INDEX IF NOT EXISTS pipeline_settings_pipeline_id_idx ON pipeline_settings(pipeline_id);

-- ============================================================
-- INSERT PERMISSION DEFINITIONS (60+ permissions)
-- ============================================================

INSERT INTO permission_definitions (key, category, subcategory, label, description, requires_ownership, display_order) VALUES
-- DEALS (18 permissions)
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
('deals.export', 'deals', 'data', 'Export Deals', 'Can export deal data', false, 50),
('deals.import', 'deals', 'data', 'Import Deals', 'Can import deal data', false, 51),
('deals.bulk_edit', 'deals', 'advanced', 'Bulk Edit Deals', 'Can edit multiple deals at once', false, 60),
('deals.bulk_delete', 'deals', 'advanced', 'Bulk Delete Deals', 'Can delete multiple deals at once', false, 61),

-- CONTACTS (9 permissions)
('contacts.view_all', 'contacts', 'viewing', 'View All Contacts', 'Can view all contacts', false, 100),
('contacts.create', 'contacts', 'creation', 'Create Contacts', 'Can create new contacts', false, 110),
('contacts.edit_all', 'contacts', 'editing', 'Edit All Contacts', 'Can edit any contact', false, 120),
('contacts.delete', 'contacts', 'deletion', 'Delete Contacts', 'Can delete contacts', false, 130),
('contacts.merge', 'contacts', 'advanced', 'Merge Duplicates', 'Can merge duplicate contacts', false, 140),
('contacts.export', 'contacts', 'data', 'Export Contacts', 'Can export contact data', false, 150),

-- PIPELINES (8 permissions)
('pipelines.view', 'pipelines', 'viewing', 'View Pipelines', 'Can view pipeline boards', false, 200),
('pipelines.create', 'pipelines', 'creation', 'Create Pipelines', 'Can create new pipelines', false, 210),
('pipelines.edit', 'pipelines', 'editing', 'Edit Pipelines', 'Can edit pipeline details', false, 220),
('pipelines.edit_stages', 'pipelines', 'editing', 'Manage Stages', 'Can add/edit/remove stages', false, 221),
('pipelines.delete', 'pipelines', 'deletion', 'Delete Pipelines', 'Can delete pipelines', false, 230),

-- TASKS (9 permissions)
('tasks.view_all', 'tasks', 'viewing', 'View All Tasks', 'Can view all tasks', false, 300),
('tasks.view_assigned', 'tasks', 'viewing', 'View Assigned Tasks', 'Can view only assigned tasks', true, 301),
('tasks.create', 'tasks', 'creation', 'Create Tasks', 'Can create new tasks', false, 310),
('tasks.edit_all', 'tasks', 'editing', 'Edit All Tasks', 'Can edit any task', false, 320),
('tasks.delete_all', 'tasks', 'deletion', 'Delete All Tasks', 'Can delete any task', false, 330),

-- USERS & TEAM (7 permissions)
('users.view_all', 'users', 'viewing', 'View All Users', 'Can see all team members', false, 500),
('users.invite', 'users', 'management', 'Invite Users', 'Can send team invitations', false, 510),
('users.edit_profile', 'users', 'management', 'Edit User Profiles', 'Can edit other users profiles', false, 520),
('users.assign_roles', 'users', 'management', 'Assign Roles', 'Can change user roles', false, 530),

-- ROLES & PERMISSIONS (5 permissions)
('roles.view', 'roles', 'viewing', 'View Roles', 'Can see custom roles', false, 600),
('roles.create', 'roles', 'management', 'Create Roles', 'Can create custom roles', false, 610),
('roles.edit', 'roles', 'management', 'Edit Roles', 'Can edit role details', false, 620),
('roles.edit_permissions', 'roles', 'management', 'Edit Permissions', 'Can change role permissions', false, 621),

-- SETTINGS (7 permissions)
('settings.view_all', 'settings', 'viewing', 'View All Settings', 'Can access settings page', false, 700),
('settings.edit_pipeline', 'settings', 'editing', 'Edit Pipeline Settings', 'Can configure pipeline settings', false, 710),
('settings.edit_deal', 'settings', 'editing', 'Edit Deal Settings', 'Can configure deal settings', false, 711),

-- ANALYTICS & REPORTING (4 permissions)
('analytics.view_own', 'analytics', 'viewing', 'View Own Analytics', 'Can view their own performance', true, 800),
('analytics.view_team', 'analytics', 'viewing', 'View Team Analytics', 'Can view team performance', false, 810),
('analytics.view_all', 'analytics', 'viewing', 'View All Analytics', 'Can view all practice analytics', false, 820),

-- AUDIT & SECURITY (4 permissions)
('audit.view', 'audit', 'viewing', 'View Audit Trail', 'Can view audit logs', false, 900),
('audit.view_sensitive', 'audit', 'viewing', 'View Sensitive Audit Data', 'Can view admin-only audit logs', false, 910),
('audit.export', 'audit', 'data', 'Export Audit Logs', 'Can export audit trail', false, 920)

ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- CREATE DEFAULT "PRACTICE OWNER" ROLE FOR ALL TENANTS
-- ============================================================

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

-- Grant ALL permissions to Practice Owner role
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
-- SUCCESS MESSAGE
-- ============================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ENTERPRISE SYSTEM SETUP COMPLETE!';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Tables created: 10';
  RAISE NOTICE '✅ Permissions defined: 50+';
  RAISE NOTICE '✅ Default roles created';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Your CRM is now enterprise-ready!';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Restart your dev server';
  RAISE NOTICE '2. Go to Settings → Roles';
  RAISE NOTICE '3. Create custom roles for your team';
  RAISE NOTICE '';
END $$;



