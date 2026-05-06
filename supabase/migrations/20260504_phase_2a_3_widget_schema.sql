-- =============================================================================
-- Phase 2a.3 — Booking widget schema additions
-- =============================================================================
-- Context: Phase 1 already created practice_booking_widgets with most of its
-- shape (slug NOT NULL, is_active NOT NULL, display_name NOT NULL, the three
-- enable_* flags, calendar_*, webform_*, whatsapp_*, brand_*, greeting_*,
-- embed_script_secret, metadata jsonb). This migration only ADDS the small
-- handful of things we need on top:
--
--   * treatment_options jsonb           — ordered list of offering ids the
--                                         widget surfaces (ordered display)
--   * success_message text              — copy shown after webform submission
--   * deleted_at timestamptz            — soft-delete column
--
-- All other widget knobs (trigger mode/position/button label, inline webform
-- field overrides, consent text overrides) live in the existing `metadata`
-- jsonb column under stable keys (see metadata schema doc in this file's
-- companion phase-2a-3-changes.md).
--
-- We intentionally do NOT add a generic `config` jsonb because the existing
-- columns already cover most config concerns one-for-one and keeping them
-- as first-class columns gives us better RLS / indexability / introspection.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Schema additions to practice_booking_widgets
-- ---------------------------------------------------------------------------

ALTER TABLE public.practice_booking_widgets
  ADD COLUMN IF NOT EXISTS treatment_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS success_message text,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_pbw_slug_active
  ON public.practice_booking_widgets (slug)
  WHERE deleted_at IS NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_pbw_tenant_active
  ON public.practice_booking_widgets (tenant_id, is_active)
  WHERE deleted_at IS NULL;

