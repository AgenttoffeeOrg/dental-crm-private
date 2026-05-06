/**
 * Phase 2a.3 — Public widget session APIs.
 *
 *   POST /api/widget/sessions  → start a session
 *
 * Unauthenticated. Rate-limited 30 req / IP / minute.
 *
 * Creates a `lead_intent_sessions` row with attribution data captured from
 * the request body and request headers. Returns a session_id (UUID) plus
 * the session_token (random string) used as the public handle for follow-up
 * PATCH/POST submit calls. expires_at defaults to 30 days (Phase 1 default).
 */

import { NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import {
  startSessionBodySchema,
  isValidSlug,
  type StartSessionBody,
} from '@/lib/booking-widget/types'
import {
  applyWidgetRateLimit,
  ipFromRequest,
  widgetCorsHeaders,
  widgetPreflightResponse,
} from '@/lib/booking-widget/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request): Promise<Response> {
  const cors = widgetCorsHeaders()

  const rl = await applyWidgetRateLimit(req, { key: 'widget-session-start' })
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      {
        status: 429,
        headers: { ...cors, 'Retry-After': String(rl.retryAfterSeconds) },
      }
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

  const parsed = startSessionBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400, headers: cors }
    )
  }
  const body: StartSessionBody = parsed.data

  if (!isValidSlug(body.widget_slug)) {
    return NextResponse.json(
      { error: 'invalid_slug_format' },
      { status: 400, headers: cors }
    )
  }

  const supabase = createServiceClient()

  const { data: widget, error: widgetError } = await supabase
    .from('practice_booking_widgets')
    .select('id, tenant_id, practice_location_id, is_active, enable_calendar, enable_webform, enable_whatsapp, calendar_redirect_url, whatsapp_phone_e164')
    .eq('slug', body.widget_slug)
    .is('deleted_at', null)
    .maybeSingle()

  if (widgetError) {
    console.error('[widget/sessions] widget lookup failed', widgetError)
    return NextResponse.json(
      { error: 'lookup_failed' },
      { status: 500, headers: cors }
    )
  }
  if (!widget) {
    return NextResponse.json(
      { error: 'widget_not_found' },
      { status: 404, headers: cors }
    )
  }
  if (!widget.is_active) {
    return NextResponse.json(
      { error: 'widget_disabled' },
      { status: 403, headers: cors }
    )
  }

  // intent_path is NOT NULL on lead_intent_sessions — pick a sensible default
  // based on what the widget enables. The user can flip this via PATCH once
  // they actually pick a path inside the modal.
  const tentativePath: 'calendar' | 'webform' | 'whatsapp' =
    widget.enable_webform
      ? 'webform'
      : widget.enable_calendar && widget.calendar_redirect_url
        ? 'calendar'
        : widget.enable_whatsapp && widget.whatsapp_phone_e164
          ? 'whatsapp'
          : 'webform'

  const ip = ipFromRequest(req)
  const userAgent = req.headers.get('user-agent') ?? body.user_agent ?? null
  const sessionToken = crypto.randomBytes(24).toString('hex')

  const { data: session, error: insertError } = await supabase
    .from('lead_intent_sessions')
    .insert({
      tenant_id: widget.tenant_id,
      practice_location_id: widget.practice_location_id ?? null,
      practice_booking_widget_id: widget.id,
      session_token: sessionToken,
      intent_path: tentativePath,
      utm_source: body.utm?.source ?? null,
      utm_medium: body.utm?.medium ?? null,
      utm_campaign: body.utm?.campaign ?? null,
      utm_content: body.utm?.content ?? null,
      utm_term: body.utm?.term ?? null,
      gclid: body.click_ids?.gclid ?? null,
      fbclid: body.click_ids?.fbclid ?? null,
      ttclid: body.click_ids?.ttclid ?? null,
      msclkid: body.click_ids?.msclkid ?? null,
      referrer_url: body.referrer_url ?? null,
      landing_page_url: body.source_url ?? null,
      ip_address: ip === 'anonymous' ? null : ip,
      user_agent: userAgent,
      metadata: {
        start_payload: raw,
      },
    })
    .select('id, session_token, expires_at, intent_path')
    .single()

  if (insertError || !session) {
    console.error('[widget/sessions] insert failed', insertError)
    return NextResponse.json(
      { error: 'insert_failed' },
      { status: 500, headers: cors }
    )
  }

  return NextResponse.json(
    {
      session_id: session.id,
      session_token: session.session_token,
      expires_at: session.expires_at,
      intent_path: session.intent_path,
    },
    { status: 201, headers: cors }
  )
}

export async function OPTIONS(): Promise<Response> {
  return widgetPreflightResponse()
}
