-- ============================================================================
-- Phase 2a.1 — Foundations migration
-- Adds: treatment_types, practice_treatment_offerings,
--       practice_notification_routing, contacts.first_response_*,
--       activities.source_channel, pipelines.is_default uniqueness,
--       first-response trigger.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. treatment_types — canonical, system-managed catalogue
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.treatment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('general','cosmetic','orthodontic','restorative','specialist','emergency')),
  description text,
  default_sla_minutes integer NOT NULL DEFAULT 15,
  default_lead_value_cents_min integer,
  default_lead_value_cents_max integer,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_system boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_treatment_types_active_sort
  ON public.treatment_types (is_active, sort_order)
  WHERE is_active = true;

ALTER TABLE public.treatment_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "treatment_types_select_authenticated" ON public.treatment_types;
CREATE POLICY "treatment_types_select_authenticated"
  ON public.treatment_types FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "treatment_types_service_role" ON public.treatment_types;
CREATE POLICY "treatment_types_service_role"
  ON public.treatment_types FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 2. practice_treatment_offerings — per-practice overlay
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.practice_treatment_offerings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE,
  treatment_type_id uuid NOT NULL REFERENCES public.treatment_types(id) ON DELETE RESTRICT,
  custom_label text,
  pipeline_id uuid NOT NULL REFERENCES public.pipelines(id) ON DELETE RESTRICT,
  stage_id uuid REFERENCES public.pipeline_stages(id) ON DELETE SET NULL,
  custom_sla_minutes integer,
  custom_lead_value_cents_min integer,
  custom_lead_value_cents_max integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_by_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pto_tenant_type_when_no_location
  ON public.practice_treatment_offerings (tenant_id, treatment_type_id)
  WHERE location_id IS NULL AND deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pto_tenant_location_type
  ON public.practice_treatment_offerings (tenant_id, location_id, treatment_type_id)
  WHERE location_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pto_tenant_active
  ON public.practice_treatment_offerings (tenant_id, is_active)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pto_pipeline
  ON public.practice_treatment_offerings (pipeline_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.practice_treatment_offerings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pto_select_tenant_members" ON public.practice_treatment_offerings;
CREATE POLICY "pto_select_tenant_members"
  ON public.practice_treatment_offerings FOR SELECT
  TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS "pto_modify_owner_admin_manager" ON public.practice_treatment_offerings;
CREATE POLICY "pto_modify_owner_admin_manager"
  ON public.practice_treatment_offerings FOR ALL
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.tenant_id = practice_treatment_offerings.tenant_id
        AND utm.role IN ('owner','admin','manager')
        AND utm.status = 'active'
    )
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.tenant_id = practice_treatment_offerings.tenant_id
        AND utm.role IN ('owner','admin','manager')
        AND utm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "pto_service_role" ON public.practice_treatment_offerings;
CREATE POLICY "pto_service_role"
  ON public.practice_treatment_offerings FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 3. practice_notification_routing
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.practice_notification_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_key text NOT NULL,
  pipeline_id uuid REFERENCES public.pipelines(id) ON DELETE CASCADE,
  primary_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
  additional_user_ids uuid[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pnr_tenant_event_default
  ON public.practice_notification_routing (tenant_id, event_key)
  WHERE pipeline_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pnr_tenant_event_pipeline
  ON public.practice_notification_routing (tenant_id, event_key, pipeline_id)
  WHERE pipeline_id IS NOT NULL;

ALTER TABLE public.practice_notification_routing ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pnr_select_tenant_members" ON public.practice_notification_routing;
CREATE POLICY "pnr_select_tenant_members"
  ON public.practice_notification_routing FOR SELECT
  TO authenticated
  USING (tenant_id = ANY (public.get_accessible_tenants()));

DROP POLICY IF EXISTS "pnr_modify_owner_admin" ON public.practice_notification_routing;
CREATE POLICY "pnr_modify_owner_admin"
  ON public.practice_notification_routing FOR ALL
  TO authenticated
  USING (
    tenant_id = ANY (public.get_accessible_tenants())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.tenant_id = practice_notification_routing.tenant_id
        AND utm.role IN ('owner','admin')
        AND utm.status = 'active'
    )
  )
  WITH CHECK (
    tenant_id = ANY (public.get_accessible_tenants())
    AND EXISTS (
      SELECT 1 FROM public.user_tenant_memberships utm
      WHERE utm.user_id = auth.uid()
        AND utm.tenant_id = practice_notification_routing.tenant_id
        AND utm.role IN ('owner','admin')
        AND utm.status = 'active'
    )
  );

