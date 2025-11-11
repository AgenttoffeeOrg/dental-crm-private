-- =====================================================
-- SETTINGS VERSIONING & GOVERNANCE
-- =====================================================
-- Version: 1.0
-- Date: January 16, 2025
-- Purpose: Version control, rollback, and audit trail for settings
-- =====================================================

BEGIN;

-- =====================================================
-- 1. LOCATIONS TABLE (Must be created FIRST)
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Location information
  name TEXT NOT NULL,
  display_name TEXT,
  location_type TEXT CHECK (location_type IN ('headquarters', 'branch', 'clinic', 'mobile')),
  
  -- Address
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT DEFAULT 'US',
  
  -- Contact
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  
  -- Operating hours (JSON: {monday: {open: '09:00', close: '17:00'}, ...})
  operating_hours JSONB DEFAULT '{}'::JSONB,
  
  -- Settings overrides
  settings_overrides JSONB DEFAULT '{}'::JSONB, -- Location-specific settings that override org defaults
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_primary BOOLEAN DEFAULT FALSE, -- Main location
  
  -- Metadata
  created_by UUID REFERENCES app_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX idx_locations_tenant ON locations(tenant_id);
CREATE INDEX idx_locations_active ON locations(tenant_id, is_active);
CREATE INDEX idx_locations_primary ON locations(tenant_id, is_primary);

COMMENT ON TABLE locations IS 'Physical locations for multi-location practices';

-- =====================================================
-- 2. SETTINGS_VERSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS settings_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id) ON DELETE CASCADE, -- For location-specific settings
  
  -- Setting identification
  setting_key TEXT NOT NULL,
  setting_category TEXT, -- 'email', 'pipeline', 'forms', 'analytics', etc.
  setting_scope TEXT CHECK (setting_scope IN ('system', 'org', 'location', 'user')),
  
  -- Version tracking
  version_number INTEGER NOT NULL,
  
  -- Values
  old_value JSONB,
  new_value JSONB,
  
  -- Change metadata
  changed_by UUID REFERENCES app_users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW(),
  change_reason TEXT, -- Optional user-provided reason
  change_source TEXT DEFAULT 'ui', -- 'ui', 'api', 'import', 'migration'
  
  -- Impact analysis
  affected_records_count INTEGER, -- How many entities affected
  affected_record_types TEXT[], -- ['deals', 'contacts', 'campaigns']
  
  -- Rollback
  is_rolled_back BOOLEAN DEFAULT FALSE,
  rolled_back_at TIMESTAMPTZ,
  rolled_back_by UUID REFERENCES app_users(id),
  rollback_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, setting_key, version_number)
);

CREATE INDEX idx_settings_versions_tenant ON settings_versions(tenant_id);
CREATE INDEX idx_settings_versions_key ON settings_versions(setting_key);
CREATE INDEX idx_settings_versions_changed_at ON settings_versions(changed_at DESC);
CREATE INDEX idx_settings_versions_rollback ON settings_versions(is_rolled_back);

COMMENT ON TABLE settings_versions IS 'Complete version history of all settings changes with rollback capability';

-- =====================================================
-- 2. SETTINGS_APPROVALS TABLE
-- =====================================================
-- For settings that require approval before taking effect

CREATE TABLE IF NOT EXISTS settings_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Pending change
  setting_key TEXT NOT NULL,
  current_value JSONB,
  proposed_value JSONB,
  change_reason TEXT,
  
  -- Requester
  requested_by UUID NOT NULL REFERENCES app_users(id),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Approval
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')) DEFAULT 'pending',
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  
  -- Effective date (scheduled change)
  effective_at TIMESTAMPTZ, -- When change should take effect
  applied_at TIMESTAMPTZ, -- When it actually was applied
  
  -- Impact analysis
  impact_summary TEXT,
  affected_count INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_settings_approvals_tenant_status ON settings_approvals(tenant_id, status);
CREATE INDEX idx_settings_approvals_requester ON settings_approvals(requested_by);
CREATE INDEX idx_settings_approvals_reviewer ON settings_approvals(reviewed_by);

