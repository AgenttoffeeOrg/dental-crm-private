-- Phase 1 — Attribution backfill from marketing_form_submissions
--
-- Purpose: populate first_touch_*, last_touch_* on contacts and
-- attribution_touchpoints from historical marketing_form_submissions.payload
-- so the new typed columns are consistent with prior form-submission history.
--
-- Pre-launch (zero real data) this is expected to write zero rows. The DML
-- is idempotent: it skips rows where the target columns are already set
-- (first_touch_at IS NULL guards) and uses a NOT EXISTS guard for
-- attribution_touchpoints to avoid duplicate inserts on re-run.
--
-- Live-schema notes (verified via Supabase MCP introspection):
--   - public.contacts has primary_email_norm and primary_phone_e164.
--   - public.marketing_form_submissions has tenant_id, form_id, contact_id,
--     payload (jsonb), referrer_url, user_agent, ip_address (text), and
--     created_at — all the columns the backfill needs. No DO-block guards
--     required.
--
-- Author: Phase 1 backfill, 2026-05-02.

BEGIN;

-- Backfill first_touch from earliest matching form submission per contact
WITH first_submissions AS (
  SELECT DISTINCT ON (mfs.tenant_id, COALESCE(mfs.contact_id, c.id))
    mfs.id AS submission_id,
    mfs.tenant_id,
    COALESCE(mfs.contact_id, c.id) AS contact_id,
    mfs.created_at,
    mfs.payload,
    mfs.referrer_url,
    mfs.user_agent,
    mfs.ip_address
  FROM public.marketing_form_submissions mfs
  LEFT JOIN public.contacts c
    ON c.tenant_id = mfs.tenant_id
    AND (
      c.primary_email_norm = lower(trim(mfs.payload->>'email'))
      OR c.primary_phone_e164 = mfs.payload->>'phone'
    )
  WHERE mfs.created_at IS NOT NULL
  ORDER BY mfs.tenant_id, COALESCE(mfs.contact_id, c.id), mfs.created_at ASC
)
UPDATE public.contacts c
SET
  first_touch_at = COALESCE(c.first_touch_at, fs.created_at),
  first_touch_utm_source = COALESCE(c.first_touch_utm_source, fs.payload->>'utm_source'),
  first_touch_utm_medium = COALESCE(c.first_touch_utm_medium, fs.payload->>'utm_medium'),
  first_touch_utm_campaign = COALESCE(c.first_touch_utm_campaign, fs.payload->>'utm_campaign'),
  first_touch_utm_content = COALESCE(c.first_touch_utm_content, fs.payload->>'utm_content'),
  first_touch_utm_term = COALESCE(c.first_touch_utm_term, fs.payload->>'utm_term'),
  first_touch_gclid = COALESCE(c.first_touch_gclid, fs.payload->>'gclid'),
  first_touch_fbclid = COALESCE(c.first_touch_fbclid, fs.payload->>'fbclid'),
  first_touch_referrer_url = COALESCE(c.first_touch_referrer_url, fs.referrer_url),
  first_touch_user_agent = COALESCE(c.first_touch_user_agent, fs.user_agent),
  first_touch_ip_address = COALESCE(c.first_touch_ip_address, fs.ip_address::inet),
  first_touch_source_channel = COALESCE(
    c.first_touch_source_channel,
    'form_embedded'::public.source_channel_enum
  )
FROM first_submissions fs
WHERE c.id = fs.contact_id
  AND c.first_touch_at IS NULL;

-- Backfill last_touch from most recent matching form submission per contact
WITH last_submissions AS (
  SELECT DISTINCT ON (mfs.tenant_id, COALESCE(mfs.contact_id, c.id))
    mfs.tenant_id,
    COALESCE(mfs.contact_id, c.id) AS contact_id,
    mfs.created_at,
    mfs.payload,
    mfs.referrer_url,
    mfs.user_agent,
    mfs.ip_address
  FROM public.marketing_form_submissions mfs
  LEFT JOIN public.contacts c
    ON c.tenant_id = mfs.tenant_id
    AND (
      c.primary_email_norm = lower(trim(mfs.payload->>'email'))
      OR c.primary_phone_e164 = mfs.payload->>'phone'
    )
  WHERE mfs.created_at IS NOT NULL
  ORDER BY mfs.tenant_id, COALESCE(mfs.contact_id, c.id), mfs.created_at DESC
)
UPDATE public.contacts c
SET
  last_touch_at = COALESCE(c.last_touch_at, ls.created_at),
  last_touch_utm_source = ls.payload->>'utm_source',
  last_touch_utm_medium = ls.payload->>'utm_medium',
  last_touch_utm_campaign = ls.payload->>'utm_campaign',
  last_touch_utm_content = ls.payload->>'utm_content',
  last_touch_utm_term = ls.payload->>'utm_term',
  last_touch_gclid = ls.payload->>'gclid',
  last_touch_fbclid = ls.payload->>'fbclid',
  last_touch_referrer_url = ls.referrer_url,
  last_touch_user_agent = ls.user_agent,
  last_touch_ip_address = ls.ip_address::inet,
  last_touch_source_channel = COALESCE(
    c.last_touch_source_channel,
    'form_embedded'::public.source_channel_enum
  )
FROM last_submissions ls
WHERE c.id = ls.contact_id
  AND c.last_touch_at IS NULL;

-- Backfill attribution_touchpoints from historical form submissions.
-- Idempotent via NOT EXISTS on metadata->>'submission_id'.
INSERT INTO public.attribution_touchpoints (
  tenant_id, contact_id, source_channel, source_sub_id, occurred_at,
  utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  gclid, fbclid, referrer_url, ip_address, user_agent, metadata
)
SELECT
  mfs.tenant_id,
  COALESCE(mfs.contact_id, c.id),
  'form_embedded'::public.source_channel_enum,
  mfs.form_id::text,
  mfs.created_at,
  mfs.payload->>'utm_source',
  mfs.payload->>'utm_medium',
  mfs.payload->>'utm_campaign',
  mfs.payload->>'utm_content',
  mfs.payload->>'utm_term',
  mfs.payload->>'gclid',
  mfs.payload->>'fbclid',
  mfs.referrer_url,
  mfs.ip_address::inet,
  mfs.user_agent,
  jsonb_build_object('backfilled', true, 'submission_id', mfs.id)
FROM public.marketing_form_submissions mfs
LEFT JOIN public.contacts c
  ON c.tenant_id = mfs.tenant_id
  AND (
    c.primary_email_norm = lower(trim(mfs.payload->>'email'))
    OR c.primary_phone_e164 = mfs.payload->>'phone'
  )
WHERE COALESCE(mfs.contact_id, c.id) IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.attribution_touchpoints t
    WHERE t.tenant_id = mfs.tenant_id
      AND t.contact_id = COALESCE(mfs.contact_id, c.id)
      AND t.metadata->>'submission_id' = mfs.id::text
  );

COMMIT;
