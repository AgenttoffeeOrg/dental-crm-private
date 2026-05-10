/**
 * @jest-environment node
 *
 * Phase 2b.4 — SMS inbound webhook route tests.
 *
 * Mirrors `src/app/api/webhooks/whatsapp/__tests__/route.test.ts` 1-to-1
 * with SMS-specific helper imports. Helpers from `@/lib/whatsapp/twilio-
 * signature` and `@/lib/sms/inbound` are mocked at the module boundary;
 * supabase service client is a no-op.
 */

import { NextRequest } from 'next/server'

// ----- mocks -----------------------------------------------------------------

const mockVerifyTwilioSignature = jest.fn()
jest.mock('@/lib/whatsapp/twilio-signature', () => ({
  __esModule: true,
  verifyTwilioSignature: (...args: unknown[]) => mockVerifyTwilioSignature(...args),
}))

const mockParseTwilioInboundSmsMessage = jest.fn()
const mockResolveTenantBySmsNumber = jest.fn()
const mockIsSmsAlreadyProcessed = jest.fn()
const mockProcessSmsInboundMessage = jest.fn()

jest.mock('@/lib/sms/inbound', () => ({
  __esModule: true,
  parseTwilioInboundSmsMessage: (...args: unknown[]) =>
    mockParseTwilioInboundSmsMessage(...args),
  resolveTenantBySmsNumber: (...args: unknown[]) =>
    mockResolveTenantBySmsNumber(...args),
  isSmsAlreadyProcessed: (...args: unknown[]) =>
    mockIsSmsAlreadyProcessed(...args),
  processSmsInboundMessage: (...args: unknown[]) =>
    mockProcessSmsInboundMessage(...args),
}))

const mockSupabaseAdmin = { from: jest.fn() }
jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => mockSupabaseAdmin,
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST, GET } = require('../route')

// ----- helpers ---------------------------------------------------------------

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const MESSAGE_SID = 'SMabc123def456'
const FROM_PHONE = '+447700900000'
const TO_PHONE = '+447782218044'

const VALID_FORM = [
  'AccountSid=ACxxx',
  'Body=Hello',
  `From=${encodeURIComponent(FROM_PHONE)}`,
  `MessageSid=${MESSAGE_SID}`,
  'NumMedia=0',
  `To=${encodeURIComponent(TO_PHONE)}`,
].join('&')

function makeReq(body: string, headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('https://dental-crm-nine.vercel.app/api/webhooks/sms', {
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
  fromPhoneE164: FROM_PHONE,
  toPhoneE164: TO_PHONE,
  body: 'Hello',
  numMedia: 0,
  mediaUrls: [],
  rawPayload: {
    MessageSid: MESSAGE_SID,
    From: FROM_PHONE,
    To: TO_PHONE,
    Body: 'Hello',
  },
}

beforeEach(() => {
  jest.clearAllMocks()
  // Default: parser returns a well-formed message; tests override per case.
  mockParseTwilioInboundSmsMessage.mockReturnValue(PARSED_MESSAGE)
})

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------

describe('POST /api/webhooks/sms', () => {
  it('returns 401 with no body when X-Twilio-Signature header is missing', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('missing_header')
    const res = await POST(makeReq(VALID_FORM, {}))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockResolveTenantBySmsNumber).not.toHaveBeenCalled()
  })

  it('returns 401 with no body on invalid signature', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('invalid_signature')
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockResolveTenantBySmsNumber).not.toHaveBeenCalled()
  })

  it('returns 400 when MessageSid / From / To are missing after parse', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockParseTwilioInboundSmsMessage.mockReturnValueOnce({
      ...PARSED_MESSAGE,
      messageSid: '',
    })
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(400)
    expect(mockResolveTenantBySmsNumber).not.toHaveBeenCalled()
  })

  it('returns 401 when no tenant matches the To-number', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce(null)

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(401)
    expect(await res.text()).toBe('')
    expect(mockIsSmsAlreadyProcessed).not.toHaveBeenCalled()
    expect(mockProcessSmsInboundMessage).not.toHaveBeenCalled()
  })

  it('returns 200 idempotent on already-processed MessageSid (pre-check short-circuit)', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(true)

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'ok', idempotent: true })
    expect(mockProcessSmsInboundMessage).not.toHaveBeenCalled()
  })

  it('returns 200 with all IDs on the happy path — new contact', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockResolvedValueOnce({
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

  it('returns 200 on the happy path — existing contact (was_new_contact=false)', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockResolvedValueOnce({
      contactId: 'c-1',
      dealId: 'd-reused',
      attributionTouchpointId: 'tp-2',
      activityId: 'a-2',
      wasNewContact: false,
    })

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.was_new_contact).toBe(false)
    expect(body.deal_id).toBe('d-reused')
  })

  it('returns 200 idempotent when the unique-index race fires past the pre-check (with index name)', async () => {
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockRejectedValueOnce({
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
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockRejectedValueOnce({
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
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockRejectedValueOnce(new Error('boom'))

    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(500)
    expect(await res.text()).toBe('')
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('does NOT treat a non-23505 error as idempotent (e.g. permission denied)', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined)
    mockVerifyTwilioSignature.mockReturnValueOnce('valid')
    mockResolveTenantBySmsNumber.mockResolvedValueOnce({
      tenantId: TENANT_ID,
      tenantName: 'Test Tenant',
    })
    mockIsSmsAlreadyProcessed.mockResolvedValueOnce(false)
    mockProcessSmsInboundMessage.mockRejectedValueOnce({
      code: '42501',
      message: 'permission denied for table attribution_touchpoints',
    })
    const res = await POST(makeReq(VALID_FORM))
    expect(res.status).toBe(500)
    errorSpy.mockRestore()
  })
})

describe('GET /api/webhooks/sms', () => {
  it('returns 200 with a small status payload (health check)', async () => {
    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ready')
    expect(body.version).toBe('phase-2b.4')
    expect(body.endpoint).toBe('sms-webhook')
  })
})
