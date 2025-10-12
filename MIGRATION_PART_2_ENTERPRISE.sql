-- ============================================================
-- PART 2 OF 3: ENTERPRISE TABLES
-- ============================================================
-- This creates: custom_roles, permissions, audit_trail, settings
-- Run this SECOND (after Part 1)!
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

-- Role Permissions (Links roles to permissions)
CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id UUID NOT NULL REFERENCES custom_roles(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_definitions(key) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(role_id, permission_key)
);

-- User Profiles (Templates)
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
  auto_assignment_enabled BOOLEAN DEFAULT false,
  auto_assignment_rules JSONB,
  enforce_stage_order BOOLEAN DEFAULT false,
  stage_time_limits JSONB,
  required_fields_per_stage JSONB,
  notify_on_stage_change BOOLEAN DEFAULT false,
  notify_on_stuck_deal BOOLEAN DEFAULT true,
  stuck_deal_threshold_days INTEGER DEFAULT 14,
  duplicate_prevention BOOLEAN DEFAULT true,
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
  value_min_cents INTEGER DEFAULT 0,
  value_max_cents INTEGER,
  allow_zero_value BOOLEAN DEFAULT true,
  default_currency TEXT DEFAULT 'GBP',
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  auto_archive_after_days INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Contact Settings
CREATE TABLE IF NOT EXISTS contact_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  required_fields TEXT[],
  custom_fields JSONB,
  duplicate_detection_enabled BOOLEAN DEFAULT true,
  duplicate_check_fields TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Task Settings
CREATE TABLE IF NOT EXISTS task_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  default_priority TEXT DEFAULT 'medium',
  auto_create_rules JSONB,
  notification_preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS custom_roles_tenant_id_idx ON custom_roles(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_tenant_id_idx ON audit_trail(tenant_id);
CREATE INDEX IF NOT EXISTS audit_trail_user_id_idx ON audit_trail(user_id);
CREATE INDEX IF NOT EXISTS audit_trail_created_at_idx ON audit_trail(created_at DESC);

-- ✅ PART 2 COMPLETE!
-- Next: Run MIGRATION_PART_3_PERMISSIONS.sql

