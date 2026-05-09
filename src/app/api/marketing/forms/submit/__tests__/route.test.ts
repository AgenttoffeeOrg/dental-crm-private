/**
 * @jest-environment node
 *
 * Phase 2b.3 — `/api/marketing/forms/submit` unit tests.
 *
 * Covers the contract laid out in the Phase 2b.3 prompt §2 and §6.1:
 *   1.  Tenant resolution from `formId` (no auth gate).
 *   2.  404 (generic body) when the form is unknown / inactive / unpublished.
 *   3.  400 when neither email nor phone is present.
 *   4.  Spam path persists a `marketing_form_submissions` row, never calls
 *       `ingestLead`, never increments the counter, and returns a generic
 *       200 success.
 *   5.  `source_channel` is set to `form_embedded` for `/forms/embed/` URLs.
 *   6.  `source_channel` is set to `form_hosted_landing` for `/f/` URLs.
 *   7.  `clickIds` from the body land on `IngestLeadInput.attribution`.
 *   8.  `landingPageUrl` from the body lands on
 *       `IngestLeadInput.attribution.landing_page_url`.
 *   9.  `marketing_form_submissions` row maps `result.contact_id` and
 *       `dedup_decision === 'new'` → `contact_created`,
 *       `dedup_decision === 'matched'` → `contact_updated`.
 *  10.  Response shape `{ contact_id, deal_id, is_new_contact, sla_due_at }`.
 *
 * Mocks the supabase service client, `ingestLead`, the marketing flag,
 * the rate limiter, and the recaptcha verifier so we can exercise every
 * branch without hitting any DB or third-party dependency.
 */

import { NextRequest } from 'next/server'

// ---------------------------------------------------------------------------
// Supabase service client mock — single chained-builder spy. Each top-level
// call to `from()` returns a fresh handle whose `.select(...).eq(...).maybeSingle()`
// or `.insert(...)` resolves to whatever the next queued response holds.
// ---------------------------------------------------------------------------

type FormRow = {
  id: string
  tenant_id: string
  name: string
  status: 'draft' | 'active' | 'archived'
  is_published: boolean
}

const mockFormLookupResult = jest.fn<
  Promise<{ data: FormRow | null; error: { message: string } | null }>,
  []
>()

// Marketing-flag gate is now an inline `tenants.marketing_enabled` SELECT
// inside the route (see route.ts top-of-file comment). The test exposes
// it through the `tenants` table mock so we can flip it to false to
// exercise the 403 path.
const mockTenantLookupResult = jest.fn<
  Promise<{ data: { marketing_enabled: boolean } | null; error: { message: string } | null }>,
  []
>()

const mockSubmissionInsert = jest.fn<
  Promise<{ data: null; error: { message: string } | null }>,
  [Record<string, unknown>]
>()

const mockRpc = jest.fn(async () => ({ data: null, error: null }))

function buildFormQueryBuilder() {
  // .select(...).eq(...).maybeSingle()
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: () => mockFormLookupResult(),
      })),
    })),
  }
}

function buildTenantsQueryBuilder() {
  return {
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        maybeSingle: () => mockTenantLookupResult(),
      })),
    })),
  }
}

function buildSubmissionsBuilder() {
  return {
    insert: (row: Record<string, unknown>) => mockSubmissionInsert(row),
  }
}

const mockFrom = jest.fn((table: string) => {
  if (table === 'marketing_forms') return buildFormQueryBuilder()
  if (table === 'tenants') return buildTenantsQueryBuilder()
  if (table === 'marketing_form_submissions') return buildSubmissionsBuilder()
  throw new Error(`unexpected supabase table: ${table}`)
})

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom, rpc: mockRpc }),
}))

// ---------------------------------------------------------------------------
// Rate limiter — allow by default; tests opt into the throttled response
// individually.
// ---------------------------------------------------------------------------

const mockCheckRateLimit = jest.fn(async () => ({
  allowed: true,
  limit: 10,
  remaining: 9,
  resetTime: Date.now() + 60_000,
}))
const mockGetTimeUntilReset = jest.fn(() => 60)

jest.mock('@/lib/rate-limiter', () => ({
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...(args as [unknown])),
  getTimeUntilReset: (...args: unknown[]) => mockGetTimeUntilReset(...(args as [number])),
}))

