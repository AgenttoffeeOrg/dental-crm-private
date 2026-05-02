-- =====================================================
-- ROLLBACK: Feature Flags System
-- Run this if Step 0 needs to be reverted
-- =====================================================

BEGIN;

-- Drop policies
DROP POLICY IF EXISTS "Anyone can view feature flags" ON feature_flags;
DROP POLICY IF EXISTS "Service role can manage flags" ON feature_flags;

-- Drop functions
DROP FUNCTION IF EXISTS check_feature_flag(TEXT);
DROP FUNCTION IF EXISTS check_feature_flag_for_tenant(TEXT, UUID);
DROP FUNCTION IF EXISTS enable_feature_for_tenant(TEXT, UUID);
DROP FUNCTION IF EXISTS disable_feature_for_tenant(TEXT, UUID);

-- Drop table
DROP TABLE IF EXISTS feature_flags CASCADE;

COMMIT;

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Feature flags system rolled back';
  RAISE NOTICE '⚠️  Application code still references feature flags - redeploy previous version';
END $$;



