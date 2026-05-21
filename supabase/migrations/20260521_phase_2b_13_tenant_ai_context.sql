-- =====================================================================
-- Phase 2b.13 — tenant_ai_context (Practice Brain)
-- =====================================================================
-- One row per tenant holding the knowledge the practice owner gives to
-- every AI feature in the CRM: brand voice, services, pricing, opening
-- hours, FAQs, escalation rules, free-form notes.
--
-- This is the Practice Brain. Read by:
--   * automations AI reply drafter (2b.15)
--   * pipeline routing AI classifier (2b.16)
--   * FAQ responder (2b.18)
--   * future AI features across the CRM
--
-- Design points:
--   * One row per tenant: UNIQUE constraint on tenant_id.
--   * Text fields are nullable + default NULL (practice fills in over time).
--   * Structured fields default to '{}'::jsonb / '[]'::jsonb so consumers
--     can read without null-checks.
--   * RLS mirrors the Phase-2a-2a pattern used by
--     google_lead_form_configs / google_ads_conversions:
--       SELECT  → tenant_id IN get_accessible_tenants()
--       WRITE   → user_has_permission(uid, tenant_id, 'settings.integrations.manage')
--     Reusing 'settings.integrations.manage' rather than adding a new
--     code (per CLAUDE.md: don't add new permission codes without
--     checking the catalog — no settings.ai.manage exists today).
--   * Service-role bypass intentional — the /api/settings/practice-brain
--     route uses requireAuthenticatedTenantUser + service client.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.tenant_ai_context (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  brand_voice              text,
  practice_description     text,
  services_offered         jsonb NOT NULL DEFAULT '[]'::jsonb,
  pricing                  jsonb NOT NULL DEFAULT '[]'::jsonb,
  opening_hours            jsonb NOT NULL DEFAULT '{}'::jsonb,
  faqs                     jsonb NOT NULL DEFAULT '[]'::jsonb,
  escalation_rules         text,
  additional_instructions  text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_ai_context_tenant_id
  ON public.tenant_ai_context (tenant_id);

-- Reuse the canonical updated_at trigger function.
DROP TRIGGER IF EXISTS trg_tenant_ai_context_updated_at
  ON public.tenant_ai_context;
CREATE TRIGGER trg_tenant_ai_context_updated_at
  BEFORE UPDATE ON public.tenant_ai_context
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.tenant_ai_context ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tac_select_tenant_members"
  ON public.tenant_ai_context;
CREATE POLICY "tac_select_tenant_members"
  ON public.tenant_ai_context FOR SELECT
  TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS "tac_insert_with_permission"
  ON public.tenant_ai_context;
CREATE POLICY "tac_insert_with_permission"
  ON public.tenant_ai_context FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

DROP POLICY IF EXISTS "tac_update_with_permission"
  ON public.tenant_ai_context;
CREATE POLICY "tac_update_with_permission"
  ON public.tenant_ai_context FOR UPDATE
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

-- ---------------------------------------------------------------------------
-- Seed the test tenant. Idempotent — safe to re-run.
-- ---------------------------------------------------------------------------
INSERT INTO public.tenant_ai_context (tenant_id)
VALUES ('5aadca14-9786-4aef-bc53-e9287cdd0bbf'::uuid)
ON CONFLICT (tenant_id) DO NOTHING;

COMMENT ON TABLE public.tenant_ai_context IS
  'Practice Brain — per-tenant knowledge hub read by every AI feature (automations drafter, pipeline router, FAQ responder, etc.). 2b.13.';
