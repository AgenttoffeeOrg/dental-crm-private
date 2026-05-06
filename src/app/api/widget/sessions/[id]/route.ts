/**
 * Phase 2a.3 — PATCH /api/widget/sessions/[id]
 *
 * Update an existing widget session row with funnel-progression data:
 *   - treatment_offering_id (the user picked a treatment)
 *   - path_chosen (the user clicked one of the 3 path buttons)
 *   - abandoned_step (the user closed the modal at step X — stored in metadata)
 *
 * Idempotent. Once a session is "joined" (joined_at NOT NULL → submission
 * happened), further PATCHes are ignored to keep the audit trail clean.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { updateSessionBodySchema } from '@/lib/booking-widget/types'
import {
  applyWidgetRateLimit,
  widgetCorsHeaders,
  widgetPreflightResponse,
} from '@/lib/booking-widget/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const cors = widgetCorsHeaders()

  const rl = await applyWidgetRateLimit(req, { key: 'widget-session-patch' })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      {
        status: 429,
        headers: { ...cors, 'Retry-After': String(rl.retryAfterSeconds) },
      }
    )
  }

  if (!UUID_REGEX.test(params.id)) {
    return NextResponse.json(
      { error: 'invalid_session_id' },
      { status: 400, headers: cors }
    )
  }

  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json(
      { error: 'invalid_json' },
      { status: 400, headers: cors }
    )
  }

  const parsed = updateSessionBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400, headers: cors }
    )
  }
  const body = parsed.data

  const supabase = createServiceClient()

  const { data: existing, error: fetchError } = await supabase
    .from('lead_intent_sessions')
    .select('id, tenant_id, joined_at, expires_at, metadata')
    .eq('id', params.id)
    .maybeSingle()

  if (fetchError) {
    console.error('[widget/sessions PATCH] fetch failed', fetchError)
    return NextResponse.json(
      { error: 'lookup_failed' },
      { status: 500, headers: cors }
    )
  }
  if (!existing) {
    return NextResponse.json(
      { error: 'session_not_found' },
      { status: 404, headers: cors }
    )
  }
  if (existing.joined_at) {
    return NextResponse.json(
      { ok: true, ignored: 'already_submitted' },
      { status: 200, headers: cors }
    )
  }
  if (new Date(existing.expires_at).getTime() < Date.now()) {
    return NextResponse.json(
      { error: 'session_expired' },
      { status: 410, headers: cors }
    )
  }

  const patch: Record<string, unknown> = {}
  if (body.treatment_offering_id) {
    patch.treatment_offering_id = body.treatment_offering_id
  }
  if (body.path_chosen) {
    patch.intent_path = body.path_chosen
  }
  if (body.abandoned_step) {
    const md = (existing.metadata && typeof existing.metadata === 'object'
      ? existing.metadata
      : {}) as Record<string, unknown>
    patch.metadata = {
      ...md,
      abandoned_step: body.abandoned_step,
      abandoned_at: new Date().toISOString(),
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: true, no_change: true }, { status: 200, headers: cors })
  }

  const { data: updated, error: updateError } = await supabase
    .from('lead_intent_sessions')
    .update(patch)
    .eq('id', params.id)
    .select('id, treatment_offering_id, intent_path, metadata, expires_at')
    .single()

  if (updateError || !updated) {
    console.error('[widget/sessions PATCH] update failed', updateError)
    return NextResponse.json(
      { error: 'update_failed' },
      { status: 500, headers: cors }
    )
  }

  return NextResponse.json({ ok: true, session: updated }, { status: 200, headers: cors })
}

export async function OPTIONS(): Promise<Response> {
  return widgetPreflightResponse()
}
