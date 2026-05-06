/**
 * Phase 2a.2a — `ingestLead()` canonical function.
 *
 * The single chokepoint that turns a normalised lead payload from any channel
 * (form, booking widget, Meta lead ad, etc.) into the four artifacts:
 *   1. contact (created or updated)
 *   2. attribution_touchpoint (always written, except for review_required)
 *   3. activity (always written, except for review_required)
 *   4. dedup_review_queue row (only when ambiguous)
 *
 * Plus:
 *   - Emits `lead.arrived` notification (best-effort; failure does NOT fail
 *     ingestion). The notification dispatcher itself is built in Phase 2a.2b
 *     — we only call it from here.
 *   - Webhook-retry idempotency via `attribution_touchpoints.event_id`.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { resolveDedup, type DedupDecision, type DedupSignals } from './dedup-engine'
import { resolveSLA, type SLAResolveOutput } from './sla-resolver'
import { normaliseEmail, normalisePhoneE164, buildFullName } from './normalise'
import { isSourceChannel, type SourceChannelEnum } from './types'
import { createDealForLead, type DealCreationOutcome } from './deal-creation'
import { fireGoogleConversionEvent } from '@/lib/conversions/fire-conversion-event'

// Notification router is loaded lazily inside the default emitter. It pulls in
// `resend` → `@react-email/render` → `react-dom/server.browser` which trips
// jsdom test envs that don't polyfill `MessageChannel`. Lazy-loading also lets
// tests stub the emitter cleanly without ever touching email infrastructure.

// =============================================================================
// Types
// =============================================================================

export interface IngestLeadInput {
  tenant_id: string
  source_channel: SourceChannelEnum
  contact: {
    email?: string | null
    phone?: string | null
    first_name?: string | null
    last_name?: string | null
    full_name?: string | null
    consents?: {
      marketing_consent?: boolean
      email_consent?: boolean
      sms_consent?: boolean
      consent_text_version?: string
      consent_method?: string
    }
  }
  attribution?: {
    utm_source?: string
    utm_medium?: string
    utm_campaign?: string
    utm_term?: string
    utm_content?: string
    gclid?: string
    fbclid?: string
    ttclid?: string
    msclkid?: string
    landing_page_url?: string
    referrer_url?: string
    user_agent?: string
    ip_address?: string
  }
  treatment_offering_id?: string | null
  treatment_intent_text?: string | null
  channel_identifier?: { kind: string; value: string } | null
  raw_payload: Record<string, unknown>
  lead_intent_session_id?: string | null
  form_id?: string | null
  /** Stable idempotency key — derived by the caller from the source webhook. */
  event_id?: string | null
}

export interface IngestLeadResult {
  contact_id: string | null
  attribution_touchpoint_id: string | null
  activity_id: string | null
  /**
   * Phase 2a.7: Deal id created alongside the contact. NULL when:
   *   - dedup decision was `review_required` (no deal until queue resolution)
   *   - the call was an idempotent replay (deals are not double-created)
   *   - deal-creation graceful-skipped (no default pipeline / zero stages /
   *     deals.insert error). The contact + activity are still committed.
   */
  deal_id: string | null
  dedup_decision: DedupDecision['decision']
  dedup_signals: DedupSignals
  queue_item_id?: string
  sla: {
    due_at: string
    minutes: number
    rule_source: SLAResolveOutput['source']
  } | null
  /** True when the call short-circuited via event_id idempotency. */
  idempotent_replay?: boolean
  /**
   * Phase 2a.5: treatment_routing_logs row id.
   *
   * Phase 2a.7 deliberately does NOT populate this. The 2a.7 prompt explicitly
   * defers the routing-engine refactor: deal creation reads
   * `practice_treatment_offerings.pipeline_id` directly rather than calling
   * `routeDealWithAdapter()`, so no `treatment_routing_logs` row is written
   * for ingested leads yet. This field stays null until a future phase wires
   * the routing engine in (post-2b).
   */
  routing_log_id: string | null
}

