-- ============================================================================
-- Phase 2b.2.a.2 — WhatsApp inbound media capture
-- ============================================================================
-- Adds the `message_media` table, the `message-media` Supabase Storage bucket,
-- and tenant-scoped RLS on both. Driven by the route handler at
-- `/api/webhooks/whatsapp` after `processWhatsappInboundMessage` creates an
-- activity for an inbound message that includes one or more attachments
-- (image / audio / video / PDF).
--
-- Discipline:
--   - All `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for idempotency.
--   - Tenant-scoping uses the existing `public.get_accessible_tenants()` helper
--     to mirror the pattern on `attribution_touchpoints`, `activities`, and
--     `contacts` (see `docs/F02_authorization_rbac_permissions.md`).
--   - Service-role policies keep the webhook (which runs before any user auth
--     and uses `SUPABASE_SERVICE_ROLE_KEY`) able to insert / upload.
--   - `expires_at` is retention scaffolding ONLY — no enforcement is built in
--     this phase. A later GDPR-retention phase can pick it up.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. message_media table
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.message_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  activity_id uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  attribution_touchpoint_id uuid NOT NULL REFERENCES public.attribution_touchpoints(id) ON DELETE CASCADE,

  -- The Twilio MessageSid (or future channel-specific external id) that
  -- brought this media. Composite-unique with `media_index` for idempotency
  -- against provider retries.
  external_message_id text NOT NULL,
  media_index integer NOT NULL CHECK (media_index >= 0),

  -- Where the file lives in Supabase Storage. `storage_path` is the path
  -- *within* the bucket (no leading slash). Bucket is the literal bucket id.
  storage_bucket text NOT NULL DEFAULT 'message-media',
  storage_path text NOT NULL,

  -- File metadata.
  content_type text NOT NULL,            -- image/jpeg, audio/ogg, application/pdf, etc.
  byte_size bigint NOT NULL CHECK (byte_size >= 0),
  original_url text,                      -- provider's URL (e.g. Twilio's; expires). Kept for audit.

  -- Retention scaffolding. NULL = no expiry. A future phase enforces
  -- deletion / soft-deletion based on this column.
  expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.message_media IS
  'Inbound message media (photos, voice notes, videos, documents) captured '
  'from messaging channels (WhatsApp via Twilio in 2b.2.a.2; Messenger '
  'reuses the same shape in 2b.2.b). One row per media item per inbound '
  'message; the (external_message_id, media_index) partial unique index '
  'protects against provider retries.';

COMMENT ON COLUMN public.message_media.external_message_id IS
  'Provider message id that brought this media (Twilio MessageSid, Meta mid). '
  'Generic across channels — paired with media_index for uniqueness.';

COMMENT ON COLUMN public.message_media.expires_at IS
  'Retention scaffolding for a future GDPR-retention phase. NULL = no expiry. '
  'No automated enforcement is implemented in 2b.2.a.2.';

-- Idempotency: one row per (external_message_id, media_index). Catches
-- provider retries at the DB level when the SELECT-then-INSERT pattern
-- in `persistMessageMedia` races.
CREATE UNIQUE INDEX IF NOT EXISTS idx_message_media_msg_idx_uniq
  ON public.message_media (external_message_id, media_index);

-- Common access patterns.
CREATE INDEX IF NOT EXISTS idx_message_media_activity
  ON public.message_media (activity_id);
CREATE INDEX IF NOT EXISTS idx_message_media_contact
  ON public.message_media (contact_id);
CREATE INDEX IF NOT EXISTS idx_message_media_tenant_created
  ON public.message_media (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_media_expires
  ON public.message_media (expires_at)
  WHERE expires_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 2. RLS on message_media
-- ---------------------------------------------------------------------------
ALTER TABLE public.message_media ENABLE ROW LEVEL SECURITY;

-- Read: any tenant member can see media for activities in their tenant.
-- Matches existing activity visibility — same shape as the policies on
-- `activities` and `attribution_touchpoints`.
DROP POLICY IF EXISTS mm_select_tenant_members ON public.message_media;
CREATE POLICY mm_select_tenant_members ON public.message_media
  FOR SELECT TO authenticated
  USING (tenant_id = ANY(public.get_accessible_tenants()));

-- Service role catch-all for the webhook writes. Webhook runs before any
-- user auth (Twilio is the authentication, via signature) so RLS bypass
-- via service role is intentional.
DROP POLICY IF EXISTS mm_service_role_all ON public.message_media;
CREATE POLICY mm_service_role_all ON public.message_media
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- No INSERT/UPDATE/DELETE policy for `authenticated` — writes happen only
-- via service role inside the webhook handler. UI is read-only.

-- ---------------------------------------------------------------------------
-- 3. Supabase Storage bucket
-- ---------------------------------------------------------------------------
-- 16 MiB cap matches Twilio's WhatsApp media maximum. Allowed mime types
-- intentionally cover the WhatsApp-supported families (image / audio /
-- video / PDF) and exclude everything else as a defense-in-depth measure
-- on top of the helper's own filtering.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'message-media',
  'message-media',
  false,
  16777216,
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    'audio/ogg', 'audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/amr', 'audio/wav',
    'video/mp4', 'video/quicktime', 'video/webm', 'video/3gpp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. RLS on storage.objects for the message-media bucket
-- ---------------------------------------------------------------------------
-- Path structure: `{tenant_id}/{activity_id}/{media_index}.{ext}`. The first
-- segment (`storage.foldername(name)[1]`) is the tenant UUID.
DROP POLICY IF EXISTS mm_storage_select_tenant_members ON storage.objects;
CREATE POLICY mm_storage_select_tenant_members ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'message-media'
    AND ((storage.foldername(name))[1])::uuid = ANY(public.get_accessible_tenants())
  );

-- Service role can do anything within the bucket. Uploads happen via
-- service role inside the webhook handler.
DROP POLICY IF EXISTS mm_storage_service_role_all ON storage.objects;
CREATE POLICY mm_storage_service_role_all ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'message-media')
  WITH CHECK (bucket_id = 'message-media');
