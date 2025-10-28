-- =====================================================
-- PHASE 1: ENHANCED ONBOARDING WIZARD - DATABASE SCHEMA
-- Migration 3 of 3: Default Configurations, Functions & RLS
-- =====================================================
-- This migration creates default field configurations,
-- database functions for onboarding logic, and RLS policies
-- =====================================================

BEGIN;

-- =====================================================
-- PART 1: DEFAULT FIELD CONFIGURATIONS
-- =====================================================
-- Insert default field configurations for a "template" tenant
-- These will be copied for new tenants
-- =====================================================

-- Create a system template (NULL tenant_id = global default)
-- When a new tenant is created, these configs are copied

-- Step 1: Email Verification (no configurable fields - system step)

-- Step 2: Personal Information
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'profile_personal', 'full_name', true, 1, 'Your full name as it should appear in the system'),
  (NULL, 'profile_personal', 'professional_title', false, 2, 'Your professional title or role (e.g., Dentist, Practice Manager)'),
  (NULL, 'profile_personal', 'phone_mobile', true, 3, 'Your mobile phone number for important notifications'),
  (NULL, 'profile_personal', 'phone_office', false, 4, 'Your office phone number (if different from mobile)'),
  (NULL, 'profile_personal', 'bio', false, 5, 'A brief description about yourself (optional)'),
  (NULL, 'profile_personal', 'profile_photo_url', false, 6, 'Upload a profile photo')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 3: Work Preferences
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'profile_work', 'timezone', true, 1, 'Your timezone for scheduling and notifications'),
  (NULL, 'profile_work', 'language', true, 2, 'Your preferred language for the interface'),
  (NULL, 'profile_work', 'date_format', true, 3, 'How dates should be displayed'),
  (NULL, 'profile_work', 'time_format', true, 4, 'How times should be displayed (12h or 24h)'),
  (NULL, 'profile_work', 'working_hours_json', false, 5, 'Your typical working hours (optional)')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 4: Communication Settings
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'profile_communication', 'email_signature', false, 1, 'Your email signature (optional)'),
  (NULL, 'profile_communication', 'sms_signature', false, 2, 'Your SMS signature (optional)')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 5: Security Settings
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'profile_security', 'two_factor_enabled', false, 1, 'Enable two-factor authentication for added security (optional)')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 6: Company Information
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'org_company', 'name', true, 1, 'Your organization name'),
  (NULL, 'org_company', 'industry', true, 2, 'Your primary industry or specialty'),
  (NULL, 'org_company', 'company_size', true, 3, 'Number of employees'),
  (NULL, 'org_company', 'founded_date', false, 4, 'When your organization was established'),
  (NULL, 'org_company', 'company_description', false, 5, 'Brief description of your organization'),
  (NULL, 'org_company', 'logo_url', false, 6, 'Upload your organization logo')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 7: Legal Details
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'org_legal', 'legal_name', true, 1, 'Legal entity name (if different from organization name)'),
  (NULL, 'org_legal', 'tax_id', false, 2, 'Tax identification number'),
  (NULL, 'org_legal', 'registration_number', false, 3, 'Business registration number'),
  (NULL, 'org_legal', 'legal_address_line1', true, 4, 'Legal address line 1'),
  (NULL, 'org_legal', 'legal_address_line2', false, 5, 'Legal address line 2'),
  (NULL, 'org_legal', 'legal_city', true, 6, 'City'),
  (NULL, 'org_legal', 'legal_state', true, 7, 'State/Province'),
  (NULL, 'org_legal', 'legal_postal_code', true, 8, 'Postal/ZIP code'),
  (NULL, 'org_legal', 'legal_country', true, 9, 'Country')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 8: Contact Information
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'org_contact', 'phone_main', true, 1, 'Main phone number for your organization'),
  (NULL, 'org_contact', 'phone_support', false, 2, 'Support phone number (if different)'),
  (NULL, 'org_contact', 'email_main', true, 3, 'Main contact email'),
  (NULL, 'org_contact', 'email_support', false, 4, 'Support email (if different)'),
  (NULL, 'org_contact', 'website', false, 5, 'Your organization website')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 9: Business Settings
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'org_business', 'fiscal_year_start', true, 1, 'First month of your fiscal year'),
  (NULL, 'org_business', 'primary_currency', true, 2, 'Your primary currency for financial data'),
  (NULL, 'org_business', 'business_hours_json', false, 3, 'Your standard business hours'),
  (NULL, 'org_business', 'gdpr_compliant', false, 4, 'Are you GDPR compliant?'),
  (NULL, 'org_business', 'data_retention_days', false, 5, 'Data retention period in days')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- Step 10: First Location
