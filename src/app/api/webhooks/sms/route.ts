/**
 * Phase 2b.4 — SMS inbound webhook (Twilio).
 *
 * Receives Twilio's SMS inbound POSTs and turns them into the canonical
 * lead artifacts (contact + deal + attribution touchpoint + activity) via
 * `ingestLead()`, the same engine the WhatsApp inbound, Google Lead Form
 * and Google Ads webhooks use.
 *
 * This file is glue. Every substantive concern lives in helper modules:
 *   src/lib/whatsapp/twilio-signature.ts   (reused; same Twilio scheme)
 *   src/lib/sms/inbound.ts                 (parse / resolve / idempotency / orchestrate)
 *
 * Response contract:
 *   200 { status: 'ok', ... }              — happy path (new contact OR existing)
 *   200 { status: 'ok', idempotent: true } — Twilio retry / pre-check or race-past hit
 *   400 (empty body)                       — signature passed but payload malformed
 *   401 (empty body)                       — bad/missing signature OR unknown To-number
 *   500 (empty body)                       — unexpected ingestion failure (Twilio retries)
 *
 * Response status semantics:
 *   - 401 deliberately covers BOTH "no tenant for the To-number" and
 *     "bad signature" so we never leak which numbers are registered.
 *   - 500 only on unexpected errors; Twilio's at-least-once retry policy is
 *     guarded by the partial unique index on
 *     `(tenant_id, source_channel, external_message_id)`.
 *
 * Logging:
 *   - Every log line carries a `correlation_id` (UUID per request) so a
 *     Twilio retry that arrives a few seconds later can be traced through
 *     Vercel function logs alongside the original.
 *   - PII (phone, message body) only appears in error/warn logs alongside
 *     the MessageSid; success is logged at info with IDs only.
 *
 * Out of scope (this phase):
 *   - MMS — `NumMedia >= 1` is captured in raw_payload and the parsed
 *     `mediaUrls` field but no media is downloaded or stored. Body still
 *     ingests as a normal text SMS (or '' if media-only).
 */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'node:crypto'
import { createServiceClient } from '@/lib/supabase-server'
import { verifyTwilioSignature } from '@/lib/whatsapp/twilio-signature'
import {
  parseTwilioInboundSmsMessage,
  resolveTenantBySmsNumber,
  isSmsAlreadyProcessed,
  processSmsInboundMessage,
} from '@/lib/sms/inbound'

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
 * body once AND keep the raw string available for any future debug logging.
 */
async function readFormParams(
  request: NextRequest
): Promise<Record<string, string>> {
  const text = await request.text()
  return Object.fromEntries(new URLSearchParams(text))
}

export async function POST(request: NextRequest): Promise<Response> {
  const correlationId = crypto.randomUUID()

  // ---------------------------------------------------------------------------
  // 1. Parse body
  // ---------------------------------------------------------------------------
  let formParams: Record<string, string>
  try {
    formParams = await readFormParams(request)
  } catch (err) {
    console.error('[sms-inbound] failed to read form body', {
      correlation_id: correlationId,
      err,
    })
    return new NextResponse(null, { status: 400 })
  }

  // ---------------------------------------------------------------------------
  // 2. Verify Twilio signature — ALWAYS required, no env-based opt-out.
  //    Pre-2b.4 code silently treated missing-header as valid; that hole is
  //    what this handler closes (mirrors the 2b.2.a WhatsApp fix).
  // ---------------------------------------------------------------------------
  const sigCheck = verifyTwilioSignature({
    authToken: process.env.TWILIO_AUTH_TOKEN ?? '',
    signatureHeader: request.headers.get('x-twilio-signature'),
    fullUrl: request.url,
    formParams,
  })

  if (sigCheck !== 'valid') {
    console.warn('[sms-inbound] signature check failed', {
      correlation_id: correlationId,
      reason: sigCheck,
    })
    return new NextResponse(null, { status: 401 })
  }

  // ---------------------------------------------------------------------------
  // 3. Parse into the structured shape used by everything downstream.
  // ---------------------------------------------------------------------------
  const message = parseTwilioInboundSmsMessage(formParams)

  if (!message.messageSid || !message.fromPhoneE164 || !message.toPhoneE164) {
    // Malformed Twilio payload — return 400. Twilio doesn't retry 4xx, so
    // garbage doesn't get re-driven. 400 (not 401) because the signature
    // passed; the body just isn't a recognisable Twilio payload.
    console.warn('[sms-inbound] missing required fields after parse', {
      correlation_id: correlationId,
      has_message_sid: !!message.messageSid,
      has_from: !!message.fromPhoneE164,
      has_to: !!message.toPhoneE164,
    })
    return new NextResponse(null, { status: 400 })
  }

  const supabaseAdmin = createServiceClient()

  // ---------------------------------------------------------------------------
  // 4. Resolve the receiving SMS number to a tenant.
  // ---------------------------------------------------------------------------
  const tenant = await resolveTenantBySmsNumber(supabaseAdmin, message.toPhoneE164)
  if (!tenant) {
    // 401 (not 404) so we don't reveal which numbers are registered.
    console.warn('[sms-inbound] no tenant for receiving number', {
      correlation_id: correlationId,
      to: message.toPhoneE164,
      message_sid: message.messageSid,
    })
    return new NextResponse(null, { status: 401 })
  }

  // ---------------------------------------------------------------------------
  // 5. Idempotency pre-check — short-circuits the common Twilio-retry case
  //    before we do any contact / deal / activity work.
  // ---------------------------------------------------------------------------
  if (
    await isSmsAlreadyProcessed(
      supabaseAdmin,
      tenant.tenantId,
      message.messageSid
    )
  ) {
    console.info('[sms-inbound] idempotent replay (pre-check hit)', {
      correlation_id: correlationId,
      tenant_id: tenant.tenantId,
      message_sid: message.messageSid,
    })
    return NextResponse.json(
      { status: 'ok', idempotent: true },
      { status: 200 }
    )
  }

  // ---------------------------------------------------------------------------
  // 6. Orchestrate the ingest. A race past the pre-check trips the partial
  //    unique index on (tenant_id, source_channel, external_message_id) —
  //    convert that into the same idempotent 200 response.
  // ---------------------------------------------------------------------------
  try {
    const result = await processSmsInboundMessage(
      supabaseAdmin,
      tenant.tenantId,
      message
    )
    console.info('[sms-inbound] processed', {
      correlation_id: correlationId,
      tenant_id: tenant.tenantId,
      message_sid: message.messageSid,
      contact_id: result.contactId,
      deal_id: result.dealId,
      was_new_contact: result.wasNewContact,
      num_media: message.numMedia,
    })
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
      console.info('[sms-inbound] idempotent replay (unique-index race)', {
        correlation_id: correlationId,
        tenant_id: tenant.tenantId,
        message_sid: message.messageSid,
      })
      return NextResponse.json(
        { status: 'ok', idempotent: true },
        { status: 200 }
      )
    }
    console.error('[sms-inbound] processing failed', {
      correlation_id: correlationId,
      message_sid: message.messageSid,
      tenant_id: tenant.tenantId,
      error_message: err instanceof Error ? err.message : String(err),
    })
    return new NextResponse(null, { status: 500 })
  }
}

/**
 * Health-check GET — used by deploy smoke checks and uptime monitors.
 * Same shape as the WhatsApp endpoint so any monitoring config that hits
 * either path can use the same parser.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: 'sms-webhook',
    version: 'phase-2b.4',
  })
}
