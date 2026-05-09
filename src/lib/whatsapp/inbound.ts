/**
 * Phase 2b.2.a — WhatsApp inbound orchestration.
 *
 * The route handler at `/api/webhooks/whatsapp` is glue. All real work
 * lives here:
 *
 *   parseTwilioInboundMessage  — Twilio form body → typed shape
 *   resolveTenantByWhatsappNumber — `To` E.164 → tenant_id (service-role)
 *   isMessageAlreadyProcessed  — pre-flight idempotency check
 *   processWhatsappInboundMessage — orchestrates ingestLead() + ensures the
 *                                   message-body activity exists
 *
 * Design notes:
 *   - Service role only. The route runs before any user auth (Twilio is the
 *     authentication, via signature). We pass `supabaseAdmin` in from the
 *     route so tests can mock cleanly.
 *   - ingestLead() is the canonical entry point for both new and existing
 *     contact paths — see Phase 2b.2.a §5 for verification of its dedup
 *     behaviour for phone-only WhatsApp inputs.
 *   - Media URLs are extracted into the structured `mediaUrls` array AND
 *     verbatim into `rawPayload` (which is persisted into
 *     `attribution_touchpoints.metadata.raw_payload`), but **not downloaded
 *     or stored** in this phase. Media handling is 2b.2.a.2.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ingestLead } from '@/lib/lead-ingestion/ingest-lead'

// =============================================================================
// Types
// =============================================================================

export interface TwilioMediaRef {
  url: string
  contentType: string
}

export interface TwilioInboundMessage {
  /** Unique Twilio message id — used for idempotency. */
  messageSid: string
  /** Sender's phone in E.164 (whatsapp: prefix stripped). */
  from: string
  /** Receiving number in E.164 (whatsapp: prefix stripped). */
  to: string
  /** Message text; '' for media-only messages. */
  body: string
  /** Twilio's `ProfileName` field (sender's WhatsApp display name). */
  profileName: string | null
  /** Twilio's `WaId` field (sender's WhatsApp ID, usually the phone digits). */
  waId: string | null
  /** Number of media attachments (0..10 per Twilio). */
  numMedia: number
  /**
   * Captured media references — URL + contentType pairs. NOT downloaded or
   * persisted to storage in this phase (deferred to 2b.2.a.2). The same
   * information is also preserved verbatim in `rawPayload` (`MediaUrl0`,
   * `MediaContentType0`, …) so the next phase can pick them up directly
   * from the touchpoint metadata if it prefers.
   */
  mediaUrls: TwilioMediaRef[]
  /** Entire form-encoded body, for the touchpoint's raw_payload audit. */
  rawPayload: Record<string, string>
}

export interface ProcessInboundResult {
  contactId: string
  /** Null when ingestLead returned `dedup_decision='review_required'` or deal-creation skipped gracefully. */
  dealId: string | null
  attributionTouchpointId: string
  activityId: string
  /** True when ingestLead created a new contact; false when an existing contact was reused. */
  wasNewContact: boolean
}

// =============================================================================
// Helper: parseTwilioInboundMessage
// =============================================================================

const WHATSAPP_PREFIX = 'whatsapp:'

/**
 * Strip the `whatsapp:` prefix Twilio prepends to From/To. Returns the input
 * unchanged when the prefix is absent.
 */
function stripWhatsappPrefix(value: string | undefined): string {
  if (!value) return ''
  return value.startsWith(WHATSAPP_PREFIX)
    ? value.slice(WHATSAPP_PREFIX.length)
    : value
}

/**
 * Collect `MediaUrl{N}` / `MediaContentType{N}` pairs from the form body.
 * Twilio numbers them 0..NumMedia-1; we cap iteration at NumMedia to avoid
 * scanning unbounded keys on a malicious payload.
 */
function collectMediaUrls(
  formParams: Record<string, string>,
  numMedia: number
): TwilioMediaRef[] {
  const out: TwilioMediaRef[] = []
  // Defensive: Twilio caps at 10; we cap at 10 too in case the parsed count
  // is larger than expected (or NaN coerced to a large number).
  const cap = Math.min(Math.max(numMedia, 0), 10)
  for (let i = 0; i < cap; i++) {
    const url = formParams[`MediaUrl${i}`]
    if (!url) continue
    out.push({
      url,
      contentType: formParams[`MediaContentType${i}`] ?? '',
    })
  }
  return out
}

export function parseTwilioInboundMessage(
  formParams: Record<string, string>
): TwilioInboundMessage {
  const messageSid = formParams.MessageSid ?? ''
  const from = stripWhatsappPrefix(formParams.From)
  const to = stripWhatsappPrefix(formParams.To)
  const body = formParams.Body ?? ''
  const profileName = formParams.ProfileName ? formParams.ProfileName : null
  const waId = formParams.WaId ? formParams.WaId : null

  // Twilio sends NumMedia as a string. parseInt('' | undefined) = NaN; coerce
  // to 0 so downstream callers always see a finite non-negative integer.
  const parsedNumMedia = parseInt(formParams.NumMedia ?? '0', 10)
  const numMedia = Number.isFinite(parsedNumMedia) && parsedNumMedia > 0
    ? parsedNumMedia
    : 0

  return {
    messageSid,
    from,
    to,
    body,
    profileName,
    waId,
    numMedia,
    mediaUrls: collectMediaUrls(formParams, numMedia),
    rawPayload: { ...formParams },
  }
}

// =============================================================================
// Helper: resolveTenantByWhatsappNumber
// =============================================================================

