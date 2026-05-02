SET search_path TO public, extensions;

-- =====================================================
-- HARDENING PHASE 2.3: Automations RLS with Combined Entitlements
-- Date: October 16, 2025
-- Purpose: Marketing automations require BOTH automations + marketing entitlements
-- =====================================================

-- =====================================================
-- COMBINED ENTITLEMENT LOGIC
-- =====================================================
-- - Base automations (deal, pipeline, task): require 'automations' only
-- - Marketing automations: require 'automations' AND 'marketing'
-- =====================================================

-- Drop existing automation policies
DROP POLICY IF EXISTS automations_select ON automations;
DROP POLICY IF EXISTS automations_insert ON automations;
DROP POLICY IF EXISTS automations_update ON automations;
DROP POLICY IF EXISTS automations_delete ON automations;
DROP POLICY IF EXISTS automations_service_role ON automations;

-- =====================================================
-- 1. AUTOMATIONS TABLE - COMBINED ENTITLEMENT CHECK
-- =====================================================

DROP POLICY IF EXISTS automations_select ON automations;
CREATE POLICY automations_select ON automations
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND is_not_deleted(deleted_at)
    AND check_entitlement('automations', false)
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_select ON automations IS 
  'SELECT: Requires automations entitlement. 
   If category=marketing, also requires marketing entitlement.';

DROP POLICY IF EXISTS automations_insert ON automations;
CREATE POLICY automations_insert ON automations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_insert ON automations IS 
  'INSERT: Requires automations entitlement + manager+ role. 
   If category=marketing, also requires marketing entitlement.';

DROP POLICY IF EXISTS automations_update ON automations;
CREATE POLICY automations_update ON automations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_update ON automations IS 
  'UPDATE: Requires automations entitlement + manager+ role. 
   If category=marketing, also requires marketing entitlement.';

DROP POLICY IF EXISTS automations_delete ON automations;
CREATE POLICY automations_delete ON automations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
    AND (
      -- Non-marketing automations: automations entitlement is sufficient
      category != 'marketing'
      OR
      -- Marketing automations: require BOTH entitlements
      (category = 'marketing' AND check_entitlement('marketing', false))
    )
  );

COMMENT ON POLICY automations_delete ON automations IS 
  'DELETE: Requires automations entitlement + admin role. 
   If category=marketing, also requires marketing entitlement.';

DROP POLICY IF EXISTS automations_service_role ON automations;
CREATE POLICY automations_service_role ON automations
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied combined entitlement RLS to automations table';
END $$;

-- =====================================================
-- 2. AUTOMATION_NODES (Supporting table)
-- =====================================================

ALTER TABLE automation_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_nodes_select ON automation_nodes;
DROP POLICY IF EXISTS automation_nodes_all ON automation_nodes;
DROP POLICY IF EXISTS automation_nodes_service ON automation_nodes;

DROP POLICY IF EXISTS automation_nodes_select ON automation_nodes;
CREATE POLICY automation_nodes_select ON automation_nodes
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_nodes_all ON automation_nodes;
CREATE POLICY automation_nodes_all ON automation_nodes
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS automation_nodes_service ON automation_nodes;
CREATE POLICY automation_nodes_service ON automation_nodes
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to automation_nodes';
END $$;

-- =====================================================
-- 3. AUTOMATION_EDGES (Supporting table)
-- =====================================================

ALTER TABLE automation_edges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_edges_select ON automation_edges;
DROP POLICY IF EXISTS automation_edges_all ON automation_edges;
DROP POLICY IF EXISTS automation_edges_service ON automation_edges;

DROP POLICY IF EXISTS automation_edges_select ON automation_edges;
CREATE POLICY automation_edges_select ON automation_edges
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_edges_all ON automation_edges;
CREATE POLICY automation_edges_all ON automation_edges
  FOR ALL
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager', 'marketing'])
  );

DROP POLICY IF EXISTS automation_edges_service ON automation_edges;
CREATE POLICY automation_edges_service ON automation_edges
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to automation_edges';
END $$;

-- =====================================================
-- 4. AUTOMATION_RUNS (Execution history)
-- =====================================================

ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_runs_select ON automation_runs;
DROP POLICY IF EXISTS automation_runs_insert ON automation_runs;
DROP POLICY IF EXISTS automation_runs_service ON automation_runs;

DROP POLICY IF EXISTS automation_runs_select ON automation_runs;
CREATE POLICY automation_runs_select ON automation_runs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_runs_insert ON automation_runs;
CREATE POLICY automation_runs_insert ON automation_runs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_runs_service ON automation_runs;
CREATE POLICY automation_runs_service ON automation_runs
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Applied entitlement RLS to automation_runs';
END $$;

-- =====================================================
-- 5. UPDATE AUTOMATION_EXECUTION_LOGS (Already has basic RLS)
-- =====================================================

-- Update existing policies to include entitlement check
DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
CREATE POLICY automation_logs_select ON automation_execution_logs
  FOR SELECT
  USING (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
CREATE POLICY automation_logs_insert ON automation_execution_logs
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND check_entitlement('automations', false)
  );

DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;
CREATE POLICY automation_logs_service_role ON automation_execution_logs
  FOR ALL
  USING (auth.role() = 'service_role');

DO $$
BEGIN
  RAISE NOTICE '✅ Updated entitlement RLS on automation_execution_logs';
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
-- TEST SCENARIOS (Document expected behavior)
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== ENTITLEMENT LOGIC ===';
  RAISE NOTICE '';
  RAISE NOTICE '1. User with NO automations entitlement:';
  RAISE NOTICE '   - Cannot see ANY automations (all categories)';
  RAISE NOTICE '   - All automation queries return 0 rows';
  RAISE NOTICE '';
  RAISE NOTICE '2. User with automations but NO marketing:';
  RAISE NOTICE '   - CAN see: deal, pipeline, task automations';
  RAISE NOTICE '   - CANNOT see: marketing automations';
  RAISE NOTICE '   - Marketing tab in UI should be hidden/locked';
  RAISE NOTICE '';
  RAISE NOTICE '3. User with automations AND marketing:';
  RAISE NOTICE '   - CAN see: ALL automations (all 4 categories)';
  RAISE NOTICE '   - All tabs visible and functional';
  RAISE NOTICE '';
  RAISE NOTICE '4. Service role (admin/background jobs):';
  RAISE NOTICE '   - Bypasses all entitlement checks';
  RAISE NOTICE '   - Can access all automation data';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 2.3 COMPLETE: Automations combined entitlements';
  RAISE NOTICE '   - automations: Combined entitlement check (automations + marketing for category=marketing)';
  RAISE NOTICE '   - automation_nodes: Requires automations';
  RAISE NOTICE '   - automation_edges: Requires automations';
  RAISE NOTICE '   - automation_runs: Requires automations';
  RAISE NOTICE '   - automation_execution_logs: Requires automations';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Marketing automations hidden without BOTH entitlements';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PHASE 2 (DB Layer) COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Implement API middleware (tRPC) and UI hooks';
END $$;

