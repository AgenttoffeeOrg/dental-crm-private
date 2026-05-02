-- BACK-FILL: this migration was applied to production via the Supabase MCP on
-- 2026-05-02. The original SQL is restored below from
-- supabase_migrations.schema_migrations.statements. This file exists so the
-- repo reflects production. No re-application is needed (already applied).
--
-- Refs: phase0/outputs/reconciliation_report.md §3.A, §6A-6

-- Original statements:

-- The frontend (PostgREST) joins these *_user_id columns to app_users via embedded
-- selects like `owner:app_users!owner_user_id(*)`. Without an actual FK constraint
-- PostgREST returns: "Could not find a relationship between 'X' and 'app_users' in the schema cache".
-- Verified zero orphan rows on every column before adding these constraints.

ALTER TABLE public.deals
  ADD CONSTRAINT deals_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.contacts
  ADD CONSTRAINT contacts_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_assignee_user_id_fkey
  FOREIGN KEY (assignee_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_agent_user_id_fkey
  FOREIGN KEY (agent_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_edited_by_user_id_fkey
  FOREIGN KEY (edited_by_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.pipelines
  ADD CONSTRAINT pipelines_owner_user_id_fkey
  FOREIGN KEY (owner_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.marketing_campaigns
  ADD CONSTRAINT marketing_campaigns_created_by_user_id_fkey
  FOREIGN KEY (created_by_user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

ALTER TABLE public.audit_trail
  ADD CONSTRAINT audit_trail_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.app_users(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
