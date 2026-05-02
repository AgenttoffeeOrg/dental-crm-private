-- BACK-FILL: this migration was applied to production via the Supabase MCP on
-- 2026-05-02. The original SQL is restored below from
-- supabase_migrations.schema_migrations.statements. This file exists so the
-- repo reflects production. No re-application is needed (already applied).
--
-- Refs: phase0/outputs/reconciliation_report.md §3.A, §6A-6

-- Original statements:

-- The tasks table has no created_by_user_id column (only assignee_user_id and owner_user_id),
-- but validate_task_tenant_relationships() still referenced NEW.created_by_user_id, causing
-- every INSERT/UPDATE on tasks to raise: record "new" has no field "created_by_user_id".
-- Patch removes the dead block; assignee_user_id and parent_task_id are still validated.
CREATE OR REPLACE FUNCTION public.validate_task_tenant_relationships()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_contact_tenant_id UUID;
  v_deal_tenant_id UUID;
  v_assignee_tenant_id UUID;
  v_parent_tenant_id UUID;
BEGIN
  IF NEW.contact_id IS NOT NULL THEN
    SELECT tenant_id INTO v_contact_tenant_id FROM contacts WHERE id = NEW.contact_id;
    IF v_contact_tenant_id IS NOT NULL AND v_contact_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task contact must belong to same tenant';
    END IF;
  END IF;

  IF NEW.deal_id IS NOT NULL THEN
    SELECT tenant_id INTO v_deal_tenant_id FROM deals WHERE id = NEW.deal_id;
    IF v_deal_tenant_id IS NOT NULL AND v_deal_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task deal must belong to same tenant';
    END IF;
  END IF;

  IF NEW.assignee_user_id IS NOT NULL THEN
    SELECT tenant_id INTO v_assignee_tenant_id FROM app_users WHERE id = NEW.assignee_user_id;
    IF v_assignee_tenant_id IS NOT NULL AND v_assignee_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Task assignee must belong to same tenant';
    END IF;
  END IF;

  IF NEW.parent_task_id IS NOT NULL THEN
    SELECT tenant_id INTO v_parent_tenant_id FROM tasks WHERE id = NEW.parent_task_id;
    IF v_parent_tenant_id IS NOT NULL AND v_parent_tenant_id != NEW.tenant_id THEN
      RAISE EXCEPTION 'SECURITY VIOLATION: Parent task must belong to same tenant';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
