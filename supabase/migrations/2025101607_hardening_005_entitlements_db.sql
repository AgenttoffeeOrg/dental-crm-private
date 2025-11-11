-- =====================================================
-- HARDENING PHASE 2.1: Entitlement Function Refactor
-- Date: October 16, 2025
-- Purpose: Fix security hole - remove tenant_id parameter
-- =====================================================

-- =====================================================
-- CRITICAL SECURITY FIX
-- =====================================================
-- OLD (INSECURE): check_entitlement(p_tenant_id UUID, p_feature_code TEXT, ...)
--   Problem: Caller can pass ANY tenant_id, bypassing security
--
-- NEW (SECURE): check_entitlement(p_feature_code TEXT, ...)
--   Solution: Always uses current_tenant_id() - no parameter bypass possible
-- =====================================================

-- Drop old insecure version
DROP FUNCTION IF EXISTS check_entitlement(UUID, TEXT, BOOLEAN);
DROP FUNCTION IF EXISTS check_entitlement(UUID, TEXT);

-- Create new secure version that derives tenant from auth context
CREATE OR REPLACE FUNCTION check_entitlement(
  p_feature_code TEXT,
  p_require_parent BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id(); -- ✅ SECURITY: Always from auth context
  v_feature_id UUID;
  v_parent UUID;
  v_is_enabled BOOLEAN;
  v_parent_enabled BOOLEAN;
BEGIN
  -- Guard: Must have valid tenant context
  IF v_tenant_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get feature ID and parent
  SELECT id, parent_feature_id INTO v_feature_id, v_parent
  FROM features
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    -- Feature doesn't exist or is inactive
    RETURN false;
  END IF;

  -- Check if feature is entitled and enabled for this tenant
  SELECT is_enabled INTO v_is_enabled
  FROM tenant_entitlements
  WHERE tenant_id = v_tenant_id
    AND feature_id = v_feature_id
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_is_enabled IS NOT TRUE THEN
    RETURN false;
  END IF;

  -- If this is a nested add-on, check parent is also enabled
  IF p_require_parent AND v_parent IS NOT NULL THEN
    SELECT is_enabled INTO v_parent_enabled
    FROM tenant_entitlements te
    WHERE te.tenant_id = v_tenant_id
      AND te.feature_id = v_parent
      AND (te.expires_at IS NULL OR te.expires_at > NOW());
    
    IF v_parent_enabled IS NOT TRUE THEN
      RETURN false;
    END IF;
  END IF;

  RETURN true;
END;
$$;

COMMENT ON FUNCTION check_entitlement(TEXT, BOOLEAN) IS 
  'SECURE: Checks if authenticated user''s tenant has access to a feature. 
   Always uses current_tenant_id() - no bypass possible.
   If p_require_parent=true, also validates parent feature is enabled (for nested add-ons).';

-- =====================================================
-- Helper: Check multiple entitlements at once
-- =====================================================

CREATE OR REPLACE FUNCTION check_entitlements(
  p_feature_codes TEXT[],
  p_require_all BOOLEAN DEFAULT true
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_code TEXT;
  v_has_access BOOLEAN;
  v_any_access BOOLEAN := false;
BEGIN
  IF p_feature_codes IS NULL OR array_length(p_feature_codes, 1) = 0 THEN
    RETURN true; -- No requirements
  END IF;
  
  FOREACH v_code IN ARRAY p_feature_codes LOOP
    v_has_access := check_entitlement(v_code, true);
    
    IF p_require_all THEN
      -- ALL mode: Return false immediately if any check fails
      IF NOT v_has_access THEN
        RETURN false;
      END IF;
    ELSE
      -- ANY mode: Return true immediately if any check succeeds
      IF v_has_access THEN
        RETURN true;
      END IF;
      v_any_access := v_any_access OR v_has_access;
    END IF;
  END LOOP;
  
  -- If we reach here:
  -- - ALL mode: all checks passed
  -- - ANY mode: no checks passed
  RETURN p_require_all OR v_any_access;
END;
$$;

COMMENT ON FUNCTION check_entitlements(TEXT[], BOOLEAN) IS 
  'Check multiple entitlements at once.
   If p_require_all=true: returns true only if ALL features are entitled (AND logic).
   If p_require_all=false: returns true if ANY feature is entitled (OR logic).';

-- =====================================================
-- Helper: Get list of entitled features for current user
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_entitlements()
RETURNS TABLE (
  feature_code TEXT,
  feature_name TEXT,
  is_enabled BOOLEAN,
  quota_limit INTEGER,
  quota_used INTEGER,
  expires_at TIMESTAMPTZ
)
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT 
    f.code as feature_code,
    f.name as feature_name,
    te.is_enabled,
    te.quota_limit,
    te.quota_used,
    te.expires_at
  FROM features f
  JOIN tenant_entitlements te ON te.feature_id = f.id
  WHERE te.tenant_id = current_tenant_id()
    AND f.is_active = true
  ORDER BY f.category, f.name;
$$;

COMMENT ON FUNCTION get_user_entitlements() IS 
  'Returns all entitled features for the authenticated user''s tenant.
   Useful for populating UI (e.g., Settings → Billing page).';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ENTITLEMENT FUNCTIONS UPDATED ===';
  RAISE NOTICE '✅ check_entitlement(feature_code, require_parent) - SECURE VERSION';
  RAISE NOTICE '   - Removed tenant_id parameter (security fix)';
  RAISE NOTICE '   - Always uses current_tenant_id() from auth context';
  RAISE NOTICE '   - No bypass possible';
  RAISE NOTICE '';
  RAISE NOTICE '✅ check_entitlements(feature_codes[], require_all) - NEW';
  RAISE NOTICE '   - Batch check multiple features';
  RAISE NOTICE '   - Supports AND/OR logic';
  RAISE NOTICE '';
  RAISE NOTICE '✅ get_user_entitlements() - NEW';
  RAISE NOTICE '   - Returns all features for current user';
  RAISE NOTICE '   - For UI rendering';
  RAISE NOTICE '';
END $$;

-- Test the function (should work for authenticated user)
-- SELECT check_entitlement('crm_base');  -- Should return true/false
-- SELECT check_entitlement('marketing'); -- Should return true/false
-- SELECT check_entitlements(ARRAY['automations', 'marketing']); -- Should return true only if both are entitled

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 2.1 COMPLETE: Entitlement security fix';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 CRITICAL SECURITY FIX:';
  RAISE NOTICE '   - check_entitlement() no longer accepts tenant_id parameter';
  RAISE NOTICE '   - Always derives tenant from current_tenant_id()';
  RAISE NOTICE '   - Eliminates entitlement bypass vulnerability';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  BREAKING CHANGE FOR APPLICATION CODE:';
  RAISE NOTICE '   OLD: await supabase.rpc("check_entitlement", { p_tenant_id: tenantId, p_feature_code: "marketing" })';
  RAISE NOTICE '   NEW: await supabase.rpc("check_entitlement", { p_feature_code: "marketing" })';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_006_rls_marketing.sql';
END $$;

