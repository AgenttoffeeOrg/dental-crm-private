-- Phase 2a.8 — Allow custom treatment offerings.
--
-- Background: `practice_treatment_offerings.treatment_type_id` was historically
-- declared NOT NULL, which made every offering bound to one of the 20 canonical
-- entries in `treatment_types`. The 2a.8 Settings UI introduces "custom"
-- offerings (e.g. "Sleep Dentistry", "Same-day Smile Package") that practices
-- can name themselves. Those rows have NULL `treatment_type_id` and a
-- user-supplied `custom_label` instead.
--
-- We relax the column and add a CHECK constraint so the data integrity invariant
-- ("every offering has either a canonical type OR a user-supplied label")
-- continues to hold at the database layer rather than relying on the application.
--
-- Phase 2a.8 also depends on `is_active` for the row-level toggle. That column
-- already exists on this table (boolean NOT NULL DEFAULT true) — see migration
-- 20260503_phase_2a_1_foundations.sql — so no schema change is needed for it.

BEGIN;

ALTER TABLE public.practice_treatment_offerings
  ALTER COLUMN treatment_type_id DROP NOT NULL;

ALTER TABLE public.practice_treatment_offerings
  ADD CONSTRAINT practice_treatment_offerings_canonical_or_custom_chk
  CHECK (treatment_type_id IS NOT NULL OR custom_label IS NOT NULL);

COMMENT ON COLUMN public.practice_treatment_offerings.treatment_type_id IS
  'FK to treatment_types.id for canonical UK treatments. NULL for custom offerings; in that case custom_label is required (enforced by practice_treatment_offerings_canonical_or_custom_chk).';

COMMENT ON COLUMN public.practice_treatment_offerings.custom_label IS
  'Practice-overridable display name. Required when treatment_type_id IS NULL (custom offering). Optional override of treatment_types.display_name when treatment_type_id IS NOT NULL.';

COMMIT;
