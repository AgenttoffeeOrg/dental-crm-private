-- =====================================================================
-- Phase 2b.57.2 — Dashboard perf + deal activity trigger
-- =====================================================================
-- Addresses the perf HIGHs from the 2b.36-56 code review:
--
--   HIGH #3 / #4 — Three dashboard components independently pull up
--     to 5000 activity rows into the browser every 60s and reduce
--     client-side ("replies needed", "unread inbound", "avg response
--     time 7d"). At the 10-client launch milestone this is ~10k rows
--     per dashboard mount. Replaced with three RPCs that aggregate
--     server-side and return scalars / small lists.
--
--   HIGH #5 — The 2b.56 Kanban loader pulls 5000 activity rows per
--     deals-page load to derive `real_last_activity_at`. The audit
--     P1-A flagged this — `deals.last_activity_at` exists but no
--     trigger maintains it. A trigger fixes the root cause: the
--     Kanban can then read the column directly.
--
--   HIGH #7 — `metadata->>'ai_attachment_uncertain' = 'true'` filter
--     (used by the AI-Needs-Your-Eye triage lane) sequential-scans
--     `activities` on every dashboard mount. Partial index avoids it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TRIGGER — keep deals.last_activity_at fresh on activity insert/update
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_deal_last_activity_at()
RETURNS TRIGGER AS $$
BEGIN
  -- We only care about real customer-facing activities for the
  -- "last touched" signal — notes/meetings/tasks count too, calls
  -- count, emails count, SMS counts. Everything except soft-deletes.
  IF NEW.deal_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.deals
     SET last_activity_at = GREATEST(
           COALESCE(last_activity_at, NEW.occurred_at),
           NEW.occurred_at
         )
   WHERE id = NEW.deal_id
     AND tenant_id = NEW.tenant_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_activities_touch_deal_last_activity ON public.activities;
CREATE TRIGGER trg_activities_touch_deal_last_activity
  AFTER INSERT OR UPDATE OF deal_id, occurred_at ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.touch_deal_last_activity_at();

-- One-time backfill so every existing deal carries a correct
-- last_activity_at after this migration. Cheap: single GROUP BY
-- scan over activities.
UPDATE public.deals d
   SET last_activity_at = sub.max_occurred_at
  FROM (
    SELECT deal_id, MAX(occurred_at) AS max_occurred_at
      FROM public.activities
     WHERE deal_id IS NOT NULL
     GROUP BY deal_id
  ) sub
 WHERE d.id = sub.deal_id
   AND (d.last_activity_at IS NULL OR d.last_activity_at < sub.max_occurred_at);

COMMENT ON FUNCTION public.touch_deal_last_activity_at IS
  'Phase 2b.57.2 — Maintains deals.last_activity_at so dashboard + Kanban can read the column directly instead of MAX(activities.occurred_at) scans. Resolves audit P1-A.';

-- ---------------------------------------------------------------------
-- INDEX — partial index for the AI-Needs-Your-Eye triage lane
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS activities_ai_attachment_uncertain_idx
  ON public.activities (tenant_id)
  WHERE metadata->>'ai_attachment_uncertain' = 'true';

COMMENT ON INDEX public.activities_ai_attachment_uncertain_idx IS
  'Phase 2b.57.2 — Partial index for the dashboard AI-Needs-Your-Eye triage lane filter (HIGH #7). Tiny because the predicate matches a small subset.';

-- ---------------------------------------------------------------------
-- RPC — dashboard_replies_needed_count
-- ---------------------------------------------------------------------
-- For the metric strip's "Replies needed" number AND the triage
-- lane "Unread inbound" card. Both need the same shape — last-
-- direction-per-contact within a window — with optional age cutoff.
--
-- Parameters:
--   p_tenant_id       — required.
--   p_window_days     — how far back to scan (14 for unread lane,
--                       14 for metric strip).
--   p_min_age_hours   — when > 0, only count contacts whose most-
--                       recent inbound is at least this old (4 for
--                       the metric strip's "we're losing them"
--                       threshold; 0 for the unread lane).
--
-- Returns a single integer count.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dashboard_replies_needed_count(
  p_tenant_id uuid,
  p_window_days integer DEFAULT 14,
  p_min_age_hours integer DEFAULT 0
)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH last_per_contact AS (
    SELECT DISTINCT ON (contact_id)
           contact_id,
           direction,
           occurred_at
      FROM public.activities
     WHERE tenant_id = p_tenant_id
       AND contact_id IS NOT NULL
       AND direction IN ('inbound', 'outbound')
       AND occurred_at >= NOW() - (p_window_days || ' days')::interval
     ORDER BY contact_id, occurred_at DESC
  )
  SELECT COUNT(*)::integer
    FROM last_per_contact
   WHERE direction = 'inbound'
     AND (p_min_age_hours = 0
          OR occurred_at <= NOW() - (p_min_age_hours || ' hours')::interval);
$$;

COMMENT ON FUNCTION public.dashboard_replies_needed_count IS
  'Phase 2b.57.2 — Server-side aggregation for the dashboard replies-needed metric + unread-inbound triage lane. Replaces a 2000-row client scan per 60s refresh.';

-- ---------------------------------------------------------------------
-- RPC — dashboard_avg_response_minutes
-- ---------------------------------------------------------------------
-- For the metric strip's "Avg response (7d)" number. Pairs each
-- inbound with the first outbound after it (per contact), within the
-- window, and returns the mean diff in minutes. NULL if zero pairs.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.dashboard_avg_response_minutes(
  p_tenant_id uuid,
  p_window_days integer DEFAULT 7
)
RETURNS numeric
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH activities_window AS (
    SELECT contact_id, direction, occurred_at
      FROM public.activities
     WHERE tenant_id = p_tenant_id
       AND contact_id IS NOT NULL
       AND direction IN ('inbound', 'outbound')
       AND occurred_at >= NOW() - (p_window_days || ' days')::interval
     ORDER BY contact_id, occurred_at ASC
  ),
  -- For each outbound, find the most-recent prior inbound from the
  -- same contact within the window.
  paired AS (
    SELECT a.contact_id,
           a.occurred_at AS outbound_at,
           (
             SELECT MAX(b.occurred_at)
               FROM activities_window b
              WHERE b.contact_id = a.contact_id
                AND b.direction = 'inbound'
                AND b.occurred_at < a.occurred_at
           ) AS prior_inbound_at
      FROM activities_window a
     WHERE a.direction = 'outbound'
  ),
  -- Keep only the first outbound after each inbound (so we don't
  -- credit subsequent outbounds against the same inbound).
  first_outbound_per_inbound AS (
    SELECT DISTINCT ON (contact_id, prior_inbound_at)
           contact_id,
           prior_inbound_at,
           outbound_at
      FROM paired
     WHERE prior_inbound_at IS NOT NULL
     ORDER BY contact_id, prior_inbound_at, outbound_at ASC
  )
  SELECT AVG(EXTRACT(EPOCH FROM (outbound_at - prior_inbound_at)) / 60.0)
    FROM first_outbound_per_inbound;
$$;

COMMENT ON FUNCTION public.dashboard_avg_response_minutes IS
  'Phase 2b.57.2 — Server-side average inbound→outbound response time for the dashboard metric strip. Replaces a 1000-row client scan per 60s refresh.';