COMMENT ON TABLE settings_approvals IS 'Approval workflow for critical settings changes';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to get current setting value with scope hierarchy
CREATE OR REPLACE FUNCTION get_setting_value(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_location_id UUID DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_value JSONB;
BEGIN
  -- Check user-level setting first
  IF p_user_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'user'
      AND changed_by = p_user_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  -- Check location-level setting
  IF p_location_id IS NOT NULL THEN
    SELECT new_value INTO v_value
    FROM settings_versions
    WHERE tenant_id = p_tenant_id
      AND setting_key = p_setting_key
      AND setting_scope = 'location'
      AND location_id = p_location_id
      AND is_rolled_back = FALSE
    ORDER BY version_number DESC
    LIMIT 1;
    
    IF FOUND THEN RETURN v_value; END IF;
  END IF;
  
  -- Check org-level setting
  SELECT new_value INTO v_value
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key
    AND setting_scope = 'org'
    AND is_rolled_back = FALSE
  ORDER BY version_number DESC
  LIMIT 1;
  
  IF FOUND THEN RETURN v_value; END IF;
  
  -- Return NULL if no setting found (will use default from registry)
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save setting with versioning
CREATE OR REPLACE FUNCTION save_setting(
  p_tenant_id UUID,
  p_setting_key TEXT,
  p_new_value JSONB,
  p_changed_by UUID,
  p_change_reason TEXT DEFAULT NULL,
  p_location_id UUID DEFAULT NULL,
  p_scope TEXT DEFAULT 'org'
)
RETURNS UUID AS $$
DECLARE
  v_version_id UUID;
  v_next_version INTEGER;
  v_old_value JSONB;
BEGIN
  -- Get current value (will be old_value)
  v_old_value := get_setting_value(p_tenant_id, p_setting_key, p_location_id, p_changed_by);
  
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version
  FROM settings_versions
  WHERE tenant_id = p_tenant_id
    AND setting_key = p_setting_key;
  
  -- Insert new version
  INSERT INTO settings_versions (
    tenant_id,
    location_id,
    setting_key,
    setting_scope,
    version_number,
    old_value,
    new_value,
    changed_by,
    change_reason
  ) VALUES (
    p_tenant_id,
    p_location_id,
    p_setting_key,
    p_scope,
    v_next_version,
    v_old_value,
    p_new_value,
    p_changed_by,
    p_change_reason
  )
  RETURNING id INTO v_version_id;
  
  RETURN v_version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to rollback setting to previous version
CREATE OR REPLACE FUNCTION rollback_setting(
  p_version_id UUID,
  p_rolled_back_by UUID,
  p_rollback_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_setting_key TEXT;
  v_old_value JSONB;
  v_tenant_id UUID;
BEGIN
  -- Get version details
  SELECT setting_key, old_value, tenant_id INTO v_setting_key, v_old_value, v_tenant_id
  FROM settings_versions
  WHERE id = p_version_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Version not found';
  END IF;
  
  -- Mark as rolled back
  UPDATE settings_versions
  SET is_rolled_back = TRUE,
      rolled_back_at = NOW(),
      rolled_back_by = p_rolled_back_by,
      rollback_reason = p_rollback_reason
  WHERE id = p_version_id;
  
  -- Create new version with old value
  PERFORM save_setting(
    v_tenant_id,
    v_setting_key,
    v_old_value,
    p_rolled_back_by,
    'Rollback: ' || p_rollback_reason
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 5. ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE settings_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

-- Settings Versions RLS
CREATE POLICY settings_versions_tenant_isolation
  ON settings_versions
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Settings Approvals RLS
CREATE POLICY settings_approvals_tenant_isolation
  ON settings_approvals
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

-- Locations RLS
CREATE POLICY locations_tenant_isolation
  ON locations
  FOR ALL
  USING (tenant_id = (SELECT tenant_id FROM app_users WHERE id = auth.uid()));

COMMIT;

