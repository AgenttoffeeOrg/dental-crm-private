-- Phase 2b.1.b.1 — Google Outbound Conversion Events
--
-- Adds:
--   1A. OAuth + Google Ads target columns on google_lead_form_configs
--   1B. conversion_events_fired table (idempotent firing log; one platform = google_ads in 2b.1.b.1)
--   1C. deals.first_response_at + activities -> deals trigger (per-deal first response stamping)
--
-- Companion rollback: 20260507_phase_2b_1_b_1_google_conversions_rollback.sql

BEGIN;

-- =============================================================================
-- 1A. Extend google_lead_form_configs
-- =============================================================================
ALTER TABLE google_lead_form_configs
  ADD COLUMN customer_id                       text,
  ADD COLUMN login_customer_id                 text,
  ADD COLUMN conversion_action_resource_name   text,
  ADD COLUMN oauth_refresh_token_encrypted     text,
  ADD COLUMN oauth_scope                       text,
  ADD COLUMN oauth_connected_at                timestamptz,
  ADD COLUMN oauth_connected_by_user_id        uuid REFERENCES app_users(id),
  ADD COLUMN oauth_pending_state               text UNIQUE,
  ADD COLUMN oauth_pending_state_expires_at    timestamptz;

CREATE INDEX idx_google_lead_form_configs_oauth_pending_state
  ON google_lead_form_configs (oauth_pending_state)
  WHERE oauth_pending_state IS NOT NULL;

COMMENT ON COLUMN google_lead_form_configs.customer_id IS
  'Google Ads 10-digit customer ID (no dashes), e.g. 1675268286';
COMMENT ON COLUMN google_lead_form_configs.login_customer_id IS
  'Google Ads manager (MCC) account ID, sent as login-customer-id header when set';
COMMENT ON COLUMN google_lead_form_configs.conversion_action_resource_name IS
  'Full resource path, e.g. customers/1675268286/conversionActions/7600535419';
COMMENT ON COLUMN google_lead_form_configs.oauth_refresh_token_encrypted IS
  'AES-256-GCM ciphertext (base64) of the long-lived OAuth refresh token. '
  'Encrypted via src/lib/crypto/integration-credentials.ts using INTEGRATION_CREDENTIAL_KEY.';
COMMENT ON COLUMN google_lead_form_configs.oauth_pending_state IS
  'One-shot CSRF token for a pending OAuth flow; UNIQUE so two tenants can never collide. NULL when no pending flow.';
COMMENT ON COLUMN google_lead_form_configs.oauth_pending_state_expires_at IS
  'Hard expiry for oauth_pending_state. Callback rejects expired states.';


-- =============================================================================
-- 1B. conversion_events_fired
-- =============================================================================
CREATE TABLE conversion_events_fired (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                       uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  deal_id                         uuid NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  contact_id                      uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,

  platform                        text NOT NULL CHECK (platform IN ('google_ads')),
  event_type                      text NOT NULL CHECK (event_type IN ('Lead', 'FirstResponse')),

  -- Payload metadata for replay/audit (NOT for re-firing)
  conversion_action_resource_name text,
  gclid                           text,
  occurred_at                     timestamptz NOT NULL,

  -- Result of the firing attempt
  status                          text NOT NULL CHECK (status IN ('success', 'failure', 'skipped_no_gclid', 'skipped_other')),
  http_status                     int,
  response_excerpt                text,
  error_message                   text,

  fired_at                        timestamptz NOT NULL DEFAULT now(),
  retry_count                     int NOT NULL DEFAULT 0
);

-- Idempotency: only one SUCCESSFUL firing per (deal, event_type, platform).
-- Failed and skipped rows are unrestricted so they can be retried / re-recorded.
CREATE UNIQUE INDEX idx_conversion_events_fired_idempotency
  ON conversion_events_fired (deal_id, event_type, platform)
  WHERE status = 'success';

CREATE INDEX idx_conversion_events_fired_tenant_fired_at
  ON conversion_events_fired (tenant_id, fired_at DESC);

CREATE INDEX idx_conversion_events_fired_status_fired_at
  ON conversion_events_fired (status, fired_at DESC) WHERE status = 'failure';

COMMENT ON TABLE conversion_events_fired IS
  'Audit + idempotency log of conversion events fired to ad platforms (Phase 2b.1.b.1: google_ads only). '
  'A row exists for every fire attempt, including skips. The partial UNIQUE index on status=''success'' '
  'enforces "fire once per deal+event+platform" without blocking retries of failed/skipped attempts.';

ALTER TABLE conversion_events_fired ENABLE ROW LEVEL SECURITY;

-- SELECT: any tenant member can read their tenant's firing log.
-- get_accessible_tenants() returns uuid[]; use = ANY(...) per the 2b.1.a pattern.
CREATE POLICY conversion_events_fired_select
  ON conversion_events_fired
  FOR SELECT
  USING (tenant_id = ANY (get_accessible_tenants()));

-- INSERT: gated by settings.integrations.manage. The engine writes via service role
-- and bypasses RLS; this policy only matters for manual inserts from authenticated
-- users (admins debugging via SQL editor).
CREATE POLICY conversion_events_fired_insert_authenticated
  ON conversion_events_fired
  FOR INSERT
  WITH CHECK (
    tenant_id = ANY (get_accessible_tenants())
    AND user_has_permission(auth.uid(), tenant_id, 'settings.integrations.manage')
  );

-- Service role catch-all: matches the 2b.1.a pattern on google_lead_form_configs.
CREATE POLICY conversion_events_fired_service_role
  ON conversion_events_fired
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);


-- =============================================================================
-- 1C. deals.first_response_at + activities trigger
-- =============================================================================
ALTER TABLE deals
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

COMMENT ON COLUMN deals.first_response_at IS
  'Timestamp of the FIRST outbound activity recorded against this deal. '
  'Stamped by trigger activities_stamp_deal_first_response on activities INSERT. '
  'NULL until the practice replies. Drives the FirstResponse conversion event in Phase 2b.1.b.1 '
  'and downstream first-response SLA reporting.';

-- Trigger function: stamp deals.first_response_at on the FIRST outbound activity per deal.
-- IMPORTANT: this is a SIBLING of the existing contact-level first-response trigger
-- (trigger_update_contact_first_response). We deliberately do NOT modify that one;
-- per-contact and per-deal tracking serve different downstream consumers.
CREATE OR REPLACE FUNCTION trigger_update_deal_first_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direction = 'outbound' AND NEW.deal_id IS NOT NULL THEN
    UPDATE deals
       SET first_response_at = COALESCE(NEW.occurred_at, now())
     WHERE id = NEW.deal_id
       AND first_response_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION trigger_update_deal_first_response IS
  'Phase 2b.1.b.1: stamps deals.first_response_at on the first outbound activity for that deal. '
  'Idempotent (only updates when first_response_at IS NULL).';

CREATE TRIGGER activities_stamp_deal_first_response
  AFTER INSERT ON activities
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_deal_first_response();

-- Lock down the SECURITY DEFINER trigger function: it should only run as part of
-- the AFTER INSERT trigger context, never directly via PostgREST /rest/v1/rpc.
-- (Required to satisfy Supabase advisors `anon_security_definer_function_executable`
-- and `authenticated_security_definer_function_executable`.)
REVOKE EXECUTE ON FUNCTION trigger_update_deal_first_response() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION trigger_update_deal_first_response() FROM anon;
REVOKE EXECUTE ON FUNCTION trigger_update_deal_first_response() FROM authenticated;

COMMIT;
