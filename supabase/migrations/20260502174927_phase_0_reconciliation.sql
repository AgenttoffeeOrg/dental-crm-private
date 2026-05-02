-- Phase 0 Reconciliation Migration
--
-- Purpose: Close the silent-failure gaps documented in
--   phase0/outputs/reconciliation_report.md (Section 6A).
-- Scope:
--   - Block 1.1: Extend public.activities.type CHECK to allow the values that
--     are written today (and the channel/system types Phase 1+2 will write).
--   - Block 1.2: Rename audit_competitors / audit_metrics / audit_recommendations
--     / audit_schedules to marketing_audit_*. Code already references the
--     marketing_audit_* names, so the rename closes a CRITICAL gap.
--   - Block 1.3: INTENTIONALLY EMPTY (treatment_routing_logs vs
--     treatment_tag_routing_logs is fixed in code; see Commit 4).
--   - Block 1.4: Create increment_form_submissions / increment_form_views RPCs
--     called by the marketing forms module.
--
-- Properties:
--   - Idempotent: every statement uses IF EXISTS / IF NOT EXISTS / DO blocks
--     or CREATE OR REPLACE. Running twice must succeed.
--   - Wrapped in BEGIN / COMMIT for atomic application.
--
-- Author: Phase 0 reconciliation, 2026-05-02.

BEGIN;

-- =====================================================================
-- Block 1.1 — Extend activities.type CHECK
-- =====================================================================
-- Reason: live CHECK only allows 6 values ('call','email','whatsapp','note',
-- 'sms','meeting'). Code already writes 'stage_change', 'assignment', and
-- 'form_submission' (silent failures today). Phase 1 channel ingestion and
-- Phase 2 voice integration will write the remaining values listed below.
-- Extending now to avoid a second migration later. Verified that all current
-- rows in public.activities have type IN the existing 6 values, so the
-- extension is purely additive.

DO $block_11$
DECLARE
  v_constraint_name text;
BEGIN
  -- Drop ALL CHECK constraints on public.activities whose check_clause
  -- mentions "type" but is not the "IS NOT NULL" guard. There should be
  -- exactly one (currently `activities_type_check`).
  FOR v_constraint_name IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name
     AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'activities'
      AND tc.constraint_type = 'CHECK'
      AND cc.check_clause ILIKE '%type%'
      AND cc.check_clause NOT ILIKE '%IS NOT NULL%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.activities DROP CONSTRAINT IF EXISTS %I',
      v_constraint_name
    );
  END LOOP;
END $block_11$;

ALTER TABLE public.activities
  ADD CONSTRAINT activities_type_check
  CHECK (type = ANY (ARRAY[
    -- Existing types (kept)
    'call', 'email', 'whatsapp', 'note', 'sms', 'meeting',
    -- Currently written by code but rejected today (CRITICAL fix)
    'stage_change', 'assignment', 'form_submission',
    -- Phase 1 channel types (lead capture from each channel)
    'meta_lead_received', 'google_lead_received',
    'instagram_dm', 'fb_messenger', 'web_chat',
    -- Phase 1 online booking types (CareStack contracts, deferred)
    'online_booking_completed', 'online_booking_abandoned',
    -- Phase 2 voice types (VoiceStack contracts, deferred)
    'voicestack_call', 'call_inbound_missed', 'call_outbound_made',
    -- Consent lifecycle types
    'consent_granted', 'consent_withdrawn',
    -- Manual / import
    'manual_entry', 'csv_import',
    -- System / audit types
    'task_created', 'task_completed',
    'email_opened', 'email_clicked',
    'appointment_scheduled', 'appointment_cancelled',
    'appointment_completed', 'appointment_no_show',
    'tag_added', 'tag_removed',
    'field_updated'
  ]::text[]));

-- Sanity (informational): rows that would violate the new CHECK
-- SELECT type, count(*) FROM public.activities GROUP BY type
--   HAVING type NOT IN ('call','email','whatsapp','note','sms','meeting',
--                       'stage_change','assignment','form_submission',
--                       'meta_lead_received','google_lead_received',
--                       'instagram_dm','fb_messenger','web_chat',
--                       'online_booking_completed','online_booking_abandoned',
--                       'voicestack_call','call_inbound_missed','call_outbound_made',
--                       'consent_granted','consent_withdrawn',
--                       'manual_entry','csv_import',
--                       'task_created','task_completed',
--                       'email_opened','email_clicked',
--                       'appointment_scheduled','appointment_cancelled',
--                       'appointment_completed','appointment_no_show',
--                       'tag_added','tag_removed','field_updated');


