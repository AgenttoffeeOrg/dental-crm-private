/**
 * Phase 2b.1.a — Google Lead Form webhook adapter.
 *
 * Maps a Google Lead Form Extensions webhook payload to the canonical
 * `IngestLeadInput` shape consumed by `ingestLead()`. The adapter is pure
 * (no IO, no DB access); the route handler does tenant resolution and
 * idempotency-key construction.
 *
 * Google's documented payload shape:
 *   https://support.google.com/google-ads/answer/7434409
 *
 * Notes:
 *  - We deliberately preserve the entire raw payload (`raw_payload`) so the
 *    touchpoint row is fully replayable from `metadata.raw_payload`.
 *  - We do NOT pre-validate identity (email/phone): the engine throws
 *    `IngestLeadValidationError('no_identity', ...)` so the route handler can
 *    convert that into a 400 consistently with every other channel.
 */
import type { IngestLeadInput } from '../ingest-lead'

/**
 * One column in `user_column_data`. Standard column ids (FULL_NAME, EMAIL,
 * PHONE_NUMBER, …) come from Google's docs; advertiser-defined custom
 * questions appear here too with whatever `column_id` the advertiser set.
 */
export type GoogleLeadFormColumn = {
  column_id: string
  string_value?: string
}

/**
 * The shape Google POSTs to our webhook. All numeric fields are sometimes
 * serialised as strings in newer payload versions — we coerce defensively.
 */
export type GoogleLeadFormPayload = {
  /** Per-form unique id; the basis for our idempotency key. */
  lead_id: string
  user_column_data: GoogleLeadFormColumn[]
  /** e.g. "1.0" — kept on raw_payload, not used to gate processing. */
  api_version: string
  form_id: number | string
  campaign_id?: number | string
  /** The per-tenant webhook key we provisioned and pasted into Google Ads. */
  google_key: string
  /** Google's "is this a test lead?" flag for the Lead Form Tester tool. */
  is_test?: boolean
  /** GCLID for the click that produced the lead. */
  gcl_id?: string
  adgroup_id?: number | string
  creative_id?: number | string
}

const STD_COLUMNS = {
  FULL_NAME: 'FULL_NAME',
  FIRST_NAME: 'FIRST_NAME',
  LAST_NAME: 'LAST_NAME',
  EMAIL: 'EMAIL',
  PHONE_NUMBER: 'PHONE_NUMBER',
  POSTAL_CODE: 'POSTAL_CODE',
} as const

function findColumn(
  cols: GoogleLeadFormColumn[],
  id: string
): string | undefined {
  const v = cols.find((c) => c.column_id === id)?.string_value?.trim()
  return v && v.length > 0 ? v : undefined
}

type ExtractedContactFields = {
  email: string | null
  phone: string | null
  full_name: string | null
  first_name: string | null
  last_name: string | null
}

function extractContactFields(
  cols: GoogleLeadFormColumn[]
): ExtractedContactFields {
  return {
    email: findColumn(cols, STD_COLUMNS.EMAIL) ?? null,
    phone: findColumn(cols, STD_COLUMNS.PHONE_NUMBER) ?? null,
    full_name: findColumn(cols, STD_COLUMNS.FULL_NAME) ?? null,
    first_name: findColumn(cols, STD_COLUMNS.FIRST_NAME) ?? null,
    last_name: findColumn(cols, STD_COLUMNS.LAST_NAME) ?? null,
  }
}

type ConsentRecord = {
  method: 'implied_inquiry'
  lawful_basis: 'consent'
  text_version: 'google_lead_form_v1'
  text: string
  captured_at: string
  ip_address: string | null
}

function buildConsentRecord(requestIp: string | undefined): ConsentRecord {
  return {
    method: 'implied_inquiry',
    lawful_basis: 'consent',
    text_version: 'google_lead_form_v1',
    text:
      'Implied consent via Google Lead Form submission. ' +
      'User saw the practice-configured privacy disclosure and submitted the form.',
    captured_at: new Date().toISOString(),
    ip_address: requestIp ?? null,
  }
}

/**
 * Convert a validated Google Lead Form payload into `IngestLeadInput`.
 *
 * Adapter-level adaptations from the original prompt → live engine shape:
 *  - Engine uses nested `contact: { email, phone, first_name, last_name,
 *    full_name, consents }` instead of flat `email`/`phone_e164`/`full_name`.
 *  - Engine uses nested `attribution: { gclid, ip_address, ... }` instead of
 *    flat `click_ids` / `http`.
 *  - Engine has `form_id` at the top level (not `source_sub_id`).
 *  - Engine's consent shape is a flat `consents` object on `contact` with
 *    boolean flags + free-text `consent_text_version` / `consent_method`.
 *    We surface the implied-consent record into those fields and stamp the
 *    consent text into `metadata.raw_payload.__consent_record` so the audit
 *    trail is preserved without a schema change.
 */
export function mapGoogleLeadFormPayload(
  payload: GoogleLeadFormPayload,
  tenantId: string,
  requestIp?: string
): IngestLeadInput {
  const cols = Array.isArray(payload.user_column_data)
    ? payload.user_column_data
    : []

  const fields = extractContactFields(cols)
  const consentRecord = buildConsentRecord(requestIp)

  // Stamp the consent record onto the raw payload so the touchpoint row
  // preserves it — the engine writes raw_payload into
  // attribution_touchpoints.metadata.raw_payload verbatim.
  const enrichedRawPayload: Record<string, unknown> = {
    ...(payload as unknown as Record<string, unknown>),
    __consent_record: consentRecord,
  }

  return {
    tenant_id: tenantId,
    source_channel: 'google_lead_form',

    contact: {
      email: fields.email,
      phone: fields.phone,
      first_name: fields.first_name,
      last_name: fields.last_name,
      full_name: fields.full_name,
      consents: {
        marketing_consent: true,
        email_consent: true,
        sms_consent: !!fields.phone,
        consent_text_version: consentRecord.text_version,
        consent_method: consentRecord.method,
      },
    },

    attribution: {
      gclid: payload.gcl_id || undefined,
      ip_address: requestIp ?? undefined,
    },

    treatment_offering_id: null,
    treatment_intent_text: null,

    raw_payload: enrichedRawPayload,
    form_id: payload.form_id !== undefined ? String(payload.form_id) : null,
  }
}
