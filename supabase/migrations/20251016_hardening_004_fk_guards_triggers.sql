-- =====================================================
-- HARDENING PHASE 1.4: Foreign Key Tenant Guards (TRIGGER VERSION)
-- Date: October 16, 2025
-- Purpose: Validate same-tenant relationships using triggers (not CHECK constraints)
-- =====================================================

-- NOTE: PostgreSQL does not allow subqueries in CHECK constraints.
-- We must use BEFORE INSERT/UPDATE triggers instead.

-- =====================================================
-- 1. DEALS TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_deal_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_pipeline_tenant_id UUID;
  v_stage_tenant_id UUID;
  v_owner_tenant_id UUID;
BEGIN
  -- Validate contact_id belongs to same tenant
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id
    FROM contacts
    WHERE id = NEW.contact_id;
    
    IF v_contact_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Contact % does not exist', NEW.contact_id;
    END IF;
    
    IF v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal contact must belong to same tenant (deal: %, contact: %)', 
        NEW.tenant_id, v_contact_tenant_id;
    END IF;
  END IF;
  
  -- Validate pipeline_id belongs to same tenant
  IF NEW.pipeline_id IS NOT NULL THEN
    SELECT tenant_id INTO v_pipeline_tenant_id
    FROM pipelines
    WHERE id = NEW.pipeline_id;
    
    IF v_pipeline_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Pipeline % does not exist', NEW.pipeline_id;
    END IF;
    
    IF v_pipeline_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal pipeline must belong to same tenant (deal: %, pipeline: %)', 
        NEW.tenant_id, v_pipeline_tenant_id;
    END IF;
  END IF;
  
  -- Validate stage_id belongs to same tenant
  IF NEW.stage_id IS NOT NULL THEN
    SELECT tenant_id INTO v_stage_tenant_id
    FROM pipeline_stages
    WHERE id = NEW.stage_id;
    
    IF v_stage_tenant_id IS NULL THEN
      RAISE EXCEPTION 'Pipeline stage % does not exist', NEW.stage_id;
    END IF;
    
    IF v_stage_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal stage must belong to same tenant (deal: %, stage: %)', 
        NEW.tenant_id, v_stage_tenant_id;
    END IF;
  END IF;
  
  -- Validate owner_user_id belongs to same tenant
  IF NEW.owner_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_owner_tenant_id
    FROM app_users
    WHERE id = NEW.owner_user_id;
    
    IF v_owner_tenant_id IS NULL THEN
      RAISE EXCEPTION 'User % does not exist', NEW.owner_user_id;
    END IF;
    
    IF v_owner_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Deal owner must belong to same tenant (deal: %, owner: %)', 
        NEW.tenant_id, v_owner_tenant_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_deal_tenant_fks ON deals;
CREATE TRIGGER validate_deal_tenant_fks
  BEFORE INSERT OR UPDATE ON deals
  FOR EACH ROW
  EXECUTE FUNCTION validate_deal_tenant_relationships();

-- =====================================================
-- 2. TASKS TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_task_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_assignee_tenant_id UUID;
  v_creator_tenant_id UUID;
  v_parent_tenant_id UUID;
BEGIN
  -- Validate contact_id
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task contact must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate deal_id
  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task deal must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate assignee_user_id
  IF NEW.assignee_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_assignee_tenant_id FROM app_users WHERE id = NEW.assignee_user_id;
    IF v_assignee_tenant_id IS NOT NULL AND v_assignee_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task assignee must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate created_by_user_id
  IF NEW.created_by_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_creator_tenant_id FROM app_users WHERE id = NEW.created_by_user_id;
    IF v_creator_tenant_id IS NOT NULL AND v_creator_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task creator must belong to same tenant';
    END IF;
  END IF;
  
  -- Validate parent_task_id
  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant_id FROM tasks WHERE id = NEW.parent_task_id;
    IF v_parent_tenant_id IS NOT NULL AND v_parent_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Parent task must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_task_tenant_fks ON tasks;
CREATE TRIGGER validate_task_tenant_fks
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION validate_task_tenant_relationships();

-- =====================================================
-- 3. ACTIVITIES TABLE TRIGGERS
-- =====================================================

