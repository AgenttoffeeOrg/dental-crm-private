-- =====================================================
-- HARDENING PHASE 1.3: RLS Policy Reset & Consistency
-- Date: October 16, 2025
-- Purpose: Apply consistent RLS policies to all tenant-scoped tables
-- =====================================================

-- =====================================================
-- MACRO: Standard RLS Policies for Tenant-Scoped Tables
-- =====================================================
-- Pattern:
-- SELECT: tenant_id = current_tenant_id() AND is_not_deleted(deleted_at)
-- INSERT: tenant_id = current_tenant_id()
-- UPDATE: tenant_id = current_tenant_id()
-- DELETE: tenant_id = current_tenant_id() AND user_has_role(ARRAY['owner','super_admin','admin'])

-- =====================================================
-- 1. CONTACTS
-- =====================================================

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_select ON contacts;
DROP POLICY IF EXISTS contacts_insert ON contacts;
DROP POLICY IF EXISTS contacts_update ON contacts;
DROP POLICY IF EXISTS contacts_delete ON contacts;
DROP POLICY IF EXISTS contacts_service_role ON contacts;

CREATE POLICY contacts_select ON contacts
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY contacts_insert ON contacts
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY contacts_update ON contacts
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY contacts_delete ON contacts
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

-- Service role bypass
CREATE POLICY contacts_service_role ON contacts
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 2. DEALS
-- =====================================================

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deals_select ON deals;
DROP POLICY IF EXISTS deals_insert ON deals;
DROP POLICY IF EXISTS deals_update ON deals;
DROP POLICY IF EXISTS deals_delete ON deals;
DROP POLICY IF EXISTS deals_service_role ON deals;

CREATE POLICY deals_select ON deals
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY deals_insert ON deals
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY deals_update ON deals
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY deals_delete ON deals
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY deals_service_role ON deals
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 3. PIPELINES
-- =====================================================

ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipelines_select ON pipelines;
DROP POLICY IF EXISTS pipelines_insert ON pipelines;
DROP POLICY IF EXISTS pipelines_update ON pipelines;
DROP POLICY IF EXISTS pipelines_delete ON pipelines;
DROP POLICY IF EXISTS pipelines_service_role ON pipelines;

CREATE POLICY pipelines_select ON pipelines
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY pipelines_insert ON pipelines
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipelines_update ON pipelines
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipelines_delete ON pipelines
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY pipelines_service_role ON pipelines
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 4. PIPELINE_STAGES
-- =====================================================

ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pipeline_stages_select ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_insert ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_update ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_delete ON pipeline_stages;
DROP POLICY IF EXISTS pipeline_stages_service_role ON pipeline_stages;

CREATE POLICY pipeline_stages_select ON pipeline_stages
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY pipeline_stages_insert ON pipeline_stages
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipeline_stages_update ON pipeline_stages
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY pipeline_stages_delete ON pipeline_stages
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY pipeline_stages_service_role ON pipeline_stages
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 5. TASKS
-- =====================================================

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tasks_select ON tasks;
DROP POLICY IF EXISTS tasks_insert ON tasks;
DROP POLICY IF EXISTS tasks_update ON tasks;
DROP POLICY IF EXISTS tasks_delete ON tasks;
DROP POLICY IF EXISTS tasks_service_role ON tasks;

CREATE POLICY tasks_select ON tasks
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY tasks_insert ON tasks
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY tasks_update ON tasks
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY tasks_delete ON tasks
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY tasks_service_role ON tasks
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 6. ACTIVITIES
-- =====================================================

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activities_select ON activities;
DROP POLICY IF EXISTS activities_insert ON activities;
DROP POLICY IF EXISTS activities_update ON activities;
DROP POLICY IF EXISTS activities_delete ON activities;
DROP POLICY IF EXISTS activities_service_role ON activities;

CREATE POLICY activities_select ON activities
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY activities_insert ON activities
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY activities_update ON activities
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY activities_delete ON activities
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY activities_service_role ON activities
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 7. CALLS
-- =====================================================

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calls_select ON calls;
DROP POLICY IF EXISTS calls_insert ON calls;
DROP POLICY IF EXISTS calls_update ON calls;
DROP POLICY IF EXISTS calls_delete ON calls;
DROP POLICY IF EXISTS calls_service_role ON calls;

