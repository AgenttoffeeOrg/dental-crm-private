-- =====================================================
-- HARDENING PHASE 2.3: Automations RLS (SAFE VERSION)
-- Date: October 16, 2025
-- Purpose: Apply entitlement RLS only to automation tables that exist AND have tenant_id
-- =====================================================

-- =====================================================
-- 1. AUTOMATIONS TABLE
-- =====================================================

DO $$
BEGIN
  -- Only apply if table exists and has tenant_id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automations'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automations' AND column_name = 'tenant_id'
  ) THEN
    
    RAISE NOTICE 'Applying combined entitlement RLS to automations table...';
    
    ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automations_select ON automations;
    DROP POLICY IF EXISTS automations_insert ON automations;
    DROP POLICY IF EXISTS automations_update ON automations;
    DROP POLICY IF EXISTS automations_delete ON automations;
    DROP POLICY IF EXISTS automations_service_role ON automations;

    -- SELECT: Requires automations entitlement
    -- If category='marketing', also requires marketing entitlement
    CREATE POLICY automations_select ON automations
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND is_not_deleted(deleted_at)
        AND check_entitlement('automations', false)
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_insert ON automations
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_update ON automations
      FOR UPDATE
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_delete ON automations
      FOR DELETE
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
        AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
        AND (
          category != 'marketing'
          OR
          (category = 'marketing' AND check_entitlement('marketing', false))
        )
      );

    CREATE POLICY automations_service_role ON automations
      FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE '✅ Applied combined entitlement RLS to automations table';
    
  ELSE
    RAISE NOTICE 'Skipping automations table (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- 2. AUTOMATION_EXECUTION_LOGS TABLE
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automation_execution_logs' AND column_name = 'tenant_id'
  ) THEN
    
    RAISE NOTICE 'Applying entitlement RLS to automation_execution_logs...';
    
    ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
    DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
    DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

    CREATE POLICY automation_logs_select ON automation_execution_logs
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_logs_insert ON automation_execution_logs
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_logs_service_role ON automation_execution_logs
      FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE '✅ Applied entitlement RLS to automation_execution_logs';
    
  ELSE
    RAISE NOTICE 'Skipping automation_execution_logs (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- 3. AUTOMATION_RUNS TABLE (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'automation_runs'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'automation_runs' AND column_name = 'tenant_id'
  ) THEN
    
    ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS automation_runs_select ON automation_runs;
    DROP POLICY IF EXISTS automation_runs_insert ON automation_runs;
    DROP POLICY IF EXISTS automation_runs_service ON automation_runs;

    CREATE POLICY automation_runs_select ON automation_runs
      FOR SELECT
      USING (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_runs_insert ON automation_runs
      FOR INSERT
      WITH CHECK (
        tenant_id = current_tenant_id()
        AND check_entitlement('automations', false)
      );

    CREATE POLICY automation_runs_service ON automation_runs
      FOR ALL
      USING (auth.role() = 'service_role');

    RAISE NOTICE '✅ Applied entitlement RLS to automation_runs';
  ELSE
    RAISE NOTICE 'Skipping automation_runs (does not exist or missing tenant_id)';
  END IF;
END $$;

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_automation_policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_automation_policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename LIKE 'automation%';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Automation table policies: %', v_automation_policy_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 2.3 COMPLETE: Automations combined entitlements';
  RAISE NOTICE '   - automations: Combined entitlement check';
  RAISE NOTICE '   - automation_execution_logs: Requires automations';
  RAISE NOTICE '   - automation_runs: Requires automations (if exists)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Marketing automations hidden without BOTH entitlements';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PHASE 2 (Entitlements) COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Phase 3-8 feature migrations';
END $$;