// ---------------------------------------------------------------------------
// reCAPTCHA — never invoked unless `recaptchaToken` is in the body. Stubbed
// regardless so accidental fetches in jsdom don't blow up.
// ---------------------------------------------------------------------------

jest.mock('@/lib/forms/recaptcha', () => ({
  verifyRecaptchaToken: jest.fn(async () => ({ score: 0.9, success: true })),
  evaluateRecaptchaScore: jest.fn(() => ({ allowed: true, reason: 'ok' })),
}))

// ---------------------------------------------------------------------------
// ingestLead mock. We re-use the real `IngestLeadValidationError` so the
// `instanceof` check inside the route still works.
// ---------------------------------------------------------------------------

const { IngestLeadValidationError } = jest.requireActual(
  '@/lib/lead-ingestion/ingest-lead'
)

const mockIngestLead = jest.fn()
jest.mock('@/lib/lead-ingestion/ingest-lead', () => ({
  __esModule: true,
  ingestLead: (...args: unknown[]) => mockIngestLead(...args),
  IngestLeadValidationError,
}))

// Import after mocks are in place.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const FORM_ID = 'b1f6a0c0-1234-4cab-9999-abcdef012345'

function activeFormRow(overrides: Partial<FormRow> = {}): FormRow {
  return {
    id: FORM_ID,
    tenant_id: TENANT,
    name: 'Test Contact Form',
    status: 'active',
    is_published: true,
    ...overrides,
  }
}

function jsonReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/marketing/forms/submit', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function happyPayload(overrides: Record<string, unknown> = {}) {
  return {
    formId: FORM_ID,
    formName: 'Test Contact Form',
    payload: {
      email: 'submit@example.com',
      phone: '+447700900111',
      full_name: 'Submit Tester',
    },
    sourceUrl: 'https://practice.example.com/contact',
    honeypot: '',
    formLoadTime: (Date.now() - 5_000).toString(), // 5 s ago — well past 2 s gate
    utmParams: {
      utm_source: 'google',
      utm_medium: 'cpc',
      utm_campaign: 'launch',
    },
    clickIds: { gclid: 'abc-gclid' },
    landingPageUrl: 'https://practice.example.com/contact',
    ...overrides,
  }
}

function happyIngestResult(overrides: Record<string, unknown> = {}) {
  return {
    contact_id: 'contact-1',
    attribution_touchpoint_id: 'tp-1',
    activity_id: 'act-1',
    deal_id: 'deal-1',
    dedup_decision: 'new' as const,
    dedup_signals: {
      email_match: false,
      phone_match: false,
      channel_identifier_match: false,
    },
    sla: { due_at: '2026-05-09T18:00:00.000Z', minutes: 60, rule_source: 'system_default' as const },
    routing_log_id: null,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockTenantLookupResult.mockResolvedValue({
    data: { marketing_enabled: true },
    error: null,
  })
  mockCheckRateLimit.mockResolvedValue({
    allowed: true,
    limit: 10,
    remaining: 9,
    resetTime: Date.now() + 60_000,
  })
  mockSubmissionInsert.mockResolvedValue({ data: null, error: null })
})

// ===========================================================================
// Tenant resolution + 404 paths
// ===========================================================================

describe('POST /api/marketing/forms/submit — tenant resolution', () => {
  it('resolves tenant from formId and forwards it to ingestLead (no auth required)', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(200)
    expect(mockIngestLead).toHaveBeenCalledTimes(1)
    expect(mockIngestLead.mock.calls[0][0].tenant_id).toBe(TENANT)
  })

  it('returns 404 with a generic body when the form is unknown', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: null, error: null })

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body).toEqual({ error: 'Form not found' })
    // Critically, the response must NOT contain the requested formId
    // (so a probe can't learn that a UUID exists in another tenant).
    expect(JSON.stringify(body)).not.toContain(FORM_ID)
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('returns 404 with the same generic body for a form whose status != active', async () => {
    mockFormLookupResult.mockResolvedValueOnce({
      data: activeFormRow({ status: 'draft' }),
      error: null,
    })

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Form not found' })
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('returns 404 for a form whose is_published is false', async () => {
    mockFormLookupResult.mockResolvedValueOnce({
      data: activeFormRow({ is_published: false }),
      error: null,
    })

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'Form not found' })
    expect(mockIngestLead).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Identity gate
// ===========================================================================

describe('POST /api/marketing/forms/submit — identity gate', () => {
  it('returns 400 when neither email nor phone is present in the payload', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })

    const res = await POST(
      jsonReq(
        happyPayload({
          payload: { full_name: 'No Identity Tester' },
        })
      )
    )

    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: 'Form must capture either email or phone',
    })
    expect(mockIngestLead).not.toHaveBeenCalled()
  })
})

