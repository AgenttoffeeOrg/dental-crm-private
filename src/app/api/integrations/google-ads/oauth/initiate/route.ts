/**
 * Phase 2b.1.b.2 — `GET /api/integrations/google-ads/oauth/initiate`
 *
 * Replaces `scripts/phase-2b/connect-google-ads.ts`. The Settings UI's
 * "Connect Google Ads" button is a styled `<a href="...">` pointing at this
 * route — a 302 to Google's consent page is the simplest UX (no JS round-trip,
 * works even if client-side state has gone stale).
 *
 * Logic:
 *   1. Auth + role check (only owner / super_admin / admin can connect).
 *   2. Find the active config row for this tenant. Refuse with 400 if none —
 *      the user must generate the inbound webhook key first via /webhook/rotate.
 *      The Settings UI ensures the user generates the webhook before showing
 *      the Connect button, so the 400 is a defensive guard rather than a UX
 *      surface.
 *   3. Generate a 32-byte oauth_pending_state with a 10-minute TTL and persist
 *      it on the active row.
 *   4. Build Google's consent URL exactly the same way the CLI used to (URL,
 *      scope, redirect_uri, access_type=offline, prompt=consent), and 302 to
 *      it.
 *
 * The OAuth callback (also under this directory) handles the redirect back
 * and surfaces success/failure as `?status=...&reason=...` on
 * `/settings/integrations/google`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'node:crypto'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { isManagementRole } from '../../_lib/role-gate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth'
const OAUTH_SCOPE = 'https://www.googleapis.com/auth/adwords'
const PENDING_TTL_MIN = 10

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function buildConsentUrl(state: string): string | null {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  if (!clientId) return null
  const redirectUri = `${appBaseUrl()}/api/integrations/google-ads/oauth/callback`
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: OAUTH_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

/** Persist the freshly-generated `oauth_pending_state` on the active config
 *  row. Returns the state on success, or a NextResponse to short-circuit on
 *  any DB error. Extracted from `GET` to keep both functions under Lizard's
 *  line-count limit (≤ 50). */
async function persistPendingState(
  ctx: Awaited<ReturnType<typeof getApiRequestContext>>,
  configId: string
): Promise<{ state: string } | NextResponse> {
  const state = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + PENDING_TTL_MIN * 60_000).toISOString()

  const { error: updateErr } = await ctx.supabase
    .from('google_lead_form_configs')
    .update({
      oauth_pending_state: state,
      oauth_pending_state_expires_at: expiresAt,
    })
    .eq('id', configId)

  if (updateErr) {
    console.error('[google-ads/oauth/initiate] state persist failed', {
      tenant_id: ctx.tenantId,
      error_message: updateErr.message,
    })
    return NextResponse.json({ error: 'state_persist_failed' }, { status: 500 })
  }
  return { state }
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B — swap to user_has_permission(...,
    // 'settings.integrations.manage'). See _lib/role-gate.ts.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    // Find the active config row for this tenant. Read tenant_id from the
    // authenticated context (NEVER from the request) — D20 P0 routes get this
    // wrong and we are not repeating that pattern.
    const { data: cfg, error: cfgErr } = await ctx.supabase
      .from('google_lead_form_configs')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (cfgErr) {
      console.error('[google-ads/oauth/initiate] config lookup failed', {
        tenant_id: ctx.tenantId,
        error_message: cfgErr.message,
      })
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }
    if (!cfg) {
      return NextResponse.json(
        { error: 'webhook_not_generated_yet' },
        { status: 400 }
      )
    }

    const persisted = await persistPendingState(ctx, (cfg as { id: string }).id)
    if (persisted instanceof NextResponse) return persisted

    const consentUrl = buildConsentUrl(persisted.state)
    if (!consentUrl) {
      return NextResponse.json(
        { error: 'oauth_not_configured' },
        { status: 500 }
      )
    }
    return NextResponse.redirect(consentUrl, 302)
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[google-ads/oauth/initiate] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
