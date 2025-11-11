-- =====================================================
-- HARDENING PHASE 2.2: Marketing RLS with Entitlement Checks
-- Date: October 16, 2025
-- Purpose: Apply entitlement checks to all marketing tables
-- =====================================================

-- =====================================================
-- Pattern: All marketing tables require 'marketing' entitlement
-- Nested add-ons (e.g., AB testing) require BOTH base + nested
-- =====================================================

-- =====================================================
-- 1. MARKETING_CAMPAIGNS
-- =====================================================

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_campaigns_select ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_insert ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_update ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_delete ON marketing_campaigns;
DROP POLICY IF EXISTS marketing_campaigns_service ON marketing_campaigns;

CREATE POLICY marketing_campaigns_select ON marketing_campaigns
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_campaigns_insert ON marketing_campaigns
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_campaigns_update ON marketing_campaigns
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_campaigns_delete ON marketing_campaigns
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_campaigns_service ON marketing_campaigns
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaigns';
END $$;

-- =====================================================
-- 2. MARKETING_TEMPLATES
-- =====================================================

ALTER TABLE marketing_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_templates_select ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_insert ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_update ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_delete ON marketing_templates;
DROP POLICY IF EXISTS marketing_templates_service ON marketing_templates;

CREATE POLICY marketing_templates_select ON marketing_templates
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_templates_insert ON marketing_templates
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_templates_update ON marketing_templates
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_templates_delete ON marketing_templates
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_templates_service ON marketing_templates
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to marketing_templates';
END $$;

-- =====================================================
-- 3. MARKETING_SEGMENTS
-- =====================================================

ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_segments_select ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_insert ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_update ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_delete ON marketing_segments;
DROP POLICY IF EXISTS marketing_segments_service ON marketing_segments;

CREATE POLICY marketing_segments_select ON marketing_segments
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_segments_insert ON marketing_segments
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_segments_update ON marketing_segments
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_segments_delete ON marketing_segments
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_segments_service ON marketing_segments
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to marketing_segments';
END $$;

-- =====================================================
-- 4. MARKETING_JOURNEYS
-- =====================================================

ALTER TABLE marketing_journeys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_journeys_select ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_insert ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_update ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_delete ON marketing_journeys;
DROP POLICY IF EXISTS marketing_journeys_service ON marketing_journeys;

CREATE POLICY marketing_journeys_select ON marketing_journeys
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_journeys_insert ON marketing_journeys
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_journeys_update ON marketing_journeys
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_journeys_delete ON marketing_journeys
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_journeys_service ON marketing_journeys
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to marketing_journeys';
END $$;

-- =====================================================
-- 5. MARKETING_FORMS
-- =====================================================

ALTER TABLE marketing_forms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_forms_select ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_insert ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_update ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_delete ON marketing_forms;
DROP POLICY IF EXISTS marketing_forms_service ON marketing_forms;

CREATE POLICY marketing_forms_select ON marketing_forms
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND is_not_deleted(deleted_at)
  );

CREATE POLICY marketing_forms_insert ON marketing_forms
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_forms_update ON marketing_forms
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
  );

CREATE POLICY marketing_forms_delete ON marketing_forms
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('marketing', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'marketing'])
  );

CREATE POLICY marketing_forms_service ON marketing_forms
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to marketing_forms';
END $$;

-- =====================================================
-- 6. MARKETING_CAMPAIGN_SENDS (Transactional table)
-- =====================================================

-- Note: No soft delete check here as this is a transactional log
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    ALTER TABLE marketing_campaign_sends ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_select ON marketing_campaign_sends';
    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_insert ON marketing_campaign_sends';
    EXECUTE 'DROP POLICY IF EXISTS marketing_sends_service ON marketing_campaign_sends';

    EXECUTE 'CREATE POLICY marketing_sends_select ON marketing_campaign_sends
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_sends_insert ON marketing_campaign_sends
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_sends_service ON marketing_campaign_sends
      FOR ALL
      USING (auth.role() = ''service_role'')';

    RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaign_sends';
  END IF;
END $$;

-- =====================================================
-- 7. MARKETING_CAMPAIGN_EVENTS (Transactional table)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_events') THEN
    ALTER TABLE marketing_campaign_events ENABLE ROW LEVEL SECURITY;

    EXECUTE 'DROP POLICY IF EXISTS marketing_events_select ON marketing_campaign_events';
    EXECUTE 'DROP POLICY IF EXISTS marketing_events_insert ON marketing_campaign_events';
    EXECUTE 'DROP POLICY IF EXISTS marketing_events_service ON marketing_campaign_events';

    EXECUTE 'CREATE POLICY marketing_events_select ON marketing_campaign_events
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_events_insert ON marketing_campaign_events
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement(''marketing'', false)
      )';

    EXECUTE 'CREATE POLICY marketing_events_service ON marketing_campaign_events
      FOR ALL
      USING (auth.role() = ''service_role'')';

    RAISE NOTICE '✅ Applied entitlement RLS to marketing_campaign_events';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_marketing_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_marketing_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'marketing_%';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Marketing table policies: %', v_marketing_policy_count;
  RAISE NOTICE '';
  
  IF v_marketing_policy_count = 0 THEN
    RAISE WARNING 'No marketing policies found - tables may not exist yet';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 2.2 COMPLETE: Marketing RLS with entitlements';
  RAISE NOTICE '   - Applied to: campaigns, templates, segments, journeys, forms';
  RAISE NOTICE '   - All SELECT/INSERT/UPDATE operations require marketing entitlement';
  RAISE NOTICE '   - DELETE restricted to owner/admin/marketing roles';
  RAISE NOTICE '   - Service role bypass for admin operations';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Marketing data hidden from non-entitled tenants';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_007_rls_automations_entitlement.sql';
END $$;

