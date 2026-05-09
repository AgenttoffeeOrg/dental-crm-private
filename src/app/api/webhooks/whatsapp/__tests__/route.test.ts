/**
 * @jest-environment node
 *
 * Phase 2b.2.a — WhatsApp inbound webhook route tests.
 *
 * Helpers from `@/lib/whatsapp/twilio-signature` and `@/lib/whatsapp/inbound`
 * are mocked at the module boundary; supabase service client is a noop. This
 * test exercises every branch in the route handler defined by the §4 table.
 */

import { NextRequest } from 'next/server'

// ----- mocks -----------------------------------------------------------------

const mockVerifyTwilioSignature = jest.fn()
jest.mock('@/lib/whatsapp/twilio-signature', () => ({
  __esModule: true,
  verifyTwilioSignature: (...args: unknown[]) => mockVerifyTwilioSignature(...args),
}))

const mockParseTwilioInboundMessage = jest.fn()
const mockResolveTenantByWhatsappNumber = jest.fn()
const mockIsMessageAlreadyProcessed = jest.fn()
const mockProcessWhatsappInboundMessage = jest.fn()

jest.mock('@/lib/whatsapp/inbound', () => ({
  __esModule: true,
  parseTwilioInboundMessage: (...args: unknown[]) => mockParseTwilioInboundMessage(...args),
  resolveTenantByWhatsappNumber: (...args: unknown[]) =>
    mockResolveTenantByWhatsappNumber(...args),
  isMessageAlreadyProcessed: (...args: unknown[]) =>
    mockIsMessageAlreadyProcessed(...args),
  processWhatsappInboundMessage: (...args: unknown[]) =>
    mockProcessWhatsappInboundMessage(...args),
}))

const mockSupabaseAdmin = { from: jest.fn() }
jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => mockSupabaseAdmin,
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST, GET } = require('../route')

// ----- helpers ---------------------------------------------------------------

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const MESSAGE_SID = 'SM21e529441bf3ed5b583a6be82303b50c'

const VALID_FORM = [
  'AccountSid=ACxxx',
  'Body=Hello',
  'From=whatsapp%3A%2B919916558958',
  `MessageSid=${MESSAGE_SID}`,
  'NumMedia=0',
  'ProfileName=Deepak',
  'To=whatsapp%3A%2B14155238886',
].join('&')

function makeReq(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://dental-crm-nine.vercel.app/api/webhooks/whatsapp', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'x-twilio-signature': 'fake-but-present-signature',
      ...headers,
    },
    body,
  })
}

const PARSED_MESSAGE = {
  messageSid: MESSAGE_SID,
  from: '+919916558958',
  to: '+14155238886',
  body: 'Hello',
  profileName: 'Deepak',
  waId: '919916558958',
  numMedia: 0,
  mediaUrls: [],
  rawPayload: { MessageSid: MESSAGE_SID, From: 'whatsapp:+919916558958', To: 'whatsapp:+14155238886', Body: 'Hello' },
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: parser returns a well-formed message; tests override per case.
  mockParseTwilioInboundMessage.mockReturnValue(PARSED_MESSAGE)
})

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('POST /api/webhooks/whatsapp', () => {
  it('returns 401 with no body when X-Twilio-Signature header is missing', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('missing_header')
    const res = await POST(makeReq(VALID_FORM, {}))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockResolveTenantByWhatsappNumber).not.toHaveBeenCalled()
  })

  it('returns 401 with no body on invalid signature', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('invalid_signature')
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockResolveTenantByWhatsappNumber).not.toHaveBeenCalled()
  })

  it('returns 400 when MessageSid / From / To are missing after parse', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockParseTwilioInboundMessage.mockReturnValueOnce({
      ...PARSED_MESSAGE,
      messageSid: '',
    })
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(400)
    expect(mockResolveTenantByWhatsappNumber).not.toHaveBeenCalled()
  })

  it('returns 401 when no tenant matches the To-number', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce(null)

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockIsMessageAlreadyProcessed).not.toHaveBeenCalled()
    expect(mockProcessWhatsappInboundMessage).not.toHaveBeenCalled()
  })

  it('returns 200 idempotent on already-processed MessageSid (pre-check short-circuit)', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(true)

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', idempotent: true })
    expect(mockProcessWhatsappInboundMessage).not.toHaveBeenCalled()
  })

  it('returns 200 with all IDs on the happy path — new contact', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockResolvedValueOnce({
      contactId: 'c-1',
      dealId: 'd-1',
      attributionTouchpointId: 'tp-1',
      activityId: 'a-1',
      wasNewContact: true,
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: 'ok',
      contact_id: 'c-1',
      deal_id: 'd-1',
      attribution_touchpoint_id: 'tp-1',
      activity_id: 'a-1',
      was_new_contact: true,
    })
  })

  it('returns 200 with the reused deal_id when the contact already has an open deal (Phase 2b.2.a.3)', async () => {
    // The route is glue — the engine-level reuse fix lives in
    // `findReusableOpenDeal` / `createDealForLead` and the orchestration
    // helper. From the route's POV, "reuse" looks identical to "create new"
    // for a matched contact: a single dealId is returned. This test locks in
    // the route's surfacing behaviour for the reuse path so a future refactor
    // of the response envelope doesn't silently drop the deal_id.
    const REUSED_DEAL_ID = 'deal-reused-123'
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockResolvedValueOnce({
      contactId: 'c-existing',
      dealId: REUSED_DEAL_ID,
      attributionTouchpointId: 'tp-reuse-1',
      activityId: 'a-reuse-1',
      wasNewContact: false,
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      status: 'ok',
      contact_id: 'c-existing',
      deal_id: REUSED_DEAL_ID,
      attribution_touchpoint_id: 'tp-reuse-1',
      activity_id: 'a-reuse-1',
      was_new_contact: false,
    })
  })

  it('returns 200 on the happy path — existing contact (was_new_contact=false)', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockResolvedValueOnce({
      contactId: 'c-1',
      dealId: null,
      attributionTouchpointId: 'tp-2',
      activityId: 'a-2',
      wasNewContact: false,
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.was_new_contact).toBe(false)
    expect(body.deal_id).toBeNull()
  })

  it('returns 200 idempotent when the unique-index race fires past the pre-check', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockRejectedValueOnce({
      code: '23505',
      message:
        'duplicate key value violates unique constraint "idx_attribution_touchpoints_external_msg_uniq"',
      details: 'Key (tenant_id, source_channel, external_message_id)=…',
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', idempotent: true })
  })

  it('returns 200 idempotent on a 23505 that mentions the column even without the index name', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockRejectedValueOnce({
      code: '23505',
      message: 'duplicate key value violates unique constraint',
      details: 'Key (external_message_id)=(SMxxx) already exists.',
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
  })

  it('returns 500 with no body on unexpected processing errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockRejectedValueOnce(new Error('boom'))

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('')
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('does NOT treat a non-23505 error as idempotent (e.g. permission denied)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantByWhatsappNumber.mockResolvedValueOnce({ tenantId: TENANT_ID })
    mockIsMessageAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessWhatsappInboundMessage.mockRejectedValueOnce({
      code: '42501',
      message: 'permission denied for table attribution_touchpoints',
    })
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(500)
    errorSpy.mockRestore()
  })
})

describe('GET /api/webhooks/whatsapp', () => {
  it('returns 200 with a small status payload (health check)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ready')
    expect(body.version).toBe('phase-2b.2.a')
  })
})
