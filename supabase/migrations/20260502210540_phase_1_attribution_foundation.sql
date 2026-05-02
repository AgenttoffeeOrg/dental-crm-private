-- Phase 1 — Attribution foundation + booking widget schema
--
-- Purpose: build the data-model foundation for typed attribution and the
-- booking-widget pipeline. STRUCTURE ONLY — no logic, no widget code, no
-- ingestLead() function. Phase 2 will build those.
--
-- Adapted from `Audit and Analysis/phase_1_execution_prompt_v2.md`. Two
-- adaptations vs the prompt, both required by the live schema:
--   1. RLS uses the codebase's `get_user_org_id()` helper (one policy per
--      CRUD action plus a service-role bypass), matching existing tables
--      (e.g. `contacts`). The prompt's `(auth.jwt()->>'tenant_id')::uuid`
--      pattern would not match the rest of the codebase.
--   2. `practice_location_id` columns FK to `public.practice_locations(id)`
--      (the live table name).
--
-- Properties:
--   - Idempotent: every block uses IF EXISTS / IF NOT EXISTS / DO guards.
--   - Wrapped in BEGIN / COMMIT for atomic application.
--
-- Author: Phase 1 attribution foundation, 2026-05-02.

BEGIN;

-- =====================================================================
-- Block 1.1 — source_channel enum (25 values)
-- =====================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'source_channel_enum') THEN
    CREATE TYPE public.source_channel_enum AS ENUM (
      'form_embedded',
      'form_hosted_landing',
      'booking_widget_calendar',
      'booking_widget_webform',
      'booking_widget_whatsapp',
      'meta_lead_ad',
      'meta_messenger_ad',
      'google_lead_form',
      'google_search_ad',
      'google_display_ad',
      'whatsapp_website_button',
      'whatsapp_meta_ad',
      'whatsapp_qr',
      'instagram_dm',
      'fb_messenger',
      'sms_inbound',
      'phone_call_inbound',
      'phone_call_voicemail',
      'online_booking_completed',
      'online_booking_abandoned',
      'manual_entry',
      'csv_import',
      'api_partner',
      'referral',
      'other'
    );
  END IF;
END $$;

-- =====================================================================
-- Block 1.2 — Typed attribution columns on contacts (32 columns)
-- =====================================================================
ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS first_touch_source_channel public.source_channel_enum,
  ADD COLUMN IF NOT EXISTS first_touch_source_sub_id text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_source text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_medium text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_campaign text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_content text,
  ADD COLUMN IF NOT EXISTS first_touch_utm_term text,
  ADD COLUMN IF NOT EXISTS first_touch_gclid text,
  ADD COLUMN IF NOT EXISTS first_touch_fbclid text,
  ADD COLUMN IF NOT EXISTS first_touch_msclkid text,
  ADD COLUMN IF NOT EXISTS first_touch_ttclid text,
  ADD COLUMN IF NOT EXISTS first_touch_referrer_url text,
  ADD COLUMN IF NOT EXISTS first_touch_landing_page_url text,
  ADD COLUMN IF NOT EXISTS first_touch_ip_address inet,
  ADD COLUMN IF NOT EXISTS first_touch_user_agent text,
  ADD COLUMN IF NOT EXISTS first_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_touch_source_channel public.source_channel_enum,
  ADD COLUMN IF NOT EXISTS last_touch_source_sub_id text,
  ADD COLUMN IF NOT EXISTS last_touch_utm_source text,
  ADD COLUMN IF NOT EXISTS last_touch_utm_medium text,
  ADD COLUMN IF NOT EXISTS last_touch_utm_campaign text,
  ADD COLUMN IF NOT EXISTS last_touch_utm_content text,
  ADD COLUMN IF NOT EXISTS last_touch_utm_term text,
  ADD COLUMN IF NOT EXISTS last_touch_gclid text,
  ADD COLUMN IF NOT EXISTS last_touch_fbclid text,
  ADD COLUMN IF NOT EXISTS last_touch_msclkid text,
  ADD COLUMN IF NOT EXISTS last_touch_ttclid text,
  ADD COLUMN IF NOT EXISTS last_touch_referrer_url text,
  ADD COLUMN IF NOT EXISTS last_touch_landing_page_url text,
  ADD COLUMN IF NOT EXISTS last_touch_ip_address inet,
  ADD COLUMN IF NOT EXISTS last_touch_user_agent text,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_source_channel
  ON public.contacts (first_touch_source_channel)
  WHERE first_touch_source_channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_last_touch_source_channel
  ON public.contacts (last_touch_source_channel)
  WHERE last_touch_source_channel IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_gclid
  ON public.contacts (first_touch_gclid)
  WHERE first_touch_gclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_fbclid
  ON public.contacts (first_touch_fbclid)
  WHERE first_touch_fbclid IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_utm_campaign
  ON public.contacts (first_touch_utm_campaign)
  WHERE first_touch_utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_contacts_first_touch_at
  ON public.contacts (first_touch_at DESC NULLS LAST);


