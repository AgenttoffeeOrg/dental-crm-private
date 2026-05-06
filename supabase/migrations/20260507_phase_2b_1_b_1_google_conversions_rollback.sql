-- Phase 2b.1.b.1 rollback — undoes 20260507_phase_2b_1_b_1_google_conversions.sql
--
-- Run order is the reverse of the forward migration. Safe to re-run idempotently
-- (uses IF EXISTS / DROP IF EXISTS throughout).

BEGIN;

-- 1C. Drop deal first-response trigger + function + column
DROP TRIGGER IF EXISTS activities_stamp_deal_first_response ON activities;
DROP FUNCTION IF EXISTS trigger_update_deal_first_response();
ALTER TABLE deals DROP COLUMN IF EXISTS first_response_at;

-- 1B. Drop conversion_events_fired (CASCADE removes RLS policies and indexes)
DROP TABLE IF EXISTS conversion_events_fired CASCADE;

-- 1A. Drop OAuth + target columns from google_lead_form_configs
DROP INDEX IF EXISTS idx_google_lead_form_configs_oauth_pending_state;

ALTER TABLE google_lead_form_configs
  DROP COLUMN IF EXISTS oauth_pending_state_expires_at,
  DROP COLUMN IF EXISTS oauth_pending_state,
  DROP COLUMN IF EXISTS oauth_connected_by_user_id,
  DROP COLUMN IF EXISTS oauth_connected_at,
  DROP COLUMN IF EXISTS oauth_scope,
  DROP COLUMN IF EXISTS oauth_refresh_token_encrypted,
  DROP COLUMN IF EXISTS conversion_action_resource_name,
  DROP COLUMN IF EXISTS login_customer_id,
  DROP COLUMN IF EXISTS customer_id;

COMMIT;