export class IngestLeadValidationError extends Error {
  public readonly code: 'missing_tenant' | 'invalid_source_channel' | 'no_identity'
  constructor(code: IngestLeadValidationError['code'], message: string) {
    super(message)
    this.name = 'IngestLeadValidationError'
    this.code = code
  }
}

// =============================================================================
// Optional notification hook (overridable by tests; real wiring in 2a.2b)
// =============================================================================

export type EmitNotificationFn = (payload: {
  event_key: 'lead.arrived'
  event_id: string
  tenant_id: string
  metadata: Record<string, unknown>
}) => Promise<void> | void

// Default emitter delegates to the notification router (whose `lead.arrived`
// event handler was built in Phase 2a.2b checkpoints 1-4). Tests override this
// with `setNotificationEmitter` to avoid hitting the router during unit tests.
let _emitNotification: EmitNotificationFn = async (payload) => {
  const { emitNotification: routerEmit } = await import(
    '@/lib/notifications/notification-router'
  )
  await routerEmit({
    event_key: payload.event_key,
    event_id: payload.event_id,
    tenant_id: payload.tenant_id,
    entity_type: 'contact',
    entity_id: (payload.metadata.contact_id as string | undefined) ?? undefined,
    metadata: payload.metadata,
  })
}

export function setNotificationEmitter(fn: EmitNotificationFn): void {
  _emitNotification = fn
}

// =============================================================================
// Public API
// =============================================================================

