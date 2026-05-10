-- Phase 2b.4 — SMS inbound: enum value + tenant SMS number column.
--
-- Companion migration to 20260509_phase_2b_2_a_whatsapp_inbound_source_channel_
-- and_external_message_id.sql. Idempotent — safe to re-apply as a no-op.
--
-- Pre-flight check (2026-05-10) showed that 'sms_inbound' was already present
-- in this database's source_channel_enum (added by an earlier phase whose
-- effects predated this prompt). The migration is still authored to ADD VALUE
-- IF NOT EXISTS so the SQL is replayable in fresh environments and CI.
--
-- Out of scope: dedicated SMS-number provisioning UI, settings tab, multi-
-- number routing. Phase 2b.4 sets the test tenant's number directly so the
-- inbound webhook can resolve tenant by `To`. Other tenants gain SMS via SQL
-- until the practice-onboarding wizard ships.

-- 1. Add 'sms_inbound' to the source_channel_enum.
ALTER TYPE public.source_channel_enum ADD VALUE IF NOT EXISTS 'sms_inbound';

-- 2. Add tenants.sms_phone_number column (nullable, text) if it doesn't exist.
--    Mirrors the existing whatsapp_phone_number column shape.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS sms_phone_number TEXT;

COMMENT ON COLUMN public.tenants.sms_phone_number IS
  'E.164 phone number (e.g. +447782218044) used as the receiving SMS number for tenant-resolution in /api/webhooks/sms. Each tenant gets their own dedicated Twilio SMS number in production. Phase 2b.4.';

-- 3. Set the test tenant's sms_phone_number so the inbound webhook can resolve
--    tenant by `To`. Targets exactly one row by id; idempotent.
UPDATE public.tenants
   SET sms_phone_number = '+447782218044'
 WHERE id = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
   AND (sms_phone_number IS NULL OR sms_phone_number != '+447782218044');