-- =====================================================================
-- Block 1.3 — channel_identifiers table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.channel_identifiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid NOT NULL,
  channel text NOT NULL,
  external_id text NOT NULL,
  external_handle text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT channel_identifiers_channel_check CHECK (channel = ANY (ARRAY[
    'whatsapp', 'instagram', 'messenger_psid',
    'meta_lead_id', 'meta_user_id', 'meta_page_scoped_id',
    'google_lead_id', 'tiktok_lead_id',
    'carestack_patient_id', 'carestack_potential_patient_id',
    'voicestack_caller_phone', 'sms_phone',
    'email_message_id', 'partner_external_id'
  ]::text[]))
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'channel_identifiers_tenant_id_fkey'
                   AND table_name = 'channel_identifiers') THEN
    ALTER TABLE public.channel_identifiers
      ADD CONSTRAINT channel_identifiers_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'channel_identifiers_contact_id_fkey'
                   AND table_name = 'channel_identifiers') THEN
    ALTER TABLE public.channel_identifiers
      ADD CONSTRAINT channel_identifiers_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_channel_identifiers_tenant_channel_external
  ON public.channel_identifiers (tenant_id, channel, external_id);
CREATE INDEX IF NOT EXISTS idx_channel_identifiers_contact_id
  ON public.channel_identifiers (contact_id);
CREATE INDEX IF NOT EXISTS idx_channel_identifiers_last_seen_at
  ON public.channel_identifiers (last_seen_at DESC);

CREATE OR REPLACE FUNCTION public.tg_channel_identifiers_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_channel_identifiers_updated_at ON public.channel_identifiers;
CREATE TRIGGER trg_channel_identifiers_updated_at
  BEFORE UPDATE ON public.channel_identifiers
  FOR EACH ROW EXECUTE FUNCTION public.tg_channel_identifiers_set_updated_at();

ALTER TABLE public.channel_identifiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass channel_identifiers" ON public.channel_identifiers;
CREATE POLICY "Service role bypass channel_identifiers" ON public.channel_identifiers
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT channel_identifiers" ON public.channel_identifiers;
CREATE POLICY "Tenant isolation SELECT channel_identifiers" ON public.channel_identifiers
  FOR SELECT USING (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT channel_identifiers" ON public.channel_identifiers;
CREATE POLICY "Tenant isolation INSERT channel_identifiers" ON public.channel_identifiers
  FOR INSERT WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE channel_identifiers" ON public.channel_identifiers;
CREATE POLICY "Tenant isolation UPDATE channel_identifiers" ON public.channel_identifiers
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE channel_identifiers" ON public.channel_identifiers;
CREATE POLICY "Tenant isolation DELETE channel_identifiers" ON public.channel_identifiers
  FOR DELETE USING (tenant_id = get_user_org_id());


-- =====================================================================
-- Block 1.4 — attribution_touchpoints (append-only)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.attribution_touchpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  contact_id uuid,
  lead_intent_session_id uuid,
  source_channel public.source_channel_enum NOT NULL,
  source_sub_id text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  utm_source text, utm_medium text, utm_campaign text,
  utm_content text, utm_term text,
  gclid text, fbclid text, msclkid text, ttclid text,
  referrer_url text, landing_page_url text,
  ip_address inet, user_agent text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT touchpoint_has_attribution_target CHECK (
    contact_id IS NOT NULL OR lead_intent_session_id IS NOT NULL
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'attribution_touchpoints_tenant_id_fkey') THEN
    ALTER TABLE public.attribution_touchpoints
      ADD CONSTRAINT attribution_touchpoints_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'attribution_touchpoints_contact_id_fkey') THEN
    ALTER TABLE public.attribution_touchpoints
      ADD CONSTRAINT attribution_touchpoints_contact_id_fkey
      FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;
  END IF;
  -- attribution_touchpoints_lead_intent_session_fkey is added in Block 1.5
  -- after lead_intent_sessions exists.
