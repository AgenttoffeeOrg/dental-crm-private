SET search_path TO public, extensions;

-- =====================================================
-- FEATURE FLAGS SYSTEM
-- Purpose: Enable/disable features globally or per-tenant
-- Safety: All new features default to OFF
-- =====================================================

BEGIN;

-- =====================================================
-- 1. FEATURE FLAGS TABLE
-- =====================================================

DROP TABLE IF EXISTS feature_flags CASCADE;
CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  
  -- Per-tenant overrides: { "tenant_id": true/false }
  tenant_overrides JSONB DEFAULT '{}'::jsonb,
  
  -- Rollout percentage (0-100): enables for random % of tenants
  rollout_percentage INTEGER DEFAULT 0 CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
  
  -- Feature metadata
  category TEXT, -- 'core', 'premium', 'experimental'
  requires_flags TEXT[], -- Dependencies: other flags that must be enabled
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);

COMMENT ON TABLE feature_flags IS 'Global and per-tenant feature toggles for safe rollout';
COMMENT ON COLUMN feature_flags.tenant_overrides IS 'JSON object mapping tenant_id to boolean override';
COMMENT ON COLUMN feature_flags.rollout_percentage IS 'Gradual rollout: enable for random percentage of tenants';

-- =====================================================
-- 2. SEED FEATURE FLAGS (ALL DEFAULT OFF)
-- =====================================================

DO $$
DECLARE
  category_system CONSTANT TEXT := 'system';
BEGIN
  INSERT INTO feature_flags (key, enabled, description, category) VALUES
    ('multi_org_enabled', false, 'Enable multi-organization membership and org switcher', 'core'),
    ('location_roles_enabled', false, 'Enable per-location role assignments', 'core'),
    ('org_validation_enabled', false, 'Enable organization validation workflow', 'compliance'),
    ('email_verification_required', false, 'Require email verification for sensitive actions', 'security'),
    ('bulk_invites_enabled', false, 'Enable bulk CSV invite uploads', 'premium'),
    ('maintenance_mode', false, 'Pause all invites and joins during migration', category_system),
    ('cutover_ready', false, 'Shadow mode: run parity checks between old and new code paths', category_system),
    ('use_legacy_membership', true, 'Emergency rollback: use app_users.tenant_id instead of memberships', category_system)
  ON CONFLICT (key) DO NOTHING;
END $$;

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Check if flag is enabled globally
CREATE OR REPLACE FUNCTION check_feature_flag(flag_key TEXT)
RETURNS BOOLEAN AS $$
  SELECT enabled FROM feature_flags WHERE key = flag_key LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- Check if flag is enabled for specific tenant (respects overrides)
CREATE OR REPLACE FUNCTION check_feature_flag_for_tenant(flag_key TEXT, tenant_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  flag RECORD;
  tenant_override BOOLEAN;
  random_hash INTEGER;
BEGIN
  -- Get flag
  SELECT * INTO flag FROM feature_flags WHERE key = flag_key LIMIT 1;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check tenant override first
  tenant_override := (flag.tenant_overrides->>tenant_uuid::text)::boolean;
  IF tenant_override IS NOT NULL THEN
    RETURN tenant_override;
  END IF;
  
  -- Check rollout percentage (deterministic based on tenant ID)
  IF flag.rollout_percentage > 0 AND flag.rollout_percentage < 100 THEN
    -- Hash tenant ID to get consistent 0-99 value
    random_hash := (hashtext(tenant_uuid::text) % 100);
    IF random_hash < flag.rollout_percentage THEN
      RETURN true;
    END IF;
  END IF;
  
  -- Default to global enabled state
  RETURN flag.enabled;
END;
$$ LANGUAGE plpgsql STABLE;

-- Enable flag for specific tenant
CREATE OR REPLACE FUNCTION enable_feature_for_tenant(flag_key TEXT, tenant_uuid UUID)
RETURNS BOOLEAN AS $$
  UPDATE feature_flags
  SET tenant_overrides = jsonb_set(
    COALESCE(tenant_overrides, '{}'::jsonb),
    ARRAY[tenant_uuid::text],
    'true'::jsonb,
    true
  ),
  updated_at = NOW()
  WHERE key = flag_key
  RETURNING true;
$$ LANGUAGE SQL;

-- Disable flag for specific tenant
CREATE OR REPLACE FUNCTION disable_feature_for_tenant(flag_key TEXT, tenant_uuid UUID)
RETURNS BOOLEAN AS $$
  UPDATE feature_flags
  SET tenant_overrides = jsonb_set(
    COALESCE(tenant_overrides, '{}'::jsonb),
    ARRAY[tenant_uuid::text],
    'false'::jsonb,
    true
  ),
  updated_at = NOW()
  WHERE key = flag_key
  RETURNING true;
$$ LANGUAGE SQL;

-- =====================================================
-- 4. RLS POLICIES
-- =====================================================

ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Anyone can read feature flags
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;
CREATE POLICY "Anyone can view feature flags" ON feature_flags
  FOR SELECT
  USING (true);

-- Only service role can modify flags
DROP POLICY IF EXISTS "Service role can manage flags" ON feature_flags;
CREATE POLICY "Service role can manage flags" ON feature_flags
  FOR ALL
  USING (auth.role() = 'service_role');

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Feature flags system created';
  RAISE NOTICE '🔒 All flags default to OFF (safe rollout)';
  RAISE NOTICE '🎯 Use enable_feature_for_tenant() for canary testing';
  RAISE NOTICE '📊 Rollout percentage supports gradual enablement';
END $$;