CREATE POLICY calls_select ON calls
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY calls_insert ON calls
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY calls_update ON calls
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY calls_delete ON calls
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY calls_service_role ON calls
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 8. FILES
-- =====================================================

ALTER TABLE files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS files_select ON files;
DROP POLICY IF EXISTS files_insert ON files;
DROP POLICY IF EXISTS files_update ON files;
DROP POLICY IF EXISTS files_delete ON files;
DROP POLICY IF EXISTS files_service_role ON files;

CREATE POLICY files_select ON files
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY files_insert ON files
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY files_update ON files
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY files_delete ON files
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY files_service_role ON files
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 9. NOTES
-- =====================================================

ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notes_select ON notes;
DROP POLICY IF EXISTS notes_insert ON notes;
DROP POLICY IF EXISTS notes_update ON notes;
DROP POLICY IF EXISTS notes_delete ON notes;
DROP POLICY IF EXISTS notes_service_role ON notes;

CREATE POLICY notes_select ON notes
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY notes_insert ON notes
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY notes_update ON notes
  FOR UPDATE
  USING (tenant_id = current_tenant_id());

CREATE POLICY notes_delete ON notes
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY notes_service_role ON notes
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 10. LOCATIONS
-- =====================================================

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS locations_select ON locations;
DROP POLICY IF EXISTS locations_insert ON locations;
DROP POLICY IF EXISTS locations_update ON locations;
DROP POLICY IF EXISTS locations_delete ON locations;
DROP POLICY IF EXISTS locations_service_role ON locations;

CREATE POLICY locations_select ON locations
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY locations_insert ON locations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY locations_update ON locations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY locations_delete ON locations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin'])
  );

CREATE POLICY locations_service_role ON locations
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 11. AUTOMATIONS (Base policies - entitlement in Phase 2)
-- =====================================================

ALTER TABLE automations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automations_select ON automations;
DROP POLICY IF EXISTS automations_insert ON automations;
DROP POLICY IF EXISTS automations_update ON automations;
DROP POLICY IF EXISTS automations_delete ON automations;
DROP POLICY IF EXISTS automations_service_role ON automations;

CREATE POLICY automations_select ON automations
  FOR SELECT
  USING (tenant_id = current_tenant_id() AND is_not_deleted(deleted_at));

CREATE POLICY automations_insert ON automations
  FOR INSERT
  WITH CHECK (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automations_update ON automations
  FOR UPDATE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin', 'manager'])
  );

CREATE POLICY automations_delete ON automations
  FOR DELETE
  USING (
    tenant_id = current_tenant_id()
    AND user_has_role(ARRAY['owner', 'super_admin', 'admin'])
  );

CREATE POLICY automations_service_role ON automations
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- 12. AUTOMATION_EXECUTION_LOGS
-- =====================================================

ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS automation_logs_select ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_insert ON automation_execution_logs;
DROP POLICY IF EXISTS automation_logs_service_role ON automation_execution_logs;

CREATE POLICY automation_logs_select ON automation_execution_logs
  FOR SELECT
  USING (tenant_id = current_tenant_id());

CREATE POLICY automation_logs_insert ON automation_execution_logs
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

CREATE POLICY automation_logs_service_role ON automation_execution_logs
  FOR ALL
  USING (auth.role() = 'service_role');

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_rls_count INTEGER;
  v_policy_count INTEGER;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*) INTO v_rls_count
  FROM pg_tables
  WHERE schemaname = 'public'
    AND rowsecurity = true;
  
  -- Count RLS policies
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RLS VERIFICATION ===';
  RAISE NOTICE 'Tables with RLS enabled: %', v_rls_count;
  RAISE NOTICE 'Total RLS policies: %', v_policy_count;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.3 COMPLETE: RLS policies reset';
  RAISE NOTICE '   - Applied consistent RLS to 12 core tables';
  RAISE NOTICE '   - SELECT: tenant filter + soft delete check';
  RAISE NOTICE '   - INSERT: tenant filter';
  RAISE NOTICE '   - UPDATE: tenant filter';
  RAISE NOTICE '   - DELETE: tenant filter + admin role check';
  RAISE NOTICE '   - Service role bypass for all tables';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: Marketing tables will get entitlement checks in Phase 2';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run 20251016_hardening_004_fk_guards.sql';
END $$;

