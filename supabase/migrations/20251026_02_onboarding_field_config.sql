-- =====================================================
-- PHASE 1: ENHANCED ONBOARDING WIZARD - DATABASE SCHEMA
-- Migration 2 of 3: Onboarding Field Configuration
-- =====================================================
-- This migration creates the infrastructure for admin-configurable
-- onboarding field requirements
-- =====================================================

BEGIN;

-- =====================================================
-- TABLE: onboarding_field_config
-- =====================================================
-- Stores configuration for which fields are required/optional
-- per step in the onboarding wizard. Allows super admins to
-- customize the onboarding experience per tenant.
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_field_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  help_text TEXT,
  validation_rules JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES app_users(id),
  updated_by UUID REFERENCES app_users(id),
  
  -- Ensure unique configuration per tenant, step, and field
  UNIQUE(tenant_id, step_id, field_name)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_onboarding_field_config_tenant 
  ON onboarding_field_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_field_config_step 
  ON onboarding_field_config(tenant_id, step_id);

-- Comments for documentation
COMMENT ON TABLE onboarding_field_config IS 
  'Configuration for onboarding wizard fields - which fields are required/optional per step';
COMMENT ON COLUMN onboarding_field_config.step_id IS 
  'Step identifier: email_verification, profile_personal, profile_work, profile_communication, profile_security, org_company, org_legal, org_contact, org_business, location_first';
COMMENT ON COLUMN onboarding_field_config.field_name IS 
  'Name of the field being configured (e.g., full_name, professional_title, phone_mobile)';
COMMENT ON COLUMN onboarding_field_config.is_required IS 
  'Whether this field is required to complete the step';
COMMENT ON COLUMN onboarding_field_config.display_order IS 
  'Order in which the field should appear in the step (0-indexed)';
COMMENT ON COLUMN onboarding_field_config.validation_rules IS 
  'JSON object with validation rules: { "minLength": 2, "maxLength": 100, "pattern": "regex" }';

-- =====================================================
-- TABLE: onboarding_step_definitions
-- =====================================================
-- Master list of all onboarding steps with metadata
-- =====================================================

CREATE TABLE IF NOT EXISTS onboarding_step_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  account_types TEXT[] NOT NULL DEFAULT ARRAY['organization', 'solo'],
  display_order INTEGER NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('email', 'profile', 'organization', 'location')),
  is_skippable BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert step definitions
INSERT INTO onboarding_step_definitions (id, name, description, icon, account_types, display_order, category, is_skippable) VALUES
  ('email_verification', 'Email Verification', 'Verify your email address', 'Mail', ARRAY['organization', 'solo'], 1, 'email', false),
  ('profile_personal', 'Personal Information', 'Tell us about yourself', 'User', ARRAY['organization', 'solo'], 2, 'profile', false),
  ('profile_work', 'Work Preferences', 'Set your timezone and working hours', 'Briefcase', ARRAY['organization', 'solo'], 3, 'profile', true),
  ('profile_communication', 'Communication Settings', 'Configure email and SMS signatures', 'MessageSquare', ARRAY['organization', 'solo'], 4, 'profile', true),
  ('profile_security', 'Security Settings', 'Enable two-factor authentication', 'Shield', ARRAY['organization', 'solo'], 5, 'profile', true),
  ('org_company', 'Company Information', 'Basic information about your organization', 'Building2', ARRAY['organization'], 6, 'organization', false),
  ('org_legal', 'Legal Details', 'Legal entity and registration information', 'FileText', ARRAY['organization'], 7, 'organization', true),
  ('org_contact', 'Contact Information', 'How patients and clients can reach you', 'Phone', ARRAY['organization'], 8, 'organization', false),
  ('org_business', 'Business Settings', 'Fiscal year, currency, and compliance', 'Settings', ARRAY['organization'], 9, 'organization', true),
  ('location_first', 'First Location', 'Create your primary location', 'MapPin', ARRAY['organization'], 10, 'location', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  account_types = EXCLUDED.account_types,
  display_order = EXCLUDED.display_order,
  category = EXCLUDED.category,
  is_skippable = EXCLUDED.is_skippable;

-- Comments
COMMENT ON TABLE onboarding_step_definitions IS 
  'Master list of all onboarding steps with metadata';
COMMENT ON COLUMN onboarding_step_definitions.account_types IS 
  'Which account types see this step (organization, solo, or both)';
COMMENT ON COLUMN onboarding_step_definitions.is_skippable IS 
  'Whether the step can be skipped if no required fields are set';

-- =====================================================
-- ENSURE: onboarding_progress table exists
-- =====================================================
-- Create table if it doesn't exist, then add new columns

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, step_name)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user ON onboarding_progress(user_id);

-- =====================================================
-- UPDATE: onboarding_progress table
-- =====================================================
-- Add new columns to existing onboarding_progress table

ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT true;
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS skipped BOOLEAN DEFAULT false;
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS skipped_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]';
ALTER TABLE onboarding_progress ADD COLUMN IF NOT EXISTS field_data JSONB DEFAULT '{}';

-- Add comments
COMMENT ON COLUMN onboarding_progress.is_required IS 
  'Whether this step is required for the user based on their account type';
COMMENT ON COLUMN onboarding_progress.skipped IS 
  'Whether the user chose to skip this optional step';
COMMENT ON COLUMN onboarding_progress.validation_errors IS 
  'Array of validation errors for this step: [{"field": "email", "message": "Invalid format"}]';
COMMENT ON COLUMN onboarding_progress.field_data IS 
  'Saved field data for this step (for resume functionality)';

-- =====================================================
-- UPDATE: app_users table
-- =====================================================
-- Add onboarding flow tracking columns

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_flow_type TEXT CHECK (onboarding_flow_type IN ('organization', 'solo'));
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_skipped_steps TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_current_step TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_started_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP WITH TIME ZONE;

-- Create index
CREATE INDEX IF NOT EXISTS idx_app_users_onboarding_flow 
  ON app_users(onboarding_flow_type) WHERE onboarding_completed = false;

-- Add comments
COMMENT ON COLUMN app_users.onboarding_flow_type IS 
  'Type of onboarding flow: organization (10 steps) or solo (5 steps)';
COMMENT ON COLUMN app_users.onboarding_skipped_steps IS 
  'Array of step IDs that the user chose to skip';
COMMENT ON COLUMN app_users.onboarding_current_step IS 
  'Current step ID in the onboarding wizard';
COMMENT ON COLUMN app_users.onboarding_started_at IS 
  'When the user first started the onboarding wizard';
COMMENT ON COLUMN app_users.onboarding_completed_at IS 
  'When the user completed the onboarding wizard';

-- =====================================================
-- FUNCTION: update_updated_at_column
-- =====================================================
-- Trigger function to auto-update updated_at timestamps

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for onboarding_field_config
DROP TRIGGER IF EXISTS update_onboarding_field_config_updated_at ON onboarding_field_config;
CREATE TRIGGER update_onboarding_field_config_updated_at
  BEFORE UPDATE ON onboarding_field_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Log completion
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251026_02_onboarding_field_config completed successfully';
  RAISE NOTICE '   - Created onboarding_field_config table';
  RAISE NOTICE '   - Created onboarding_step_definitions table with 10 steps';
  RAISE NOTICE '   - Updated onboarding_progress with validation columns';
  RAISE NOTICE '   - Updated app_users with flow tracking columns';
  RAISE NOTICE '   - Created indexes and triggers';
END $$;

COMMIT;