export async function ingestLead(
  input: IngestLeadInput,
  client?: SupabaseClient
): Promise<IngestLeadResult> {
  validate(input)
  const supabase = client ?? createServiceClient()
  const arrivedAt = new Date()

  // ---------------------------------------------------------------------------
  // 0. Idempotency short-circuit
  // ---------------------------------------------------------------------------
  if (input.event_id) {
    const replay = await fetchExistingByEventId(supabase, input.tenant_id, input.event_id)
    if (replay) return replay
  }

  // ---------------------------------------------------------------------------
  // 1. Dedup
  // ---------------------------------------------------------------------------
  const decision = await resolveDedup(
    {
      tenant_id: input.tenant_id,
      email: input.contact.email,
      phone: input.contact.phone,
      first_name: input.contact.first_name,
      last_name: input.contact.last_name,
      full_name: input.contact.full_name,
      channel_identifier: input.channel_identifier as
        | { kind: 'whatsapp_phone' | 'instagram_handle' | 'fb_messenger_psid' | 'tiktok_user_id' | 'meta_lead_id'; value: string }
        | null,
    },
    supabase
  )

  // ---------------------------------------------------------------------------
  // 2. Branch on decision
  // ---------------------------------------------------------------------------
  if (decision.decision === 'review_required') {
    const queueRow = await insertReviewQueueItem(supabase, input, decision)
    return {
      contact_id: null,
      attribution_touchpoint_id: null,
      activity_id: null,
      deal_id: null,
      dedup_decision: 'review_required',
      dedup_signals: decision.signals,
      queue_item_id: queueRow.id,
      sla: null,
      routing_log_id: null,
    }
  }

  let contactId: string
  if (decision.decision === 'matched') {
    contactId = decision.contact_id
    await additivelyUpdateContact(supabase, contactId, input)
  } else {
    contactId = await insertNewContact(supabase, input)
  }

  // ---------------------------------------------------------------------------
  // 3. SLA
  // ---------------------------------------------------------------------------
  const sla = await resolveSLA(
    {
      tenant_id: input.tenant_id,
      source_channel: input.source_channel,
      treatment_offering_id: input.treatment_offering_id ?? null,
      lead_arrived_at: arrivedAt,
    },
    supabase
  )

  // ---------------------------------------------------------------------------
  // 4. Attribution touchpoint
  // ---------------------------------------------------------------------------
  const touchpointId = await insertTouchpoint(supabase, input, contactId, arrivedAt)

  // ---------------------------------------------------------------------------
  // 5. Deal creation (Phase 2a.7)
  //
  // Runs BEFORE the activity so the activity can reference the deal id.
  // Skipped entirely on review_required (handled above). Failures are
  // graceful: a missing pipeline, a zero-stage pipeline, or a deals.insert
  // error returns `dealOutcome.ok === false` — the lead is still captured.
  // ---------------------------------------------------------------------------
  const dealOutcome: DealCreationOutcome = await createDealForLead(supabase, {
    tenantId: input.tenant_id,
    contactId,
    treatmentOfferingId: input.treatment_offering_id ?? null,
    sourceChannel: input.source_channel,
  })
  const dealId = dealOutcome.ok ? dealOutcome.dealId : null
  const dealTitle = dealOutcome.ok
    ? dealOutcome.context.title
    : dealOutcome.context?.title ?? null

  // ---------------------------------------------------------------------------
  // 6. Activity (now references deal_id when available)
  // ---------------------------------------------------------------------------
  const activityId = await insertActivity(
    supabase,
    input,
    contactId,
    arrivedAt,
    sla,
    touchpointId,
    dealId
  )

  // ---------------------------------------------------------------------------
  // 7. Update first_touch / last_touch on contact
  // ---------------------------------------------------------------------------
  await updateTouchTimestamps(supabase, contactId, input, arrivedAt)

  // ---------------------------------------------------------------------------
  // 8. Emit notification (best-effort; never fail ingestion)
  //
  // Phase 2a.7: metadata extended with `deal_id` and `deal_title`. The event
  // key stays `lead.arrived` and the deep-link in `event-catalog.ts` still
  // points at /contacts/{contact_id}. A future phase can refactor copy /
  // routing to land on the deal once UX wants that.
  // ---------------------------------------------------------------------------
  try {
    await _emitNotification({
      event_key: 'lead.arrived',
      event_id: input.event_id ?? `lead.arrived:${touchpointId}`,
      tenant_id: input.tenant_id,
      metadata: {
        contact_id: contactId,
        attribution_touchpoint_id: touchpointId,
        deal_id: dealId,
        deal_title: dealTitle,
        sla_due_at: sla.due_at.toISOString(),
        source_channel: input.source_channel,
        treatment_offering_id: input.treatment_offering_id ?? null,
      },
    })
  } catch (err) {
    console.error('[ingestLead] emitNotification failed (non-fatal):', err)
  }

  // ---------------------------------------------------------------------------
  // 9. Phase 2b.1.b.1: fire `Lead` conversion event to Google Ads.
  //
  // Only fires if a deal was created (so we have a stable id to dedup on) AND
  // a gclid is present on the inbound attribution. The conversion-event firing
  // module is itself best-effort — it never throws, and missing tenant config
  // / no gclid produces a `skipped_*` row rather than an error. The outer
  // try/catch is defence-in-depth: under no circumstances is ingestion
  // allowed to fail because of a downstream marketing-platform call.
  // ---------------------------------------------------------------------------
  if (dealId && input.attribution?.gclid) {
    try {
      await fireGoogleConversionEvent(
        {
          tenant_id: input.tenant_id,
          deal_id: dealId,
          contact_id: contactId,
          event_type: 'Lead',
          gclid: input.attribution.gclid,
          email: input.contact.email ?? null,
          phone_e164: normalisePhoneE164(input.contact.phone) ?? null,
          occurred_at: arrivedAt.toISOString(),
        },
        supabase
      )
    } catch (err) {
      console.error('[ingestLead] fireGoogleConversionEvent crashed (non-fatal)', {
        deal_id: dealId,
        error_message: (err as Error)?.message ?? String(err),
      })
    }
  }

  return {
    contact_id: contactId,
    attribution_touchpoint_id: touchpointId,
    activity_id: activityId,
    deal_id: dealId,
    dedup_decision: decision.decision,
    dedup_signals: decision.signals,
    sla: {
      due_at: sla.due_at.toISOString(),
      minutes: sla.first_response_minutes,
      rule_source: sla.source,
    },
    // Phase 2a.5/2a.7: still null. See IngestLeadResult.routing_log_id JSDoc.
    routing_log_id: null,
  }
}

