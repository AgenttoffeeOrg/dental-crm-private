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

interface CustomerEntry {
  customer_id: string
  resource_name: string
  /** Set when this row was discovered as a sub-account of a manager — the UI
   *  uses this as a hint to pre-fill the login-customer-id header on
   *  conversion-actions calls. Null for top-level (directly accessible)
   *  customers. See §3 row O. */
  login_customer_id?: string | null
  /** True when this row is itself a manager (MCC) account. Useful for the UI
   *  to either filter / disable picking these (managers don't host
   *  conversion actions) or label them visually. Defaults to false / unknown
   *  for the top-level rows because `customers:listAccessibleCustomers` does
   *  not return a manager flag — only the descendant query does. */
  is_manager?: boolean
  /** Optional human-readable name from Google Ads — only populated for rows
   *  discovered via `customer_client` GAQL (the descendant call). */
  descriptive_name?: string
}

/**
 * Combine the OAuth user's directly-accessible customers (typically just the
 * MCC manager(s) they're a member of) with the descendants enumerated under
 * each via `customer_client` GAQL.
 *
 * Rationale (§3 row O): `customers:listAccessibleCustomers` is the only
 * endpoint that works without a customer-id, but it ONLY returns customers
 * the OAuth user has direct membership on. Practices whose Google Ads
 * advertisers sit underneath an agency-owned manager wouldn't see those
 * advertisers in the picker, despite having full API access via the manager.
 * For each top-level customer we follow up with a descendants query; failures
 * on the descendant call are non-fatal (the top-level entry is still kept).
 */
async function listAccessibleAndDescendants(
  client: GoogleAdsClient
): Promise<CustomerEntry[]> {
  const top = await client.listAccessibleCustomers()
  const byId = new Map<string, CustomerEntry>()
  for (const t of top) {
    byId.set(t.customer_id, {
      customer_id: t.customer_id,
      resource_name: t.resource_name,
      login_customer_id: null,
    })
  }
  for (const t of top) {
    const subs = await safelyListDescendants(client, t.customer_id)
    for (const s of subs) mergeDescendant(byId, s)
  }
  return Array.from(byId.values())
}

/** Wrap `listCustomerClients` so non-OAuth Google failures are non-fatal —
 *  the top-level customer entry is still kept and returned. */
async function safelyListDescendants(
  client: GoogleAdsClient,
  managerId: string
): Promise<Awaited<ReturnType<GoogleAdsClient['listCustomerClients']>>> {
  try {
    return await client.listCustomerClients(managerId)
  } catch (e) {
    if (e instanceof GoogleOAuthRevokedError) throw e
    if (e instanceof GoogleAdsApiError) {
      console.warn('[google-ads/customers/list] descendants lookup failed', {
        login_customer_id: managerId,
        http_status: e.httpStatus,
      })
      return []
    }
    throw e
  }
}

/** De-dupe: a descendant might already exist as a top-level entry (the OAuth
 *  user can be a member of both the manager AND a sub-account). Prefer the
 *  entry that has the manager hint, since that lets the UI pre-fill
 *  login-customer-id without the user having to know it. */
function mergeDescendant(
  byId: Map<string, CustomerEntry>,
  s: Awaited<ReturnType<GoogleAdsClient['listCustomerClients']>>[number]
): void {
  const existing = byId.get(s.customer_id)
  if (existing) {
    if (!existing.login_customer_id) {
      existing.login_customer_id = s.login_customer_id
      if (s.descriptive_name) existing.descriptive_name = s.descriptive_name
      existing.is_manager = s.is_manager
    }
    return
  }
  byId.set(s.customer_id, {
    customer_id: s.customer_id,
    resource_name: s.resource_name,
    login_customer_id: s.login_customer_id,
    is_manager: s.is_manager,
    descriptive_name: s.descriptive_name || undefined,
  })
}

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
      const customers = await listAccessibleAndDescendants(client)
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
