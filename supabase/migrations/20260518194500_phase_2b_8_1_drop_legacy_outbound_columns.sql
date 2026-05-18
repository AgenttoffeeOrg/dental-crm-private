-- =====================================================================
-- Phase 2b.8.1 — drop legacy plain-text outbound credential columns
-- =====================================================================
-- Authored by 2b.8, parked in docs/2b/migrations-pending/, applied by
-- 2b.8.1 after 2b.8.2 confirmed the CIT now writes to
-- integration_settings exclusively and the dispatcher reads from it
-- (verified end-to-end via live SMS send on 2026-05-13).
--
-- Drops 14 columns on public.tenants and the public.email_logs table.
-- Preserved: sms_phone_number, whatsapp_phone_number (inbound webhook
-- routing), and email/email_main/email_support (tenant contact info,
-- surviving callers found by 2b.8 pre-flight §2.1).
-- =====================================================================
--
-- Drops the legacy plain-text outbound credential columns on `tenants`
-- that no surviving code reads or writes after 2b.8. Also drops the
-- `email_logs` table whose only writer (`lib/email-queue.ts`) was
-- deleted in 2b.7 §6.
--
-- ---------------------------------------------------------------------
-- Drop set (14 columns) — confirmed DROP_SAFE during 2b.8 pre-flight §2.1
-- ---------------------------------------------------------------------
--   - default_email_from_address
--   - default_email_from_name
--   - default_email_reply_to
--   - sms_api_key
--   - sms_api_secret
--   - sms_from_number
--   - sms_provider
--   - smtp_encryption
--   - smtp_host
--   - smtp_password
--   - smtp_port
--   - smtp_username
--   - whatsapp_api_key
--   - whatsapp_api_secret
--
-- ---------------------------------------------------------------------
-- Preserved (NOT dropped here) — confirmed during 2b.8 pre-flight §2.1
-- ---------------------------------------------------------------------
--   - tenants.sms_phone_number       — used by inbound SMS webhook tenant
--                                       resolution (per 2b.4 schema and
--                                       outbound audit §7.1 / §7.3).
--   - tenants.whatsapp_phone_number  — used by inbound WhatsApp webhook
--                                       tenant resolution (per outbound
--                                       audit §7.4).
--   - tenants.email                  — referenced by the marketing
--                                       merge-tag resolver
--                                       (`src/lib/marketing/merge-tag-resolver.ts:108`)
--                                       which expands `{{practice.email}}`
--                                       from `practiceInfo.email`.
--   - tenants.email_main             — tenant contact address; read/written
--                                       by the org profile editor, the
--                                       contact-information section, and
--                                       the onboarding contact-info step
--                                       (3 surviving callers).
--   - tenants.email_support          — tenant contact address; read/written
--                                       by the same three surviving
--                                       callers as `email_main`.
--
-- ---------------------------------------------------------------------
-- To apply (in a future phase):
-- ---------------------------------------------------------------------
--   1. Move this file into dental-crm/supabase/migrations/ with a
--      fresh YYYYMMDDHHMMSS timestamp prefix.
--   2. Move the `_rollback.sql` companion alongside it.
--   3. Run via supabase migration up (or the project's standard apply
--      path: supabase MCP `apply_migration` / `npx supabase db push`).
--   4. Regenerate TypeScript types
--      (`supabase MCP generate_typescript_types`) so `src/types/supabase.ts`
--      drops the deleted columns and the `email_logs` table.
--   5. Run the post-apply check below.
-- =====================================================================

BEGIN;

ALTER TABLE public.tenants
  DROP COLUMN IF EXISTS default_email_from_address,
  DROP COLUMN IF EXISTS default_email_from_name,
  DROP COLUMN IF EXISTS default_email_reply_to,
  -- PRESERVED: email, email_main, email_support — see header (surviving
  -- callers: org profile editor, contact-info section, onboarding step,
  -- marketing merge-tag resolver).
  DROP COLUMN IF EXISTS sms_api_key,
  DROP COLUMN IF EXISTS sms_api_secret,
  DROP COLUMN IF EXISTS sms_from_number,
  -- PRESERVED: sms_phone_number — inbound SMS webhook tenant resolution.
  DROP COLUMN IF EXISTS sms_provider,
  DROP COLUMN IF EXISTS smtp_encryption,
  DROP COLUMN IF EXISTS smtp_host,
  DROP COLUMN IF EXISTS smtp_password,
  DROP COLUMN IF EXISTS smtp_port,
  DROP COLUMN IF EXISTS smtp_username,
  DROP COLUMN IF EXISTS whatsapp_api_key,
  DROP COLUMN IF EXISTS whatsapp_api_secret;
  -- PRESERVED: whatsapp_phone_number — inbound WhatsApp webhook tenant
  -- resolution.

DROP TABLE IF EXISTS public.email_logs;

COMMIT;

-- =====================================================================
-- Post-apply check (run after apply, expect counts as documented):
-- =====================================================================
-- SELECT count(*) AS dropped_columns_remaining
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'tenants'
--     AND column_name IN (
--       'default_email_from_address', 'default_email_from_name',
--       'default_email_reply_to', 'sms_api_key', 'sms_api_secret',
--       'sms_from_number', 'sms_provider', 'smtp_encryption',
--       'smtp_host', 'smtp_password', 'smtp_port', 'smtp_username',
--       'whatsapp_api_key', 'whatsapp_api_secret'
--     );
-- -- expect: 0
--
-- SELECT count(*) AS email_logs_remaining
--   FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'email_logs';
-- -- expect: 0
--
-- SELECT count(*) AS inbound_routing_preserved
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'tenants'
--     AND column_name IN ('sms_phone_number', 'whatsapp_phone_number');
-- -- expect: 2
--
-- SELECT count(*) AS tenant_contact_preserved
--   FROM information_schema.columns
--   WHERE table_schema = 'public' AND table_name = 'tenants'
--     AND column_name IN ('email', 'email_main', 'email_support');
-- -- expect: 3
-- =====================================================================