INSERT INTO onboarding_field_config (tenant_id, step_id, field_name, is_required, display_order, help_text) VALUES
  (NULL, 'location_first', 'name', true, 1, 'Location name'),
  (NULL, 'location_first', 'display_name', false, 2, 'Display name (if different)'),
  (NULL, 'location_first', 'location_type', true, 3, 'Type of location'),
  (NULL, 'location_first', 'address_line1', true, 4, 'Street address'),
  (NULL, 'location_first', 'address_line2', false, 5, 'Address line 2'),
  (NULL, 'location_first', 'city', true, 6, 'City'),
  (NULL, 'location_first', 'state', true, 7, 'State/Province'),
  (NULL, 'location_first', 'postal_code', true, 8, 'Postal/ZIP code'),
  (NULL, 'location_first', 'country', true, 9, 'Country'),
  (NULL, 'location_first', 'phone_number', true, 10, 'Location phone number'),
  (NULL, 'location_first', 'email', false, 11, 'Location email'),
  (NULL, 'location_first', 'website_url', false, 12, 'Location website')
ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;

-- =====================================================
-- PART 2: DATABASE FUNCTIONS
-- =====================================================

-- Function: Get onboarding configuration for a tenant
CREATE OR REPLACE FUNCTION get_onboarding_config(
  p_tenant_id UUID,
  p_account_type TEXT
)
RETURNS TABLE (
  step_id TEXT,
  step_name TEXT,
  step_description TEXT,
  step_icon TEXT,
  step_order INTEGER,
  step_category TEXT,
  is_skippable BOOLEAN,
  fields JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as step_id,
    s.name as step_name,
    s.description as step_description,
    s.icon as step_icon,
    s.display_order as step_order,
    s.category as step_category,
    s.is_skippable,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'fieldName', f.field_name,
          'isRequired', f.is_required,
          'displayOrder', f.display_order,
          'helpText', f.help_text,
          'validationRules', f.validation_rules
        ) ORDER BY f.display_order
      ) FILTER (WHERE f.field_name IS NOT NULL),
      '[]'::jsonb
    ) as fields
  FROM onboarding_step_definitions s
  LEFT JOIN onboarding_field_config f ON (
    f.step_id = s.id 
    AND (f.tenant_id = p_tenant_id OR f.tenant_id IS NULL)
  )
  WHERE p_account_type = ANY(s.account_types)
  GROUP BY s.id, s.name, s.description, s.icon, s.display_order, s.category, s.is_skippable
  ORDER BY s.display_order;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_onboarding_config IS 
  'Returns onboarding configuration with steps and fields for a given tenant and account type';

