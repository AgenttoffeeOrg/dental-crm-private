-- Phase 2b.21 — Templates library for automation steps.
-- Per-tenant SMS / WhatsApp / Email templates referenced by
-- workflow message nodes. Kept separate from `activity_templates`
-- (which is the contact-detail composer's snippets surface) to
-- avoid mixing two table-level audiences.

CREATE TABLE IF NOT EXISTS public.automation_step_templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  channel     text NOT NULL CHECK (channel = ANY (ARRAY['sms','whatsapp','email']::text[])),
  subject     text,
  body        text NOT NULL,
  description text,
  tags        text[] NOT NULL DEFAULT ARRAY[]::text[],
  created_by_user_id uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  deleted_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aut_step_templates_tenant
  ON public.automation_step_templates (tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_aut_step_templates_channel
  ON public.automation_step_templates (tenant_id, channel) WHERE deleted_at IS NULL;

DROP TRIGGER IF EXISTS trg_aut_step_templates_updated_at ON public.automation_step_templates;
CREATE TRIGGER trg_aut_step_templates_updated_at
  BEFORE UPDATE ON public.automation_step_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.automation_step_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aut_step_templates_select" ON public.automation_step_templates;
CREATE POLICY "aut_step_templates_select"
  ON public.automation_step_templates FOR SELECT TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS "aut_step_templates_insert" ON public.automation_step_templates;
CREATE POLICY "aut_step_templates_insert"
  ON public.automation_step_templates FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

DROP POLICY IF EXISTS "aut_step_templates_update" ON public.automation_step_templates;
CREATE POLICY "aut_step_templates_update"
  ON public.automation_step_templates FOR UPDATE TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

COMMENT ON TABLE public.automation_step_templates IS
  '2b.21: per-tenant templates referenced by automation message nodes. Body supports merge tags resolved by lib/marketing/merge-tag-resolver.ts (contact.*, deal.*, tenant.*, practice.* including practice.opening_hours.monday, FAQs, etc).';
