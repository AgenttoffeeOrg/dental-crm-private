-- Phase 2a.5 — Drop three vestigial shadow tables.
--
-- 'stages' was an early prototype superseded by 'pipeline_stages'.
-- 'forms' / 'form_submissions' were superseded by 'marketing_forms' /
-- 'marketing_form_submissions'.
--
-- See pipelines_audit.md §7 Q5 and form_builder_audit.md §4 Q10 for context.
-- Any code referencing these has been removed in 2a; this migration removes
-- the now-orphan tables.
--
-- Pre-flight (verified live, 2026-05-04):
--
--   - No FK from any canonical table references these three tables.
--   - No views in public reference them.
--   - Zero rows in each.

BEGIN;

DROP TABLE IF EXISTS public.form_submissions CASCADE;
DROP TABLE IF EXISTS public.forms CASCADE;
DROP TABLE IF EXISTS public.stages CASCADE;

COMMIT;
