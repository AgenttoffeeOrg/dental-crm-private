/**
 * Phase 2b.4 — Twilio SMS inbound orchestration.
 *
 * The route handler at `/api/webhooks/sms` is glue. All real work lives here.
 * Mirrors `src/lib/whatsapp/inbound.ts` function-for-function, with these
 * SMS-specific differences:
 *
 *   - No `whatsapp:` prefix to strip from From / To — SMS uses raw E.164.
 *   - No ProfileName / WaId — SMS doesn't carry sender display info.
 *   - `mediaUrls` are captured into the parsed shape AND the touchpoint's
 *     raw_payload, but the orchestrator does NOT download or store media
 *     in this phase. That's a deliberate `text-only` scope: an inbound MMS
 *     still ingests as a text-channel lead with body = '' if there's no
 *     text. A future MMS phase can pick up the captured URLs from the
 *     touchpoint.
 *   - Source channel: `'sms_inbound'`. Activity type: `'sms'` (per
 *     `mapSourceChannelToActivityType` in `ingest-lead.ts`).
 *
 * Design notes:
 *   - Service-role only. Tenant resolution by receiving number happens
 *     before any user auth (Twilio is the auth, via signature verification).
 *   - Reuses the same `external_message_id` partial unique index from
 *     2b.2.a — the index is keyed on `(tenant_id, source_channel,
 *     external_message_id)` so the WhatsApp + SMS keyspaces don't collide.
 *   - Same idempotency + race-past-pre-check pattern as WhatsApp: a
 *     pre-flight SELECT in `isSmsAlreadyProcessed`, with the unique index
 *     as the safety net. The route handler converts unique-violation
 *     errors into 200 idempotent responses.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { ingestLead } from '@/lib/lead-ingestion/ingest-lead'

// =============================================================================
// Types
// =============================================================================

export interface TwilioInboundSmsMessage {
  /** Unique Twilio message id — used for idempotency. */
  messageSid: string
  /** Sender's phone in E.164. */
  fromPhoneE164: string
  /** Receiving SMS number in E.164. */
  toPhoneE164: string
  /** Message text; '' for media-only or empty messages. */
  body: string
  /** Number of media attachments (0..10 per Twilio). Captured, not acted on. */
  numMedia: number
  /**
   * Captured media URLs. NOT downloaded or persisted in this phase. The same
   * URLs are also in `rawPayload` (`MediaUrl0`, …) so the eventual MMS phase
   * can read them straight off the touchpoint.
   */
  mediaUrls: string[]
  /** Entire form-encoded body, for the touchpoint's raw_payload audit. */
  rawPayload: Record<string, string>
}

export interface ProcessSmsInboundResult {
  contactId: string
  /** Null when ingestLead returned `dedup_decision='review_required'` — but
   *  the orchestrator throws on null contact IDs (see processSmsInboundMessage). */
  dealId: string | null
  attributionTouchpointId: string
  activityId: string
  /** True when ingestLead created a new contact; false when an existing
   *  contact was reused (Tier 2 phone match) or replayed idempotently. */
  wasNewContact: boolean
}

/** Engine-side idempotent replay — orchestrator-level short-circuit shape. */
export interface ProcessSmsInboundIdempotentReplay {
  idempotentReplay: true
}

// =============================================================================
// Helper: parseTwilioInboundSmsMessage
// =============================================================================

/**
 * Collect `MediaUrl{N}` keys from the form body. Twilio numbers them
 * 0..NumMedia-1; we cap iteration at min(NumMedia, 10) to bound a malicious
 * payload's key-count.
 */
function collectMediaUrls(
  formParams: Record<string, string>,
  numMedia: number
): string[] {
  const out: string[] = []
  // Twilio caps at 10 in practice; cap defensively in case `numMedia` is
  // corrupted (NaN coerced or excessively large).
  const cap = Math.min(Math.max(numMedia, 0), 10)
  for (let i = 0; i < cap; i++) {
    const url = formParams[`MediaUrl${i}`]
    if (!url) continue
    out.push(url)
  }
  return out
}

