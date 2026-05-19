-- Phase 2b.11 — Conversation rows
-- Adds activities.conversation_id (nullable) + partial index + backfill.
-- Namespace UUID: 'dc5cee30-9488-4ebf-a7fe-250a98176501'
-- Backfill rule: uuidv5(namespace, tenant_id || ':' || contact_id || ':' || type)
-- when contact_id IS NOT NULL AND type IN ('email', 'sms', 'whatsapp').
-- Live schema uses activities.type (not a separate channel column).

BEGIN;

ALTER TABLE public.activities
  ADD COLUMN IF NOT EXISTS conversation_id uuid;

CREATE INDEX IF NOT EXISTS activities_conversation_id_idx
  ON public.activities (tenant_id, conversation_id, occurred_at DESC)
  WHERE conversation_id IS NOT NULL;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$
DECLARE
  backfill_count bigint;
BEGIN
  SELECT count(*) INTO backfill_count
  FROM public.activities
  WHERE contact_id IS NOT NULL
    AND type IN ('email', 'sms', 'whatsapp');

  IF backfill_count > 100000 THEN
    RAISE EXCEPTION 'Phase 2b.11 backfill aborted: % rows exceed 100k safety limit', backfill_count;
  END IF;
END $$;

UPDATE public.activities
SET conversation_id = uuid_generate_v5(
  'dc5cee30-9488-4ebf-a7fe-250a98176501'::uuid,
  tenant_id::text || ':' || contact_id::text || ':' || type
)
WHERE conversation_id IS NULL
  AND contact_id IS NOT NULL
  AND type IN ('email', 'sms', 'whatsapp');

COMMIT;