// =============================================================================
// Validation
// =============================================================================

function validate(input: IngestLeadInput): void {
  if (!input.tenant_id) {
    throw new IngestLeadValidationError('missing_tenant', 'tenant_id is required')
  }
  if (!isSourceChannel(input.source_channel)) {
    throw new IngestLeadValidationError(
      'invalid_source_channel',
      `source_channel "${input.source_channel}" is not a valid public.source_channel_enum value`
    )
  }
  const hasEmail = !!input.contact.email
  const hasPhone = !!input.contact.phone
  const hasChannel = !!input.channel_identifier
  if (!hasEmail && !hasPhone && !hasChannel) {
    throw new IngestLeadValidationError(
      'no_identity',
      'At least one of contact.email, contact.phone, or channel_identifier is required'
    )
  }
}

// =============================================================================
// DB helpers
// =============================================================================

async function fetchExistingByEventId(
  supabase: SupabaseClient,
  tenantId: string,
  eventId: string
): Promise<IngestLeadResult | null> {
  const { data: tp, error } = await supabase
    .from('attribution_touchpoints')
    .select('id, contact_id, treatment_offering_id, occurred_at, source_channel')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error || !tp) return null

  // Look up the matching activity for completeness.
  const { data: act } = await supabase
    .from('activities')
    .select('id, deal_id')
    .eq('tenant_id', tenantId)
    .eq('contact_id', tp.contact_id)
    .eq('source_channel', tp.source_channel)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    contact_id: tp.contact_id,
    attribution_touchpoint_id: tp.id,
    activity_id: (act as { id: string } | null)?.id ?? null,
    // Phase 2a.7: surface the prior deal id on idempotent replays so the
    // form/widget callers can still link to the deal even on a webhook
    // retry. Read from the activity rather than re-querying `deals`
    // because the activity is the canonical link in this flow.
    deal_id: (act as { deal_id: string | null } | null)?.deal_id ?? null,
    dedup_decision: 'matched',
    dedup_signals: {
      email_match: false,
      phone_match: false,
      channel_identifier_match: false,
    },
    sla: null,
    idempotent_replay: true,
    routing_log_id: null,
  }
}

