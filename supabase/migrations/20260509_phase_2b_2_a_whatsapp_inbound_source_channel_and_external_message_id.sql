-- ============================================================================
-- Phase 2b.2.a — WhatsApp inbound source channel + external message id
-- ============================================================================
-- Adds:
--   1) `whatsapp_inbound` value to `public.source_channel_enum` so the
--      rewritten `/api/webhooks/whatsapp` can call ingestLead() with a
--      typed channel value (separate from the existing user-arrival
--      `whatsapp_*_button/_meta_ad/_qr` values, which describe how the
--      lead reached us, not "the patient sent us a DM").
--   2) `attribution_touchpoints.external_message_id` text column — generic
--      so 2b.2.b (Messenger inbound) can reuse it for `mid`.
--   3) Partial unique index on
--      `(tenant_id, source_channel, external_message_id) WHERE
--       external_message_id IS NOT NULL` — DB-level idempotency for
--      Twilio retries; doubles as the lookup index for the route's
--      pre-flight `isMessageAlreadyProcessed` check.
--
-- Discipline: idempotent (`IF NOT EXISTS` / `ADD VALUE IF NOT EXISTS`).
-- No backfill required: existing touchpoints have no external_message_id,
-- the partial index ignores them.
-- ============================================================================

-- 1) Enum value ---------------------------------------------------------------
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in older
-- Postgres versions; Supabase migrations run each migration in its own
-- transaction by default. Postgres 12+ allows ADD VALUE in a transaction
-- block as long as the new value is not used in the same transaction.
-- We don't reference the new value below, so this is safe.
ALTER TYPE public.source_channel_enum ADD VALUE IF NOT EXISTS 'whatsapp_inbound';

-- 2) Column -------------------------------------------------------------------
ALTER TABLE public.attribution_touchpoints
  ADD COLUMN IF NOT EXISTS external_message_id text;

COMMENT ON COLUMN public.attribution_touchpoints.external_message_id IS
  'External provider message id (Twilio MessageSid, Meta mid, ...). '
  'Generic across channels — paired with source_channel for uniqueness. '
  'Phase 2b.2.a (WhatsApp inbound).';

-- 3) Partial unique index -----------------------------------------------------
-- Tenant-scoped + channel-scoped uniqueness so the same external id from a
-- different channel (or — much more theoretically — a different tenant) does
-- not collide. WHERE clause keeps existing nulls out of the index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_attribution_touchpoints_external_msg_uniq
  ON public.attribution_touchpoints (tenant_id, source_channel, external_message_id)
  WHERE external_message_id IS NOT NULL;
