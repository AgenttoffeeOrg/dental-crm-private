-- =============================================================================
-- Phase 2b.1.a — google_lead_form_configs
-- =============================================================================
-- Holds per-tenant webhook keys for the Google Lead Form ad inbound webhook.
-- 2b.1.b will extend this table with OAuth state for outbound Enhanced
-- Conversions for Leads, so we keep it dedicated rather than overloading
-- a generic config blob.
--
-- Key design points:
--   * `webhook_key` defaults to gen_random_uuid() — Google sends it back as
--     `google_key` on every lead, and we look up the tenant by it.
--   * Globally UNIQUE on `webhook_key` (lookup must be O(1) and unambiguous).
--   * One ACTIVE config per tenant via partial UNIQUE on (tenant_id) WHERE
--     is_active = true. Inactive rows are retained as audit history.
--   * RLS uses the live Phase-2a-2a permission pattern:
--       SELECT  → tenant_id IN get_accessible_tenants()
--       WRITE   → user_has_permission(uid, tenant_id, 'settings.integrations.manage')
--     The CLI script in scripts/phase-2b/generate-google-webhook-key.ts uses
--     the service role and bypasses RLS, which is intentional for 2b.1.a
--     (self-serve Settings UI is deferred to 2b.1.b).
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.google_lead_form_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  webhook_key   uuid NOT NULL DEFAULT gen_random_uuid(),
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.app_users(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_lead_form_configs_one_active_per_tenant
  ON public.google_lead_form_configs (tenant_id)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_google_lead_form_configs_webhook_key
  ON public.google_lead_form_configs (webhook_key);

-- Reuse the canonical updated_at trigger function used elsewhere in the repo.
DROP TRIGGER IF EXISTS trg_google_lead_form_configs_updated_at
  ON public.google_lead_form_configs;
CREATE TRIGGER trg_google_lead_form_configs_updated_at
  BEFORE UPDATE ON public.google_lead_form_configs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.google_lead_form_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "glfc_select_tenant_members"
  ON public.google_lead_form_configs;
CREATE POLICY "glfc_select_tenant_members"
  ON public.google_lead_form_configs FOR SELECT
  TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS "glfc_insert_with_permission"
  ON public.google_lead_form_configs;
CREATE POLICY "glfc_insert_with_permission"
  ON public.google_lead_form_configs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

DROP POLICY IF EXISTS "glfc_update_with_permission"
  ON public.google_lead_form_configs;
CREATE POLICY "glfc_update_with_permission"
  ON public.google_lead_form_configs FOR UPDATE
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

DROP POLICY IF EXISTS "glfc_delete_with_permission"
  ON public.google_lead_form_configs;
CREATE POLICY "glfc_delete_with_permission"
  ON public.google_lead_form_configs FOR DELETE
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

DROP POLICY IF EXISTS "glfc_service_role"
  ON public.google_lead_form_configs;
CREATE POLICY "glfc_service_role"
  ON public.google_lead_form_configs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE  public.google_lead_form_configs IS
  'Per-tenant Google Lead Form Extensions webhook keys (Phase 2b.1.a). One active row per tenant. 2b.1.b will add OAuth state columns for outbound conversion events.';
COMMENT ON COLUMN public.google_lead_form_configs.webhook_key IS
  'UUID echoed back by Google as `google_key` on every lead delivery. Used to resolve the tenant.';
COMMENT ON COLUMN public.google_lead_form_configs.is_active IS
  'False rows are retained as audit history of rotated keys; only one true row per tenant (enforced by partial unique index).';