async function insertReviewQueueItem(
  supabase: SupabaseClient,
  input: IngestLeadInput,
  decision: Extract<DedupDecision, { decision: 'review_required' }>
): Promise<{ id: string }> {
  const emailNorm = normaliseEmail(input.contact.email)
  const phoneE164 = normalisePhoneE164(input.contact.phone)
  const candidateName = buildFullName(input.contact)

  // Phase 2a.9: enrich candidate_payload with the structured fields
  // ingestLead carries on its top-level input but the source raw_payload
  // doesn't reliably include — `treatment_offering_id`, normalised email,
  // E.164 phone, and the consents struct. The dedup-queue resolve endpoint
  // reads these back when constructing the deal context, so they have to be
  // preserved on the queue row even though the source raw_payload may not
  // have included them. The `source_channel` and idempotency `event_id`
  // already live on dedicated queue columns / the resolve event_id pattern,
  // so they're not duplicated here.
  const enrichedPayload: Record<string, unknown> = {
    ...(input.raw_payload ?? {}),
    treatment_offering_id: input.treatment_offering_id ?? null,
    treatment_intent_text: input.treatment_intent_text ?? null,
    email: emailNorm ?? input.contact.email ?? null,
    phone: phoneE164 ?? input.contact.phone ?? null,
    full_name: candidateName === 'Unknown Lead' ? null : candidateName,
    consents: input.contact.consents ?? null,
  }

  const { data, error } = await supabase
    .from('dedup_review_queue')
    .insert({
      tenant_id: input.tenant_id,
      candidate_payload: enrichedPayload,
      candidate_email: emailNorm,
      candidate_phone: phoneE164,
      candidate_name: candidateName === 'Unknown Lead' ? null : candidateName,
      source_channel: input.source_channel,
      matched_contact_ids: decision.matched_contact_ids,
      match_signals: decision.signals as unknown as Record<string, unknown>,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert dedup review queue row: ${error?.message ?? 'unknown error'}`)
  }
  return data
}

async function insertNewContact(supabase: SupabaseClient, input: IngestLeadInput): Promise<string> {
  const emailNorm = normaliseEmail(input.contact.email)
  const phoneE164 = normalisePhoneE164(input.contact.phone)
  const fullName = buildFullName(input.contact)
  const consents = input.contact.consents ?? {}

  const { data, error } = await supabase
    .from('contacts')
    .insert({
      tenant_id: input.tenant_id,
      full_name: fullName,
      primary_email: emailNorm,
      primary_email_norm: emailNorm,
      primary_phone: phoneE164 ?? input.contact.phone ?? null,
      primary_phone_e164: phoneE164,
      treatment_offering_id: input.treatment_offering_id ?? null,
      // Consent boolean columns. Never widen consent on update; only set on insert.
      marketing_consent: consents.marketing_consent ?? false,
      email_consent: consents.email_consent ?? true,
      sms_consent: consents.sms_consent ?? false,
      source: input.source_channel,
      contact_type: 'lead',
      status: 'lead',
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert new contact: ${error?.message ?? 'unknown error'}`)
  }
  return data.id
}

/**
 * Update an existing contact additively only — never overwrite a non-null
 * value with the candidate's value. COALESCE logic implemented client-side
 * via two-step read/conditional-write because PostgREST doesn't expose raw
 * SQL COALESCE in update payloads.
 */
async function additivelyUpdateContact(
  supabase: SupabaseClient,
  contactId: string,
  input: IngestLeadInput
): Promise<void> {
  const { data: existing } = await supabase
    .from('contacts')
    .select(
      'id, primary_email, primary_email_norm, primary_phone, primary_phone_e164, full_name, treatment_offering_id'
    )
    .eq('id', contactId)
    .maybeSingle()

  if (!existing) return // The dedup engine pointed us at a contact that vanished.

  const emailNorm = normaliseEmail(input.contact.email)
  const phoneE164 = normalisePhoneE164(input.contact.phone)
  const candidateFullName = buildFullName(input.contact)

  const patch: Record<string, unknown> = {}
  if (!existing.primary_email && emailNorm) {
    patch.primary_email = emailNorm
    patch.primary_email_norm = emailNorm
  }
  if (!existing.primary_phone && (phoneE164 || input.contact.phone)) {
    patch.primary_phone = phoneE164 ?? input.contact.phone
    patch.primary_phone_e164 = phoneE164
  } else if (!existing.primary_phone_e164 && phoneE164) {
    patch.primary_phone_e164 = phoneE164
  }
  if ((!existing.full_name || existing.full_name === 'Unknown Lead') && candidateFullName !== 'Unknown Lead') {
    patch.full_name = candidateFullName
  }
  if (!existing.treatment_offering_id && input.treatment_offering_id) {
    patch.treatment_offering_id = input.treatment_offering_id
  }

  if (Object.keys(patch).length === 0) return

  patch.updated_at = new Date().toISOString()
  const { error } = await supabase.from('contacts').update(patch).eq('id', contactId)
  if (error) {
    throw new Error(`Failed to update existing contact ${contactId}: ${error.message}`)
  }
}

