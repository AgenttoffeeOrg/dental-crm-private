SET search_path TO public, extensions;

-- =====================================================
-- HARDENING PHASE 3: Quotas & Billing Enforcement
-- Date: October 16, 2025
-- Purpose: Enforce per-tenant quotas at database layer
-- =====================================================

-- =====================================================
-- 1. QUOTA ENFORCEMENT FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION enforce_quota_and_increment(
  p_feature_code TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
VOLATILE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_feature_id UUID;
  v_quota_limit INTEGER;
  v_quota_used INTEGER;
  v_quota_reset_at TIMESTAMPTZ;
BEGIN
  -- Guard: Must have valid tenant context
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'SECURITY VIOLATION: No tenant context available';
  END IF;
  
  -- Get feature ID
  SELECT id INTO v_feature_id 
  FROM features 
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    RAISE EXCEPTION 'Unknown or inactive feature: %', p_feature_code
      USING ERRCODE = '22023'; -- invalid_parameter_value
  END IF;

  -- Lock the entitlement row for update (prevents race conditions)
  SELECT quota_limit, quota_used, quota_reset_at
  INTO v_quota_limit, v_quota_used, v_quota_reset_at
  FROM tenant_entitlements
  WHERE tenant_id = v_tenant_id 
    AND feature_id = v_feature_id
  FOR UPDATE;

  -- Check if record exists
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Tenant % not entitled to feature %', v_tenant_id, p_feature_code
      USING ERRCODE = '42501'; -- insufficient_privilege
  END IF;

  -- If quota_limit is NULL, it means unlimited usage
  IF v_quota_limit IS NULL THEN
    -- Still increment for tracking, but don't enforce
    UPDATE tenant_entitlements
    SET quota_used = COALESCE(quota_used, 0) + p_amount,
        updated_at = NOW()
    WHERE tenant_id = v_tenant_id
      AND feature_id = v_feature_id;
    RETURN;
  END IF;

  -- Check if quota has reset (monthly reset logic)
  IF v_quota_reset_at IS NOT NULL AND v_quota_reset_at < NOW() THEN
    -- Reset quota
    v_quota_used := 0;
    v_quota_reset_at := (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ;
    
    UPDATE tenant_entitlements
    SET quota_used = 0,
        quota_reset_at = v_quota_reset_at,
        updated_at = NOW()
    WHERE tenant_id = v_tenant_id
      AND feature_id = v_feature_id;
  END IF;

  -- Check if adding p_amount would exceed quota
  IF (v_quota_used + p_amount) > v_quota_limit THEN
    RAISE EXCEPTION 'QUOTA EXCEEDED: Feature "%" quota limit reached (used: %, limit: %, attempting: %)', 
      p_feature_code, v_quota_used, v_quota_limit, p_amount
      USING 
        ERRCODE = '53400', -- configuration_limit_exceeded
        HINT = 'Please upgrade your plan or wait for quota reset';
  END IF;

  -- Increment quota usage
  UPDATE tenant_entitlements
  SET quota_used = v_quota_used + p_amount,
      updated_at = NOW()
  WHERE tenant_id = v_tenant_id
    AND feature_id = v_feature_id;
END;
$$;

COMMENT ON FUNCTION enforce_quota_and_increment(TEXT, INTEGER) IS 
  'Enforces quota limits for a feature before allowing an action.
   Raises exception if quota is exceeded.
   If quota_limit IS NULL, usage is unlimited (but still tracked).
   Automatically resets quota if past quota_reset_at date.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created enforce_quota_and_increment() function';
END $$;

-- =====================================================
-- 2. QUOTA CHECK FUNCTION (Non-enforcing, for UI)
-- =====================================================

CREATE OR REPLACE FUNCTION check_quota_status(p_feature_code TEXT)
RETURNS TABLE (
  quota_limit INTEGER,
  quota_used INTEGER,
  quota_remaining INTEGER,
  quota_reset_at TIMESTAMPTZ,
  is_near_limit BOOLEAN,
  is_exceeded BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_tenant_id UUID := current_tenant_id();
  v_feature_id UUID;
  v_limit INTEGER;
  v_used INTEGER;
  v_reset TIMESTAMPTZ;
BEGIN
  -- Get feature ID
  SELECT id INTO v_feature_id 
  FROM features 
  WHERE code = p_feature_code AND is_active = true;
  
  IF v_feature_id IS NULL THEN
    RETURN;
  END IF;

  -- Get quota info
  SELECT te.quota_limit, te.quota_used, te.quota_reset_at
  INTO v_limit, v_used, v_reset
  FROM tenant_entitlements te
  WHERE te.tenant_id = v_tenant_id 
    AND te.feature_id = v_feature_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Return status
  RETURN QUERY
  SELECT 
    v_limit as quota_limit,
    v_used as quota_used,
    CASE 
      WHEN v_limit IS NULL THEN NULL -- Unlimited
      ELSE v_limit - v_used
    END as quota_remaining,
    v_reset as quota_reset_at,
    CASE
      WHEN v_limit IS NULL THEN false -- Unlimited
      WHEN v_used >= (v_limit * 0.85) THEN true -- >= 85% used
      ELSE false
    END as is_near_limit,
    CASE
      WHEN v_limit IS NULL THEN false -- Unlimited
      WHEN v_used >= v_limit THEN true
      ELSE false
    END as is_exceeded;
END;
$$;

COMMENT ON FUNCTION check_quota_status(TEXT) IS 
  'Returns current quota status for a feature.
   Used by UI to display usage warnings.
   is_near_limit = true when >= 85% used.';

DO $$
BEGIN
  RAISE NOTICE '✅ Created check_quota_status() function';
END $$;

-- =====================================================
-- 3. TRIGGER FOR MARKETING CAMPAIGN SENDS
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    -- CREATE OR REPLACE TRIGGER function
    CREATE OR REPLACE FUNCTION before_insert_marketing_send()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      v_feature_code TEXT;
    BEGIN
      -- Determine feature code based on channel
      v_feature_code := CASE NEW.channel
        WHEN 'email' THEN 'marketing' -- Base marketing quota for email
        WHEN 'sms' THEN 'marketing_sms'
        WHEN 'whatsapp' THEN 'marketing_whatsapp'
        ELSE 'marketing'
      END;

      -- Enforce quota before insert
      PERFORM enforce_quota_and_increment(v_feature_code, 1);

      -- If we reach here, quota check passed
      RETURN NEW;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log the error and re-raise
        RAISE NOTICE 'Quota enforcement failed for send %: %', NEW.id, SQLERRM;
        RAISE;
    END;
    $func$;

    -- Attach trigger
    DROP TRIGGER IF EXISTS trig_quota_marketing_send ON marketing_campaign_sends;
    CREATE OR REPLACE TRIGGER trig_quota_marketing_send
      BEFORE INSERT ON marketing_campaign_sends
      FOR EACH ROW
      EXECUTE FUNCTION before_insert_marketing_send();

    RAISE NOTICE '✅ Created quota trigger on marketing_campaign_sends';
  ELSE
    RAISE NOTICE 'ℹ️  marketing_campaign_sends table does not exist - skipping trigger';
  END IF;
END $$;

-- =====================================================
-- 4. TRIGGER FOR MARKETING CAMPAIGNS (Optional - count campaigns)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    -- CREATE OR REPLACE TRIGGER function to count campaigns
    CREATE OR REPLACE FUNCTION before_insert_marketing_campaign()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    BEGIN
      -- Optional: Enforce quota on number of campaigns created per month
      -- Uncomment if needed:
      -- PERFORM enforce_quota_and_increment('marketing_campaigns', 1);
      
      RETURN NEW;
    END;
    $func$;

    -- Note: Trigger creation commented out - enable if campaign count quota needed
    -- DROP TRIGGER IF EXISTS trig_quota_marketing_campaign ON marketing_campaigns;
    -- CREATE OR REPLACE TRIGGER trig_quota_marketing_campaign
    --   BEFORE INSERT ON marketing_campaigns
    --   FOR EACH ROW
    --   EXECUTE FUNCTION before_insert_marketing_campaign();

    RAISE NOTICE '✓ Marketing campaign quota trigger function created (not enabled)';
  END IF;
END $$;

-- =====================================================
-- 5. INITIALIZE QUOTA RESET DATES
-- =====================================================

-- Set initial quota_reset_at for existing entitlements
UPDATE tenant_entitlements
SET quota_reset_at = (DATE_TRUNC('month', NOW()) + INTERVAL '1 month')::TIMESTAMPTZ
WHERE quota_reset_at IS NULL
  AND quota_limit IS NOT NULL;

DO $$
BEGIN
  RAISE NOTICE '✅ Initialized quota reset dates for existing entitlements';
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== QUOTA SYSTEM VERIFICATION ===';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - enforce_quota_and_increment(feature_code, amount)';
  RAISE NOTICE '  - check_quota_status(feature_code)';
  RAISE NOTICE '';
  RAISE NOTICE 'Triggers created:';
  RAISE NOTICE '  - marketing_campaign_sends: before insert (enforces quota)';
  RAISE NOTICE '';
  RAISE NOTICE 'Behavior:';
  RAISE NOTICE '  - quota_limit NULL = unlimited';
  RAISE NOTICE '  - quota_limit set = enforced at DB layer';
  RAISE NOTICE '  - Auto-resets monthly';
  RAISE NOTICE '  - Raises exception on quota exceeded (SQLSTATE 53400)';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- TEST SCENARIO (Manual testing)
-- =====================================================

-- To test quota enforcement:
-- 1. Set a quota limit:
--    UPDATE tenant_entitlements 
--    SET quota_limit = 10, quota_used = 9
--    WHERE tenant_id = current_tenant_id()
--      AND feature_id = (SELECT id FROM features WHERE code = 'marketing');

-- 2. Check quota status:
--    SELECT * FROM check_quota_status('marketing');

-- 3. Try to exceed quota:
--    INSERT INTO marketing_campaign_sends (...);
--    -- Should fail with SQLSTATE 53400 if quota_used >= quota_limit

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 3 COMPLETE: Quotas & billing enforcement';
  RAISE NOTICE '   - Created enforce_quota_and_increment() (enforces limits)';
  RAISE NOTICE '   - Created check_quota_status() (for UI warnings)';
  RAISE NOTICE '   - Attached triggers to marketing_campaign_sends';
  RAISE NOTICE '   - Initialized quota reset dates';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Over-usage blocked at database layer';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  APPLICATION CHANGES NEEDED:';
  RAISE NOTICE '   1. UI: Show quota warnings when is_near_limit = true';
  RAISE NOTICE '   2. UI: Block actions when is_exceeded = true';
  RAISE NOTICE '   3. API: Catch SQLSTATE 53400 → return 402 Payment Required';
  RAISE NOTICE '   4. Admin: Set quota_limit in tenant_entitlements';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run Phase 4 migrations (Webhooks security)';
END $$;

