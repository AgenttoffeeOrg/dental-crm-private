-- =====================================================================
-- Phase 2b.69 — Morning digest dedup column
-- =====================================================================
-- The morning digest cron fires hourly and sends to any tenant whose
-- local-time hour is 8. The check has minute-level slack (catches
-- the 8:00-8:59 window) which means a tenant could see the same
-- 8am tick twice if a clock skew + DST + cron retries align.
--
-- Dedup column on app_users: track the last DATE we sent the digest
-- for this user. Cron skips when last_sent == today (tenant-local).
-- One column add; no schema rebuild needed.
-- =====================================================================

ALTER TABLE public.app_users
  ADD COLUMN IF NOT EXISTS task_morning_digest_last_sent_date date;

COMMENT ON COLUMN public.app_users.task_morning_digest_last_sent_date IS
  'Phase 2b.69 — Last DATE the morning task digest was sent to this user. Dedup guard so an hourly cron tick that catches the 8am window twice (clock skew / DST / retry) doesn''t double-send.';
