-- =============================================================================
-- Phase 2b.1.a — google_lead_form_configs ROLLBACK
-- =============================================================================
-- Drops everything created by 20260505_phase_2b_1_a_google_lead_form_configs.sql.
-- The trigger, indexes, and policies all live on the table, so DROP TABLE
-- CASCADE is sufficient. (set_updated_at() is shared with sibling tables and
-- must NOT be dropped here.)
-- =============================================================================

DROP TABLE IF EXISTS public.google_lead_form_configs CASCADE;
