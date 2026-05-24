-- =====================================================================
-- Phase 2b.72 — Schema additions for the Tasks follow-up build-out
-- =====================================================================
-- Three small column adds that unlock the deferred 2b.71 work:
--
--   1. tasks.snoozed_until — snooze persistence across devices.
--      Queue filters out tasks where snoozed_until > now().
--      Cleared on edit/reschedule.
--
--   2. tasks.last_recurring_generated_at — dedup for the recurring
--      next-instance generator (Phase 2b.75). Prevents the daily
--      cron from spawning two copies of the same rule on a single
--      tick.
--
--   3. app_users.manager_user_id — "who manages who" for the
--      manager-overdue alerts (Phase 2b.74). Nullable; if set,
--      points to the manager's app_users.id.
-- =====================================================================

-- 1. tasks.snoozed_until
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS snoozed_until timestamptz;

COMMENT ON COLUMN public.tasks.snoozed_until IS
  'Phase 2b.72 — Snooze persistence. Tasks where snoozed_until > now() are filtered out of the queue and dashboard "today" lane. Cleared automatically on reschedule (since due_at changes). Editing the task does not clear it.';

CREATE INDEX IF NOT EXISTS tasks_snoozed_until_idx
  ON public.tasks (snoozed_until)
  WHERE snoozed_until IS NOT NULL;

-- 2. tasks.last_recurring_generated_at
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS last_recurring_generated_at timestamptz;

COMMENT ON COLUMN public.tasks.last_recurring_generated_at IS
  'Phase 2b.72 — Stamped on the parent task when the recurring next-instance cron spawns a child. Dedup guard so the daily cron tick doesn''t create two copies of the same rule on a single firing.';

-- 3. app_users.manager_user_id
ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS manager_user_id uuid
    REFERENCES public.app_users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.app_users.manager_user_id IS
  'Phase 2b.72 — Optional pointer to the user''s manager (another app_users row). Drives the manager-overdue-task alerts cron (Phase 2b.74). NULL = no manager registered; the alert simply doesn''t fire for that user''s tasks.';

CREATE INDEX IF NOT EXISTS app_users_manager_user_id_idx
  ON public.app_users (manager_user_id)
  WHERE manager_user_id IS NOT NULL;
