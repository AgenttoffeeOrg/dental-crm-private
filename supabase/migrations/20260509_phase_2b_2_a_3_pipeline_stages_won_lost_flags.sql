-- ============================================================================
-- Phase 2b.2.a.3 — Terminal-stage flags on pipeline_stages
-- ============================================================================
-- Adds two boolean flags to `pipeline_stages` so the lead-ingestion engine
-- can answer "is this stage a Closed-Won / Closed-Lost (terminal) stage?"
-- without inspecting stage names. Used by the new
-- `findReusableOpenDeal()` helper in `src/lib/lead-ingestion/deal-creation.ts`
-- to decide whether an existing deal for a contact is still "open" and
-- therefore reusable for a new inbound lead.
--
-- Columns added (both default `false` so all existing stages are non-terminal
-- — current production stages are workflow positions like "Inquiry" /
-- "Consultation" / "Treatment Accepted", none of which are wins or losses):
--
--   * `is_won  boolean NOT NULL DEFAULT false`
--   * `is_lost boolean NOT NULL DEFAULT false`
--
-- Open-deal predicate used by the engine:
--   `COALESCE(is_won, false) = false AND COALESCE(is_lost, false) = false`
-- (the COALESCE is defence-in-depth — both columns are NOT NULL, but the
-- predicate stays correct if a future migration relaxes that.)
--
-- Discipline:
--   - Idempotent (`ADD COLUMN IF NOT EXISTS`).
--   - No backfill needed: `DEFAULT false` lands on every existing row at
--     ALTER time. Postgres ≥11 fast-paths NOT NULL + constant DEFAULT
--     additions without rewriting the table.
--   - No FK / view / RLS changes; existing tenant-scoped policies on
--     pipeline_stages still apply.
--   - `pipelines.is_default = true` is unchanged; this is a stage-level
--     flag, not a pipeline-level one.
--
-- Operator note: existing pipelines have NO won/lost stages today. To mark
-- a stage as Closed-Lost (e.g. for the Phase 2b.2.a.3 manual validation):
--
--   UPDATE public.pipeline_stages
--   SET is_lost = true
--   WHERE id = '<stage-id>';
--
-- Same for is_won. The Settings UI for editing stage flags is deferred to
-- a separate UX phase per §10 of `2b-2-a-3-changes.md`.
-- ============================================================================

ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS is_won boolean NOT NULL DEFAULT false;

ALTER TABLE public.pipeline_stages
  ADD COLUMN IF NOT EXISTS is_lost boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.pipeline_stages.is_won IS
  'When true, deals in this stage are considered Closed-Won (terminal). '
  'Read by lead-ingestion engine''s findReusableOpenDeal() to skip closed '
  'deals when looking for an open deal to reuse. Phase 2b.2.a.3.';

COMMENT ON COLUMN public.pipeline_stages.is_lost IS
  'When true, deals in this stage are considered Closed-Lost (terminal). '
  'Read by lead-ingestion engine''s findReusableOpenDeal() to skip closed '
  'deals when looking for an open deal to reuse. Phase 2b.2.a.3.';
