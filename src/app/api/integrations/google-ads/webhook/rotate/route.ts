/**
 * Phase 2b.1.b.2 — `POST /api/integrations/google-ads/webhook/rotate`
 *
 * Replaces `scripts/phase-2b/generate-google-webhook-key.ts` (and handles
 * first-time setup along the same path).
 *
 * Logic:
 *   1. Auth + role check.
 *   2. Read the previously-active row for this tenant (if any) so we can
 *      carry over its OAuth fields onto the new row.
 *   3. Update all rows for this tenant where `is_active = true` to
 *      `is_active = false` (rotation = audit history; old keys become dead).
 *   4. Insert a fresh row with `is_active = true`, fresh `webhook_key`
 *      (default `gen_random_uuid()`), `created_by = auth.uid()`, plus the
 *      carry-over of the previous row's OAuth/target fields.
 *   5. Return `{ webhook_url, webhook_key }`.
 *
 * Carry-over rationale: rotating the webhook key (inbound) must NOT
 * disconnect OAuth or unset the customer/conversion-action targets
 * (outbound). The two surfaces are user-mentally separate. The `is_active`
 * flag flips for audit history; OAuth state moves with the tenant to the new
 * active row.
 *
 * Atomicity: we deliberately avoid a Postgres function for this — the
 * partial-unique index `(tenant_id) WHERE is_active = true` provides the
 * safety net. If the deactivate succeeds and the insert fails, the tenant
 * temporarily has zero active rows (the inbound webhook will 401 in the
 * window) but the index can never go to a state with two active rows. The
 * UI shows a clear error and the user re-rotates.
 */

import { NextRequest, NextResponse } from 'next/server'
import { ApiContextError, getApiRequestContext } from '@/lib/api/context'
import { isManagementRole } from '../../_lib/role-gate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface CarryOverFields {
  oauth_refresh_token_encrypted: string | null
  oauth_scope: string | null
  oauth_connected_at: string | null
  oauth_connected_by_user_id: string | null
  customer_id: string | null
  login_customer_id: string | null
  conversion_action_resource_name: string | null
}

const CARRY_OVER_COLUMNS =
  'oauth_refresh_token_encrypted, oauth_scope, oauth_connected_at, ' +
  'oauth_connected_by_user_id, customer_id, login_customer_id, ' +
  'conversion_action_resource_name'

function appBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

function emptyCarryOver(): CarryOverFields {
  return {
    oauth_refresh_token_encrypted: null,
    oauth_scope: null,
    oauth_connected_at: null,
    oauth_connected_by_user_id: null,
    customer_id: null,
    login_customer_id: null,
    conversion_action_resource_name: null,
  }
}

type Ctx = Awaited<ReturnType<typeof getApiRequestContext>>

/** Look up the previous active row's OAuth/target fields so they survive
 *  rotation. Returns the carry-over snapshot or a NextResponse on DB error. */
async function loadCarryOver(
  ctx: Ctx
): Promise<CarryOverFields | NextResponse> {
  const { data: prev, error } = await ctx.supabase
    .from('google_lead_form_configs')
    .select(CARRY_OVER_COLUMNS)
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
    .maybeSingle()
  if (error) {
    console.error('[google-ads/webhook/rotate] previous-row lookup failed', {
      tenant_id: ctx.tenantId,
      error_message: error.message,
    })
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500 })
  }
  return prev ? (prev as CarryOverFields) : emptyCarryOver()
}

/** Deactivate the existing active row(s); insert a fresh active row with
 *  carry-over OAuth/target state. Returns the new row or a NextResponse on
 *  any DB error. webhook_key defaults to gen_random_uuid() server-side. */
async function rotateRow(
  ctx: Ctx,
  carryOver: CarryOverFields
): Promise<{ webhook_key: string } | NextResponse> {
  const { error: deactivateErr } = await ctx.supabase
    .from('google_lead_form_configs')
    .update({ is_active: false })
    .eq('tenant_id', ctx.tenantId)
    .eq('is_active', true)
  if (deactivateErr) {
    console.error('[google-ads/webhook/rotate] deactivate failed', {
      tenant_id: ctx.tenantId,
      error_message: deactivateErr.message,
    })
    return NextResponse.json({ error: 'deactivate_failed' }, { status: 500 })
  }

  const { data: inserted, error: insertErr } = await ctx.supabase
    .from('google_lead_form_configs')
    .insert({
      tenant_id: ctx.tenantId,
      is_active: true,
      created_by: ctx.user.id,
      ...carryOver,
    })
    .select('webhook_key')
    .single()
  if (insertErr || !inserted) {
    console.error('[google-ads/webhook/rotate] insert failed', {
      tenant_id: ctx.tenantId,
      error_message: insertErr?.message ?? 'no row returned',
    })
    return NextResponse.json({ error: 'insert_failed' }, { status: 500 })
  }
  return inserted as { webhook_key: string }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await getApiRequestContext(req)

    // TODO(rbac): F02 §13 Phase B.
    if (!isManagementRole(ctx.membership.role)) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const carryOver = await loadCarryOver(ctx)
    if (carryOver instanceof NextResponse) return carryOver

    const inserted = await rotateRow(ctx, carryOver)
    if (inserted instanceof NextResponse) return inserted

    return NextResponse.json({
      webhook_url: `${appBaseUrl()}/api/webhooks/google-lead-form`,
      webhook_key: inserted.webhook_key,
    })
  } catch (err) {
    if (err instanceof ApiContextError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[google-ads/webhook/rotate] unexpected', err)
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  }
}
