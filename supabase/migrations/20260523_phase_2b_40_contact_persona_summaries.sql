-- =====================================================================
-- Phase 2b.40 — contact_persona_summaries
-- =====================================================================
-- One row per contact carrying a 2-3 sentence "what kind of person is
-- this" blurb generated from the contact's full conversation history.
-- Surfaced on the contact detail page (under the KPI strip) per the
-- 2026-05-23 product discussion.
--
-- This replaces the paused 2b.30.2 `contact_psych_profiles` schema
-- (which lived in a different shape and was never deployed on this
-- branch). It is intentionally lighter — no anxiety / trust / decision-
-- style sliders, just a short prose summary that helps a new operator
-- get up to speed on a contact in five seconds.
--
-- Refresh contract:
--   * `generated_at`     — when this row was written.
--   * `last_activity_seen_at` — the `occurred_at` of the most recent
--      activity included in the summary. The /persona-summary endpoint
--      compares this against MAX(activities.occurred_at) and forces a
--      regeneration when ≥5 new inbound/outbound activities have
--      arrived since (the "auto-refresh" rule from Q2 of the audit).
--   * `model_version`    — short identifier ("claude-haiku-4-5") so
--      future schema diffs can spot stale model output.
--
-- Storage choice (Q2 from rebuild audit):
--   * New table beats a column on `contacts` because we may later add
--     model_version / confidence / multi-persona variants without
--     churning the contacts table or its RLS.
--   * Unique on (tenant_id, contact_id) so there's at most one
--     summary per contact; regeneration is an UPSERT.
--
-- RLS pattern matches `tenant_ai_context` (2b.13):
--   SELECT → tenant_id IN get_accessible_tenants()
--   WRITE  → service-role only (the /api/contacts/[id]/persona-summary
--           POST endpoint uses createServiceClient + auth gate)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.contact_persona_summaries (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id                uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  summary                   text NOT NULL,
  generated_at              timestamptz NOT NULL DEFAULT now(),
  last_activity_seen_at     timestamptz,
  activities_seen_count     integer NOT NULL DEFAULT 0,
  model_version             text NOT NULL DEFAULT 'claude-haiku-4-5',
  is_fallback               boolean NOT NULL DEFAULT false,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contact_id)
);

CREATE INDEX IF NOT EXISTS contact_persona_summaries_tenant_contact_idx
  ON public.contact_persona_summaries (tenant_id, contact_id);

CREATE INDEX IF NOT EXISTS contact_persona_summaries_generated_at_idx
  ON public.contact_persona_summaries (generated_at DESC);

-- updated_at trigger (matches the project pattern used on contacts /
-- tenant_ai_context / etc.).
CREATE OR REPLACE FUNCTION public.touch_contact_persona_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_contact_persona_summaries_updated_at
  ON public.contact_persona_summaries;
CREATE TRIGGER trg_contact_persona_summaries_updated_at
  BEFORE UPDATE ON public.contact_persona_summaries
  FOR EACH ROW EXECUTE FUNCTION public.touch_contact_persona_summary_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================

ALTER TABLE public.contact_persona_summaries ENABLE ROW LEVEL SECURITY;

-- SELECT — any user with access to the tenant can see the summary.
DROP POLICY IF EXISTS contact_persona_summaries_select
  ON public.contact_persona_summaries;
CREATE POLICY contact_persona_summaries_select
  ON public.contact_persona_summaries
  FOR SELECT
  USING (tenant_id = ANY (public.get_accessible_tenants()));

-- WRITE — service-role only. The POST endpoint uses
-- createServiceClient() so it bypasses RLS (matches the pattern from
-- audit_trail / tenant_ai_context / lead_capture_settings).
DROP POLICY IF EXISTS contact_persona_summaries_insert
  ON public.contact_persona_summaries;
CREATE POLICY contact_persona_summaries_insert
  ON public.contact_persona_summaries
  FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS contact_persona_summaries_update
  ON public.contact_persona_summaries;
CREATE POLICY contact_persona_summaries_update
  ON public.contact_persona_summaries
  FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS contact_persona_summaries_delete
  ON public.contact_persona_summaries;
CREATE POLICY contact_persona_summaries_delete
  ON public.contact_persona_summaries
  FOR DELETE
  USING (false);

COMMENT ON TABLE public.contact_persona_summaries IS
  'Phase 2b.40 — AI-generated 2-3 sentence persona blurb per contact, displayed on the contact detail page. Service-role writes only (via /api/contacts/[id]/persona-summary).';
