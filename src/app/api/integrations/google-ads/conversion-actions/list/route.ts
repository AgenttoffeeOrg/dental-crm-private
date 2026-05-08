/**
 * Phase 2b.1.b.2 — `GET /api/integrations/google-ads/conversion-actions/list`
 *
 * Powers the conversion-action dropdown in the Settings UI. The customer is
 * a query parameter so the UI can re-fetch when the user changes their
 * selection without reloading the page.
 *
 * Query params:
 *   customer_id        (required, digits only)
 *   login_customer_id  (optional, digits only — present only when the
 *                       customer is reached via a manager / MCC account)
 *
 * The client method already filters to category = LEAD AND status = ENABLED,
 * so no further filtering happens here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import {
  GoogleAdsApiError,
  GoogleAdsClient,
  GoogleOAuthRevokedError,
  loadGoogleAdsOAuthOnly,
} from '@/lib/conversions/google-ads-client'
import { isManagementRole } from '../../_lib/role-gate'
import { nullOutRevokedOAuth } from '../../_lib/oauth-failure'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DIGITS_ONLY = /^\d+$/

function badInput(): NextResponse {
  return NextResponse.json({ error: 'invalid_customer_id' }, { status: 400 })
}

/** Validate the two query params. Returns the normalised values, or a
 *  NextResponse to short-circuit on invalid input. */
function readParams(
  req: NextRequest
): { customerId: string; loginCustomerId: string | undefined } | NextResponse {
  const url = new URL(req.url)
  const customerId = url.searchParams.get('customer_id')
  const loginCustomerId = url.searchParams.get('login_customer_id')

  if (!customerId || !DIGITS_ONLY.test(customerId)) return badInput()
  const hasLogin = loginCustomerId !== null && loginCustomerId !== ''
  if (hasLogin && !DIGITS_ONLY.test(loginCustomerId)) return badInput()

  return {
    customerId,
    loginCustomerId: hasLogin ? loginCustomerId : undefined,
  }
}

/** Convert a thrown Google Ads API error into a 4xx/5xx response, or
 *  re-throw if it isn't one we recognise. Logs the underlying Google response
 *  excerpt server-side so Vercel logs show what actually happened — handy for
 *  debugging "Couldn't load conversion actions" without DevTools. */
async function handleApiError(
  err: unknown,
  ctx: Awaited<ReturnType<typeof getApiRequestContext>>
): Promise<NextResponse> {
  if (err instanceof GoogleOAuthRevokedError) {
    console.error('[google-ads/conversion-actions/list] OAuth revoked', {
      tenant_id: ctx.tenantId,
      message: err.message,
    })
    await nullOutRevokedOAuth(ctx.supabase, ctx.tenantId)
    return NextResponse.json({ error: 'oauth_revoked' }, { status: 400 })
  }
  if (err instanceof GoogleAdsApiError) {
    console.error('[google-ads/conversion-actions/list] Google API error', {
      tenant_id: ctx.tenantId,
      http_status: err.httpStatus,
      response_excerpt: err.responseExcerpt,
    })
    return NextResponse.json(
      { error: 'google_api_error', detail: `HTTP ${err.httpStatus}` },
      { status: 500 }
    )
  }
  throw err
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const params = readParams(req)
    if (params instanceof NextResponse) return params

    const cfg = await loadGoogleAdsOAuthOnly(ctx.supabase, ctx.tenantId)
    if (!cfg) {
      return NextResponse.json({ error: 'oauth_not_connected' }, { status: 400 })
    }

    const client = new GoogleAdsClient(cfg)
    try {
      const conversion_actions = await client.listConversionActions(
        params.customerId,
        params.loginCustomerId
      )
      return NextResponse.json({ conversion_actions })
    } catch (err) {
      return await handleApiError(err, ctx)
    }
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[google-ads/conversion-actions/list] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
