/**
 * Phase 2b.2.a — WhatsApp inbound webhook (Twilio).
 *
 * Receives Twilio's WhatsApp inbound POSTs and turns them into the canonical
 * lead artifacts (contact + deal + attribution touchpoint + activity) via
 * `ingestLead()`, the same engine the Google Lead Form webhook uses.
 *
 * Response contract:
 *   200 { status: 'ok', ... }            — happy path; new contact OR existing
 *   200 { status: 'ok', idempotent: true } — Twilio retry (MessageSid seen before)
 *   401 (empty body)                     — missing/invalid signature OR unknown To-number
 *   500 (empty body)                     — unexpected ingestion failure (Twilio retries)
 *
 * Glue only — every substantive concern lives in helper modules:
 *   src/lib/whatsapp/twilio-signature.ts
 *   src/lib/whatsapp/inbound.ts
 *
 * Response status semantics:
 *   - 401 deliberately covers BOTH "no tenant for the To-number" and
 *     "bad signature" so we never leak which numbers are registered.
 *   - 500 only on unexpected errors; Twilio's at-least-once retry policy
 *     is what the partial unique index on external_message_id guards.
 *
 * No body fields are logged at info level; PII (phone, profile name,
 * message body) only appears in error/warn logs alongside the MessageSid.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyTwilioSignature } from '@/lib/whatsapp/twilio-signature'
import {
  parseTwilioInboundMessage,
  resolveTenantByWhatsappNumber,
  isMessageAlreadyProcessed,
  processWhatsappInboundMessage,
} from '@/lib/whatsapp/inbound'

const UNIQUE_VIOLATION_CODE = '23505'
const EXTERNAL_MSG_INDEX = 'idx_attribution_touchpoints_external_msg_uniq'

/**
 * Detect Postgres unique-constraint violations on the
 * `idx_attribution_touchpoints_external_msg_uniq` partial unique index.
 *
 * Supabase JS surfaces Postgres errors as `{ code, message, details, hint }`.
 * We match by code (`23505`) and either the index name (when the message
 * mentions it) or the column tuple (defensive fallback).
 */
function isExternalMessageIdUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string; details?: string }
  if (e.code !== UNIQUE_VIOLATION_CODE) return false
  const haystack = `${e.message ?? ''} ${e.details ?? ''}`
  return (
    haystack.includes(EXTERNAL_MSG_INDEX) ||
    haystack.includes('external_message_id')
  )
}

/**
 * Convert Next.js `Request` form-encoded body to a plain object.
 * Done by hand (not via `request.formData()`) so we can both consume the
 * body once AND keep the raw string for any future debug logging.
 */
async function readFormParams(request: NextRequest): Promise<Record<string, string>> {
  const text = await request.text()
  return Object.fromEntries(new URLSearchParams(text))
}

export async function POST(request: NextRequest): Promise<Response> {
  // ---------------------------------------------------------------------------
  // 1. Parse body
  // ---------------------------------------------------------------------------
  let formParams: Record<string, string>
  try {
    formParams = await readFormParams(request)
  } catch (err) {
    console.error('[whatsapp-webhook] failed to read form body', { err })
    return new NextResponse(null, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 2. Verify Twilio signature — ALWAYS required, no env-based opt-out.
  //    Pre-2b.2.a code silently treated missing-header as valid; that hole
  //    is what this handler closes.
  // ---------------------------------------------------------------------------
  const sigCheck = verifyTwilioSignature({
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    signatureHeader: request.headers.get('x-twilio-signature'),
    fullUrl: request.url,
    formParams,
  })

  if (sigCheck !== 'valid') {
    console.warn('[whatsapp-webhook] signature check failed', {
      reason: sigCheck,
    })
    return new NextResponse(null, { status: 401 })
  }

  // ---------------------------------------------------------------------------
  // 3. Parse into the structured shape used by everything downstream.
  // ---------------------------------------------------------------------------
  const message = parseTwilioInboundMessage(formParams)

  if (!message.messageSid || !message.from || !message.to) {
    // Malformed Twilio payload — return 400. Twilio does not retry 4xx, so
    // garbage doesn't get re-driven. This is a 400 (not 401) because the
    // signature passed; the body just isn't a recognisable Twilio payload.
    console.warn('[whatsapp-webhook] missing required fields after parse', {
      has_message_sid: !!message.messageSid,
      has_from: !!message.from,
      has_to: !!message.to,
    })
    return new NextResponse(null, { status: 400 })
  }

  const supabaseAdmin = createServiceClient()

  // ---------------------------------------------------------------------------
  // 4. Resolve the receiving WhatsApp number to a tenant.
  // ---------------------------------------------------------------------------
  const tenant = await resolveTenantByWhatsappNumber(supabaseAdmin, message.to)
  if (!tenant) {
    // 401 (not 404) so we don't reveal which numbers are registered.
    console.warn('[whatsapp-webhook] no tenant for receiving number', {
      to: message.to,
      message_sid: message.messageSid,
    })
    return new NextResponse(null, { status: 401 })
  }

  // ---------------------------------------------------------------------------
  // 5. Idempotency pre-check — short-circuits the common Twilio-retry case
  //    before we do any contact / deal / activity work.
  // ---------------------------------------------------------------------------
  if (await isMessageAlreadyProcessed(supabaseAdmin, tenant.tenantId, message.messageSid)) {
    return NextResponse.json({ status: 'ok', idempotent: true }, { status: 200 })
  }

  // ---------------------------------------------------------------------------
  // 6. Orchestrate the ingest. A race past the pre-check trips the partial
  //    unique index on (tenant_id, source_channel, external_message_id) —
  //    we convert that into the same idempotent 200 response.
  // ---------------------------------------------------------------------------
  try {
    const result = await processWhatsappInboundMessage(
      supabaseAdmin,
      tenant.tenantId,
      message
    )
    return NextResponse.json(
      {
        status: 'ok',
        contact_id: result.contactId,
        deal_id: result.dealId,
        attribution_touchpoint_id: result.attributionTouchpointId,
        activity_id: result.activityId,
        was_new_contact: result.wasNewContact,
      },
      { status: 200 }
    )
  } catch (err) {
    if (isExternalMessageIdUniqueViolation(err)) {
      return NextResponse.json({ status: 'ok', idempotent: true }, { status: 200 })
    }
    console.error('[whatsapp-webhook] processing failed', {
      message_sid: message.messageSid,
      tenant_id: tenant.tenantId,
      error_message: err instanceof Error ? err.message : String(err),
    })
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * Health-check GET — same shape as before so any monitoring that hits this
 * endpoint keeps working.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: 'whatsapp-webhook',
    version: 'phase-2b.2.a',
  })
}
