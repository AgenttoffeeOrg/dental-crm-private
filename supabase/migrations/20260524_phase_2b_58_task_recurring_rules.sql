-- =====================================================================
-- Phase 2b.58 — task_recurring_rules
-- =====================================================================
-- The `tasks.recurring_rule_id` column has existed for a while but the
-- table it points to does NOT. Caught by the rebuild audit. Any task
-- that tried to set recurring_rule_id would have FK-errored.
--
-- Shape per audit recommendation: hybrid — simple columns (frequency
-- + interval) cover ~95% of cases (weekly cleaning reminders,
-- monthly insurance check-ins). An rrule jsonb field is the escape
-- hatch for the rare custom cadence that doesn't fit a simple enum.
-- This avoids forcing every recurring task through an RRULE-parse
-- code path while still permitting RFC-5545-style flexibility when
-- needed.
--
-- A separate cron will be wired in a future phase to materialise the
-- "next instance" of a recurring task on the prior instance's
-- completion. v1 stops at the schema; UI work is in phase 2b.63 (the
-- queue UX) where Edit / Create surface the recurrence picker.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.task_recurring_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  -- Simple cadence (covers daily / weekly / monthly).
  frequency           text NOT NULL
                        CHECK (frequency IN ('daily', 'weekly', 'monthly', 'custom')),
  -- 1 = every interval, 2 = every other, etc. NULL when frequency='custom'.
  interval_count      integer CHECK (interval_count IS NULL OR interval_count > 0),
  -- For weekly: which days of the week (0=Sunday … 6=Saturday). NULL = every day.
  weekly_days         integer[] CHECK (
                        weekly_days IS NULL
                        OR (weekly_days <@ ARRAY[0,1,2,3,4,5,6])
                      ),
  -- For monthly: which day of the month (1-31). NULL = same day-of-month
  -- as the origin task.
  monthly_day         integer CHECK (monthly_day IS NULL OR (monthly_day BETWEEN 1 AND 31)),
  -- Custom cadence escape hatch (RFC 5545 RRULE string when frequency='custom').
  rrule               text,
  -- Optional cap: end the series after N occurrences OR after a date.
  occurrences_limit   integer CHECK (occurrences_limit IS NULL OR occurrences_limit > 0),
  ends_at             timestamptz,
  -- Bookkeeping.
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  -- Either simple cadence OR a custom rrule, not both null.
  CONSTRAINT task_recurring_rules_kind_check CHECK (
    (frequency != 'custom' AND interval_count IS NOT NULL)
    OR (frequency = 'custom' AND rrule IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS task_recurring_rules_tenant_idx
  ON public.task_recurring_rules (tenant_id);

CREATE OR REPLACE FUNCTION public.touch_task_recurring_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_task_recurring_rules_updated_at
  ON public.task_recurring_rules;
CREATE TRIGGER trg_task_recurring_rules_updated_at
  BEFORE UPDATE ON public.task_recurring_rules
  FOR EACH ROW EXECUTE FUNCTION public.touch_task_recurring_rules_updated_at();

-- =====================================================================
-- RLS — same pattern as tenant_ai_context (2b.13).
-- =====================================================================

ALTER TABLE public.task_recurring_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS task_recurring_rules_select ON public.task_recurring_rules;
CREATE POLICY task_recurring_rules_select
  ON public.task_recurring_rules
  FOR SELECT
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS task_recurring_rules_insert ON public.task_recurring_rules;
CREATE POLICY task_recurring_rules_insert
  ON public.task_recurring_rules
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS task_recurring_rules_update ON public.task_recurring_rules;
CREATE POLICY task_recurring_rules_update
  ON public.task_recurring_rules
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS task_recurring_rules_delete ON public.task_recurring_rules;
CREATE POLICY task_recurring_rules_delete
  ON public.task_recurring_rules
  FOR DELETE
  USING (false);

COMMENT ON TABLE public.task_recurring_rules IS
  'Phase 2b.58 — Backing table for tasks.recurring_rule_id (the FK target had been missing). Hybrid shape: simple frequency+interval cols for the common case, rrule text for custom cadences. Service-role writes only.';
