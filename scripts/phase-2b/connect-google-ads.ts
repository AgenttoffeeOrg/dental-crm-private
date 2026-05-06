/**
 * Phase 2b.1.b.1 — CLI: kick off the Google Ads OAuth flow for a tenant.
 *
 * Usage:
 *   cd dental-crm
 *   set -a && source .env.local && set +a
 *   npx tsx scripts/phase-2b/connect-google-ads.ts <tenant_id>
 *
 * Behaviour:
 *   1. Validates the tenant exists and has an ACTIVE google_lead_form_configs row.
 *   2. Generates a fresh oauth_pending_state (32 random bytes, base64url) with a
 *      15-minute expiry; writes both onto the active config row (overwriting any
 *      prior pending state).
 *   3. Prints the Google OAuth consent URL for the operator to open in a browser.
 *   4. Operator completes consent → Google redirects to
 *      `${APP_BASE_URL}/api/integrations/google-ads/oauth/callback?code=...&state=...`.
 *   5. The callback route (Task 3B) exchanges the code for tokens, encrypts the
 *      refresh token, and clears the pending state.
 *
 * Service-role client; bypasses RLS, intentional for 2b.1.b.1 (Settings UI is
 * deferred to 2b.1.b.2).
 */

import { config as loadEnv } from 'dotenv'
import { resolve as resolvePath } from 'node:path'
import { randomBytes } from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

loadEnv({ path: resolvePath(process.cwd(), '.env.local') })

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const OAUTH_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/adwords'
const PENDING_TTL_MIN = 15

type SbClient = SupabaseClient

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

function readArgs(): string {
  const tenantId = process.argv[2]
  if (!tenantId) {
    fail(
      'Usage: npx tsx scripts/phase-2b/connect-google-ads.ts <tenant_id>'
    )
  }
  return tenantId
}

function buildClient(): SbClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    fail(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env. ' +
        'Did you `set -a && source .env.local && set +a` first?'
    )
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } })
}

async function loadActiveConfig(
  supabase: SbClient,
  tenantId: string
): Promise<{ id: string; tenant_id: string }> {
  const { data, error } = await supabase
    .from('google_lead_form_configs')
    .select('id, tenant_id')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (error || !data) {
    fail(
      `No active google_lead_form_configs row for tenant ${tenantId}. ` +
        `Run \`scripts/phase-2b/generate-google-webhook-key.ts ${tenantId}\` first. ` +
        `${error?.message ?? ''}`
    )
  }
  return data as { id: string; tenant_id: string }
}

async function writePendingState(
  supabase: SbClient,
  configId: string,
  state: string,
  expiresAtIso: string
): Promise<void> {
  const { error } = await supabase
    .from('google_lead_form_configs')
    .update({
      oauth_pending_state: state,
      oauth_pending_state_expires_at: expiresAtIso,
    })
    .eq('id', configId)
  if (error) {
    fail(`Failed to write oauth_pending_state: ${error.message}`)
  }
}

function buildConsentUrl(state: string): string {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) {
    fail('GOOGLE_OAUTH_CLIENT_ID not set in env')
  }
  const redirectUri = `${APP_BASE_URL}/api/integrations/google-ads/oauth/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${OAUTH_AUTH_ENDPOINT}?${params.toString()}`
}

function printInstructions(tenantId: string, expiresAtIso: string, url: string): void {
  console.log('')
  console.log('=== Google Ads OAuth flow ===')
  console.log(`Tenant:        ${tenantId}`)
  console.log(`State expires: ${expiresAtIso}`)
  console.log(`Redirect URI:  ${APP_BASE_URL}/api/integrations/google-ads/oauth/callback`)
  console.log('')
  console.log('Open this URL in a browser, sign in with the dedicated Google account, and consent:')
  console.log('')
  console.log(url)
  console.log('')
  console.log(
    'After consent, the callback route stores the encrypted refresh token automatically. ' +
      'Then run set-google-ads-targets.ts to set customer_id + conversion_action.'
  )
}

async function main(): Promise<void> {
  const tenantId = readArgs()
  const supabase = buildClient()
  const cfg = await loadActiveConfig(supabase, tenantId)

  const state = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + PENDING_TTL_MIN * 60_000).toISOString()
  await writePendingState(supabase, cfg.id, state, expiresAt)

  const url = buildConsentUrl(state)
  printInstructions(tenantId, expiresAt, url)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
