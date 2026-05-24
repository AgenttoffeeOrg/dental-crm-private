-- Phase 2b.88 — Align tasks.status with the application schema.
-- The DB had a stale check constraint allowing only
-- (pending, in_progress, completed, cancelled), but the entire
-- application (UI, schema, queue, automation engine, cron) uses
-- (open, in_progress, done, cancelled). Every task insert with
-- status='open' or status='done' silently rejected.

ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;

UPDATE public.tasks SET status = 'open' WHERE status = 'pending';
UPDATE public.tasks SET status = 'done' WHERE status = 'completed';

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_status_check
  CHECK (status IN ('open', 'in_progress', 'done', 'cancelled'));

COMMENT ON COLUMN public.tasks.status IS
  'Phase 2b.88 — Aligned with application schema. Values: open | in_progress | done | cancelled.';
