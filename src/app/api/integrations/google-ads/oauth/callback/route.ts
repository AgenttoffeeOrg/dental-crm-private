/**
 * API ENDPOINT: Google Ads OAuth callback (Phase 2b.1.b.1)
 *
 * Google redirects the operator's browser here after they consent to the
 * Google Ads API scope. We:
 *
 *   1. Look up the active config row by `oauth_pending_state` (CSRF guard).
 *   2. Reject if state is unknown or expired (>15 min).
 *   3. Exchange `code` for tokens at https://oauth2.googleapis.com/token.
 *   4. Persist the encrypted refresh token onto the same config row, plus
 *      the granted scope and connection timestamp; clear the pending state.
 *   5. Render a small HTML page reporting success/failure to the operator.
 *
 * Security notes:
 *   - We DO NOT log the access token, refresh token, code, state, or client
 *     secret. Errors log only HTTP status and the first 500 chars of any
 *     non-token error body.
 *   - The refresh token is stored encrypted via
 *     `encryptIntegrationCredential()` (AES-256-GCM); only the service role
 *     can read the column anyway, but defence in depth.
 *   - The route is unauthenticated (Google's redirect doesn't carry session
 *     cookies). Authorisation is provided by the unguessable
 *     `oauth_pending_state` (32 random bytes, base64url, single-use, 15-min TTL).
 *
 * Out of scope here (lands in 2b.1.b.2):
 *   - The Settings UI that initiates the flow from a logged-in admin
 *   - Customer ID / conversion-action picker (CLI handles it for now)
 *   - Disconnect / rotate buttons
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { encryptIntegrationCredential } from '@/lib/crypto/integration-credentials'

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'

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

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function redirectUri(): string {
  return `${appBaseUrl()}/api/integrations/google-ads/oauth/callback`
}

function renderHtml(body: string, status: number): NextResponse {
  const html =
    '<!doctype html><html><head><title>Google Ads OAuth</title>' +
    '<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:60px auto;padding:0 20px;color:#222;line-height:1.5}h2{margin-top:0}code{background:#f4f4f5;padding:2px 6px;border-radius:4px}</style>' +
    `</head><body>${body}</body></html>`
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
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
        'No refresh_token returned by Google. Ensure the connect script uses prompt=consent and access_type=offline.',
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

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const oauthError = url.searchParams.get('error')

  // 1) Google reported an error or the user denied consent.
  if (oauthError) {
    console.warn('[google-ads/oauth/callback] oauth declined or errored', {
      route: '/api/integrations/google-ads/oauth/callback',
      error: oauthError,
    })
    return renderHtml(
      `<h2>OAuth declined or failed</h2><p>Reason: <code>${escapeHtml(oauthError)}</code></p><p>Re-run the connect script to start over.</p>`,
      400
    )
  }

  // 2) Missing parameters.
  if (!code || !state) {
    return renderHtml('<h2>Missing parameters</h2><p>Expected <code>code</code> and <code>state</code>.</p>', 400)
  }

  const supabase = createServiceClient()

  // 3) Look up the pending state.
  const cfg = await lookupPendingConfig(supabase, state)
  if (!cfg) {
    return renderHtml(
      '<h2>Unknown or already-used state</h2><p>Re-run the connect script to start a new flow.</p>',
      401
    )
  }
  if (stateExpired(cfg.oauth_pending_state_expires_at)) {
    return renderHtml(
      '<h2>State expired</h2><p>Pending OAuth states are valid for 15 minutes. Re-run the connect script.</p>',
      401
    )
  }

  // 4) Exchange the code for tokens.
  const tokenResult = await exchangeCodeForTokens(code)
  if (!tokenResult.ok) {
    console.error('[google-ads/oauth/callback] token exchange failed', {
      route: '/api/integrations/google-ads/oauth/callback',
      tenant_id: cfg.tenant_id,
      http_status: tokenResult.status,
      body_excerpt: tokenResult.bodyExcerpt,
    })
    return renderHtml(
      `<h2>Token exchange failed</h2><p>HTTP ${tokenResult.status}. Check server logs for details.</p>`,
      500
    )
  }

  // 5) Persist encrypted refresh token + clear pending state.
  const persistResult = await persistTokens(supabase, cfg.id, tokenResult.tokens)
  if (!persistResult.ok) {
    console.error('[google-ads/oauth/callback] persist failed', {
      route: '/api/integrations/google-ads/oauth/callback',
      tenant_id: cfg.tenant_id,
      error_message: persistResult.message,
    })
    return renderHtml(
      `<h2>Failed to persist credentials</h2><p>${escapeHtml(persistResult.message)}</p>`,
      500
    )
  }

  return renderHtml(
    `<h2>Google Ads connected</h2><p>Tenant: <code>${escapeHtml(cfg.tenant_id)}</code></p>` +
      `<p>You can close this tab. Run <code>set-google-ads-targets.ts</code> next to set the customer ID and conversion action.</p>`,
    200
  )
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
