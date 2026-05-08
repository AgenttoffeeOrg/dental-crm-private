/**
 * Phase 2b.1.b.2 — `POST /api/integrations/google-ads/targets`
 *
 * Replaces `scripts/phase-2b/set-google-ads-targets.ts`. Persists the chosen
 * customer / conversion-action / optional manager-account onto the tenant's
 * active config row. Refuses if OAuth isn't connected yet — targets are only
 * meaningful in conjunction with credentials that can fire conversions.
 *
 * Body shape:
 *   { customer_id: string,
 *     conversion_action_resource_name: string,
 *     login_customer_id?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { isManagementRole } from '../_lib/role-gate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DIGITS_ONLY = /^\d+$/
const RESOURCE_NAME = /^customers\/\d+\/conversionActions\/\d+$/

interface TargetsBody {
  customer_id?: unknown
  conversion_action_resource_name?: unknown
  login_customer_id?: unknown
}

interface ParsedTargets {
  customer_id: string
  conversion_action_resource_name: string
  login_customer_id: string | null
}

/** Validate the optional `login_customer_id`. Returns `{ ok: false }` on
 *  validation failure, `{ ok: true, value }` otherwise. Extracted to keep
 *  `parseBody` under Lizard's CCN limit. */
// eslint-disable-next-line complexity
function parseLoginCustomerId(raw: unknown):
  { ok: true; value: string | null } | { ok: false } {
  if (raw === undefined) return { ok: true, value: null }
  if (raw === null) return { ok: true, value: null }
  if (raw === '') return { ok: true, value: null }
  if (typeof raw !== 'string') return { ok: false }
  if (!DIGITS_ONLY.test(raw)) return { ok: false }
  return { ok: true, value: raw }
}

function parseBody(raw: unknown): ParsedTargets | null {
  if (!raw || typeof raw !== 'object') return null
  const body = raw as TargetsBody
  const customerId = body.customer_id
  const car = body.conversion_action_resource_name
  if (typeof customerId !== 'string' || !DIGITS_ONLY.test(customerId)) return null
  if (typeof car !== 'string' || !RESOURCE_NAME.test(car)) return null
  const login = parseLoginCustomerId(body.login_customer_id)
  if (!login.ok) return null
  return {
    customer_id: customerId,
    conversion_action_resource_name: car,
    login_customer_id: login.value,
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    let raw: unknown
    try {
      raw = await req.json()
    } catch {
      return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
    }

    const parsed = parseBody(raw)
    if (!parsed) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
    }

    const { data: cfg, error: cfgErr } = await ctx.supabase
      .from('google_lead_form_configs')
      .select('id, oauth_refresh_token_encrypted')
      .eq('tenant_id', ctx.tenantId)
      .eq('is_active', true)
      .maybeSingle()

    if (cfgErr) {
      console.error('[google-ads/targets] config lookup failed', {
        tenant_id: ctx.tenantId,
        error_message: cfgErr.message,
      })
      return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
    }
    if (!cfg) {
      return NextResponse.json({ error: 'oauth_not_connected' }, { status: 400 })
    }
    const row = cfg as { id: string; oauth_refresh_token_encrypted: string | null }
    if (!row.oauth_refresh_token_encrypted) {
      return NextResponse.json({ error: 'oauth_not_connected' }, { status: 400 })
    }

    const { error: updateErr } = await ctx.supabase
      .from('google_lead_form_configs')
      .update({
        customer_id: parsed.customer_id,
        login_customer_id: parsed.login_customer_id,
        conversion_action_resource_name: parsed.conversion_action_resource_name,
      })
      .eq('id', row.id)

    if (updateErr) {
      console.error('[google-ads/targets] update failed', {
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
    console.error('[google-ads/targets] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
