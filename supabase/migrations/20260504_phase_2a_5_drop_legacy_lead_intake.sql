-- Phase 2a.5 — Drop the legacy lead-intake stack.
--
-- These tables and the RPC predate ingestLead() and were never wired to it.
-- The /api/webhooks/lead-intake route that wrote to them has already been
-- deleted from the tree. See Audit and Analysis/phase0/outputs/form_builder_audit.md
-- §4.1 endpoint #3 for the full backstory and the audit that uncovered them.
--
-- FK safety (verified live pre-migration, 2026-05-04):
--
--   deals.lead_intake_id       → lead_intakes    (100% null across all rows)
--   contacts.lead_source_id    → lead_sources    (100% null across all rows)
--   lead_intakes.lead_source_id → lead_sources   (internal)
--
-- View dependencies discovered during apply:
--
--   lead_pipeline_analytics — pure analytics view over lead_intakes /
--     lead_sources / dental_services / deals.lead_intake_id. Unreferenced
--     in src/; dropped outright since it cannot function once the
--     underlying tables are gone.
--
--   deals_with_contacts — canonical view used by src/components/deals/
--     deal-slide-in-panel.tsx and src/app/api/export/deals/route.ts. Still
--     needed; recreated below WITHOUT the d.lead_intake_id passthrough.
--
-- Both canonical-table columns are unreferenced in src/ (verified by grep),
-- so we drop the columns after dropping dependent views. lead_intakes /
-- lead_sources have zero rows, so no data loss.

BEGIN;

-- 1. Drop the pure-analytics view that is built entirely on top of the
--    vestigial stack. Nothing in src/ references it.
DROP VIEW IF EXISTS public.lead_pipeline_analytics;

-- 2. Drop the canonical deals_with_contacts view so we can drop
--    deals.lead_intake_id. We recreate it after the column is gone.
DROP VIEW IF EXISTS public.deals_with_contacts;

-- 3. Drop the FK columns on canonical tables. Nullable, 100% null,
--    unreferenced in src/ except the generated supabase.ts types (which
--    get regenerated after this migration).
ALTER TABLE public.deals    DROP COLUMN IF EXISTS lead_intake_id;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS lead_source_id;

-- 4. Drop the vestigial RPC.
DROP FUNCTION IF EXISTS public.auto_categorize_lead(text, uuid);

-- 5. Drop the vestigial tables. CASCADE is still used defensively to catch
--    any objects we didn't see during pre-flight.
DROP TABLE IF EXISTS public.lead_intakes CASCADE;
DROP TABLE IF EXISTS public.lead_sources CASCADE;

-- 6. Recreate deals_with_contacts without the lead_intake_id passthrough.
--    Column list matches the pre-existing definition (captured from
--    pg_views pre-migration) except d.lead_intake_id has been removed.
CREATE VIEW public.deals_with_contacts AS
SELECT d.id,
    d.tenant_id,
    d.contact_id,
    d.pipeline_id,
    d.stage_id,
    d.title,
    d.value_estimate_cents,
    d.currency,
    d.treatment_tags,
    d.owner_user_id,
    d.source,
    d.last_activity_at,
    d.created_at,
    d.updated_at,
    d.dental_service_id,
    d.deal_type,
    d.deposit_amount_cents,
    d.payment_plan,
    d.treatment_category,
    d.treatment_urgency,
    d.estimated_duration_weeks,
    d.pms_treatment_plan_id,
    d.pms_patient_id,
    d.pms_sync_status,
    d.consultation_scheduled,
    d.consultation_date,
    d.treatment_start_date,
    d.treatment_end_date,
    d.insurance_coverage,
    d.insurance_provider,
    d.insurance_authorization_number,
    d.insurance_coverage_percentage,
    d.follow_up_required,
    d.next_follow_up_date,
    d.internal_notes,
    d.patient_concerns,
    d.lead_score,
    d.conversion_probability,
    d.description,
    d.marketing_source_type,
    d.marketing_source_id,
    d.marketing_source_name,
    d.marketing_touchpoints,
    d.social_media_source_platform,
    d.social_media_source_post_id,
    d.social_media_source_interaction_id,
    d.pms_treatment_id,
    d.actual_revenue_cents,
    d.treatment_type,
    d.procedure_codes,
    d.location_id,
    d.deleted_at,
    d.status,
    d.owner_id,
    d.expected_close_date,
    c.full_name AS contact_name,
    c.primary_email AS contact_email,
    c.primary_phone AS contact_phone,
    c.tags AS contact_tags,
    c.source AS contact_source,
    p.name AS pipeline_name,
    s.name AS stage_name,
    s.position AS stage_position,
    u.full_name AS owner_name,
    u.email AS owner_email,
    loc.name AS location_name
FROM deals d
LEFT JOIN contacts c        ON d.contact_id = c.id
LEFT JOIN pipelines p       ON d.pipeline_id = p.id
LEFT JOIN pipeline_stages s ON d.stage_id = s.id
LEFT JOIN app_users u       ON d.owner_user_id = u.id
LEFT JOIN locations loc     ON d.location_id = loc.id;

COMMIT;
