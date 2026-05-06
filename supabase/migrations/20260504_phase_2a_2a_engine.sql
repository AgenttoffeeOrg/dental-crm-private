-- Phase 2a.2a — Server-side lead ingestion engine (schema additions)
--
-- Adds:
--   1. treatment_offering_id columns on lead_intent_sessions, attribution_touchpoints, contacts
--   2. attribution_touchpoints.event_id (for ingestLead webhook-retry idempotency)
--   3. dedup_review_queue table (+ RLS + updated_at trigger)
--   4. contacts.dedup_queue_manage permission seeded into the live RBAC tables
--      (permissions + role_permissions joined by role_id ↔ role_definitions).
--      NOTE 1: live schema uses (code, role_id, permission_id, granted), NOT (key, role text, permission_key)
--              as the planner's draft assumed. This file uses the live shape.
--      NOTE 2: permissions.module has a CHECK constraint limiting it to a fixed
--              set: analytics, audit, automations, contacts, deals, integrations,
--              marketing, pipeline, settings, tasks. 'leads' is NOT allowed, so
--              we use 'contacts' (closest fit — the queue is fundamentally a
--              contact-management UI) and follow the existing 'module.action'
--              code convention → 'contacts.dedup_queue_manage'.
--   5. seed_default_treatment_offerings(p_tenant_id) RPC

BEGIN;

-- =============================================================================
-- 1. Link treatment offerings to Phase 1 ingestion tables
-- =============================================================================

ALTER TABLE public.lead_intent_sessions
  ADD COLUMN IF NOT EXISTS treatment_offering_id uuid
    REFERENCES public.practice_treatment_offerings(id) ON DELETE SET NULL;

ALTER TABLE public.attribution_touchpoints
  ADD COLUMN IF NOT EXISTS treatment_offering_id uuid
    REFERENCES public.practice_treatment_offerings(id) ON DELETE SET NULL;

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS treatment_offering_id uuid
    REFERENCES public.practice_treatment_offerings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lis_treatment_offering
  ON public.lead_intent_sessions (treatment_offering_id)
  WHERE treatment_offering_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_at_treatment_offering
  ON public.attribution_touchpoints (treatment_offering_id)
  WHERE treatment_offering_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_treatment_offering
  ON public.contacts (treatment_offering_id)
  WHERE treatment_offering_id IS NOT NULL;

-- =============================================================================
-- 2. attribution_touchpoints.event_id (ingestLead webhook idempotency key)
-- =============================================================================
-- Phase 1's attribution_touchpoints had no idempotency key column. ingestLead's
-- contract requires one (per Checkpoint 5 of the prompt) so retries don't
-- double-create. We add a nullable text column with a partial UNIQUE index
-- (so legacy rows without an event_id remain valid).

ALTER TABLE public.attribution_touchpoints
  ADD COLUMN IF NOT EXISTS event_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_at_event_id_unique
  ON public.attribution_touchpoints (tenant_id, event_id)
  WHERE event_id IS NOT NULL;

-- =============================================================================
-- 3. dedup_review_queue
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.dedup_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  candidate_payload jsonb NOT NULL,
  candidate_email text,
  candidate_phone text,
  candidate_name text,
  source_channel public.source_channel_enum,
  matched_contact_ids uuid[] NOT NULL DEFAULT '{}',
  match_signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','merged','new_contact','dismissed')),
  resolved_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  resolved_by_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

CREATE INDEX IF NOT EXISTS idx_drq_tenant_status
  ON public.dedup_review_queue (tenant_id, status, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_drq_email
  ON public.dedup_review_queue (tenant_id, candidate_email)
  WHERE candidate_email IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_drq_phone
  ON public.dedup_review_queue (tenant_id, candidate_phone)
  WHERE candidate_phone IS NOT NULL AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_drq_expires
  ON public.dedup_review_queue (expires_at)
  WHERE status = 'pending';

-- RLS
ALTER TABLE public.dedup_review_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "drq_select_tenant_members" ON public.dedup_review_queue;
CREATE POLICY "drq_select_tenant_members"
  ON public.dedup_review_queue FOR SELECT
  TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

-- Live schema's tenant-aware permission helper: user_has_permission(uid, tenant_id, code).
-- The 2-arg version in pg_proc is broken (joins on a column that no longer
-- exists). Always use the 3-arg form.
DROP POLICY IF EXISTS "drq_modify_with_permission" ON public.dedup_review_queue;
CREATE POLICY "drq_modify_with_permission"
  ON public.dedup_review_queue FOR UPDATE
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'contacts.dedup_queue_manage')
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND public.user_has_permission(auth.uid(), tenant_id, 'contacts.dedup_queue_manage')
  );

DROP POLICY IF EXISTS "drq_service_role" ON public.dedup_review_queue;
CREATE POLICY "drq_service_role"
  ON public.dedup_review_queue FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_drq_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trigger_touch_drq_updated_at ON public.dedup_review_queue;
CREATE TRIGGER trigger_touch_drq_updated_at
  BEFORE UPDATE ON public.dedup_review_queue
  FOR EACH ROW EXECUTE FUNCTION public.touch_drq_updated_at();

-- =============================================================================
-- 4. contacts.dedup_queue_manage permission
-- =============================================================================

INSERT INTO public.permissions (code, name, description, module, action, resource_type)
VALUES (
  'contacts.dedup_queue_manage',
  'Manage dedup review queue',
  'Resolve duplicate-lead candidates: merge, create new, or dismiss.',
  'contacts',
  'manage',
  'dedup_review_queue'
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT rd.id, p.id, true
FROM public.role_definitions rd
CROSS JOIN public.permissions p
WHERE rd.code IN ('owner','admin')
  AND p.code = 'contacts.dedup_queue_manage'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- =============================================================================
-- 5. seed_default_treatment_offerings(p_tenant_id) RPC
-- =============================================================================

CREATE OR REPLACE FUNCTION public.seed_default_treatment_offerings(p_tenant_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_default_pipeline_id uuid;
  v_inserted integer := 0;
BEGIN
  SELECT id INTO v_default_pipeline_id
  FROM public.pipelines
  WHERE tenant_id = p_tenant_id
    AND is_default = true
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_default_pipeline_id IS NULL THEN
    RAISE EXCEPTION 'Tenant % has no default pipeline. Cannot seed offerings.', p_tenant_id;
  END IF;

  WITH ins AS (
    INSERT INTO public.practice_treatment_offerings
      (tenant_id, location_id, treatment_type_id, pipeline_id, stage_id,
       is_active, sort_order, created_by_user_id)
    SELECT
      p_tenant_id,
      NULL,
      tt.id,
      v_default_pipeline_id,
      NULL,
      true,
      tt.sort_order,
      NULL
    FROM public.treatment_types tt
    WHERE tt.is_active = true
    ON CONFLICT (tenant_id, treatment_type_id)
      WHERE (location_id IS NULL AND deleted_at IS NULL)
      DO NOTHING
    RETURNING id
  )
  SELECT count(*) INTO v_inserted FROM ins;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_treatment_offerings(uuid) TO service_role;

COMMIT;
