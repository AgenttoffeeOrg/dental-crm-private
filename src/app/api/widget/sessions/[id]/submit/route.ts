/**
 * Phase 2a.3 — POST /api/widget/sessions/[id]/submit
 *
 * Final submission endpoint. Maps the chosen path to a source_channel,
 * delegates to ingestLead(), and returns the next-step destination URL
 * (calendar / WhatsApp deeplink) when relevant.
 *
 * Idempotent via `event_id = "widget_submit:<session_id>"` — if a submit
 * is replayed, ingestLead's idempotency layer short-circuits and returns
 * the prior result so we never double-create a contact.
 */

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { ingestLead, IngestLeadValidationError } from '@/lib/lead-ingestion/ingest-lead'
import {
  submitSessionBodySchema,
  buildWhatsAppLink,
  type WidgetPath,
} from '@/lib/booking-widget/types'
import {
  applyWidgetRateLimit,
  ipFromRequest,
  widgetCorsHeaders,
  widgetPreflightResponse,
} from '@/lib/booking-widget/rate-limit'
import type { SourceChannelEnum } from '@/lib/lead-ingestion/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const PATH_TO_SOURCE_CHANNEL: Record<WidgetPath, SourceChannelEnum> = {
  calendar: 'booking_widget_calendar',
  webform: 'booking_widget_webform',
  whatsapp: 'booking_widget_whatsapp',
}