-- =====================================================================
-- Block 1.2 — Rename audit_* tables to marketing_audit_*
-- =====================================================================
-- Reason: code references marketing_audit_competitors, marketing_audit_metrics,
-- marketing_audit_recommendations, marketing_audit_schedules. DB has them
-- under audit_* prefix. Marketing-audit is a top-level product module
-- distinct from generic auditing (security audits, GDPR audits, audit_logs,
-- audit_trail), so the marketing_audit_* prefix is correct.
--
-- PostgreSQL's ALTER TABLE ... RENAME TO automatically updates incoming and
-- outgoing FK targets, sequences, triggers, RLS policies, and view
-- dependencies. Pre-flight verified the only FK relationships these four
-- tables have are OUTGOING to marketing_audit_runs (no incoming FKs from
-- other tables), so the rename is safe.

DO $block_12$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_competitors'
  ) THEN
    ALTER TABLE public.audit_competitors RENAME TO marketing_audit_competitors;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_metrics'
  ) THEN
    ALTER TABLE public.audit_metrics RENAME TO marketing_audit_metrics;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_recommendations'
  ) THEN
    ALTER TABLE public.audit_recommendations RENAME TO marketing_audit_recommendations;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_schedules'
  ) THEN
    ALTER TABLE public.audit_schedules RENAME TO marketing_audit_schedules;
  END IF;
END $block_12$;

-- Cosmetic: rename indexes that include the old table name so they don't
-- look orphaned. Idempotent: skip if the marketing_-prefixed name already
-- exists (i.e. a previous rename pass already happened).
DO $block_12_idx$
DECLARE
  r RECORD;
  new_name text;
BEGIN
  FOR r IN
    SELECT indexname, tablename
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND (
        indexname LIKE 'audit_competitors%' OR
        indexname LIKE 'audit_metrics%' OR
        indexname LIKE 'audit_recommendations%' OR
        indexname LIKE 'audit_schedules%'
      )
  LOOP
    new_name := 'marketing_' || r.indexname;
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname = 'public' AND indexname = new_name
    ) THEN
      EXECUTE format(
        'ALTER INDEX public.%I RENAME TO %I',
        r.indexname,
        new_name
      );
    END IF;
  END LOOP;
END $block_12_idx$;

-- Sanity (informational): any FKs still pointing at the old table names?
-- Should return zero rows after the rename.
-- SELECT conname, conrelid::regclass FROM pg_constraint
--   WHERE confrelid::regclass::text IN (
--     'audit_competitors','audit_metrics','audit_recommendations','audit_schedules'
--   );


-- =====================================================================
-- Block 1.3 — INTENTIONALLY EMPTY
-- =====================================================================
-- treatment_tag_routing_logs vs treatment_routing_logs is fixed in code
-- (single caller in src/app/api/treatment-routing/bulk-reroute/route.ts).
-- DB stays as treatment_routing_logs. See Commit 4.


-- =====================================================================
-- Block 1.4 — Create increment_form_submissions / increment_form_views RPCs
-- =====================================================================
-- Reason: the marketing forms module calls supabase.rpc('increment_form_*')
-- to bump per-form counters; the functions don't exist in the live DB so the
-- calls fail (errors are currently swallowed by call-site catches that
-- Commit 6 will tighten). Pre-flight verified marketing_forms.total_submissions
-- and marketing_forms.total_views both exist as nullable integer columns
-- with default 0; no schema change to marketing_forms is needed here.

CREATE OR REPLACE FUNCTION public.increment_form_submissions(form_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.marketing_forms
     SET total_submissions = COALESCE(total_submissions, 0) + 1,
         updated_at = now()
   WHERE id = form_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_form_views(form_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.marketing_forms
     SET total_views = COALESCE(total_views, 0) + 1,
         updated_at = now()
   WHERE id = form_id;
$$;

-- Forms can be viewed/submitted anonymously (public landing pages), so anon
-- needs EXECUTE on the counters. Service role and authenticated also.
GRANT EXECUTE ON FUNCTION public.increment_form_submissions(uuid)
  TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.increment_form_views(uuid)
  TO authenticated, anon, service_role;


COMMIT;
