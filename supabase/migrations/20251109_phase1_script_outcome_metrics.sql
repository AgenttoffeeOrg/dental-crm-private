-- =====================================================
-- PHASE 1: Script Outcome Metrics & Triggers
-- -----------------------------------------------------
-- Adds outcome aggregate columns to sales_script_versions,
-- refreshes the stats function to account for conversation
-- outcomes, and wires triggers to keep metrics current.
-- =====================================================

BEGIN;

ALTER TABLE sales_script_versions
  ADD COLUMN IF NOT EXISTS outcome_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS positive_outcome_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_revenue_cents BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_outcome_at TIMESTAMPTZ;

UPDATE sales_script_versions
SET
  outcome_count = COALESCE(outcome_count, 0),
  positive_outcome_count = COALESCE(positive_outcome_count, 0),
  total_revenue_cents = COALESCE(total_revenue_cents, 0);

ALTER TABLE sales_script_versions
  ALTER COLUMN outcome_count SET DEFAULT 0,
  ALTER COLUMN outcome_count SET NOT NULL,
  ALTER COLUMN positive_outcome_count SET DEFAULT 0,
  ALTER COLUMN positive_outcome_count SET NOT NULL,
  ALTER COLUMN total_revenue_cents SET DEFAULT 0,
  ALTER COLUMN total_revenue_cents SET NOT NULL;

CREATE OR REPLACE FUNCTION recompute_sales_script_version_stats(p_script_version_id UUID)
RETURNS VOID AS $$
DECLARE
  usage_summary RECORD;
  outcome_summary RECORD;
BEGIN
  SELECT
    COUNT(*) AS total_usage,
    COUNT(*) FILTER (WHERE helpful IS TRUE) AS helpful_usage,
    MAX(used_at) AS last_used
  INTO usage_summary
  FROM sales_script_usages
  WHERE script_version_id = p_script_version_id;

  SELECT
    COUNT(*) AS total_outcomes,
    COUNT(*) FILTER (WHERE outcome_type IN ('appointment_booked', 'deal_won')) AS positive_outcomes,
    MAX(occurred_at) AS last_outcome,
    SUM(revenue_cents) AS revenue_total
  INTO outcome_summary
  FROM conversation_outcomes co
  JOIN sales_script_usages su ON co.usage_id = su.id
  WHERE su.script_version_id = p_script_version_id;

  UPDATE sales_script_versions
  SET
    usage_count = COALESCE(usage_summary.total_usage, 0),
    helpful_count = COALESCE(usage_summary.helpful_usage, 0),
    outcome_count = COALESCE(outcome_summary.total_outcomes, 0),
    positive_outcome_count = COALESCE(outcome_summary.positive_outcomes, 0),
    total_revenue_cents = COALESCE(outcome_summary.revenue_total, 0),
    success_rate = CASE
      WHEN COALESCE(outcome_summary.total_outcomes, 0) > 0 THEN
        ROUND(
          COALESCE(outcome_summary.positive_outcomes, 0)::NUMERIC /
          NULLIF(COALESCE(outcome_summary.total_outcomes, 0), 0) * 100,
          2
        )
      WHEN COALESCE(usage_summary.total_usage, 0) > 0 THEN
        ROUND(
          COALESCE(usage_summary.helpful_usage, 0)::NUMERIC /
          NULLIF(COALESCE(usage_summary.total_usage, 0), 0) * 100,
          2
        )
      ELSE 0
    END,
    last_used_at = usage_summary.last_used,
    last_outcome_at = outcome_summary.last_outcome,
    updated_at = NOW()
  WHERE id = p_script_version_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_sales_script_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_version UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_version := OLD.script_version_id;
  ELSE
    target_version := NEW.script_version_id;
  END IF;

  IF target_version IS NOT NULL THEN
    PERFORM recompute_sales_script_version_stats(target_version);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trg_refresh_sales_script_stats_from_outcome()
RETURNS TRIGGER AS $$
DECLARE
  target_version UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT script_version_id INTO target_version
    FROM sales_script_usages
    WHERE id = OLD.usage_id;
  ELSE
    SELECT script_version_id INTO target_version
    FROM sales_script_usages
    WHERE id = NEW.usage_id;
  END IF;

  IF target_version IS NOT NULL THEN
    PERFORM recompute_sales_script_version_stats(target_version);
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_after_sales_script_usage ON sales_script_usages;
CREATE TRIGGER trg_after_sales_script_usage
AFTER INSERT OR UPDATE OR DELETE ON sales_script_usages
FOR EACH ROW EXECUTE FUNCTION trg_refresh_sales_script_stats();

DROP TRIGGER IF EXISTS trg_after_conversation_outcomes ON conversation_outcomes;
CREATE TRIGGER trg_after_conversation_outcomes
AFTER INSERT OR UPDATE OR DELETE ON conversation_outcomes
FOR EACH ROW EXECUTE FUNCTION trg_refresh_sales_script_stats_from_outcome();

COMMIT;


