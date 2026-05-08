/**
 * Phase 2b.1.b.2 — `GET /api/integrations/google-ads/customers/list`
 *
 * Powers the customer-picker dropdown in the Settings UI's outbound section.
 * Returns the Google Ads accounts the connected refresh token has access to
 * (no customer_id required to call this endpoint — it's the bootstrap call).
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

export async function GET(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const cfg = await loadGoogleAdsOAuthOnly(ctx.supabase, ctx.tenantId)
    if (!cfg) {
      return NextResponse.json({ error: 'oauth_not_connected' }, { status: 400 })
    }

    const client = new GoogleAdsClient(cfg)
    try {
      const customers = await client.listAccessibleCustomers()
      return NextResponse.json({ customers })
    } catch (err) {
      if (err instanceof GoogleOAuthRevokedError) {
        // We pre-emptively disconnect because the next call would have done
        // the same. UX: user sees "OAuth revoked, please reconnect" and the
        // page state matches reality. Refined per §3 row L: we now only enter
        // this branch when Google's body indicates UNAUTHENTICATED, not on
        // every 401 (which over-disconnected on developer-token / customer
        // permission failures during the picker UI flow).
        console.error('[google-ads/customers/list] OAuth revoked', {
          tenant_id: ctx.tenantId,
          message: err.message,
        })
        await nullOutRevokedOAuth(ctx.supabase, ctx.tenantId)
        return NextResponse.json({ error: 'oauth_revoked' }, { status: 400 })
      }
      if (err instanceof GoogleAdsApiError) {
        console.error('[google-ads/customers/list] Google API error', {
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
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[google-ads/customers/list] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