/**
 * Look up which tenant owns the receiving WhatsApp number.
 *
 * Service-role client because tenant resolution happens BEFORE we know the
 * tenant — RLS would reject a SELECT on `tenants` without a session.
 *
 * Edge case: if multiple tenants share the same number (sandbox testing
 * collision — Twilio's shared sandbox `+14155238886` is global to every
 * Twilio sandbox account), pick the **oldest** by `created_at` and emit a
 * structured warn log so the operator can investigate without losing the
 * inbound message. Don't 500.
 */
export async function resolveTenantByWhatsappNumber(
  supabaseAdmin: SupabaseClient,
  toNumber: string
): Promise<{ tenantId: string } | null> {
  if (!toNumber) return null

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, created_at')
    .eq('whatsapp_phone_number', toNumber)
    .order('created_at', { ascending: true })
    .limit(2)

  if (error) {
    console.error('[whatsapp-inbound] tenant lookup failed', {
      to: toNumber,
      error_message: error.message,
    })
    return null
  }

  if (!data || data.length === 0) return null

  if (data.length > 1) {
    console.warn(
      '[whatsapp-inbound] multiple tenants share the same whatsapp_phone_number; ' +
        'routing to the oldest by created_at',
      { to: toNumber, tenant_ids: data.map((row) => row.id) }
    )
  }

  return { tenantId: data[0].id as string }
}

// =============================================================================
// Helper: isMessageAlreadyProcessed
// =============================================================================

/**
 * Check whether we've already processed this Twilio MessageSid for this tenant
 * on the `whatsapp_inbound` channel. Used as the first check in the route
 * handler to short-circuit Twilio retries before any contact / deal / activity
 * work happens.
 *
 * Returns true if an `attribution_touchpoints` row exists with
 * `(tenant_id, source_channel='whatsapp_inbound', external_message_id=<sid>)`.
 *
 * The partial unique index from the 2b.2.a migration is the second line of
 * defence — if a race condition slips past this check, the unique constraint
 * catches it and the route handler converts the unique-violation error into
 * a 200 idempotent response.
 */
export async function isMessageAlreadyProcessed(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  messageSid: string
): Promise<boolean> {
  if (!messageSid) return false

  const { data, error } = await supabaseAdmin
    .from('attribution_touchpoints')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source_channel', 'whatsapp_inbound')
    .eq('external_message_id', messageSid)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Don't fail-open; a SELECT error means we can't be sure, so the safest
    // thing is to fall through to the ingest path. The DB unique index will
    // catch a real duplicate.
    console.warn('[whatsapp-inbound] idempotency pre-check failed', {
      tenant_id: tenantId,
      message_sid: messageSid,
      error_message: error.message,
    })
    return false
  }

  return data !== null
}

// =============================================================================
// Helper: processWhatsappInboundMessage
// =============================================================================

/**
 * Top-level handler for an inbound WhatsApp message.
 *
 * Calls ingestLead() — the canonical entry point — for both new and
 * existing-contact paths. ingestLead's dedup engine handles the
 * existing-contact case correctly for phone-only candidates (Tier 2 phone
 * match → 'matched' decision, additive-only update). See change log §14
 * for the verification.
 *
 * The message body is passed via `treatment_intent_text`, which ingestLead
 * uses as the activity's `description`. This avoids creating a duplicate
 * activity for the inbound message — ingestLead already inserts one with
 * `type='whatsapp'`, `direction='inbound'`, `source_channel='whatsapp_inbound'`.
 *
 * `external_message_id` is forwarded to the touchpoint row so future
 * retries are caught by the partial unique index.
 */
export async function processWhatsappInboundMessage(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  message: TwilioInboundMessage
): Promise<ProcessInboundResult> {
  const result = await ingestLead(
    {
      tenant_id: tenantId,
      source_channel: 'whatsapp_inbound',
      contact: {
        phone: message.from,
        full_name: message.profileName ?? null,
        email: null,
      },
      // Body becomes the activity's description (see ingestLead.insertActivity).
      treatment_intent_text: message.body,
      raw_payload: {
        ...message.rawPayload,
        // Captured-not-downloaded media surface for 2b.2.a.2.
        _media_urls: message.mediaUrls,
        _profile_name: message.profileName,
        _wa_id: message.waId,
      },
      // Engine-side idempotency: short-circuits replays at the top of
      // ingestLead before any DB writes.
      event_id: `whatsapp_inbound:${message.messageSid}`,
      // Phase 2b.2.a: persisted on attribution_touchpoints.external_message_id
      // and protected by the partial unique index for race-past-pre-check.
      external_message_id: message.messageSid,
    },
    supabaseAdmin
  )

  if (!result.contact_id || !result.attribution_touchpoint_id || !result.activity_id) {
    // ingestLead returns nulls only for `review_required` (ambiguous dedup) —
    // for phone-only WhatsApp candidates this should never happen (Tier 2
    // either matches a single contact, returns 'new', or 'phone_matches_
    // different_email' which IS review_required). When it does, surface as
    // a structured error so Twilio retries (5xx) and an operator gets paged
    // via Vercel logs.
    throw new Error(
      `ingestLead returned an incomplete result for whatsapp_inbound; ` +
        `dedup_decision=${result.dedup_decision}`
    )
  }

  return {
    contactId: result.contact_id,
    dealId: result.deal_id,
    attributionTouchpointId: result.attribution_touchpoint_id,
    activityId: result.activity_id,
    // ingestLead doesn't directly expose was-new; we infer from dedup_decision.
    // 'idempotent_replay' counts as not-new (we reused an existing record set).
    wasNewContact:
      result.dedup_decision === 'new' && result.idempotent_replay !== true,
  }
}