/**
 * Twilio form body → typed shape used by the rest of the SMS pipeline.
 *
 * Differences from the WhatsApp parser:
 *   - From / To are returned verbatim (no `whatsapp:` prefix-stripping).
 *     If a WhatsApp message ever reaches this parser (e.g. webhook
 *     misconfiguration on Twilio's side), the `whatsapp:` prefix will
 *     surface in `fromPhoneE164` / `toPhoneE164` — a deliberate signal,
 *     not silent normalisation.
 *   - No `profileName` / `waId` — SMS doesn't carry those.
 *   - `mediaUrls` is a flat string[] (URL only). SMS in this phase doesn't
 *     act on content-types; capturing the URLs is enough to preserve the
 *     payload for a future MMS phase.
 */
export function parseTwilioInboundSmsMessage(
  formParams: Record<string, string>
): TwilioInboundSmsMessage {
  const messageSid = formParams.MessageSid ?? ''
  const fromPhoneE164 = formParams.From ?? ''
  const toPhoneE164 = formParams.To ?? ''
  const body = formParams.Body ?? ''

  // Twilio sends NumMedia as a string. parseInt('' | undefined) = NaN; coerce
  // to 0 so downstream callers always see a finite non-negative integer.
  const parsedNumMedia = parseInt(formParams.NumMedia ?? '0', 10)
  const numMedia =
    Number.isFinite(parsedNumMedia) && parsedNumMedia > 0 ? parsedNumMedia : 0

  return {
    messageSid,
    fromPhoneE164,
    toPhoneE164,
    body,
    numMedia,
    mediaUrls: collectMediaUrls(formParams, numMedia),
    // Independent shallow copy — callers can mutate the parsed object without
    // disturbing the original input. The values are strings (immutable in JS),
    // so a shallow spread is sufficient.
    rawPayload: { ...formParams },
  }
}

// =============================================================================
// Helper: resolveTenantBySmsNumber
// =============================================================================

/**
 * Look up which tenant owns the receiving SMS number (the `To` field on the
 * inbound payload). Service-role client because tenant resolution happens
 * BEFORE we know the tenant — RLS would reject a SELECT on `tenants` without
 * a session context.
 *
 * Edge case: if multiple tenants share the same number (provisioning bug or
 * shared test setup), pick the OLDEST by `created_at` and emit a structured
 * warn log so the operator can investigate without losing the inbound
 * message. Don't 500.
 */
export async function resolveTenantBySmsNumber(
  supabaseAdmin: SupabaseClient,
  smsNumberE164: string
): Promise<{ tenantId: string; tenantName: string } | null> {
  if (!smsNumberE164) return null

  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('id, name, created_at')
    .eq('sms_phone_number', smsNumberE164)
    .order('created_at', { ascending: true })
    .limit(2)

  if (error) {
    console.error('[sms-inbound] tenant lookup failed', {
      to: smsNumberE164,
      error_message: error.message,
    })
    return null
  }

  if (!data || data.length === 0) return null

  if (data.length > 1) {
    console.warn(
      '[sms-inbound] multi-tenant collision on sms_phone_number; ' +
        'routing to the oldest by created_at',
      { to: smsNumberE164, tenant_ids: data.map((row) => row.id) }
    )
  }

  return {
    tenantId: data[0].id as string,
    tenantName: (data[0].name as string) ?? '',
  }
}

// =============================================================================
// Helper: isSmsAlreadyProcessed
// =============================================================================

/**
 * Pre-flight idempotency check: have we already processed this Twilio
 * `MessageSid` for this tenant on the `sms_inbound` channel?
 *
 * Returns true if an `attribution_touchpoints` row exists with
 * `(tenant_id, source_channel='sms_inbound', external_message_id=<sid>)`.
 *
 * The partial unique index `idx_attribution_touchpoints_external_msg_uniq`
 * (added in 2b.2.a, keyed on (tenant_id, source_channel, external_message_id)
 * WHERE external_message_id IS NOT NULL) is the second line of defence — if
 * a race condition slips past this pre-check, the unique constraint catches
 * it and the route handler converts the violation into a 200 idempotent
 * response.
 *
 * Empty `messageSid` short-circuits to false: no SID → no idempotency anchor
 * → process normally. Matches the WhatsApp helper's behaviour.
 */