-- Function: Update onboarding progress
CREATE OR REPLACE FUNCTION update_onboarding_progress(
  p_user_id UUID,
  p_step_id TEXT,
  p_field_data JSONB,
  p_is_complete BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_tenant_id UUID;
  v_result JSONB;
BEGIN
  -- Get user's tenant_id
  SELECT tenant_id INTO v_tenant_id FROM app_users WHERE id = p_user_id;
  
  IF v_tenant_id IS NULL THEN
    RETURN jsonb_build_object('error', 'User not found');
  END IF;
  
  -- Upsert progress record
  INSERT INTO onboarding_progress (
    user_id, 
    tenant_id, 
    step_name,
    completed,
    completed_at,
    field_data,
    data
  ) VALUES (
    p_user_id,
    v_tenant_id,
    p_step_id,
    p_is_complete,
    CASE WHEN p_is_complete THEN NOW() ELSE NULL END,
    p_field_data,
    p_field_data
  )
  ON CONFLICT (user_id, step_name) DO UPDATE SET
    completed = p_is_complete,
    completed_at = CASE WHEN p_is_complete THEN NOW() ELSE onboarding_progress.completed_at END,
    field_data = p_field_data,
    data = p_field_data;
  
  -- Update user's current step
  UPDATE app_users 
  SET onboarding_current_step = p_step_id
  WHERE id = p_user_id;
  
  -- Return success with progress info
  SELECT jsonb_build_object(
    'success', true,
    'stepId', p_step_id,
    'completed', p_is_complete,
    'totalCompleted', (
      SELECT COUNT(*) FROM onboarding_progress 
      WHERE user_id = p_user_id AND completed = true
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_onboarding_progress IS 
  'Updates user onboarding progress for a specific step';

-- Function: Check if step is complete
CREATE OR REPLACE FUNCTION check_step_completion(
  p_user_id UUID,
  p_step_id TEXT,
  p_tenant_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_required_fields TEXT[];
  v_field_data JSONB;
  v_field_name TEXT;
  v_is_complete BOOLEAN := true;
BEGIN
  -- Get required fields for this step
  SELECT array_agg(field_name)
  INTO v_required_fields
  FROM onboarding_field_config
  WHERE step_id = p_step_id
    AND (tenant_id = p_tenant_id OR tenant_id IS NULL)
    AND is_required = true;
  
  -- Get saved field data
  SELECT field_data
  INTO v_field_data
  FROM onboarding_progress
  WHERE user_id = p_user_id
    AND step_name = p_step_id;
  
  -- If no required fields, step is complete
  IF v_required_fields IS NULL OR array_length(v_required_fields, 1) = 0 THEN
    RETURN true;
  END IF;
  
  -- Check each required field has a value
  FOREACH v_field_name IN ARRAY v_required_fields LOOP
    IF v_field_data IS NULL OR 
       v_field_data->v_field_name IS NULL OR 
       v_field_data->>v_field_name = '' THEN
      v_is_complete := false;
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_is_complete;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_step_completion IS 
  'Checks if all required fields for a step have been filled';

-- =====================================================
-- PART 3: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on tables
ALTER TABLE onboarding_field_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_step_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS onboarding_field_config_read_policy ON onboarding_field_config;
DROP POLICY IF EXISTS onboarding_field_config_write_policy ON onboarding_field_config;
DROP POLICY IF EXISTS onboarding_step_definitions_read_policy ON onboarding_step_definitions;
DROP POLICY IF EXISTS onboarding_progress_read_policy ON onboarding_progress;
DROP POLICY IF EXISTS onboarding_progress_write_policy ON onboarding_progress;

-- Policy: Users can read their tenant's field config OR global defaults
CREATE POLICY onboarding_field_config_read_policy ON onboarding_field_config
  FOR SELECT
  USING (
    tenant_id IS NULL OR -- Global defaults
    tenant_id IN (
      SELECT tenant_id FROM app_users WHERE id = auth.uid()
    )
  );

-- Policy: Only super admins can modify field config
CREATE POLICY onboarding_field_config_write_policy ON onboarding_field_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM app_users
      WHERE id = auth.uid()
        AND role IN ('owner', 'super_admin')
        AND (tenant_id = onboarding_field_config.tenant_id OR onboarding_field_config.tenant_id IS NULL)
    )
  );

-- Policy: Everyone can read step definitions
CREATE POLICY onboarding_step_definitions_read_policy ON onboarding_step_definitions
  FOR SELECT
  USING (true);

-- Policy: Users can read their own onboarding progress
CREATE POLICY onboarding_progress_read_policy ON onboarding_progress
  FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can update their own onboarding progress
CREATE POLICY onboarding_progress_write_policy ON onboarding_progress
  FOR ALL
  USING (user_id = auth.uid());

-- =====================================================
-- PART 4: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_user_step 
  ON onboarding_progress(user_id, step_name);

CREATE INDEX IF NOT EXISTS idx_onboarding_progress_completed 
  ON onboarding_progress(user_id) WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_onboarding_field_config_required 
  ON onboarding_field_config(step_id, is_required);

-- =====================================================
-- PART 5: HELPER FUNCTION - Copy default configs for new tenant
-- =====================================================

CREATE OR REPLACE FUNCTION copy_default_onboarding_config(p_tenant_id UUID)
RETURNS VOID AS $$
BEGIN
  -- Copy global field configs (where tenant_id IS NULL) to new tenant
  INSERT INTO onboarding_field_config (
    tenant_id, step_id, field_name, is_required, 
    display_order, help_text, validation_rules
  )
  SELECT 
    p_tenant_id, step_id, field_name, is_required,
    display_order, help_text, validation_rules
  FROM onboarding_field_config
  WHERE tenant_id IS NULL
  ON CONFLICT (tenant_id, step_id, field_name) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION copy_default_onboarding_config IS 
  'Copies default onboarding field configurations to a new tenant';

-- =====================================================
-- Log completion
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migration 20251026_03_onboarding_defaults_functions_rls completed successfully';
  RAISE NOTICE '   - Inserted default field configurations for all 10 steps';
  RAISE NOTICE '   - Created 4 database functions:';
  RAISE NOTICE '     • get_onboarding_config()';
  RAISE NOTICE '     • update_onboarding_progress()';
  RAISE NOTICE '     • check_step_completion()';
  RAISE NOTICE '     • copy_default_onboarding_config()';
  RAISE NOTICE '   - Created RLS policies for security';
  RAISE NOTICE '   - Created indexes for performance';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Phase 1 Database Setup Complete!';
  RAISE NOTICE '   Total fields configured: %', (SELECT COUNT(*) FROM onboarding_field_config);
  RAISE NOTICE '   Total steps defined: %', (SELECT COUNT(*) FROM onboarding_step_definitions);
END $$;

COMMIT;

