-- =====================================================================
-- Phase 2b.59 — Schema additions for the tasks module rebuild
-- =====================================================================
-- Adds the substrate the next 11 phases build on. Everything here is
-- additive (new tables / new nullable columns / sensible defaults) so
-- nothing in the live tenants' behaviour changes until the UI for each
-- new field is wired up in a later phase.
--
-- Five blocks:
--   1. practice_groups + user_group_memberships — new concept for
--      job-function task assignment (Front Desk / TCs / Hygienists).
--   2. tasks.assigned_to_group_id + assigned_to_everyone — let the
--      shared-inbox model work alongside the existing assignee_user_id.
--   3. tasks.auto_completed_via_activity_id + source_activity_id —
--      audit hints for Path X auto-done (2b.64) and Path 1 AI-suggest
--      accepted (2b.61).
--   4. tasks.notified_at / notified_overdue_at / escalated_to_manager_at
--      — book-keeping so the notifications cron (2b.70) doesn't
--      re-ping the same task.
--   5. tenant_routing_settings.default_assignee_policy JSONB — tenant
--      default for who tasks get assigned to when auto-created.
--   6. push_subscriptions — net-new table for Web Push subscriptions
--      per user, used by the browser-push notifications phase (2b.70).
--   7. app_users.task_morning_digest_enabled + urgent_task_*_enabled
--      — per-user notification preferences toggleable from
--      /settings/notifications.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Block 1 — practice_groups + user_group_memberships
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.practice_groups (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS practice_groups_tenant_idx
  ON public.practice_groups (tenant_id);

CREATE OR REPLACE FUNCTION public.touch_practice_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_practice_groups_updated_at ON public.practice_groups;
CREATE TRIGGER trg_practice_groups_updated_at
  BEFORE UPDATE ON public.practice_groups
  FOR EACH ROW EXECUTE FUNCTION public.touch_practice_groups_updated_at();

ALTER TABLE public.practice_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS practice_groups_select ON public.practice_groups;
CREATE POLICY practice_groups_select
  ON public.practice_groups
  FOR SELECT
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS practice_groups_insert ON public.practice_groups;
CREATE POLICY practice_groups_insert
  ON public.practice_groups
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS practice_groups_update ON public.practice_groups;
CREATE POLICY practice_groups_update
  ON public.practice_groups
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS practice_groups_delete ON public.practice_groups;
CREATE POLICY practice_groups_delete
  ON public.practice_groups
  FOR DELETE USING (false);

COMMENT ON TABLE public.practice_groups IS
  'Phase 2b.59 — Job-function groups for task assignment (Front Desk, Treatment Coordinators, etc.). Orthogonal to user_tenant_memberships.role which is about permissions, not function. Service-role writes only (writes go via /api/practice-groups with practice_groups.manage permission).';

CREATE TABLE IF NOT EXISTS public.user_group_memberships (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  group_id    uuid NOT NULL REFERENCES public.practice_groups(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, user_id, group_id)
);

CREATE INDEX IF NOT EXISTS user_group_memberships_user_idx
  ON public.user_group_memberships (user_id);
CREATE INDEX IF NOT EXISTS user_group_memberships_group_idx
  ON public.user_group_memberships (group_id);

ALTER TABLE public.user_group_memberships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_group_memberships_select ON public.user_group_memberships;
CREATE POLICY user_group_memberships_select
  ON public.user_group_memberships
  FOR SELECT
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS user_group_memberships_insert ON public.user_group_memberships;
CREATE POLICY user_group_memberships_insert
  ON public.user_group_memberships
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS user_group_memberships_update ON public.user_group_memberships;
CREATE POLICY user_group_memberships_update
  ON public.user_group_memberships
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS user_group_memberships_delete ON public.user_group_memberships;
CREATE POLICY user_group_memberships_delete
  ON public.user_group_memberships
  FOR DELETE USING (false);

-- ---------------------------------------------------------------------
-- Block 2 — tasks group assignment + everyone shortcut
-- ---------------------------------------------------------------------

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS assigned_to_group_id uuid
    REFERENCES public.practice_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to_everyone boolean NOT NULL DEFAULT false;

-- The existing assignee_user_id stays. Tasks have ONE of:
--   assignee_user_id IS NOT NULL  → assigned to a specific person
--   assigned_to_group_id IS NOT NULL → assigned to a group
--   assigned_to_everyone = true   → shared inbox
-- (Mutually exclusive but we don't add a CHECK constraint until the
-- write paths in 2b.60+ are updated; legacy rows with null on all
-- three would break it.)

CREATE INDEX IF NOT EXISTS tasks_assigned_group_idx
  ON public.tasks (assigned_to_group_id)
  WHERE assigned_to_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS tasks_assigned_everyone_idx
  ON public.tasks (tenant_id)
  WHERE assigned_to_everyone = true;

-- ---------------------------------------------------------------------
-- Block 3 — Audit hints: auto-done source + AI-suggest source
-- ---------------------------------------------------------------------

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS auto_completed_via_activity_id uuid
    REFERENCES public.activities(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source_activity_id uuid
    REFERENCES public.activities(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.tasks.auto_completed_via_activity_id IS
  'Phase 2b.59 — Set when status transitions to done because the operator took an outbound action of the matching channel (Path X auto-done, 2b.64). Drives the "Auto-completed because you sent [activity]" hint + Reopen button.';

COMMENT ON COLUMN public.tasks.source_activity_id IS
  'Phase 2b.59 — Set when a task is created from accepting an AI commitment suggestion (Path 1, 2b.61) so the UI can link back to the originating message bubble.';

-- ---------------------------------------------------------------------
-- Block 4 — Notification bookkeeping
-- ---------------------------------------------------------------------

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified_overdue_at timestamptz,
  ADD COLUMN IF NOT EXISTS escalated_to_manager_at timestamptz;

-- Index for the due-now cron: find tasks whose due_at just crossed
-- without yet being notified.
CREATE INDEX IF NOT EXISTS tasks_due_not_notified_idx
  ON public.tasks (tenant_id, due_at)
  WHERE notified_at IS NULL
    AND status NOT IN ('done', 'cancelled', 'completed')
    AND due_at IS NOT NULL;

-- ---------------------------------------------------------------------
-- Block 5 — tenant_routing_settings.default_assignee_policy
-- ---------------------------------------------------------------------
-- JSONB rather than 3 separate columns (mode + group_id + nullable
-- everyone flag) so future additions (e.g. "round-robin within a
-- group", "fall back to manager if owner unset") don't require
-- another migration each time.
--
-- Shape:
--   { "mode": "contact_owner" | "group" | "everyone",
--     "group_id": "<uuid>" | null,
--     "fallback_user_id": "<uuid>" | null }
--
-- Default = contact_owner mode (matches the audit's Q1 recommendation).

ALTER TABLE public.tenant_routing_settings
  ADD COLUMN IF NOT EXISTS default_assignee_policy jsonb
    NOT NULL DEFAULT '{"mode": "contact_owner", "group_id": null, "fallback_user_id": null}'::jsonb;

COMMENT ON COLUMN public.tenant_routing_settings.default_assignee_policy IS
  'Phase 2b.59 — Tenant-wide default for who auto-created tasks get assigned to. Read by the playbook engine (2b.62) and the AI-suggest accept handler (2b.61).';

-- ---------------------------------------------------------------------
-- Block 6 — push_subscriptions for Web Push notifications
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.app_users(id) ON DELETE CASCADE,
  endpoint        text NOT NULL,
  p256dh          text NOT NULL,
  auth            text NOT NULL,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_used_at    timestamptz,
  UNIQUE (user_id, endpoint)
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_select ON public.push_subscriptions;
CREATE POLICY push_subscriptions_select
  ON public.push_subscriptions
  FOR SELECT
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS push_subscriptions_insert ON public.push_subscriptions;
CREATE POLICY push_subscriptions_insert
  ON public.push_subscriptions
  FOR INSERT WITH CHECK (false);

DROP POLICY IF EXISTS push_subscriptions_update ON public.push_subscriptions;
CREATE POLICY push_subscriptions_update
  ON public.push_subscriptions
  FOR UPDATE USING (false);

DROP POLICY IF EXISTS push_subscriptions_delete ON public.push_subscriptions;
CREATE POLICY push_subscriptions_delete
  ON public.push_subscriptions
  FOR DELETE USING (false);

COMMENT ON TABLE public.push_subscriptions IS
  'Phase 2b.59 — Web Push subscriptions per user. Populated when the operator grants browser-notification permission via /settings/notifications (2b.70). Used by /api/cron/task-notifications to dispatch due-now and overdue pings. Service-role writes only.';

-- ---------------------------------------------------------------------
-- Block 7 — User notification preferences on app_users
-- ---------------------------------------------------------------------

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS task_morning_digest_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS urgent_task_email_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS urgent_task_sms_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_overdue_alerts_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.app_users.task_morning_digest_enabled IS
  'Phase 2b.59 — Per-user toggle for the 8am tenant-local morning email digest of today''s tasks. Default ON; opt-out via /settings/notifications.';
COMMENT ON COLUMN public.app_users.urgent_task_email_enabled IS
  'Phase 2b.59 — Opt-in to email pings on urgent-priority tasks (in addition to the always-on browser push). Default OFF.';
COMMENT ON COLUMN public.app_users.urgent_task_sms_enabled IS
  'Phase 2b.59 — Opt-in to SMS pings on urgent-priority tasks (~£0.04 per send). Default OFF.';
COMMENT ON COLUMN public.app_users.manager_overdue_alerts_enabled IS
  'Phase 2b.59 — For managers/owners: notify when an urgent task assigned to a direct report goes overdue 24h+. Default ON.';
