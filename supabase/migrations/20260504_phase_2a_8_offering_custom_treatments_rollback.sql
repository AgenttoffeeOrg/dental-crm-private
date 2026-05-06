-- Phase 2a.8 — Rollback: re-tighten treatment_type_id to NOT NULL.
--
-- Safe only if no custom offerings exist (treatment_type_id IS NULL with custom_label).
-- Will fail loudly if any custom offerings exist.

BEGIN;

ALTER TABLE public.practice_treatment_offerings
  DROP CONSTRAINT IF EXISTS practice_treatment_offerings_canonical_or_custom_chk;

ALTER TABLE public.practice_treatment_offerings
  ALTER COLUMN treatment_type_id SET NOT NULL;

COMMIT;