END $$;

CREATE INDEX IF NOT EXISTS idx_touchpoints_contact_occurred
  ON public.attribution_touchpoints (contact_id, occurred_at DESC)
  WHERE contact_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_tenant_occurred
  ON public.attribution_touchpoints (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_touchpoints_source_channel
  ON public.attribution_touchpoints (source_channel);
CREATE INDEX IF NOT EXISTS idx_touchpoints_gclid
  ON public.attribution_touchpoints (gclid) WHERE gclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_fbclid
  ON public.attribution_touchpoints (fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_utm_campaign
  ON public.attribution_touchpoints (utm_campaign) WHERE utm_campaign IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_touchpoints_lead_intent_session
  ON public.attribution_touchpoints (lead_intent_session_id)
  WHERE lead_intent_session_id IS NOT NULL;

ALTER TABLE public.attribution_touchpoints ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass attribution_touchpoints" ON public.attribution_touchpoints;
CREATE POLICY "Service role bypass attribution_touchpoints" ON public.attribution_touchpoints
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT attribution_touchpoints" ON public.attribution_touchpoints;
CREATE POLICY "Tenant isolation SELECT attribution_touchpoints" ON public.attribution_touchpoints
  FOR SELECT USING (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT attribution_touchpoints" ON public.attribution_touchpoints;
CREATE POLICY "Tenant isolation INSERT attribution_touchpoints" ON public.attribution_touchpoints
  FOR INSERT WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE attribution_touchpoints" ON public.attribution_touchpoints;
CREATE POLICY "Tenant isolation UPDATE attribution_touchpoints" ON public.attribution_touchpoints
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE attribution_touchpoints" ON public.attribution_touchpoints;
CREATE POLICY "Tenant isolation DELETE attribution_touchpoints" ON public.attribution_touchpoints
  FOR DELETE USING (tenant_id = get_user_org_id());


-- =====================================================================
-- Block 1.5 — lead_intent_sessions table (widget session record)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lead_intent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  practice_location_id uuid,
  practice_booking_widget_id uuid,
  session_token text NOT NULL,
  intent_path text NOT NULL,

  -- Phone is captured at session creation for the calendar path; may be NULL
  -- for whatsapp/webform paths until the user actually completes the action.
  phone_e164 text,
  consent_marketing boolean,
  consent_transactional boolean,
  consent_text text,
  consent_text_version text,
  consent_method text,
  consent_captured_at timestamptz,
  consent_ip_address inet,
  consent_user_agent text,

  source_channel public.source_channel_enum,
  source_sub_id text,
  utm_source text, utm_medium text, utm_campaign text,
  utm_content text, utm_term text,
  gclid text, fbclid text, msclkid text, ttclid text,
  referrer_url text, landing_page_url text,
  ip_address inet, user_agent text,

  redirect_destination_url text,
  redirect_completed_at timestamptz,
  whatsapp_tracking_code text,

  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  joined_to_contact_id uuid,
  joined_at timestamptz,
  join_method text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT lead_intent_sessions_intent_path_check CHECK (
    intent_path = ANY (ARRAY['calendar', 'webform', 'whatsapp']::text[])
  ),
  CONSTRAINT lead_intent_sessions_consent_method_check CHECK (
    consent_method IS NULL OR consent_method = ANY (ARRAY[
      'widget_checkbox', 'widget_implicit', 'form_checkbox',
      'whatsapp_double_optin', 'verbal_call', 'imported'
    ]::text[])
  ),
  CONSTRAINT lead_intent_sessions_join_method_check CHECK (
    join_method IS NULL OR join_method = ANY (ARRAY[
      'phone_match_exact', 'phone_match_normalised', 'session_cookie',
      'whatsapp_tracking_code', 'manual'
    ]::text[])
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_intent_sessions_tenant_id_fkey') THEN
    ALTER TABLE public.lead_intent_sessions
      ADD CONSTRAINT lead_intent_sessions_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_intent_sessions_practice_location_fkey') THEN
    ALTER TABLE public.lead_intent_sessions
      ADD CONSTRAINT lead_intent_sessions_practice_location_fkey
      FOREIGN KEY (practice_location_id) REFERENCES public.practice_locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_intent_sessions_joined_contact_fkey') THEN
    ALTER TABLE public.lead_intent_sessions
      ADD CONSTRAINT lead_intent_sessions_joined_contact_fkey
      FOREIGN KEY (joined_to_contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'attribution_touchpoints_lead_intent_session_fkey') THEN
    ALTER TABLE public.attribution_touchpoints
      ADD CONSTRAINT attribution_touchpoints_lead_intent_session_fkey
      FOREIGN KEY (lead_intent_session_id) REFERENCES public.lead_intent_sessions(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_intent_sessions_tenant_session
  ON public.lead_intent_sessions (tenant_id, session_token);
CREATE INDEX IF NOT EXISTS idx_lead_intent_sessions_phone_unjoined
  ON public.lead_intent_sessions (tenant_id, phone_e164, created_at DESC)
  WHERE phone_e164 IS NOT NULL AND joined_to_contact_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_intent_sessions_location_created
  ON public.lead_intent_sessions (practice_location_id, created_at DESC)
  WHERE joined_to_contact_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_intent_sessions_expires
  ON public.lead_intent_sessions (expires_at)
  WHERE joined_to_contact_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_intent_sessions_whatsapp_tracking
  ON public.lead_intent_sessions (whatsapp_tracking_code)
  WHERE whatsapp_tracking_code IS NOT NULL AND joined_to_contact_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_lead_intent_sessions_intent_path
  ON public.lead_intent_sessions (intent_path);

ALTER TABLE public.lead_intent_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass lead_intent_sessions" ON public.lead_intent_sessions;
CREATE POLICY "Service role bypass lead_intent_sessions" ON public.lead_intent_sessions
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT lead_intent_sessions" ON public.lead_intent_sessions;
CREATE POLICY "Tenant isolation SELECT lead_intent_sessions" ON public.lead_intent_sessions
  FOR SELECT USING (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT lead_intent_sessions" ON public.lead_intent_sessions;
CREATE POLICY "Tenant isolation INSERT lead_intent_sessions" ON public.lead_intent_sessions
  FOR INSERT WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE lead_intent_sessions" ON public.lead_intent_sessions;
CREATE POLICY "Tenant isolation UPDATE lead_intent_sessions" ON public.lead_intent_sessions
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE lead_intent_sessions" ON public.lead_intent_sessions;
CREATE POLICY "Tenant isolation DELETE lead_intent_sessions" ON public.lead_intent_sessions
  FOR DELETE USING (tenant_id = get_user_org_id());


-- =====================================================================
-- Block 1.6 — practice_booking_widgets table (per-practice widget config)
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.practice_booking_widgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  practice_location_id uuid,

  slug text NOT NULL,
  display_name text NOT NULL,
  display_subtitle text,

  -- Calendar path
  enable_calendar boolean NOT NULL DEFAULT true,
  calendar_pms_kind text,
  calendar_redirect_url text,
  calendar_button_label text NOT NULL DEFAULT 'Book on Calendar',
  calendar_capture_phone boolean NOT NULL DEFAULT true,
  calendar_capture_email boolean NOT NULL DEFAULT false,
  calendar_capture_full_name boolean NOT NULL DEFAULT false,
  calendar_consent_text text,
  calendar_consent_text_version text,
  calendar_interstitial_message text DEFAULT 'Taking you to the booking calendar...',
  calendar_interstitial_duration_ms integer NOT NULL DEFAULT 1500,

  -- Webform path
  enable_webform boolean NOT NULL DEFAULT true,
  webform_kind text NOT NULL DEFAULT 'practice_url',
  webform_redirect_url text,
  webform_crm_form_id uuid,
  webform_button_label text NOT NULL DEFAULT 'Send an Enquiry',
  webform_open_in_new_tab boolean NOT NULL DEFAULT false,

  -- WhatsApp path
  enable_whatsapp boolean NOT NULL DEFAULT true,
  whatsapp_phone_e164 text,
  whatsapp_button_label text NOT NULL DEFAULT 'WhatsApp Us',
  whatsapp_prefilled_message_template text DEFAULT 'Hi, I''d like to book an appointment.',

  -- Branding
  brand_primary_color text DEFAULT '#000000',
  brand_text_color text DEFAULT '#FFFFFF',
  brand_logo_url text,
  brand_font_family text,
  greeting_title text DEFAULT 'How can we help you today?',
  greeting_subtitle text,

  is_active boolean NOT NULL DEFAULT true,
  embed_script_secret text NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT practice_booking_widgets_calendar_pms_kind_check CHECK (
    calendar_pms_kind IS NULL OR calendar_pms_kind = ANY (ARRAY[
      'carestack', 'dentally', 'soe_exact', 'software_of_excellence',
      'r4', 'kiroku', 'other_url', 'crm_native'
    ]::text[])
  ),
  CONSTRAINT practice_booking_widgets_webform_kind_check CHECK (
    webform_kind = ANY (ARRAY['practice_url', 'crm_form']::text[])
  ),
  CONSTRAINT practice_booking_widgets_calendar_url_required CHECK (
    NOT enable_calendar OR calendar_redirect_url IS NOT NULL
  ),
  CONSTRAINT practice_booking_widgets_webform_url_required CHECK (
    NOT (enable_webform AND webform_kind = 'practice_url')
    OR webform_redirect_url IS NOT NULL
  ),
  CONSTRAINT practice_booking_widgets_webform_form_id_required CHECK (
    NOT (enable_webform AND webform_kind = 'crm_form')
    OR webform_crm_form_id IS NOT NULL
  ),
  CONSTRAINT practice_booking_widgets_whatsapp_phone_required CHECK (
    NOT enable_whatsapp OR whatsapp_phone_e164 IS NOT NULL
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'practice_booking_widgets_tenant_id_fkey') THEN
    ALTER TABLE public.practice_booking_widgets
      ADD CONSTRAINT practice_booking_widgets_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'practice_booking_widgets_practice_location_fkey') THEN
    ALTER TABLE public.practice_booking_widgets
      ADD CONSTRAINT practice_booking_widgets_practice_location_fkey
      FOREIGN KEY (practice_location_id) REFERENCES public.practice_locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_intent_sessions_widget_fkey') THEN
    ALTER TABLE public.lead_intent_sessions
      ADD CONSTRAINT lead_intent_sessions_widget_fkey
      FOREIGN KEY (practice_booking_widget_id) REFERENCES public.practice_booking_widgets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_booking_widgets_slug
  ON public.practice_booking_widgets (slug);
CREATE INDEX IF NOT EXISTS idx_practice_booking_widgets_tenant
  ON public.practice_booking_widgets (tenant_id);
CREATE INDEX IF NOT EXISTS idx_practice_booking_widgets_location
  ON public.practice_booking_widgets (practice_location_id)
  WHERE practice_location_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_practice_booking_widgets_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_practice_booking_widgets_updated_at ON public.practice_booking_widgets;
CREATE TRIGGER trg_practice_booking_widgets_updated_at
  BEFORE UPDATE ON public.practice_booking_widgets
  FOR EACH ROW EXECUTE FUNCTION public.tg_practice_booking_widgets_set_updated_at();

ALTER TABLE public.practice_booking_widgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Service role bypass practice_booking_widgets" ON public.practice_booking_widgets
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Tenant isolation SELECT practice_booking_widgets" ON public.practice_booking_widgets
  FOR SELECT USING (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Tenant isolation INSERT practice_booking_widgets" ON public.practice_booking_widgets
  FOR INSERT WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Tenant isolation UPDATE practice_booking_widgets" ON public.practice_booking_widgets
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Tenant isolation DELETE practice_booking_widgets" ON public.practice_booking_widgets
  FOR DELETE USING (tenant_id = get_user_org_id());

-- Anonymous read so the widget loader can fetch config from a practice's
-- website without a user session. embed_script_secret in the URL gates which
-- widget can be loaded — Phase 2's API route will check the secret before
-- returning config.
DROP POLICY IF EXISTS "Anon read active practice_booking_widgets" ON public.practice_booking_widgets;
CREATE POLICY "Anon read active practice_booking_widgets" ON public.practice_booking_widgets
  FOR SELECT TO anon
  USING (is_active = true);


-- =====================================================================
-- Block 1.7 — practice_domains table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.practice_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  practice_location_id uuid,
  practice_booking_widget_id uuid,

  domain text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_verified boolean NOT NULL DEFAULT false,
  ssl_status text NOT NULL DEFAULT 'pending',
  domain_kind text NOT NULL DEFAULT 'widget',
  verification_token text,
  verified_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT practice_domains_kind_check CHECK (
    domain_kind = ANY (ARRAY['widget', 'landing_page', 'booking_portal', 'other']::text[])
  ),
  CONSTRAINT practice_domains_ssl_status_check CHECK (
    ssl_status = ANY (ARRAY['pending', 'active', 'failed', 'not_required']::text[])
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'practice_domains_tenant_id_fkey') THEN
    ALTER TABLE public.practice_domains
      ADD CONSTRAINT practice_domains_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'practice_domains_practice_location_fkey') THEN
    ALTER TABLE public.practice_domains
      ADD CONSTRAINT practice_domains_practice_location_fkey
      FOREIGN KEY (practice_location_id) REFERENCES public.practice_locations(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'practice_domains_widget_fkey') THEN
    ALTER TABLE public.practice_domains
      ADD CONSTRAINT practice_domains_widget_fkey
      FOREIGN KEY (practice_booking_widget_id) REFERENCES public.practice_booking_widgets(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_domains_domain
  ON public.practice_domains (domain);
CREATE INDEX IF NOT EXISTS idx_practice_domains_tenant
  ON public.practice_domains (tenant_id);

CREATE OR REPLACE FUNCTION public.tg_practice_domains_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_practice_domains_updated_at ON public.practice_domains;
CREATE TRIGGER trg_practice_domains_updated_at
  BEFORE UPDATE ON public.practice_domains
  FOR EACH ROW EXECUTE FUNCTION public.tg_practice_domains_set_updated_at();

ALTER TABLE public.practice_domains ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass practice_domains" ON public.practice_domains;
CREATE POLICY "Service role bypass practice_domains" ON public.practice_domains
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Tenant isolation SELECT practice_domains" ON public.practice_domains;
CREATE POLICY "Tenant isolation SELECT practice_domains" ON public.practice_domains
  FOR SELECT USING (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT practice_domains" ON public.practice_domains;
CREATE POLICY "Tenant isolation INSERT practice_domains" ON public.practice_domains
  FOR INSERT WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE practice_domains" ON public.practice_domains;
CREATE POLICY "Tenant isolation UPDATE practice_domains" ON public.practice_domains
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE practice_domains" ON public.practice_domains;
CREATE POLICY "Tenant isolation DELETE practice_domains" ON public.practice_domains
  FOR DELETE USING (tenant_id = get_user_org_id());


-- =====================================================================
-- Block 1.8 — Extend consent_records
-- =====================================================================
ALTER TABLE public.consent_records
  ADD COLUMN IF NOT EXISTS consent_text_version text,
  ADD COLUMN IF NOT EXISTS lawful_basis text,
  ADD COLUMN IF NOT EXISTS consent_locale text DEFAULT 'en-GB';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_schema = 'public'
      AND constraint_name = 'consent_records_lawful_basis_check'
  ) THEN
    ALTER TABLE public.consent_records
      ADD CONSTRAINT consent_records_lawful_basis_check
      CHECK (lawful_basis IS NULL OR lawful_basis = ANY (ARRAY[
        'consent', 'contract', 'legal_obligation',
        'vital_interests', 'public_task', 'legitimate_interests'
      ]::text[]));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_consent_records_text_version
  ON public.consent_records (consent_text_version)
  WHERE consent_text_version IS NOT NULL;


-- =====================================================================
-- Block 1.9 — lead_sla_rules table
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.lead_sla_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid,
  practice_location_id uuid,
  source_channel public.source_channel_enum NOT NULL,
  first_response_minutes integer NOT NULL,
  escalation_after_minutes integer,
  escalation_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  business_hours_only boolean NOT NULL DEFAULT false,
  business_hours_start time NOT NULL DEFAULT '07:00',
  business_hours_end time NOT NULL DEFAULT '22:00',
  business_hours_timezone text NOT NULL DEFAULT 'Europe/London',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT lead_sla_rules_scope_check CHECK (
    (tenant_id IS NULL AND practice_location_id IS NULL)
    OR (tenant_id IS NOT NULL)
  )
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_sla_rules_tenant_id_fkey') THEN
    ALTER TABLE public.lead_sla_rules
      ADD CONSTRAINT lead_sla_rules_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                 WHERE constraint_schema = 'public'
                   AND constraint_name = 'lead_sla_rules_practice_location_fkey') THEN
    ALTER TABLE public.lead_sla_rules
      ADD CONSTRAINT lead_sla_rules_practice_location_fkey
      FOREIGN KEY (practice_location_id) REFERENCES public.practice_locations(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_sla_rule_system_default
  ON public.lead_sla_rules (source_channel)
  WHERE tenant_id IS NULL AND practice_location_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sla_rule_tenant
  ON public.lead_sla_rules (tenant_id, source_channel)
  WHERE tenant_id IS NOT NULL AND practice_location_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_sla_rule_location
  ON public.lead_sla_rules (tenant_id, practice_location_id, source_channel)
  WHERE practice_location_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_lead_sla_rules_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_lead_sla_rules_updated_at ON public.lead_sla_rules;
CREATE TRIGGER trg_lead_sla_rules_updated_at
  BEFORE UPDATE ON public.lead_sla_rules
  FOR EACH ROW EXECUTE FUNCTION public.tg_lead_sla_rules_set_updated_at();

ALTER TABLE public.lead_sla_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role bypass lead_sla_rules" ON public.lead_sla_rules;
CREATE POLICY "Service role bypass lead_sla_rules" ON public.lead_sla_rules
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- System defaults (tenant_id IS NULL) are readable by every authenticated
-- user; tenant-scoped rows are gated on get_user_org_id() match.
DROP POLICY IF EXISTS "Tenant isolation SELECT lead_sla_rules" ON public.lead_sla_rules;
CREATE POLICY "Tenant isolation SELECT lead_sla_rules" ON public.lead_sla_rules
  FOR SELECT USING (tenant_id IS NULL OR tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation INSERT lead_sla_rules" ON public.lead_sla_rules;
CREATE POLICY "Tenant isolation INSERT lead_sla_rules" ON public.lead_sla_rules
  FOR INSERT WITH CHECK (tenant_id IS NOT NULL AND tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation UPDATE lead_sla_rules" ON public.lead_sla_rules;
CREATE POLICY "Tenant isolation UPDATE lead_sla_rules" ON public.lead_sla_rules
  FOR UPDATE USING (tenant_id = get_user_org_id())
  WITH CHECK (tenant_id = get_user_org_id());

DROP POLICY IF EXISTS "Tenant isolation DELETE lead_sla_rules" ON public.lead_sla_rules;
CREATE POLICY "Tenant isolation DELETE lead_sla_rules" ON public.lead_sla_rules
  FOR DELETE USING (tenant_id = get_user_org_id());


-- =====================================================================
-- Block 1.10 — Seed system-default SLA rules (25 rows)
-- =====================================================================
INSERT INTO public.lead_sla_rules
  (tenant_id, practice_location_id, source_channel, first_response_minutes,
   escalation_after_minutes, business_hours_only, business_hours_start,
   business_hours_end, business_hours_timezone, is_active)
VALUES
  (NULL, NULL, 'phone_call_inbound',         5,  15, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'phone_call_voicemail',       5,  15, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'booking_widget_calendar',    5,  15, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'booking_widget_webform',    15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'booking_widget_whatsapp',   15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'whatsapp_website_button',   15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'whatsapp_meta_ad',          15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'whatsapp_qr',               15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'sms_inbound',               15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'meta_lead_ad',              15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'meta_messenger_ad',         15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'google_lead_form',          15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'google_search_ad',          15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'google_display_ad',         15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'form_hosted_landing',       15,  45, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'form_embedded',             60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'instagram_dm',              60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'fb_messenger',              60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'online_booking_completed',  60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'online_booking_abandoned',  60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'manual_entry',             1440, NULL, true, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'csv_import',               1440, NULL, true, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'api_partner',                60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'referral',                   60, 180, false, '07:00', '22:00', 'Europe/London', true),
  (NULL, NULL, 'other',                      60, 180, false, '07:00', '22:00', 'Europe/London', true)
ON CONFLICT DO NOTHING;

COMMIT;

-- =====================================================================
-- Verification (informational; run by hand after apply)
-- =====================================================================
-- After COMMIT this migration leaves the database with:
--   - public.source_channel_enum (25 values)
--   - 32 first_touch_*/last_touch_* columns on public.contacts
--   - public.channel_identifiers
--   - public.attribution_touchpoints
--   - public.lead_intent_sessions
--   - public.practice_booking_widgets
--   - public.practice_domains
--   - public.lead_sla_rules (with 25 system-default rows)
--   - 3 new columns on public.consent_records
--   - RLS enabled on all 6 new tables (one policy per CRUD action +
--     service_role bypass; practice_booking_widgets also has anon SELECT
--     gated on is_active = true)
