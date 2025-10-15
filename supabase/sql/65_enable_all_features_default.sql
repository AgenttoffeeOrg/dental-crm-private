-- 65_enable_all_features_default.sql
-- Enable ALL features by default for ALL tenants (for testing purposes)

-- This script makes every feature enabled by default, regardless of plan tier
-- Users can still toggle them OFF if they want, but they start ON

-- Enable all features for all existing tenants
INSERT INTO tenant_feature_flags (tenant_id, feature_key, is_enabled)
SELECT 
    t.id as tenant_id,
    fd.feature_key,
    true as is_enabled
FROM tenants t
CROSS JOIN feature_definitions fd
ON CONFLICT (tenant_id, feature_key) 
DO UPDATE SET 
    is_enabled = true,
    updated_at = NOW();

-- Update the default value for future inserts
ALTER TABLE tenant_feature_flags 
ALTER COLUMN is_enabled SET DEFAULT true;

-- Verify all features are enabled
-- Run this to check:
-- SELECT t.name, fd.feature_name, tff.is_enabled 
-- FROM tenants t
-- CROSS JOIN feature_definitions fd
-- LEFT JOIN tenant_feature_flags tff ON t.id = tff.tenant_id AND fd.feature_key = tff.feature_key
-- ORDER BY t.name, fd.feature_name;

COMMENT ON TABLE tenant_feature_flags IS 'Feature flags per tenant - ALL ENABLED BY DEFAULT for testing';