-- Slug format: lowercase, alphanumeric + hyphens, 3-50 chars (matches the
-- public widget loader's `data-slug` attribute and `/w/[slug]` URL space).
ALTER TABLE public.practice_booking_widgets
  DROP CONSTRAINT IF EXISTS practice_booking_widgets_slug_format;

ALTER TABLE public.practice_booking_widgets
  ADD CONSTRAINT practice_booking_widgets_slug_format
    CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$');

-- Phase 1 limited webform_kind to ('practice_url','crm_form'); the booking
-- widget v1 ships with inline (CRM-managed) forms so we need that value too.
ALTER TABLE public.practice_booking_widgets
  DROP CONSTRAINT IF EXISTS practice_booking_widgets_webform_kind_check;

ALTER TABLE public.practice_booking_widgets
  ADD CONSTRAINT practice_booking_widgets_webform_kind_check
    CHECK (webform_kind = ANY (ARRAY['practice_url'::text, 'crm_form'::text, 'inline'::text]));

-- ---------------------------------------------------------------------------
-- 2. Permission key for widget administration
-- ---------------------------------------------------------------------------
-- Schema uses `permissions.code` + `permissions.name` (verified via
-- information_schema). Roles live in `role_definitions` keyed by `name`.
-- role_permissions is a join table by uuid (role_id, permission_id, granted).

INSERT INTO public.permissions (code, name, description, module, action, resource_type)
VALUES (
  'contacts.widget_manage',
  'Manage booking widget',
  'Configure the practice booking widget: treatments shown, paths enabled, branding, embed snippet.',
  'contacts',
  'manage',
  'practice_booking_widget'
)
ON CONFLICT (code) DO NOTHING;

-- Grant widget_manage to Owner / Admin / Manager by default.
INSERT INTO public.role_permissions (role_id, permission_id, granted)
SELECT rd.id, p.id, true
FROM public.role_definitions rd
CROSS JOIN public.permissions p
WHERE p.code = 'contacts.widget_manage'
  AND rd.name IN ('Owner', 'Admin', 'Manager')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. seed_default_booking_widget(p_tenant_id) RPC
-- ---------------------------------------------------------------------------
-- Idempotent. Re-running on a tenant that already has a widget returns the
-- existing widget id without modifying it. Builds slug from tenant name +
-- 4-char random suffix; populates treatment_options from active offerings.

CREATE OR REPLACE FUNCTION public.seed_default_booking_widget(p_tenant_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_widget_id uuid;
  v_slug text;
  v_tenant_name text;
  v_offering_options jsonb;
BEGIN
  SELECT id INTO v_widget_id
  FROM public.practice_booking_widgets
  WHERE tenant_id = p_tenant_id
    AND deleted_at IS NULL
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_widget_id IS NOT NULL THEN
    RETURN v_widget_id;
  END IF;

  SELECT COALESCE(slug, name) INTO v_tenant_name
  FROM public.tenants
  WHERE id = p_tenant_id;

  v_slug := lower(regexp_replace(coalesce(v_tenant_name, 'practice'), '[^a-z0-9]+', '-', 'gi'));
  v_slug := trim(both '-' from v_slug);
  IF v_slug = '' OR v_slug IS NULL THEN
    v_slug := 'practice';
  END IF;
  v_slug := substring(v_slug from 1 for 40) || '-' || substring(md5(random()::text || p_tenant_id::text) from 1 for 4);

  -- Ensure global uniqueness (slug is UNIQUE in the table).
  WHILE EXISTS (
    SELECT 1 FROM public.practice_booking_widgets WHERE slug = v_slug
  ) LOOP
    v_slug := substring(v_slug from 1 for 40) || '-' || substring(md5(random()::text) from 1 for 4);
  END LOOP;

  SELECT jsonb_agg(
    jsonb_build_object(
      'offering_id', pto.id,
      'sort_order', COALESCE(pto.sort_order, 0)
    )
    ORDER BY COALESCE(pto.sort_order, 0), pto.id
  )
  INTO v_offering_options
  FROM public.practice_treatment_offerings pto
  WHERE pto.tenant_id = p_tenant_id
    AND pto.is_active = true
    AND pto.deleted_at IS NULL;

  INSERT INTO public.practice_booking_widgets (
    tenant_id,
    slug,
    display_name,
    is_active,
    treatment_options,
    success_message,
    -- Disable calendar / whatsapp by default (need a URL / phone first); only
    -- the inline webform path is enabled out of the box.
    enable_calendar,
    enable_webform,
    enable_whatsapp,
    webform_kind,
    greeting_title,
    metadata
  )
  VALUES (
    p_tenant_id,
    v_slug,
    COALESCE(v_tenant_name, 'Our Practice'),
    true,
    COALESCE(v_offering_options, '[]'::jsonb),
    'Thanks — we''ll be in touch shortly.',
    false,
    true,
    false,
    'inline',
    'How can we help you today?',
    jsonb_build_object(
      'trigger', jsonb_build_object(
        'mode', 'button',
        'position', 'bottom-right',
        'button_label', 'Book a consultation'
      ),
      'webform', jsonb_build_object(
        'fields', jsonb_build_array(
          jsonb_build_object('name', 'full_name', 'label', 'Your name', 'required', true),
          jsonb_build_object('name', 'email',     'label', 'Email',     'required', true),
          jsonb_build_object('name', 'phone',     'label', 'Phone',     'required', true)
        ),
        'consent_text', 'By submitting, you agree to be contacted about your enquiry.',
        'consent_required', true
      ),
      'whatsapp', jsonb_build_object(
        'prefill_template', 'Hi, I''m interested in {treatment}.'
      ),
      'theme', jsonb_build_object(
        'primary_color', '#0ea5e9'
      )
    )
  )
  RETURNING id INTO v_widget_id;

  RETURN v_widget_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_booking_widget(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.seed_default_booking_widget(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. updated_at touch trigger (only if not already wired up)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.practice_booking_widgets'::regclass
      AND tgname = 'practice_booking_widgets_set_updated_at'
  ) THEN
    -- Only create if a generic touch helper exists; otherwise rely on app-side updates.
    IF EXISTS (
      SELECT 1 FROM pg_proc
      WHERE proname = 'set_updated_at' AND pronamespace = 'public'::regnamespace
    ) THEN
      EXECUTE $TRG$
        CREATE TRIGGER practice_booking_widgets_set_updated_at
        BEFORE UPDATE ON public.practice_booking_widgets
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()
      $TRG$;
    END IF;
  END IF;
END $$;

COMMIT;
