/**
 * @jest-environment node
 *
 * Phase 2b.5 — send-sms (v1) auth gate tests.
 */

import { NextRequest } from 'next/server'

const mockRequire = jest.fn()
const mockAssert = jest.fn()
const mockRateLimit = jest.fn()

class FakeAuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

jest.mock('@/lib/auth/api-auth-helpers', () => {
  const { NextResponse } = require('next/server')
  return {
    AuthApiError: FakeAuthApiError,
    requireAuthenticatedTenantUser: (...args: unknown[]) => mockRequire(...args),
    assertBodyTenantMatches: (...args: unknown[]) => mockAssert(...args),
    enforceOutboundRateLimit: (...args: unknown[]) => mockRateLimit(...args),
    authErrorResponse: (err: unknown) => {
      if (err instanceof FakeAuthApiError) {
        return NextResponse.json(
          { error: err.code, message: err.message },
          { status: err.status }
        )
      }
      return NextResponse.json({ error: 'internal_error' }, { status: 500 })
    },
  }
})

const mockDispatchSms = jest.fn()
jest.mock('@/lib/communications/dispatcher', () => ({
  dispatchSms: (...args: unknown[]) => mockDispatchSms(...args),
  inferSmsPurpose: () => 'Quick Message',
}))

jest.mock('@/lib/queues/queue-manager', () => ({
  queueManager: { isEnabled: () => false },
}))
jest.mock('@/lib/queues/communication-queue', () => ({
  enqueueCommunication: jest.fn(),
  registerCommunicationQueue: jest.fn(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/communications/send-sms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { to: '+447400000000', message: 'hi from the test', contact_id: 'c-1', deal_id: 'd-1' }

beforeEach(() => {
  jest.clearAllMocks()
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
  mockDispatchSms.mockResolvedValue({
    activityId: 'a-1',
    externalId: 'ex-1',
    status: 'sent',
    aiPurpose: 'Quick',
    aiOutcome: 'ok',
    aiSummary: 'sent',
  })
})

describe('POST /api/communications/send-sms — auth gate', () => {
  it('returns 401 when no session', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'Login required'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(401)
    expect((await res.json()).error).toBe('unauthenticated')
    expect(mockDispatchSms).not.toHaveBeenCalled()
  })

  it('returns 403 (entitlement_missing) when helper rejects on entitlement', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(403, 'entitlement_missing', 'Tenant does not have sms enabled')
    )
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('entitlement_missing')
    expect(mockDispatchSms).not.toHaveBeenCalled()
  })

  it('returns 403 (tenant_mismatch) when body tenant_id differs', async () => {
    mockAssert.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'mismatch')
    })
    const res = await POST(makeReq({ ...validBody, tenant_id: OTHER_TENANT }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('tenant_mismatch')
    expect(mockDispatchSms).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockRateLimit.mockRejectedValueOnce(new FakeAuthApiError(429, 'rate_limit_exceeded', 'too many'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(429)
    expect((await res.json()).error).toBe('rate_limit_exceeded')
    expect(mockDispatchSms).not.toHaveBeenCalled()
  })

  it('returns 200 and dispatches with the authenticated tenant_id', async () => {
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(200)
    expect(mockDispatchSms.mock.calls[0][0].context.tenantId).toBe(TENANT)
    expect(mockDispatchSms.mock.calls[0][0].context.userId).toBe(USER)
  })

  it('returns 200 when body has no tenant_id', async () => {
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(mockDispatchSms.mock.calls[0][0].context.tenantId).toBe(TENANT)
  })
})

describe('POST /api/communications/send-sms — friendly error body', () => {
  it('returns friendly error in body when dispatcher throws a friendly Error', async () => {
    mockDispatchSms.mockRejectedValueOnce(
      new Error('Send failed — invalid SMS credentials')
    )
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Send failed — invalid SMS credentials')
    expect(body.details).toBeUndefined()
  })

  it('returns generic error when dispatcher throws an unsafe message', async () => {
    mockDispatchSms.mockRejectedValueOnce(new Error('database connection failed'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('Internal server error')
    expect(body.details).toBeUndefined()
  })
})
