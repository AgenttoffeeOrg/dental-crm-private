/**
 * @jest-environment node
 *
 * Phase 2b.1.a — webhook route handler unit tests.
 *
 * The supabase service client and `ingestLead` are mocked at the module
 * boundary so we can exercise every response branch without hitting the DB.
 *
 * Cases covered (mirror Task 6.2 in the prompt):
 *   1. 400 on malformed JSON
 *   2. 400 on missing required fields
 *   3. 401 on unknown webhook key (config lookup returns null)
 *   4. 401 on inactive config (route filter excludes; lookup returns null)
 *   5. 500 on supabase config-lookup error
 *   6. 400 on IngestLeadValidationError
 *   7. 200 on happy path with correct response shape
 *   8. 200 on duplicate lead_id (idempotent_replay short-circuit)
 *   9. 405 on GET
 */

import { NextRequest } from 'next/server'

// ----- mocks -----------------------------------------------------------------
// Mock the supabase server module before importing the route.

type MaybeSingleResult = {
  data: { tenant_id: string; is_active: boolean } | null
  error: { message: string } | null
}

const mockMaybeSingle = jest.fn<Promise<MaybeSingleResult>, []>()
const mockEqIsActive = jest.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockEqWebhookKey = jest.fn(() => ({ eq: mockEqIsActive }))
const mockSelect = jest.fn(() => ({ eq: mockEqWebhookKey }))
const mockFrom = jest.fn(() => ({ select: mockSelect }))

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

// Re-export the real IngestLeadValidationError so `instanceof` works.
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
const { POST, GET } = require('../route')

// ----- helpers ---------------------------------------------------------------

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const KEY = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function jsonReq(body: unknown, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/google-lead-form', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

function rawReq(rawBody: string): NextRequest {
  return new NextRequest('http://localhost/api/webhooks/google-lead-form', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: rawBody,
  })
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    lead_id: 'test-lead-001',
    api_version: '1.0',
    form_id: 9876543210,
    google_key: KEY,
    user_column_data: [
      { column_id: 'EMAIL', string_value: 'unit@test.com' },
      { column_id: 'PHONE_NUMBER', string_value: '+447700900100' },
      { column_id: 'FULL_NAME', string_value: 'Unit Test' },
    ],
    gcl_id: 'gclid-x',
    ...overrides,
  }
}

const okConfig = {
  data: { tenant_id: TENANT, is_active: true },
  error: null,
} as const

beforeEach(() => {
  jest.clearAllMocks()
})

// ----- tests -----------------------------------------------------------------