// ===========================================================================
// Spam path
// ===========================================================================

describe('POST /api/marketing/forms/submit — spam path', () => {
  it('honeypot trigger writes a spam row, skips ingestLead, returns generic 200', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })

    const res = await POST(jsonReq(happyPayload({ honeypot: 'i-am-a-bot' })))

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockIngestLead).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()

    expect(mockSubmissionInsert).toHaveBeenCalledTimes(1)
    const row = mockSubmissionInsert.mock.calls[0][0]
    expect(row.is_spam).toBe(true)
    expect(row.honeypot_triggered).toBe(true)
    expect(row.contact_id).toBeNull()
    expect(row.tenant_id).toBe(TENANT)
    expect(row.form_id).toBe(FORM_ID)
  })

  it('sub-2-second submit is flagged as spam', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })

    const res = await POST(
      jsonReq(
        happyPayload({
          // formLoadTime "now" → submissionTime ~0 ms ⇒ trips the 2 s gate
          formLoadTime: Date.now().toString(),
        })
      )
    )

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ success: true })
    expect(mockIngestLead).not.toHaveBeenCalled()
    expect(mockSubmissionInsert).toHaveBeenCalledTimes(1)
    expect(mockSubmissionInsert.mock.calls[0][0].is_spam).toBe(true)
  })
})

// ===========================================================================
// source_channel detection
// ===========================================================================

describe('POST /api/marketing/forms/submit — source_channel detection', () => {
  it('uses form_embedded for /forms/embed/ sourceUrl', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          sourceUrl: `https://dental-crm-nine.vercel.app/forms/embed/${FORM_ID}`,
        })
      )
    )

    expect(mockIngestLead.mock.calls[0][0].source_channel).toBe('form_embedded')
  })

  it('uses form_hosted_landing for /f/ sourceUrl', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          sourceUrl: `https://dental-crm-nine.vercel.app/f/test-slug`,
        })
      )
    )

    expect(mockIngestLead.mock.calls[0][0].source_channel).toBe('form_hosted_landing')
  })

  it('falls back to form_embedded for an unrecognised path', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          sourceUrl: 'https://practice.example.com/contact',
        })
      )
    )

    expect(mockIngestLead.mock.calls[0][0].source_channel).toBe('form_embedded')
  })
})

// ===========================================================================
// Click IDs + landing page URL forwarding
// ===========================================================================

describe('POST /api/marketing/forms/submit — click IDs and landing page URL', () => {
  it('forwards clickIds into IngestLeadInput.attribution', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          clickIds: {
            gclid: 'g-1',
            fbclid: 'f-1',
            msclkid: 'm-1',
            ttclid: 't-1',
          },
        })
      )
    )

    const arg = mockIngestLead.mock.calls[0][0]
    expect(arg.attribution.gclid).toBe('g-1')
    expect(arg.attribution.fbclid).toBe('f-1')
    expect(arg.attribution.msclkid).toBe('m-1')
    expect(arg.attribution.ttclid).toBe('t-1')
  })

  it('forwards landingPageUrl into IngestLeadInput.attribution.landing_page_url', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    const LANDING = 'https://practice.example.com/landing-page-from-document-referrer'
    await POST(jsonReq(happyPayload({ landingPageUrl: LANDING })))

    expect(mockIngestLead.mock.calls[0][0].attribution.landing_page_url).toBe(LANDING)
  })

  it('captures the full request envelope into raw_payload (replay material)', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          utmParams: { utm_source: 's', utm_campaign: 'c' },
          clickIds: { gclid: 'g-1' },
          landingPageUrl: 'https://landing/',
          sourceUrl: 'https://source/',
        })
      )
    )

    const arg = mockIngestLead.mock.calls[0][0]
    expect(arg.raw_payload.payload).toBeDefined()
    expect(arg.raw_payload.utmParams).toEqual({ utm_source: 's', utm_campaign: 'c' })
    expect(arg.raw_payload.clickIds).toEqual({ gclid: 'g-1' })
    expect(arg.raw_payload.landingPageUrl).toBe('https://landing/')
    expect(arg.raw_payload.sourceUrl).toBe('https://source/')
    expect(arg.raw_payload.formId).toBe(FORM_ID)
    expect(arg.raw_payload.formName).toBe('Test Contact Form')
    // GDPR consent record stamped onto raw_payload like
    // google-lead-form-adapter does — keeps the audit trail without a
    // schema change.
    expect(arg.raw_payload.__consent_record).toMatchObject({
      method: 'implied_inquiry',
      lawful_basis: 'legitimate_interests',
      text_version: 'form_implicit_v1',
      text: 'Submitted form: Test Contact Form',
    })
  })

  it('switches consent method/basis when payload.marketing_consent is true', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(
      jsonReq(
        happyPayload({
          payload: {
            email: 'consent@example.com',
            phone: '+447700900111',
            marketing_consent: true,
          },
        })
      )
    )

    const arg = mockIngestLead.mock.calls[0][0]
    expect(arg.contact.consents.marketing_consent).toBe(true)
    expect(arg.contact.consents.consent_method).toBe('form_checkbox')
    expect(arg.raw_payload.__consent_record).toMatchObject({
      method: 'form_checkbox',
      lawful_basis: 'consent',
    })
  })
})

