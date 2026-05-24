-- Phase 2b.88 — notification_policies.manager_overdue_hours
-- Backs the Notifications → Policies tab's "Manager-overdue threshold"
-- input. NULL = cron uses the default (24h).
ALTER TABLE public.notification_policies
  ADD COLUMN IF NOT EXISTS manager_overdue_hours integer;

COMMENT ON COLUMN public.notification_policies.manager_overdue_hours IS
  'Phase 2b.88 — Hours an urgent task must be overdue before the manager-overdue cron escalates to the assignees manager. NULL = use cron default (24h).';