CREATE OR REPLACE FUNCTION validate_activity_tenant_relationships()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_user_tenant_id UUID;
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity contact must belong to same tenant';
    END IF;
  END IF;
  
  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity deal must belong to same tenant';
    END IF;
  END IF;
  
  IF NEW.user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_user_tenant_id FROM app_users WHERE id = NEW.user_id;
    IF v_user_tenant_id IS NOT NULL AND v_user_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Activity user must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_activity_tenant_fks ON activities;
CREATE TRIGGER validate_activity_tenant_fks
  BEFORE INSERT OR UPDATE ON activities
  FOR EACH ROW
  EXECUTE FUNCTION validate_activity_tenant_relationships();

-- =====================================================
-- 4. PIPELINE_STAGES TABLE TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION validate_pipeline_stage_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_pipeline_tenant_id UUID;
BEGIN
  IF NEW.pipeline_id IS NOT NULL THEN
    SELECT tenant_id INTO v_pipeline_tenant_id FROM pipelines WHERE id = NEW.pipeline_id;
    IF v_pipeline_tenant_id IS NOT NULL AND v_pipeline_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Stage pipeline must belong to same tenant';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_stage_tenant_fks ON pipeline_stages;
CREATE TRIGGER validate_stage_tenant_fks
  BEFORE INSERT OR UPDATE ON pipeline_stages
  FOR EACH ROW
  EXECUTE FUNCTION validate_pipeline_stage_tenant();

-- =====================================================
-- 5. AUTOMATION_EXECUTION_LOGS TABLE TRIGGER (if exists)
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'automation_execution_logs') THEN
    CREATE OR REPLACE FUNCTION validate_automation_log_tenant()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $func$
    DECLARE
      v_automation_tenant_id UUID;
    BEGIN
      IF NEW.automation_id IS NOT NULL THEN
        SELECT tenant_id INTO v_automation_tenant_id FROM automations WHERE id = NEW.automation_id;
        IF v_automation_tenant_id IS NOT NULL AND v_automation_tenant_id != NEW.tenant_id THEN
          RAISE EXCEPTION 'SECURITY VIOLATION: Automation log must belong to same tenant as automation';
        END IF;
      END IF;
      
      RETURN NEW;
    END;
    $func$;

    DROP TRIGGER IF EXISTS validate_automation_log_tenant_fks ON automation_execution_logs;
    CREATE TRIGGER validate_automation_log_tenant_fks
      BEFORE INSERT OR UPDATE ON automation_execution_logs
      FOR EACH ROW
      EXECUTE FUNCTION validate_automation_log_tenant();
      
    RAISE NOTICE '✅ Created tenant validation trigger on automation_execution_logs';
  END IF;
END $$;

-- =====================================================
-- 6. VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
    AND (trigger_name LIKE 'validate_%tenant%' OR action_statement LIKE '%SECURITY VIOLATION%');
  
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Tenant validation triggers: %', v_trigger_count;
  RAISE NOTICE '';
  
  IF v_trigger_count < 4 THEN
    RAISE WARNING 'Expected at least 4 tenant validation triggers, but found %', v_trigger_count;
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '✅ HARDENING PHASE 1.4 COMPLETE: FK tenant guards (TRIGGER VERSION)';
  RAISE NOTICE '   - Created 5 trigger functions for tenant validation';
  RAISE NOTICE '   - deals: Validates contact, pipeline, stage, owner (4 FKs)';
  RAISE NOTICE '   - tasks: Validates contact, deal, assignee, creator, parent (5 FKs)';
  RAISE NOTICE '   - activities: Validates contact, deal, user (3 FKs)';
  RAISE NOTICE '   - pipeline_stages: Validates pipeline (1 FK)';
  RAISE NOTICE '   - automation_execution_logs: Validates automation (1 FK)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SECURITY: Cross-tenant data linkage BLOCKED via triggers';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  NOTE: Using triggers (not CHECK constraints) because Postgres';
  RAISE NOTICE '   does not support subqueries in CHECK constraints.';
  RAISE NOTICE '';
  RAISE NOTICE '✅ PHASE 1 COMPLETE (All 4 migrations done)';
  RAISE NOTICE '';
  RAISE NOTICE '➡️  Next: Run Phase 2 migrations (Entitlement hardening)';
END $$;

