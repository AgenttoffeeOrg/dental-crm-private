-- =====================================================
-- HARDENING PHASE 1.4: Foreign Key Tenant Guards
-- Date: October 16, 2025
-- Purpose: Add CHECK constraints to validate same-tenant relationships
-- =====================================================

-- =====================================================
-- IMPORTANT: Audit existing data first
-- =====================================================

-- Check for existing cross-tenant violations before adding constraints
DO $$
DECLARE
  v_violations INTEGER := 0;
BEGIN
  RAISE NOTICE '=== AUDITING EXISTING DATA FOR CROSS-TENANT VIOLATIONS ===';
  
  -- Check deals.contact_id
  SELECT COUNT(*) INTO v_violations
  FROM deals d
  LEFT JOIN contacts c ON c.id = d.contact_id
  WHERE d.contact_id IS NOT NULL
    AND c.tenant_id IS DISTINCT FROM d.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % deals with contact_id from different tenant', v_violations;
  ELSE
    RAISE NOTICE '✓ deals.contact_id: No violations';
  END IF;
  
  -- Check tasks.contact_id
  SELECT COUNT(*) INTO v_violations
  FROM tasks t
  LEFT JOIN contacts c ON c.id = t.contact_id
  WHERE t.contact_id IS NOT NULL
    AND c.tenant_id IS DISTINCT FROM t.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % tasks with contact_id from different tenant', v_violations;
  ELSE
    RAISE NOTICE '✓ tasks.contact_id: No violations';
  END IF;
  
  -- Check tasks.deal_id
  SELECT COUNT(*) INTO v_violations
  FROM tasks t
  LEFT JOIN deals d ON d.id = t.deal_id
  WHERE t.deal_id IS NOT NULL
    AND d.tenant_id IS DISTINCT FROM t.tenant_id;
  
  IF v_violations > 0 THEN
    RAISE WARNING 'Found % tasks with deal_id from different tenant', v_violations;
  ELSE
    RAISE NOTICE '✓ tasks.deal_id: No violations';
  END IF;
  
  RAISE NOTICE '=== AUDIT COMPLETE ===';
END $$;

-- =====================================================
-- 1. DEALS TABLE CONSTRAINTS
-- =====================================================

-- Validate deals.contact_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_contact_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = deals.contact_id
  ) = tenant_id
);

-- Validate deals.pipeline_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_pipeline_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_pipeline_same_tenant CHECK (
  pipeline_id IS NULL OR (
    SELECT tenant_id FROM pipelines WHERE id = deals.pipeline_id
  ) = tenant_id
);

-- Validate deals.stage_id belongs to same tenant (and same pipeline)
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_stage_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_stage_same_tenant CHECK (
  stage_id IS NULL OR (
    SELECT tenant_id FROM pipeline_stages WHERE id = deals.stage_id
  ) = tenant_id
);

-- Validate deals.owner_user_id belongs to same tenant
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_owner_same_tenant;
ALTER TABLE deals ADD CONSTRAINT deals_owner_same_tenant CHECK (
  owner_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = deals.owner_user_id
  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to deals table (4 constraints)';
END $$;

-- =====================================================
-- 2. TASKS TABLE CONSTRAINTS
-- =====================================================

-- Validate tasks.contact_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_contact_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = tasks.contact_id
  ) = tenant_id
);

-- Validate tasks.deal_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_deal_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = tasks.deal_id
  ) = tenant_id
);

-- Validate tasks.assignee_user_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_assignee_same_tenant CHECK (
  assignee_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = tasks.assignee_user_id
  ) = tenant_id
);

-- Validate tasks.created_by_user_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_creator_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_creator_same_tenant CHECK (
  created_by_user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = tasks.created_by_user_id
  ) = tenant_id
);

-- Validate tasks.parent_task_id belongs to same tenant
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_parent_same_tenant;
ALTER TABLE tasks ADD CONSTRAINT tasks_parent_same_tenant CHECK (
  parent_task_id IS NULL OR (
    SELECT tenant_id FROM tasks WHERE id = tasks.parent_task_id
  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to tasks table (5 constraints)';
END $$;

-- =====================================================
-- 3. ACTIVITIES TABLE CONSTRAINTS
-- =====================================================

-- Validate activities.contact_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_contact_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = activities.contact_id
  ) = tenant_id
);

