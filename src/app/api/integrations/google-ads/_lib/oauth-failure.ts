/**
 * Phase 2b.1.b.2 — shared "OAuth was revoked" handling for the customer /
 * conversion-action list routes.
 *
 * When Google returns 401 we know the refresh token is dead. We
 * pre-emptively NULL out the OAuth fields on the active config row so the
 * UI's next render reflects reality (a "reconnect" prompt instead of a
 * misleading "loading customers..." spinner), and so subsequent fire-conversion
 * attempts short-circuit cleanly.
 *
 * We deliberately do NOT add a new `oauth_disconnected_at` column here; the
 * intent is "matches reality immediately", and adding a column is deferred
 * per `2b-1-b-1-changes.md` §11.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

const NULLED_OAUTH_FIELDS = {
  oauth_refresh_token_encrypted: null,
  oauth_scope: null,
  oauth_connected_at: null,
  oauth_connected_by_user_id: null,
  customer_id: null,
  login_customer_id: null,
  conversion_action_resource_name: null,
} as const

export async function nullOutRevokedOAuth(
  supabase: SupabaseClient,
  tenantId: string
): Promise<void> {
  const { error } = await supabase
    .from('google_lead_form_configs')
    .update(NULLED_OAUTH_FIELDS)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
  if (error) {
    console.error('[google-ads/_lib] nullOutRevokedOAuth failed', {
      tenant_id: tenantId,
      error_message: error.message,
    })
  }
}
