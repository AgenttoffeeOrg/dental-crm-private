-- BACK-FILL: this migration was applied to production via the Supabase MCP on
-- 2026-05-02. The original SQL is restored below from
-- supabase_migrations.schema_migrations.statements. This file exists so the
-- repo reflects production. No re-application is needed (already applied).
--
-- Refs: phase0/outputs/reconciliation_report.md §3.A, §6A-6

-- Original statements:

-- Frontend reads from these two convenience views (joining tasks/deals with their
-- related entities). Both views were defined in the legacy /supabase/sql + migration
-- folders but never made it onto the live project, so the app's tasks page and deal
-- slide-in panel were failing with relation-does-not-exist.

CREATE OR REPLACE VIEW public.tasks_with_associations AS
SELECT
  t.*,
  c.full_name        AS contact_name,
  c.primary_email    AS contact_email,
  c.primary_phone    AS contact_phone,
  d.title            AS deal_title,
  u.full_name        AS assignee_name,
  u.email            AS assignee_email,
  loc.name           AS location_name,
  COALESCE((SELECT count(*) FROM public.tasks ct WHERE ct.parent_task_id = t.id), 0) AS subtask_count,
  COALESCE((SELECT count(*) FROM public.task_comments tc WHERE tc.task_id = t.id), 0) AS comment_count
FROM public.tasks t
LEFT JOIN public.contacts  c   ON t.contact_id        = c.id
LEFT JOIN public.deals     d   ON t.deal_id           = d.id
LEFT JOIN public.app_users u   ON t.assignee_user_id  = u.id
LEFT JOIN public.locations loc ON t.location_id       = loc.id;

CREATE OR REPLACE VIEW public.deals_with_contacts AS
SELECT
  d.*,
  c.full_name        AS contact_name,
  c.primary_email    AS contact_email,
  c.primary_phone    AS contact_phone,
  c.tags             AS contact_tags,
  c.source           AS contact_source,
  p.name             AS pipeline_name,
  s.name             AS stage_name,
  s.position         AS stage_position,
  u.full_name        AS owner_name,
  u.email            AS owner_email,
  loc.name           AS location_name
FROM public.deals d
LEFT JOIN public.contacts        c   ON d.contact_id     = c.id
LEFT JOIN public.pipelines       p   ON d.pipeline_id    = p.id
LEFT JOIN public.pipeline_stages s   ON d.stage_id       = s.id
LEFT JOIN public.app_users       u   ON d.owner_user_id  = u.id
LEFT JOIN public.locations       loc ON d.location_id    = loc.id;

GRANT SELECT ON public.tasks_with_associations TO authenticated, service_role, anon;
GRANT SELECT ON public.deals_with_contacts     TO authenticated, service_role, anon;

NOTIFY pgrst, 'reload schema';
