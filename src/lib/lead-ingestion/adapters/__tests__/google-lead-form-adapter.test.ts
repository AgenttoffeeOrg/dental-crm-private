/**
 * Phase 2b.1.a — adapter unit tests for `mapGoogleLeadFormPayload`.
 *
 * Pure-function tests — no DB, no mocks needed. Each case asserts the
 * shape returned to the caller (the route handler), which in turn becomes
 * the input to ingestLead().
 */

import {
  mapGoogleLeadFormPayload,
  type GoogleLeadFormPayload,
} from '../google-lead-form-adapter'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const IP = '203.0.113.5'

function payload(
  overrides: Partial<GoogleLeadFormPayload> = {}
): GoogleLeadFormPayload {
  return {
    lead_id: 'lead-001',
    api_version: '1.0',
    form_id: 9876543210,
    google_key: 'key-uuid-irrelevant-here',
    user_column_data: [
      { column_id: 'FULL_NAME', string_value: 'Sarah Test' },
      { column_id: 'EMAIL', string_value: 'sarah.test@example.com' },
      { column_id: 'PHONE_NUMBER', string_value: '+447700900100' },
    ],
    gcl_id: 'Cj0KCQjw-test-gclid',
    ...overrides,
  }
}

describe('mapGoogleLeadFormPayload', () => {
  it('happy path: maps full payload into a well-formed IngestLeadInput', () => {
    const out = mapGoogleLeadFormPayload(payload(), TENANT, IP)

    expect(out.tenant_id).toBe(TENANT)
    expect(out.source_channel).toBe('google_lead_form')
    expect(out.form_id).toBe('9876543210')

    expect(out.contact.email).toBe('sarah.test@example.com')
    expect(out.contact.phone).toBe('+447700900100')
    expect(out.contact.full_name).toBe('Sarah Test')
    expect(out.contact.first_name).toBeNull()
    expect(out.contact.last_name).toBeNull()

    expect(out.contact.consents).toMatchObject({
      marketing_consent: true,
      email_consent: true,
      sms_consent: true,
      consent_text_version: 'google_lead_form_v1',
      consent_method: 'implied_inquiry',
    })

    expect(out.attribution?.gclid).toBe('Cj0KCQjw-test-gclid')
    expect(out.attribution?.ip_address).toBe(IP)
    expect(out.attribution?.utm_source).toBeUndefined()
    expect(out.attribution?.utm_campaign).toBeUndefined()
    expect(out.attribution?.referrer_url).toBeUndefined()
    expect(out.attribution?.user_agent).toBeUndefined()

    expect(out.treatment_offering_id).toBeNull()
    expect(out.treatment_intent_text).toBeNull()

    // raw_payload preserves the original payload (including the full lead_id,
    // form_id, etc.) plus our consent record annotation.
    expect(out.raw_payload).toMatchObject({
      lead_id: 'lead-001',
      form_id: 9876543210,
      google_key: 'key-uuid-irrelevant-here',
    })
    expect(
      (out.raw_payload as Record<string, unknown>).__consent_record
    ).toMatchObject({
      method: 'implied_inquiry',
      lawful_basis: 'consent',
      text_version: 'google_lead_form_v1',
      ip_address: IP,
    })
  })

  it('email only: phone undefined, sms_consent flips false', () => {
    const out = mapGoogleLeadFormPayload(
      payload({
        user_column_data: [
          { column_id: 'EMAIL', string_value: 'only@example.com' },
        ],
      }),
      TENANT,
      IP
    )
    expect(out.contact.email).toBe('only@example.com')
    expect(out.contact.phone).toBeNull()
    expect(out.contact.consents?.sms_consent).toBe(false)
  })

  it('phone only: email undefined, sms_consent stays true', () => {
    const out = mapGoogleLeadFormPayload(
      payload({
        user_column_data: [
          { column_id: 'PHONE_NUMBER', string_value: '+447700900200' },
        ],
      }),
      TENANT,
      IP
    )
    expect(out.contact.email).toBeNull()
    expect(out.contact.phone).toBe('+447700900200')
    expect(out.contact.consents?.sms_consent).toBe(true)
  })

  it('empty user_column_data: returns a structure (engine handles validation)', () => {
    const out = mapGoogleLeadFormPayload(
      payload({ user_column_data: [] }),
      TENANT,
      IP
    )
    // Adapter doesn't throw; identity-claim enforcement is the engine's job.
    expect(out.contact.email).toBeNull()
    expect(out.contact.phone).toBeNull()
    expect(out.contact.full_name).toBeNull()
  })

  it('missing gcl_id: attribution.gclid is undefined', () => {
    const out = mapGoogleLeadFormPayload(
      payload({ gcl_id: undefined }),
      TENANT,
      IP
    )
    expect(out.attribution?.gclid).toBeUndefined()
  })

  it('custom (non-standard) columns: ignored at top level, preserved in raw_payload', () => {
    const customCol = {
      column_id: 'TREATMENT_INTEREST',
      string_value: 'Implants',
    }
    const out = mapGoogleLeadFormPayload(
      payload({
        user_column_data: [
          { column_id: 'EMAIL', string_value: 'x@y.com' },
          customCol,
        ],
      }),
      TENANT,
      IP
    )
    // Adapter doesn't surface custom columns into typed fields …
    expect(out.contact.full_name).toBeNull()
    // … but they are preserved in raw_payload for downstream replay.
    const rp = out.raw_payload as { user_column_data?: unknown[] }
    expect(rp.user_column_data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ column_id: 'TREATMENT_INTEREST' }),
      ])
    )
  })

  it('is_test flag is not handled by adapter (route handler responsibility)', () => {
    const out = mapGoogleLeadFormPayload(
      payload({ is_test: true }),
      TENANT,
      IP
    )
    // Adapter does NOT lift is_test into a typed field — only preserves it on
    // raw_payload. Route handler is responsible for tagging metadata.is_test.
    expect((out.raw_payload as Record<string, unknown>).__is_test).toBeUndefined()
    expect((out.raw_payload as Record<string, unknown>).is_test).toBe(true)
  })

  it('form_id as number vs string both stringify the same way for form_id', () => {
    const a = mapGoogleLeadFormPayload(
      payload({ form_id: 9876543210 }),
      TENANT,
      IP
    )
    const b = mapGoogleLeadFormPayload(
      payload({ form_id: '9876543210' }),
      TENANT,
      IP
    )
    expect(a.form_id).toBe('9876543210')
    expect(b.form_id).toBe('9876543210')
    expect(a.form_id).toBe(b.form_id)
  })

  it('strips empty string column values to undefined', () => {
    const out = mapGoogleLeadFormPayload(
      payload({
        user_column_data: [
          { column_id: 'EMAIL', string_value: 'a@b.com' },
          { column_id: 'FULL_NAME', string_value: '   ' },
        ],
      }),
      TENANT,
      IP
    )
    expect(out.contact.email).toBe('a@b.com')
    expect(out.contact.full_name).toBeNull()
  })
})