const PATH_TO_JOIN_METHOD: Record<WidgetPath, string> = {
  calendar: 'session_cookie',
  webform: 'session_cookie',
  whatsapp: 'whatsapp_tracking_code',
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  const cors = widgetCorsHeaders()

  const rl = await applyWidgetRateLimit(req, { key: 'widget-session-submit' })
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

  const parsed = submitSessionBodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', issues: parsed.error.issues },
      { status: 400, headers: cors }
    )
  }
  const body = parsed.data

  const supabase = createServiceClient()

  const { data: session, error: sessionError } = await supabase
    .from('lead_intent_sessions')
    .select(
      'id, tenant_id, practice_booking_widget_id, expires_at, joined_at, joined_to_contact_id, treatment_offering_id, utm_source, utm_medium, utm_campaign, utm_content, utm_term, gclid, fbclid, ttclid, msclkid, landing_page_url, referrer_url, ip_address, user_agent, intent_path'
    )
    .eq('id', params.id)
    .maybeSingle()

  if (sessionError) {
    console.error('[widget/sessions/submit] session lookup failed', sessionError)
    return NextResponse.json({ error: 'lookup_failed' }, { status: 500, headers: cors })
  }
  if (!session) {
    return NextResponse.json({ error: 'session_not_found' }, { status: 404, headers: cors })
  }
  if (new Date(session.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'session_expired' }, { status: 410, headers: cors })
  }

  // Treatment hint: caller-provided wins, then session, then null.
  const treatmentOfferingId = body.treatment_offering_id ?? session.treatment_offering_id ?? null

  // Resolve the widget for path-config (calendar URL, WhatsApp number, success copy).
  const { data: widget, error: widgetError } = await supabase
    .from('practice_booking_widgets')
    .select(
      'id, tenant_id, enable_calendar, enable_webform, enable_whatsapp, calendar_redirect_url, whatsapp_phone_e164, whatsapp_prefilled_message_template, success_message, metadata'
    )
    .eq('id', session.practice_booking_widget_id ?? '')
    .maybeSingle()

  if (widgetError || !widget) {
    console.error('[widget/sessions/submit] widget lookup failed', widgetError)
    return NextResponse.json({ error: 'widget_not_found' }, { status: 404, headers: cors })
  }

  // Per-path validation
  if (body.path === 'calendar') {
    if (!widget.enable_calendar) {
      return NextResponse.json(
        { error: 'path_disabled', path: 'calendar' },
        { status: 400, headers: cors }
      )
    }
    if (!widget.calendar_redirect_url) {
      return NextResponse.json(
        { error: 'calendar_not_configured' },
        { status: 400, headers: cors }
      )
    }
  } else if (body.path === 'whatsapp') {
    if (!widget.enable_whatsapp) {
      return NextResponse.json(
        { error: 'path_disabled', path: 'whatsapp' },
        { status: 400, headers: cors }
      )
    }
    if (!widget.whatsapp_phone_e164) {
      return NextResponse.json(
        { error: 'whatsapp_not_configured' },
        { status: 400, headers: cors }
      )
    }
  } else if (body.path === 'webform') {
    if (!widget.enable_webform) {
      return NextResponse.json(
        { error: 'path_disabled', path: 'webform' },
        { status: 400, headers: cors }
      )
    }
  }

  // Resolve treatment label for WhatsApp prefill template.
  let treatmentLabel: string | null = null
  if (treatmentOfferingId) {
    const { data: offering } = await supabase
      .from('practice_treatment_offerings')
      .select('id, custom_label, treatment_type:treatment_types(display_name)')
      .eq('id', treatmentOfferingId)
      .eq('tenant_id', session.tenant_id)
      .maybeSingle()
    if (offering) {
      const tt = Array.isArray(offering.treatment_type)
        ? offering.treatment_type[0]
        : offering.treatment_type
      treatmentLabel = offering.custom_label ?? tt?.display_name ?? null
    }
  }

  const eventId = `widget_submit:${session.id}`
  const sourceChannel = PATH_TO_SOURCE_CHANNEL[body.path]

  let ingestResult
  try {
    ingestResult = await ingestLead(
      {
        tenant_id: session.tenant_id,
        source_channel: sourceChannel,
        contact: {
          full_name: body.contact.full_name,
          email: body.contact.email,
          phone: body.contact.phone,
          consents: body.contact.consents,
        },
        attribution: {
          utm_source: session.utm_source ?? undefined,
          utm_medium: session.utm_medium ?? undefined,
          utm_campaign: session.utm_campaign ?? undefined,
          utm_content: session.utm_content ?? undefined,
          utm_term: session.utm_term ?? undefined,
          gclid: session.gclid ?? undefined,
          fbclid: session.fbclid ?? undefined,
          ttclid: session.ttclid ?? undefined,
          msclkid: session.msclkid ?? undefined,
          landing_page_url: session.landing_page_url ?? undefined,
          referrer_url: session.referrer_url ?? undefined,
          ip_address: session.ip_address ?? ipFromRequest(req),
          user_agent: session.user_agent ?? req.headers.get('user-agent') ?? undefined,
        },
        treatment_offering_id: treatmentOfferingId,
        raw_payload: { ...(raw as Record<string, unknown>), session_id: session.id },
        lead_intent_session_id: session.id,
        event_id: eventId,
      },
      supabase
    )
  } catch (err) {
    if (err instanceof IngestLeadValidationError) {
      return NextResponse.json(
        { error: 'invalid_lead', code: err.code, message: err.message },
        { status: 400, headers: cors }
      )
    }
    console.error('[widget/sessions/submit] ingestLead failed', err)
    return NextResponse.json({ error: 'ingest_failed' }, { status: 500, headers: cors })
  }

  // Build path-specific redirect / success payload BEFORE the join update so
  // we still respond even if the session-update fails.
  let whatsappRedirect: string | null = null
  let calendarRedirect: string | null = null
  if (body.path === 'whatsapp') {
    whatsappRedirect = buildWhatsAppLink(
      widget.whatsapp_phone_e164!,
      widget.whatsapp_prefilled_message_template ?? null,
      treatmentLabel
    )
  } else if (body.path === 'calendar') {
    calendarRedirect = widget.calendar_redirect_url ?? null
  }

  // Update session: mark joined, link contact, persist redirect destination.
  if (!session.joined_at) {
    const { error: updateError } = await supabase
      .from('lead_intent_sessions')
      .update({
        joined_to_contact_id: ingestResult.contact_id,
        joined_at: new Date().toISOString(),
        join_method: PATH_TO_JOIN_METHOD[body.path],
        intent_path: body.path,
        treatment_offering_id: treatmentOfferingId,
        redirect_destination_url: whatsappRedirect ?? calendarRedirect ?? null,
        redirect_completed_at:
          whatsappRedirect || calendarRedirect ? new Date().toISOString() : null,
      })
      .eq('id', session.id)
    if (updateError) {
      console.error('[widget/sessions/submit] session update failed', updateError)
    }
  }

  const successMessage = widget.success_message ?? "Thanks — we'll be in touch shortly."

  return NextResponse.json(
    {
      ok: true,
      idempotent_replay: ingestResult.idempotent_replay ?? false,
      dedup_decision: ingestResult.dedup_decision,
      contact_id: ingestResult.contact_id,
      // Phase 2a.7: surface the deal id so the widget's thank-you screen can
      // link to /deals/{deal_id} if/when the iframed UI grows that affordance.
      // null when review_required or graceful-skip.
      deal_id: ingestResult.deal_id,
      whatsapp_redirect: whatsappRedirect,
      calendar_redirect: calendarRedirect,
      success_message: body.path === 'webform' ? successMessage : null,
    },
    { status: 200, headers: cors }
  )
}

export async function OPTIONS(): Promise<Response> {
  return widgetPreflightResponse()
}
