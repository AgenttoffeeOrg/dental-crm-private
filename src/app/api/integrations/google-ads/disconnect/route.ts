/**
 * Phase 2b.1.b.2 — `POST /api/integrations/google-ads/disconnect`
 *
 * Disconnect is **outbound-only**. The webhook (inbound) is independent and
 * managed via the rotate flow. This is a deliberate UX choice — a practice
 * may want to revoke OAuth (e.g., changing agency) while continuing to
 * receive Google Lead Form posts.
 *
 * Logic:
 *   1. Auth + role check.
 *   2. Find the active config row. If none, return 200 with
 *      `{ status: 'ok', already_disconnected: true }` (idempotent).
 *   3. NULL out the OAuth + targets fields. Leave `webhook_key`, `is_active`,
 *      and the row identity untouched so inbound continues working.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { isManagementRole } from '../_lib/role-gate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const NULLED_FIELDS = {
  oauth_refresh_token_encrypted: null,
  oauth_scope: null,
  oauth_connected_at: null,
  oauth_connected_by_user_id: null,
  customer_id: null,
  login_customer_id: null,
  conversion_action_resource_name: null,
} as const

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { data: cfg, error: cfgErr } = await ctx.supabase
      .from('google_lead_form_configs')
      .select('id')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (cfgErr) {
      console.error('[google-ads/disconnect] config lookup failed', {
        tenant_id: ctx.tenantId,
        error_message: cfgErr.message,
      })
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }

    if (!cfg) {
      return NextResponse.json({ status: 'ok', already_disconnected: true })
    }

    const { error: updateErr } = await ctx.supabase
      .from('google_lead_form_configs')
      .update(NULLED_FIELDS)
      .eq('id', (cfg as { id: string }).id)

    if (updateErr) {
      console.error('[google-ads/disconnect] update failed', {
        tenant_id: ctx.tenantId,
        error_message: updateErr.message,
      })
      return NextResponse.json({ error: 'update_failed' }, { status: 500 })
    }

    return NextResponse.json({ status: 'ok' })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[google-ads/disconnect] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
