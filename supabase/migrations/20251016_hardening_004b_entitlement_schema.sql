-- =====================================================
-- HARDENING PHASE 1.5: Entitlement Schema (PREREQUISITE)
-- Date: October 16, 2025
-- Purpose: Create features and tenant_entitlements tables
-- MUST RUN BEFORE: Migration 005 (entitlements_db.sql)
-- =====================================================

-- =====================================================
-- 1. FEATURES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('base', 'addon', 'nested_addon')),
  parent_feature_id UUID REFERENCES features(id) ON DELETE CASCADE,
  tier_requirements TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_features_code ON features(code);
CREATE INDEX IF NOT EXISTS idx_features_parent ON features(parent_feature_id);
CREATE INDEX IF NOT EXISTS idx_features_category ON features(category);

COMMENT ON TABLE features IS 
  'Defines all available features in the system.
   Supports hierarchical structure (base → addon → nested_addon).';

-- =====================================================
-- 2. TENANT_ENTITLEMENTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS tenant_entitlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  feature_id UUID NOT NULL REFERENCES features(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT true,
  quota_limit INTEGER,
  quota_used INTEGER DEFAULT 0,
  quota_reset_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, feature_id)
);

CREATE INDEX IF NOT EXISTS idx_entitlements_tenant ON tenant_entitlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_feature ON tenant_entitlements(feature_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_enabled ON tenant_entitlements(tenant_id, feature_id) 
  WHERE is_enabled = true;

COMMENT ON TABLE tenant_entitlements IS 
  'Maps which tenants have access to which features.
   Includes quota tracking and expiration dates.';

-- =====================================================
-- 3. SEED BASE FEATURES
-- =====================================================

-- Insert base features (idempotent using ON CONFLICT)
INSERT INTO features (code, name, category, description) VALUES
  ('crm_base', 'CRM Base', 'base', 'Core CRM functionality'),
  ('marketing', 'Marketing Module', 'addon', 'Campaigns, journeys, and marketing analytics'),
  ('automations', 'Automations', 'addon', 'Workflow automation across deals, pipelines, and tasks')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

-- Insert nested marketing add-ons
INSERT INTO features (code, name, category, parent_feature_id, description) VALUES
  ('marketing_email_warmup', 'Email Warm-Up', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Automated email warm-up for better deliverability'),
  ('marketing_ab_testing', 'A/B Testing', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Split test your campaigns'),
  ('marketing_heatmaps', 'Click Heatmaps', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Visual click tracking in emails'),
  ('marketing_advanced_analytics', 'Advanced Analytics Suite', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Deep-dive analytics and attribution'),
  ('marketing_ai_send_time', 'AI Send-Time Optimization', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'AI-powered optimal send time prediction'),
  ('marketing_social', 'Social Media Publishing', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'Publish to Facebook, Instagram, LinkedIn'),
  ('marketing_sms', 'SMS Campaigns', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'SMS campaign management'),
  ('marketing_whatsapp', 'WhatsApp Campaigns', 'nested_addon', 
    (SELECT id FROM features WHERE code = 'marketing'), 
    'WhatsApp business messaging')
ON CONFLICT (code) DO NOTHING;

-- =====================================================
-- 4. ENABLE ALL TENANTS WITH CRM_BASE (Grandfather in existing tenants)
-- =====================================================

-- Give all existing tenants the base CRM feature
INSERT INTO tenant_entitlements (tenant_id, feature_id, is_enabled)
SELECT 
  t.id as tenant_id,
  f.id as feature_id,
  true as is_enabled
FROM tenants t
CROSS JOIN features f
WHERE f.code = 'crm_base'
  AND NOT EXISTS (
    SELECT 1 FROM tenant_entitlements te
    WHERE te.tenant_id = t.id AND te.feature_id = f.id
  );

-- =====================================================
-- 5. ENABLE RLS ON ENTITLEMENT TABLES
-- =====================================================

ALTER TABLE features ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_entitlements ENABLE ROW LEVEL SECURITY;

-- Features are visible to all authenticated users (read-only)
DROP POLICY IF EXISTS features_select_all ON features;
CREATE POLICY features_select_all ON features
  FOR SELECT
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Service role can manage features
DROP POLICY IF EXISTS features_service_role ON features;
CREATE POLICY features_service_role ON features
  FOR ALL
  USING (auth.role() = 'service_role');

-- Users can view their tenant's entitlements
DROP POLICY IF EXISTS entitlements_select ON tenant_entitlements;
CREATE POLICY entitlements_select ON tenant_entitlements
  FOR SELECT
  USING (tenant_id = current_tenant_id());

-- Service role can manage entitlements
DROP POLICY IF EXISTS entitlements_service_role ON tenant_entitlements;
CREATE POLICY entitlements_service_role ON tenant_entitlements
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_feature_count INTEGER;
  v_entitlement_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_feature_count FROM features;
  SELECT COUNT(*) INTO v_entitlement_count FROM tenant_entitlements;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ENTITLEMENT SCHEMA VERIFICATION ===';
  RAISE NOTICE 'Features defined: %', v_feature_count;
  RAISE NOTICE 'Tenant entitlements created: %', v_entitlement_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Base features:';
  RAISE NOTICE '  - crm_base (all tenants)';
  RAISE NOTICE '  - marketing (addon)';
  RAISE NOTICE '  - automations (addon)';
  RAISE NOTICE '';
  RAISE NOTICE 'Nested marketing add-ons:';
  RAISE NOTICE '  - marketing_ab_testing';
  RAISE NOTICE '  - marketing_social';
  RAISE NOTICE '  - marketing_sms';
  RAISE NOTICE '  - marketing_whatsapp';
  RAISE NOTICE '  - + 4 more';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.5 COMPLETE: Entitlement schema';
  RAISE NOTICE '   - Created features table (9 features seeded)';
  RAISE NOTICE '   - Created tenant_entitlements table';
  RAISE NOTICE '   - All existing tenants granted crm_base';
  RAISE NOTICE '   - RLS policies applied';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 FOUNDATION: Entitlement system ready';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_005_entitlements_db.sql';
  RAISE NOTICE '   (This will create the check_entitlement() functions)';
END $$;