async function insertTouchpoint(
  supabase: SupabaseClient,
  input: IngestLeadInput,
  contactId: string,
  arrivedAt: Date
): Promise<string> {
  const attr = input.attribution ?? {}
  const consents = input.contact.consents ?? {}

  const metadata: Record<string, unknown> = {
    raw_payload: input.raw_payload,
    treatment_intent_text: input.treatment_intent_text ?? null,
    form_id: input.form_id ?? null,
    consent_text_version: consents.consent_text_version ?? null,
    consent_method: consents.consent_method ?? null,
    channel_identifier: input.channel_identifier ?? null,
  }

  const { data, error } = await supabase
    .from('attribution_touchpoints')
    .insert({
      tenant_id: input.tenant_id,
      contact_id: contactId,
      lead_intent_session_id: input.lead_intent_session_id ?? null,
      treatment_offering_id: input.treatment_offering_id ?? null,
      source_channel: input.source_channel,
      occurred_at: arrivedAt.toISOString(),
      utm_source: attr.utm_source ?? null,
      utm_medium: attr.utm_medium ?? null,
      utm_campaign: attr.utm_campaign ?? null,
      utm_content: attr.utm_content ?? null,
      utm_term: attr.utm_term ?? null,
      gclid: attr.gclid ?? null,
      fbclid: attr.fbclid ?? null,
      ttclid: attr.ttclid ?? null,
      msclkid: attr.msclkid ?? null,
      landing_page_url: attr.landing_page_url ?? null,
      referrer_url: attr.referrer_url ?? null,
      ip_address: attr.ip_address ?? null,
      user_agent: attr.user_agent ?? null,
      event_id: input.event_id ?? null,
      metadata,
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert attribution_touchpoint: ${error?.message ?? 'unknown error'}`)
  }
  return data.id
}

/**
 * Map a source_channel to an `activities.type` value that satisfies the
 * activities_type_check CHECK constraint. The 3 booking_widget_* and the
 * meta_messenger_ad / google_*_ad source channels do NOT have direct
 * activity-type counterparts; we use 'web_chat' / 'form_submission' /
 * 'meta_lead_received' / 'google_lead_received' and rely on `source_channel`
 * for the typed channel.
 */
function mapSourceChannelToActivityType(channel: SourceChannelEnum): string {
  switch (channel) {
    case 'form_embedded':
    case 'form_hosted_landing':
    case 'booking_widget_webform':
      return 'form_submission'
    case 'booking_widget_calendar':
      return 'web_chat'
    case 'booking_widget_whatsapp':
    case 'whatsapp_website_button':
    case 'whatsapp_meta_ad':
    case 'whatsapp_qr':
      return 'whatsapp'
    case 'meta_lead_ad':
    case 'meta_messenger_ad':
      return 'meta_lead_received'
    case 'google_lead_form':
    case 'google_search_ad':
    case 'google_display_ad':
      return 'google_lead_received'
    case 'instagram_dm':
      return 'instagram_dm'
    case 'fb_messenger':
      return 'fb_messenger'
    case 'sms_inbound':
      return 'sms'
    case 'phone_call_inbound':
    case 'phone_call_voicemail':
      return 'call'
    case 'online_booking_completed':
      return 'online_booking_completed'
    case 'online_booking_abandoned':
      return 'online_booking_abandoned'
    case 'manual_entry':
      return 'manual_entry'
    case 'csv_import':
      return 'csv_import'
    case 'api_partner':
    case 'referral':
    case 'other':
    default:
      return 'note'
  }
}

async function insertActivity(
  supabase: SupabaseClient,
  input: IngestLeadInput,
  contactId: string,
  arrivedAt: Date,
  sla: SLAResolveOutput,
  touchpointId: string,
  dealId: string | null
): Promise<string> {
  const description =
    input.treatment_intent_text?.trim() ||
    `New lead via ${input.source_channel}`

  const { data, error } = await supabase
    .from('activities')
    .insert({
      tenant_id: input.tenant_id,
      contact_id: contactId,
      // Phase 2a.7: link the activity to the deal we just created so it shows
      // up on the deal's timeline as well as the contact's. NULL is fine — the
      // graceful-skip paths in deal-creation leave the activity contact-scoped.
      deal_id: dealId,
      type: mapSourceChannelToActivityType(input.source_channel),
      direction: 'inbound',
      source_channel: input.source_channel,
      occurred_at: arrivedAt.toISOString(),
      title: 'Lead received',
      description,
      metadata: {
        attribution_touchpoint_id: touchpointId,
        treatment_offering_id: input.treatment_offering_id ?? null,
        sla_due_at: sla.due_at.toISOString(),
        sla_minutes: sla.first_response_minutes,
        sla_rule_source: sla.source,
        utm: input.attribution
          ? {
              source: input.attribution.utm_source,
              medium: input.attribution.utm_medium,
              campaign: input.attribution.utm_campaign,
            }
          : null,
      },
    })
    .select('id')
    .single()

  if (error || !data) {
    throw new Error(`Failed to insert activity: ${error?.message ?? 'unknown error'}`)
  }
  return data.id
}

/**
 * Set first_touch_* (only if NULL — first wins) and last_touch_* (always —
 * latest wins) on the contact. We deliberately don't try to be transactional
 * with the touchpoint insert; if this update fails, the touchpoint is still
 * authoritative and we can recompute touch fields from there later.
 */
async function updateTouchTimestamps(
  supabase: SupabaseClient,
  contactId: string,
  input: IngestLeadInput,
  arrivedAt: Date
): Promise<void> {
  const attr = input.attribution ?? {}
  const { data: existing } = await supabase
    .from('contacts')
    .select(
      'first_touch_at, first_touch_source_channel, first_touch_utm_source, first_touch_utm_medium, first_touch_utm_campaign, first_touch_utm_content, first_touch_utm_term, first_touch_gclid, first_touch_fbclid, first_touch_msclkid, first_touch_ttclid, first_touch_referrer_url, first_touch_landing_page_url, first_touch_ip_address, first_touch_user_agent'
    )
    .eq('id', contactId)
    .maybeSingle()

  const patch: Record<string, unknown> = {
    last_touch_source_channel: input.source_channel,
    last_touch_at: arrivedAt.toISOString(),
    last_touch_utm_source: attr.utm_source ?? null,
    last_touch_utm_medium: attr.utm_medium ?? null,
    last_touch_utm_campaign: attr.utm_campaign ?? null,
    last_touch_utm_content: attr.utm_content ?? null,
    last_touch_utm_term: attr.utm_term ?? null,
    last_touch_gclid: attr.gclid ?? null,
    last_touch_fbclid: attr.fbclid ?? null,
    last_touch_msclkid: attr.msclkid ?? null,
    last_touch_ttclid: attr.ttclid ?? null,
    last_touch_referrer_url: attr.referrer_url ?? null,
    last_touch_landing_page_url: attr.landing_page_url ?? null,
    last_touch_ip_address: attr.ip_address ?? null,
    last_touch_user_agent: attr.user_agent ?? null,
  }

  if (!existing?.first_touch_at) {
    patch.first_touch_source_channel = input.source_channel
    patch.first_touch_at = arrivedAt.toISOString()
    patch.first_touch_utm_source = attr.utm_source ?? null
    patch.first_touch_utm_medium = attr.utm_medium ?? null
    patch.first_touch_utm_campaign = attr.utm_campaign ?? null
    patch.first_touch_utm_content = attr.utm_content ?? null
    patch.first_touch_utm_term = attr.utm_term ?? null
    patch.first_touch_gclid = attr.gclid ?? null
    patch.first_touch_fbclid = attr.fbclid ?? null
    patch.first_touch_msclkid = attr.msclkid ?? null
    patch.first_touch_ttclid = attr.ttclid ?? null
    patch.first_touch_referrer_url = attr.referrer_url ?? null
    patch.first_touch_landing_page_url = attr.landing_page_url ?? null
    patch.first_touch_ip_address = attr.ip_address ?? null
    patch.first_touch_user_agent = attr.user_agent ?? null
  }

  await supabase.from('contacts').update(patch).eq('id', contactId)
}