DROP POLICY IF EXISTS "pnr_service_role" ON public.practice_notification_routing;
CREATE POLICY "pnr_service_role"
  ON public.practice_notification_routing FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 4. contacts.first_response_at + first_response_user_id
-- ----------------------------------------------------------------------------

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_response_user_id uuid REFERENCES public.app_users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_first_response_at
  ON public.contacts (first_response_at)
  WHERE first_response_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_no_first_response
  ON public.contacts (tenant_id, created_at)
  WHERE first_response_at IS NULL;

-- ----------------------------------------------------------------------------
-- 5. activities.source_channel — typed channel
-- ----------------------------------------------------------------------------

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS source_channel public.source_channel_enum;

CREATE INDEX IF NOT EXISTS idx_activities_tenant_source_channel
  ON public.activities (tenant_id, source_channel)
  WHERE source_channel IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 6. pipelines.is_default — enforce one default per tenant
-- ----------------------------------------------------------------------------

UPDATE public.pipelines p
SET is_default = true
WHERE p.id IN (
  SELECT DISTINCT ON (tenant_id) id
  FROM public.pipelines
  WHERE deleted_at IS NULL
    AND tenant_id IN (
      SELECT tenant_id
      FROM public.pipelines
      WHERE deleted_at IS NULL
      GROUP BY tenant_id
      HAVING COUNT(*) FILTER (WHERE is_default = true) = 0
    )
  ORDER BY tenant_id, created_at ASC
);

WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at ASC) AS rn
  FROM public.pipelines
  WHERE is_default = true AND deleted_at IS NULL
)
UPDATE public.pipelines
  SET is_default = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

DROP INDEX IF EXISTS public.idx_pipelines_default;

CREATE UNIQUE INDEX IF NOT EXISTS idx_pipelines_one_default_per_tenant
  ON public.pipelines (tenant_id)
  WHERE is_default = true AND deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 7. First-response trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.update_contact_first_response()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'outbound'
     AND NEW.contact_id IS NOT NULL
     AND NEW.type IN (
       'call','email','sms','whatsapp',
       'instagram_dm','fb_messenger','meeting',
       'call_outbound_made'
     )
  THEN
    UPDATE public.contacts
       SET first_response_at = COALESCE(first_response_at, NEW.occurred_at, NEW.created_at, now()),
           first_response_user_id = COALESCE(first_response_user_id, NEW.agent_user_id)
     WHERE id = NEW.contact_id
       AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_contact_first_response ON public.activities;
CREATE TRIGGER trigger_update_contact_first_response
  AFTER INSERT ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_contact_first_response();

-- ----------------------------------------------------------------------------
-- 8. Seed default lead.arrived routing for every existing tenant
-- ----------------------------------------------------------------------------

INSERT INTO public.practice_notification_routing
  (tenant_id, event_key, pipeline_id, primary_user_id, additional_user_ids, is_active)
SELECT
  t.id,
  'lead.arrived',
  NULL,
  (
    SELECT utm.user_id
    FROM public.user_tenant_memberships utm
    WHERE utm.tenant_id = t.id
      AND utm.role = 'owner'
      AND utm.status = 'active'
    ORDER BY utm.created_at ASC
    LIMIT 1
  ),
  COALESCE(
    (
      SELECT array_agg(utm.user_id)
      FROM public.user_tenant_memberships utm
      WHERE utm.tenant_id = t.id
        AND utm.role IN ('admin','manager')
        AND utm.status = 'active'
    ),
    '{}'::uuid[]
  ),
  true
FROM public.tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM public.practice_notification_routing pnr
  WHERE pnr.tenant_id = t.id
    AND pnr.event_key = 'lead.arrived'
    AND pnr.pipeline_id IS NULL
);

COMMIT;