export async function isSmsAlreadyProcessed(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  messageSid: string
): Promise<boolean> {
  if (!messageSid) return false

  const { data, error } = await supabaseAdmin
    .from('attribution_touchpoints')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('source_channel', 'sms_inbound')
    .eq('external_message_id', messageSid)
    .limit(1)
    .maybeSingle()

  if (error) {
    // Don't fail-open; a SELECT error means we can't be sure, so the safest
    // outcome is to fall through to the ingest path. The DB unique index
    // catches a real duplicate.
    console.warn('[sms-inbound] idempotency pre-check failed', {
      tenant_id: tenantId,
      message_sid: messageSid,
      error_message: error.message,
    })
    return false
  }

  return data !== null
}

// =============================================================================
// Helper: processSmsInboundMessage
// =============================================================================

/**
 * Top-level handler for an inbound SMS. Builds the canonical `IngestLeadInput`
 * and calls `ingestLead()` — the same engine the Google Lead Form webhook
 * and WhatsApp inbound use. ingestLead's dedup engine handles the existing-
 * contact path correctly for phone-only SMS inputs (Tier 2 phone match →
 * 'matched' decision, additive-only update).
 *
 * The message body is forwarded via `treatment_intent_text`, which
 * `ingestLead.insertActivity` lands in `activities.description`. This avoids
 * a duplicate activity insert — ingestLead already creates one with
 * `type='sms'`, `direction='inbound'`, `source_channel='sms_inbound'`.
 *
 * Media: captured in `rawPayload._media_urls` and on the touchpoint's
 * `raw_payload.MediaUrlN` keys, never downloaded. A future MMS phase reads
 * those URLs directly off the touchpoint.
 *
 * Throws when ingestLead returns null IDs (`review_required` decision) so
 * the route surfaces 5xx and Twilio retries — giving the operator a window
 * to resolve in the dedup queue UI before the next retry.
 */
export async function processSmsInboundMessage(
  supabaseAdmin: SupabaseClient,
  tenantId: string,
  message: TwilioInboundSmsMessage
): Promise<ProcessSmsInboundResult> {
  const result = await ingestLead(
    {
      tenant_id: tenantId,
      source_channel: 'sms_inbound',
      contact: {
        phone: message.fromPhoneE164,
        // SMS carries no display name. Leave full_name null and let
        // attribution + the operator's CRM workflow fill it in later.
        full_name: null,
        email: null,
      },
      // Body becomes the activity's description (see ingestLead.insertActivity).
      // Empty for MMS-only payloads — that's fine; description falls back
      // to `New lead via sms_inbound`.
      treatment_intent_text: message.body,
      raw_payload: {
        ...message.rawPayload,
        // Captured-not-downloaded media URLs surface for a future MMS phase.
        _media_urls: message.mediaUrls,
        _num_media: message.numMedia,
      },
      // Engine-side idempotency: short-circuits replays at the top of
      // ingestLead before any DB writes. Distinct namespace from WhatsApp
      // so a hypothetical SID collision across channels stays safe.
      event_id: `sms_inbound:${message.messageSid}`,
      // Phase 2b.2.a: persisted on attribution_touchpoints.external_message_id
      // and protected by the partial unique index for race-past-pre-check.
      external_message_id: message.messageSid,
    },
    supabaseAdmin
  )

  if (
    !result.contact_id ||
    !result.attribution_touchpoint_id ||
    !result.activity_id
  ) {
    // ingestLead returns nulls only for `review_required` (ambiguous dedup) —
    // for phone-only SMS candidates this happens when the same phone is
    // attached to a contact whose email conflicts with another match. When
    // it does, surface as a structured error so Twilio retries (5xx) and
    // an operator gets visibility via Vercel logs + the dedup queue UI.
    throw new Error(
      `ingestLead returned an incomplete result for sms_inbound; ` +
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