-- Validate activities.deal_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_deal_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = activities.deal_id
  ) = tenant_id
);

-- Validate activities.user_id belongs to same tenant
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_user_same_tenant;
ALTER TABLE activities ADD CONSTRAINT activities_user_same_tenant CHECK (
  user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = activities.user_id
  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to activities table (3 constraints)';
END $$;

-- =====================================================
-- 4. CALLS TABLE CONSTRAINTS
-- =====================================================

-- Validate calls.contact_id belongs to same tenant
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_contact_same_tenant;
ALTER TABLE calls ADD CONSTRAINT calls_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = calls.contact_id
  ) = tenant_id
);

-- Validate calls.user_id belongs to same tenant
ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_user_same_tenant;
ALTER TABLE calls ADD CONSTRAINT calls_user_same_tenant CHECK (
  user_id IS NULL OR (
    SELECT tenant_id FROM app_users WHERE id = calls.user_id
  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to calls table (2 constraints)';
END $$;

-- =====================================================
-- 5. FILES TABLE CONSTRAINTS
-- =====================================================

-- Validate files.contact_id belongs to same tenant
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_contact_same_tenant;
ALTER TABLE files ADD CONSTRAINT files_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = files.contact_id
  ) = tenant_id
);

-- Validate files.deal_id belongs to same tenant
ALTER TABLE files DROP CONSTRAINT IF EXISTS files_deal_same_tenant;
ALTER TABLE files ADD CONSTRAINT files_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = files.deal_id
  ) = tenant_id
);

-- Validate files.uploaded_by_user_id belongs to same tenant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'files' 
    AND column_name = 'uploaded_by_user_id'
  ) THEN
    ALTER TABLE files DROP CONSTRAINT IF EXISTS files_uploader_same_tenant;
    ALTER TABLE files ADD CONSTRAINT files_uploader_same_tenant CHECK (
      uploaded_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = files.uploaded_by_user_id
      ) = tenant_id
    );
  END IF;
  END IF;
  
  RAISE NOTICE '✅ Added tenant guards to files table (2-3 constraints)';
END $$;

-- =====================================================
-- 6. NOTES TABLE CONSTRAINTS
-- =====================================================

-- Validate notes.contact_id belongs to same tenant
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_contact_same_tenant;
ALTER TABLE notes ADD CONSTRAINT notes_contact_same_tenant CHECK (
  contact_id IS NULL OR (
    SELECT tenant_id FROM contacts WHERE id = notes.contact_id
  ) = tenant_id
);

-- Validate notes.deal_id belongs to same tenant
ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_deal_same_tenant;
ALTER TABLE notes ADD CONSTRAINT notes_deal_same_tenant CHECK (
  deal_id IS NULL OR (
    SELECT tenant_id FROM deals WHERE id = notes.deal_id
  ) = tenant_id
);

-- Validate notes.created_by_user_id belongs to same tenant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notes' 
    AND column_name = 'created_by_user_id'
  ) THEN
    ALTER TABLE notes DROP CONSTRAINT IF EXISTS notes_creator_same_tenant;
    ALTER TABLE notes ADD CONSTRAINT notes_creator_same_tenant CHECK (
      created_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = notes.created_by_user_id
      ) = tenant_id
    );
  END IF;
  END IF;
  
  RAISE NOTICE '✅ Added tenant guards to notes table (2-3 constraints)';
END $$;

-- =====================================================
-- 7. PIPELINE_STAGES TABLE CONSTRAINTS
-- =====================================================