// ===========================================================================
// marketing_form_submissions row mapping + response shape
// ===========================================================================

describe('POST /api/marketing/forms/submit — submissions row + response shape', () => {
  it('maps result.contact_id and dedup_decision="new" to contact_created=true', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(
      happyIngestResult({ dedup_decision: 'new', contact_id: 'fresh-contact' })
    )

    await POST(jsonReq(happyPayload()))

    expect(mockSubmissionInsert).toHaveBeenCalledTimes(1)
    const row = mockSubmissionInsert.mock.calls[0][0]
    expect(row.contact_id).toBe('fresh-contact')
    expect(row.contact_created).toBe(true)
    expect(row.contact_updated).toBe(false)
    expect(row.duplicate_submission).toBe(false)
    expect(row.is_spam).toBe(false)
    expect(row.tenant_id).toBe(TENANT)
    expect(row.form_id).toBe(FORM_ID)
  })

  it('maps dedup_decision="matched" to contact_updated=true (existing contact, attribution updated)', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(
      happyIngestResult({ dedup_decision: 'matched', contact_id: 'existing-contact' })
    )

    await POST(jsonReq(happyPayload()))

    const row = mockSubmissionInsert.mock.calls[0][0]
    expect(row.contact_created).toBe(false)
    expect(row.contact_updated).toBe(true)
  })

  it('returns the prompt §2.5 response shape: { contact_id, deal_id, is_new_contact, sla_due_at }', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(
      happyIngestResult({
        contact_id: 'c-resp',
        deal_id: 'd-resp',
        dedup_decision: 'new',
        sla: { due_at: '2026-05-10T00:00:00.000Z', minutes: 60, rule_source: 'system_default' },
      })
    )

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      contact_id: 'c-resp',
      deal_id: 'd-resp',
      is_new_contact: true,
      sla_due_at: '2026-05-10T00:00:00.000Z',
    })
  })

  it('increments the per-form counter on the happy path (best-effort)', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockIngestLead.mockResolvedValueOnce(happyIngestResult())

    await POST(jsonReq(happyPayload()))

    expect(mockRpc).toHaveBeenCalledWith('increment_form_submissions', { form_id: FORM_ID })
  })

  it('keeps marketing-flag gate intact (returns 403 when disabled)', async () => {
    mockFormLookupResult.mockResolvedValueOnce({ data: activeFormRow(), error: null })
    mockTenantLookupResult.mockResolvedValueOnce({
      data: { marketing_enabled: false },
      error: null,
    })

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(403)
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('returns 429 when the IP rate limiter rejects', async () => {
    mockCheckRateLimit.mockResolvedValueOnce({
      allowed: false,
      limit: 10,
      remaining: 0,
      resetTime: Date.now() + 60_000,
    })

    const res = await POST(jsonReq(happyPayload()))

    expect(res.status).toBe(429)
    // Form lookup must not happen once we already know we're throttled.
    expect(mockFormLookupResult).not.toHaveBeenCalled()
    expect(mockIngestLead).not.toHaveBeenCalled()
  })
})
