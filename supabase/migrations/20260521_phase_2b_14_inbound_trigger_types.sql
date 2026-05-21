-- =====================================================================
-- Phase 2b.14 — Add inbound trigger types to the automation catalog
-- =====================================================================
-- The automations.trigger_type column has no CHECK constraint — the
-- source of truth is the `automation_trigger_metadata` catalog table.
-- This migration registers three new trigger types that the
-- automation engine + listener will use:
--
--   * inbound_sms                  — fired when a patient texts in
--   * inbound_whatsapp             — fired when a patient WhatsApps in
--   * google_lead_form_submitted   — fired when a Google Lead Form lead arrives
--
-- The existing `form_submitted` row already covers web forms (and is
-- the canonical name the listener will use after 2b.14 — the prior
-- `form_submit` listener string was a mismatch, fixed in code).
--
-- `automation_trigger_metadata.category` has a CHECK that allows
-- 'marketing' — we reuse that. Inbound messaging fits there
-- semantically until we have a richer category vocabulary.
-- =====================================================================

INSERT INTO public.automation_trigger_metadata
  (trigger_type, category, display_name, description, icon, required_fields, optional_fields, example_config, is_active)
VALUES
  ('inbound_sms', 'marketing', 'Inbound SMS',
   'Fires when a patient sends an SMS to the practice number.',
   'message-square',
   '[]'::jsonb,
   '[{"key":"keywords","label":"Keywords (any-of)","type":"string[]"}]'::jsonb,
   '{"keywords":["braces","consultation"]}'::jsonb,
   true),
  ('inbound_whatsapp', 'marketing', 'Inbound WhatsApp',
   'Fires when a patient sends a WhatsApp message to the practice number.',
   'message-circle',
   '[]'::jsonb,
   '[{"key":"keywords","label":"Keywords (any-of)","type":"string[]"}]'::jsonb,
   '{"keywords":["braces","consultation"]}'::jsonb,
   true),
  ('google_lead_form_submitted', 'marketing', 'Google Lead Form Submitted',
   'Fires when a Google Lead Form delivers a new lead via webhook.',
   'megaphone',
   '[]'::jsonb,
   '[{"key":"form_id","label":"Specific form id","type":"string"}]'::jsonb,
   '{}'::jsonb,
   true)
ON CONFLICT (trigger_type) DO NOTHING;

COMMENT ON TABLE public.automation_trigger_metadata IS
  'Source of truth for valid automations.trigger_type values. Extended in 2b.14 with inbound messaging + Google Lead Form triggers.';