describe('POST /api/webhooks/google-lead-form', () => {
  it('400 on malformed JSON', async () => {
    const res = await POST(rawReq('this is not json'))
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it.each([
    ['missing google_key', { google_key: undefined }],
    ['missing lead_id', { lead_id: undefined }],
    ['missing form_id', { form_id: undefined }],
    ['non-array user_column_data', { user_column_data: 'oops' as unknown }],
  ])('400 when %s', async (_label, override) => {
    const res = await POST(jsonReq(validPayload(override)))
    expect(res.status).toBe(400)
    expect(mockFrom).not.toHaveBeenCalled()
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('401 on unknown webhook key (config row not found)', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(401)
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('401 on inactive config (filter is_active=true returns null)', async () => {
    // Same as "unknown key" branch from the route's POV: the eq(is_active,
    // true) filter strips inactive rows so maybeSingle resolves to null.
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })
    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(401)
    expect(mockEqIsActive).toHaveBeenCalled()
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('500 on supabase config-lookup error', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection lost' },
    })
    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(500)
    expect(mockIngestLead).not.toHaveBeenCalled()
  })

  it('400 on IngestLeadValidationError (no identity)', async () => {
    mockMaybeSingle.mockResolvedValueOnce(okConfig)
    mockIngestLead.mockRejectedValueOnce(
      new IngestLeadValidationError(
        'no_identity',
        'At least one of contact.email, contact.phone, or channel_identifier is required'
      )
    )
    const res = await POST(
      jsonReq(validPayload({ user_column_data: [] }))
    )
    expect(res.status).toBe(400)
    expect(mockIngestLead).toHaveBeenCalledTimes(1)
  })

  it('500 on unexpected ingest failure (Google retries on 5xx)', async () => {
    mockMaybeSingle.mockResolvedValueOnce(okConfig)
    mockIngestLead.mockRejectedValueOnce(new Error('db down'))
    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(500)
  })

  it('200 happy path: returns {status, lead_id, contact_id, deal_id}', async () => {
    mockMaybeSingle.mockResolvedValueOnce(okConfig)
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'act-1',
      deal_id: 'deal-1',
      dedup_decision: 'new',
      dedup_signals: {
        email_match: false,
        phone_match: false,
        channel_identifier_match: false,
      },
      sla: null,
      routing_log_id: null,
    })

    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      status: 'ok',
      lead_id: 'test-lead-001',
      contact_id: 'contact-1',
      deal_id: 'deal-1',
    })

    // Verify the engine was called with our adapter shape + idempotency key.
    const arg = mockIngestLead.mock.calls[0][0]
    expect(arg.tenant_id).toBe(TENANT)
    expect(arg.source_channel).toBe('google_lead_form')
    expect(arg.event_id).toBe('google-lead:9876543210:test-lead-001')
    expect(arg.contact.email).toBe('unit@test.com')
    expect(arg.contact.phone).toBe('+447700900100')
    expect(arg.attribution.gclid).toBe('gclid-x')
  })

  it('200 + returns the reused deal_id when the contact already has an open deal (Phase 2b.2.a.3)', async () => {
    // The route is glue over `ingestLead`. The engine-level reuse fix in
    // `findReusableOpenDeal` / `createDealForLead` makes ingestLead return
    // the existing open deal id rather than inserting a new one. From the
    // route's POV the response shape is unchanged — `deal_id` carries the
    // reused id. This test locks in that surfacing for the inbound
    // Google Lead Form path so a future refactor doesn't drop the field.
    const REUSED_DEAL_ID = 'deal-reused-via-google-form'
    mockMaybeSingle.mockResolvedValueOnce(okConfig)
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'contact-returning',
      attribution_touchpoint_id: 'tp-google-reuse',
      activity_id: 'act-google-reuse',
      deal_id: REUSED_DEAL_ID,
      dedup_decision: 'matched',
      dedup_signals: {
        email_match: true,
        phone_match: false,
        channel_identifier_match: false,
      },
      sla: null,
      routing_log_id: null,
    })

    const res = await POST(jsonReq(validPayload()))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({
      status: 'ok',
      lead_id: 'test-lead-001',
      contact_id: 'contact-returning',
      deal_id: REUSED_DEAL_ID,
    })
  })

  it('200 + tags is_test on raw_payload when payload.is_test is true', async () => {
    mockMaybeSingle.mockResolvedValueOnce(okConfig)
    mockIngestLead.mockResolvedValueOnce({
      contact_id: 'c2',
      attribution_touchpoint_id: 't2',
      activity_id: 'a2',
      deal_id: null,
      dedup_decision: 'new',
      dedup_signals: {
        email_match: false,
        phone_match: false,
        channel_identifier_match: false,
      },
      sla: null,
      routing_log_id: null,
    })

    const res = await POST(jsonReq(validPayload({ is_test: true })))
    expect(res.status).toBe(200)
    const arg = mockIngestLead.mock.calls[0][0]
    expect(arg.raw_payload.__is_test).toBe(true)
  })

  it('200 on duplicate lead_id (idempotent_replay short-circuit)', async () => {
    mockMaybeSingle.mockResolvedValue(okConfig)
    mockIngestLead.mockResolvedValue({
      contact_id: 'contact-dup',
      attribution_touchpoint_id: 'tp-dup',
      activity_id: 'act-dup',
      deal_id: 'deal-dup',
      dedup_decision: 'matched',
      dedup_signals: {
        email_match: false,
        phone_match: false,
        channel_identifier_match: false,
      },
      sla: null,
      idempotent_replay: true,
      routing_log_id: null,
    })

    const r1 = await POST(jsonReq(validPayload()))
    const r2 = await POST(jsonReq(validPayload()))
    expect(r1.status).toBe(200)
    expect(r2.status).toBe(200)
    expect(mockIngestLead).toHaveBeenCalledTimes(2)
    // Same event_id on both calls: the engine's UNIQUE constraint on
    // attribution_touchpoints.event_id guarantees no duplicate write.
    expect(mockIngestLead.mock.calls[0][0].event_id).toBe(
      mockIngestLead.mock.calls[1][0].event_id
    )
  })
})

describe('GET /api/webhooks/google-lead-form', () => {
  it('returns 405', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })
})
