/**
 * @jest-environment node
 *
 * Phase 2b.5 — initiate-call auth gate tests.
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

const mockDispatchVoice = jest.fn()
jest.mock('@/lib/communications/dispatcher', () => ({
  dispatchVoiceCall: (...args: unknown[]) => mockDispatchVoice(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/communications/initiate-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = { to: '+447400000000', contact_id: 'c-1', deal_id: 'd-1' }

beforeEach(() => {
  jest.clearAllMocks()
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
  mockDispatchVoice.mockResolvedValue({
    success: true,
    activityId: 'a-1',
    callSid: 'CA-1',
    status: 'queued',
    aiPurpose: 'Inbound',
    aiSummary: 'queued',
  })
})

describe('POST /api/communications/initiate-call — auth gate', () => {
  it('returns 401 when no session', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'Login required'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(401)
    expect(mockDispatchVoice).not.toHaveBeenCalled()
  })

  it('returns 403 (entitlement_missing) when helper rejects on entitlement', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(403, 'entitlement_missing', 'no voice')
    )
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(403)
  })

  it('returns 403 (tenant_mismatch) when body tenant_id differs', async () => {
    mockAssert.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'mismatch')
    })
    const res = await POST(makeReq({ ...validBody, tenant_id: OTHER_TENANT }))
    expect(res.status).toBe(403)
    expect(mockDispatchVoice).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockRateLimit.mockRejectedValueOnce(new FakeAuthApiError(429, 'rate_limit_exceeded', 'too many'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(429)
    expect(mockDispatchVoice).not.toHaveBeenCalled()
  })

  it('returns 200 and dispatches with the authenticated tenant_id', async () => {
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(200)
    expect(mockDispatchVoice.mock.calls[0][0].context.tenantId).toBe(TENANT)
  })

  it('returns 200 when body has no tenant_id', async () => {
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(mockDispatchVoice.mock.calls[0][0].context.tenantId).toBe(TENANT)
  })
})