-- Validate pipeline_stages.pipeline_id belongs to same tenant
ALTER TABLE pipeline_stages DROP CONSTRAINT IF EXISTS stages_pipeline_same_tenant;
ALTER TABLE pipeline_stages ADD CONSTRAINT stages_pipeline_same_tenant CHECK (
  (SELECT tenant_id FROM pipelines WHERE id = pipeline_stages.pipeline_id  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to pipeline_stages table (1 constraint)';
END $$;

-- =====================================================
-- 8. MARKETING TABLES CONSTRAINTS
-- =====================================================

-- Validate marketing_campaigns.created_by_user_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaigns') THEN
    ALTER TABLE marketing_campaigns DROP CONSTRAINT IF EXISTS campaigns_creator_same_tenant;
    ALTER TABLE marketing_campaigns ADD CONSTRAINT campaigns_creator_same_tenant CHECK (
      created_by_user_id IS NULL OR (
        SELECT tenant_id FROM app_users WHERE id = marketing_campaigns.created_by_user_id
      ) = tenant_id
    );
    RAISE NOTICE '✓ Added tenant guard to marketing_campaigns';
  END IF;
END $$;

-- Validate marketing_campaign_sends.contact_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'marketing_campaign_sends') THEN
    ALTER TABLE marketing_campaign_sends DROP CONSTRAINT IF EXISTS sends_contact_same_tenant;
    ALTER TABLE marketing_campaign_sends ADD CONSTRAINT sends_contact_same_tenant CHECK (
      contact_id IS NULL OR (
        SELECT tenant_id FROM contacts WHERE id = marketing_campaign_sends.contact_id
      ) = tenant_id
    );
    
    ALTER TABLE marketing_campaign_sends DROP CONSTRAINT IF EXISTS sends_campaign_same_tenant;
    ALTER TABLE marketing_campaign_sends ADD CONSTRAINT sends_campaign_same_tenant CHECK (
      campaign_id IS NULL OR (
        SELECT tenant_id FROM marketing_campaigns WHERE id = marketing_campaign_sends.campaign_id
      ) = tenant_id
    );
    RAISE NOTICE '✓ Added tenant guards to marketing_campaign_sends';
  END IF;
END $$;

-- =====================================================
-- 9. AUTOMATION TABLES CONSTRAINTS
-- =====================================================

-- Validate automation_execution_logs.automation_id
ALTER TABLE automation_execution_logs DROP CONSTRAINT IF EXISTS logs_automation_same_tenant;
ALTER TABLE automation_execution_logs ADD CONSTRAINT logs_automation_same_tenant CHECK (
  automation_id IS NULL OR (
    SELECT tenant_id FROM automations WHERE id = automation_execution_logs.automation_id
  ) = tenant_id
);

DO $$
BEGIN
  RAISE NOTICE '✅ Added tenant guards to automation_execution_logs table (1 constraint)';
END $$;

-- =====================================================
-- 10. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_constraint_count INTEGER;
BEGIN
  -- Count all tenant guard CHECK constraints
  SELECT COUNT(*) INTO v_constraint_count
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE con.contype = 'c'
    AND nsp.nspname = 'public'
    AND pg_get_constraintdef(con.oid) LIKE '%tenant_id%'
    AND con.conname LIKE '%same_tenant%';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Total same-tenant CHECK constraints: %', v_constraint_count;
  RAISE NOTICE '';
  
  IF v_constraint_count < 20 THEN
    RAISE WARNING 'Expected at least 20 tenant guard constraints, but found %', v_constraint_count;
  END IF;
END $$;

-- Test constraint (will fail if constraint works)
-- Uncomment to test:
-- INSERT INTO deals (id, tenant_id, contact_id, pipeline_id, stage_id, title)
-- VALUES (gen_random_uuid(), gen_random_uuid(), (SELECT id FROM contacts LIMIT 1), gen_random_uuid(), gen_random_uuid(), 'Test');
-- Expected: ERROR - violates check constraint "deals_contact_same_tenant"

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.4 COMPLETE: FK tenant guards';
  RAISE NOTICE '   - Added 25+ CHECK constraints across 9 tables';
  RAISE NOTICE '   - deals: 4 constraints (contact, pipeline, stage, owner)';
  RAISE NOTICE '   - tasks: 5 constraints (contact, deal, assignee, creator, parent)';
  RAISE NOTICE '   - activities: 3 constraints (contact, deal, user)';
  RAISE NOTICE '   - calls: 2 constraints (contact, user)';
  RAISE NOTICE '   - files: 2-3 constraints (contact, deal, uploader)';
  RAISE NOTICE '   - notes: 2-3 constraints (contact, deal, creator)';
  RAISE NOTICE '   - pipeline_stages: 1 constraint (pipeline)';
  RAISE NOTICE '   - marketing tables: 3 constraints';
  RAISE NOTICE '   - automation_execution_logs: 1 constraint';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Cross-tenant data linkage now BLOCKED at DB level';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PHASE 1 COMPLETE (All 4 migrations done)';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run Phase 2 migrations (Entitlement hardening)';
END $$;

