/**
 * API ENDPOINT: Google Ads OAuth callback (Phase 2b.1.b.1, modified by 2b.1.b.2).
 *
 * Google redirects the operator's browser here after they consent to the
 * Google Ads API scope. We:
 *
 *   1. Look up the active config row by `oauth_pending_state` (CSRF guard).
 *   2. Reject if state is unknown or expired.
 *   3. Exchange `code` for tokens at https://oauth2.googleapis.com/token.
 *   4. Persist the encrypted refresh token onto the same config row, plus
 *      the granted scope and connection timestamp; clear the pending state.
 *   5. **Redirect** the browser back to `/settings/integrations/google` with
 *      `?status=...&reason=...` query params (replaces the inline HTML page
 *      this route used to render in 2b.1.b.1 — the Settings UI now owns the
 *      success/failure surfacing).
 *
 * Security notes:
 *   - We DO NOT log the access token, refresh token, code, state, or client
 *     secret. Errors log only HTTP status and the first 500 chars of any
 *     non-token error body.
 *   - We DO NOT leak `error_description` from Google into the redirect URL —
 *     it can include OAuth client info we don't want a user-visible URL to
 *     carry.
 *   - The refresh token is stored encrypted via
 *     `encryptIntegrationCredential()` (AES-256-GCM); only the service role
 *     can read the column anyway, but defence in depth.
 *   - The route is unauthenticated (Google's redirect doesn't carry session
 *     cookies). Authorisation is provided by the unguessable
 *     `oauth_pending_state` (32 random bytes, single-use, 10-minute TTL set
 *     by the initiate route in 2b.1.b.2).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { encryptIntegrationCredential } from '@/lib/crypto/integration-credentials'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'
const SETTINGS_PATH = '/settings/integrations/google'

interface PendingConfigRow {
  id: string
  tenant_id: string
  oauth_pending_state_expires_at: string | null
}

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: 'Bearer'
}

type Reason = 'expired' | 'invalid_state' | 'oauth_failed' | 'unknown'

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function redirectUri(): string {
  return `${appBaseUrl()}/api/integrations/google-ads/oauth/callback`
}

function redirectSuccess(req: NextRequest): NextResponse {
  return NextResponse.redirect(
    new URL(`${SETTINGS_PATH}?status=connected`, req.url),
    302
  )
}

function redirectError(req: NextRequest, reason: Reason): NextResponse {
  return NextResponse.redirect(
    new URL(`${SETTINGS_PATH}?status=error&reason=${reason}`, req.url),
    302
  )
}

async function lookupPendingConfig(
  supabase: ReturnType<typeof createServiceClient>,
  state: string
): Promise<PendingConfigRow | null> {
  const { data, error } = await supabase
    .from('google_lead_form_configs')
    .select('id, tenant_id, oauth_pending_state_expires_at')
    .eq('oauth_pending_state', state)
    .eq('is_active', true)
    .maybeSingle()
  if (error) {
    console.error('[google-ads/oauth/callback] config lookup failed', {
      route: '/api/integrations/google-ads/oauth/callback',
      error_message: error.message,
    })
    return null
  }
  return (data as PendingConfigRow | null) ?? null
}

function stateExpired(expiresAtIso: string | null): boolean {
  if (!expiresAtIso) return true
  const expiresAt = new Date(expiresAtIso).getTime()
  if (!Number.isFinite(expiresAt)) return true
  return expiresAt < Date.now()
}

async function exchangeCodeForTokens(code: string): Promise<
  | { ok: true; tokens: GoogleTokenResponse }
  | { ok: false; status: number; bodyExcerpt: string }
> {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return { ok: false, status: 0, bodyExcerpt: 'GOOGLE_OAUTH_CLIENT_ID/SECRET not set' }
  }

  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: 'authorization_code',
    }),
  })

  const text = await res.text()
  if (!res.ok) {
    return { ok: false, status: res.status, bodyExcerpt: text.slice(0, 500) }
  }
  let parsed: GoogleTokenResponse
  try {
    parsed = JSON.parse(text) as GoogleTokenResponse
  } catch {
    return { ok: false, status: res.status, bodyExcerpt: text.slice(0, 500) }
  }
  return { ok: true, tokens: parsed }
}

async function persistTokens(
  supabase: ReturnType<typeof createServiceClient>,
  configId: string,
  tokens: GoogleTokenResponse
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!tokens.refresh_token) {
    return {
      ok: false,
      message:
        'No refresh_token returned by Google. Ensure the connect flow uses prompt=consent and access_type=offline.',
    }
  }
  const { error } = await supabase
    .from('google_lead_form_configs')
    .update({
      oauth_refresh_token_encrypted: encryptIntegrationCredential(tokens.refresh_token),
      oauth_scope: tokens.scope,
      oauth_connected_at: new Date().toISOString(),
      oauth_pending_state: null,
      oauth_pending_state_expires_at: null,
    })
    .eq('id', configId)
  if (error) {
    return { ok: false, message: error.message }
  }
  return { ok: true }
}

/** Step 4+5: exchange the code, persist the encrypted refresh token, and
 *  return the appropriate redirect. Extracted from `GET` to keep both
 *  functions under Lizard's cyclomatic-complexity limit (≤ 8). */
async function exchangeAndPersist(
  req: NextRequest,
  supabase: ReturnType<typeof createServiceClient>,
  cfg: PendingConfigRow,
  code: string
): Promise<NextResponse> {
  const tokenResult = await exchangeCodeForTokens(code)
  if (!tokenResult.ok) {
    console.error('[google-ads/oauth/callback] token exchange failed', {
      route: '/api/integrations/google-ads/oauth/callback',
      tenant_id: cfg.tenant_id,
      http_status: tokenResult.status,
      body_excerpt: tokenResult.bodyExcerpt,
    })
    return redirectError(req, 'oauth_failed')
  }
  const persistResult = await persistTokens(supabase, cfg.id, tokenResult.tokens)
  if (!persistResult.ok) {
    console.error('[google-ads/oauth/callback] persist failed', {
      route: '/api/integrations/google-ads/oauth/callback',
      tenant_id: cfg.tenant_id,
      error_message: persistResult.message,
    })
    return redirectError(req, 'unknown')
  }
  return redirectSuccess(req)
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')
  const oauthErrorDescription = url.searchParams.get('error_description')

  // 1) Google reported an error or the user denied consent. Server-side log
  //    the description; never put it into the user-visible redirect URL.
  if (oauthError) {
    console.warn('[google-ads/oauth/callback] oauth declined or errored', {
      route: '/api/integrations/google-ads/oauth/callback',
      error: oauthError,
      error_description: oauthErrorDescription ?? null,
    })
    return redirectError(req, 'oauth_failed')
  }

  // 2) Missing parameters → treat as invalid state.
  if (!code || !state) {
    return redirectError(req, 'invalid_state')
  }

  const supabase = createServiceClient()

  // 3) Look up the pending state.
  const cfg = await lookupPendingConfig(supabase, state)
  if (!cfg) return redirectError(req, 'invalid_state')
  if (stateExpired(cfg.oauth_pending_state_expires_at)) {
    return redirectError(req, 'expired')
  }

  return exchangeAndPersist(req, supabase, cfg, code)
}
