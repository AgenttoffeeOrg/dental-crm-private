/**
 * Phase 2b.26.1 — Voice inbound helpers.
 *
 * Twilio's voice status-callback gives us a `To` (the practice's
 * inbound number) and a `From` (the caller). We need to:
 *
 *   1. Resolve which tenant owns the receiving number. Practices
 *      typically share a single Twilio number across SMS and voice,
 *      so we check `tenants.sms_phone_number` first (canonical
 *      inbound binding, written by Settings → Communications →
 *      Integrations after 2b.25.1) and fall back to
 *      `integration_settings.voice_from_number` for practices that
 *      have a dedicated voice line. Returns null if no tenant claims
 *      the number — the route returns 401 in that case (same
 *      semantics as SMS / WhatsApp).
 *
 *   2. Dedup / create the contact by E.164 phone number. New callers
 *      get a contact with `full_name = null` (per the locked product
 *      rule: "if there's no contact with that name and number, create
 *      it without a name. The user can type in the name later").
 *
 *   3. Classify the call event as missed / answered / voicemail so
 *      the caller can render the right activity marker + notification.
 *
 * Service-role expectation: callers are inside the voice webhook
 * route which already runs with elevated privilege.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface VoiceTenantResolution {
  tenantId: string
  /** Which column matched — useful for ops logging. */
  source: 'sms_phone_number' | 'voice_from_number'
}

export async function resolveTenantByVoiceNumber(
  supabase: SupabaseClient,
  toNumberE164: string
): Promise<VoiceTenantResolution | null> {
  if (!toNumberE164) return null

  // Tier 1: shared with SMS — the canonical column.
  {
    const { data, error } = await supabase
      .from('tenants')
      .select('id, created_at')
      .eq('sms_phone_number', toNumberE164)
      .order('created_at', { ascending: true })
      .limit(2)
    if (!error && data && data.length > 0) {
      if (data.length > 1) {
        console.warn('[voice-inbound] multi-tenant collision on sms_phone_number — oldest wins', {
          to: toNumberE164,
          tenant_ids: data.map((r) => r.id),
        })
      }
      return { tenantId: data[0].id as string, source: 'sms_phone_number' }
    }
  }

  // Tier 2: dedicated voice number stored on integration_settings.
  {
    const { data, error } = await supabase
      .from('integration_settings')
      .select('tenant_id, created_at')
      .eq('voice_from_number', toNumberE164)
      .order('created_at', { ascending: true })
      .limit(2)
    if (!error && data && data.length > 0) {
      if (data.length > 1) {
        console.warn(
          '[voice-inbound] multi-tenant collision on integration_settings.voice_from_number — oldest wins',
          { to: toNumberE164, tenant_ids: data.map((r) => r.tenant_id) }
        )
      }
      return {
        tenantId: data[0].tenant_id as string,
        source: 'voice_from_number',
      }
    }
  }

  return null
}

export interface ContactResolution {
  contactId: string
  isNew: boolean
}

/**
 * Find an existing contact matching the caller's phone OR create a
 * no-name contact for this tenant. Search is on `primary_phone_e164`;
 * we don't auto-update `primary_phone` for legacy contacts here
 * because that's the dedup engine's job — voice just attaches.
 */
export async function findOrCreateContactByPhone(
  supabase: SupabaseClient,
  tenantId: string,
  phoneE164: string
): Promise<ContactResolution | null> {
  if (!tenantId || !phoneE164) return null

  // Try E.164 column first (the normalised one most code writes).
  // Fall through to the legacy `primary_phone` column for older rows.
  const { data: matches, error } = await supabase
    .from('contacts')
    .select('id, primary_phone_e164, primary_phone')
    .eq('tenant_id', tenantId)
    .or(`primary_phone_e164.eq.${phoneE164},primary_phone.eq.${phoneE164}`)
    .limit(1)

  if (error) {
    console.error('[voice-inbound] contact lookup failed', {
      tenantId,
      phoneE164,
      error: error.message,
    })
    return null
  }

  if (matches && matches.length > 0) {
    return { contactId: matches[0].id as string, isNew: false }
  }

  // No-name contact — fields left null so the practice can fill them
  // in. Status defaults to 'lead' so this row shows up in the
  // contacts list rather than getting hidden by lead-status filters.
  const { data: created, error: insertError } = await supabase
    .from('contacts')
    .insert({
      tenant_id: tenantId,
      primary_phone: phoneE164,
      primary_phone_e164: phoneE164,
      full_name: null,
      contact_type: 'lead',
      status: 'lead',
    })
    .select('id')
    .single()

  if (insertError || !created) {
    console.error('[voice-inbound] no-name contact insert failed', {
      tenantId,
      phoneE164,
      error: insertError?.message,
    })
    return null
  }
  return { contactId: created.id as string, isNew: true }
}

/**
 * Classify a call event as missed / answered / voicemail based on
 * Twilio's CallStatus + presence of a recording URL.
 *
 * Twilio statuses:
 *   - queued / ringing / in-progress — in-flight, not terminal
 *   - completed — answered (operator picked up). May or may not have a recording.
 *   - busy / failed / no-answer / canceled — caller hung up before connect → missed
 *
 * "Voicemail left" is signalled by `completed` + a recording_url when
 * Twilio's TwiML routed the call to a voicemail leg. Without TwiML
 * voicemail (most practices), recording_url is just the answered-call
 * recording. We classify it as voicemail only when caller hung up AND
 * recording_url is present — a separate signal upstream can override.
 */
export type CallShape = 'in_progress' | 'answered' | 'missed' | 'voicemail'

export function classifyCallShape(
  callStatus: string | null | undefined,
  recordingUrl: string | null | undefined
): CallShape {
  switch ((callStatus ?? '').toLowerCase()) {
    case 'queued':
    case 'ringing':
    case 'in-progress':
      return 'in_progress'
    case 'busy':
    case 'failed':
    case 'no-answer':
    case 'canceled':
      return recordingUrl ? 'voicemail' : 'missed'
    case 'completed':
      return 'answered'
    default:
      return 'in_progress'
  }
}
