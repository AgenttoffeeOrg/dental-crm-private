/**
 * @jest-environment node
 *
 * Phase 2b.5 — send-sms-v2 auth gate tests.
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

const mockSmsSend = jest.fn()
jest.mock('@/lib/sms-service', () => ({
  smsService: {
    initialize: jest.fn().mockResolvedValue(undefined),
    send: (...args: unknown[]) => mockSmsSend(...args),
  },
}))

jest.mock('@/lib/conversions/first-response-detector', () => ({
  detectAndFireFirstResponse: jest.fn().mockResolvedValue(undefined),
}))

const mockTenantSingle = jest.fn()
const mockActivityInsert = jest.fn().mockResolvedValue({ data: null, error: null })

function makeSupabaseStub() {
  // tenants -> select -> eq -> single, activities -> insert
  return {
    from: jest.fn((table: string) => {
      if (table === 'tenants') {
        return {
          select: jest.fn(() => ({
            eq: jest.fn(() => ({ single: mockTenantSingle })),
          })),
        }
      }
      if (table === 'activities') {
        return { insert: mockActivityInsert }
      }
      throw new Error(`unexpected from(${table})`)
    }),
  }
}

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => makeSupabaseStub(),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/communications/send-sms-v2', {
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
  mockTenantSingle.mockResolvedValue({
    data: {
      sms_provider: 'twilio',
      sms_api_key: 'k',
      sms_api_secret: 's',
      sms_from_number: '+447100000000',
    },
    error: null,
  })
  mockSmsSend.mockResolvedValue({ messageId: 'sm-1' })
})

describe('POST /api/communications/send-sms-v2 — auth gate', () => {
  it('returns 401 when no session', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'Login required'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(401)
    expect(mockSmsSend).not.toHaveBeenCalled()
  })

  it('returns 403 (entitlement_missing) when helper rejects on entitlement', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(403, 'entitlement_missing', 'Tenant does not have sms enabled')
    )
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('entitlement_missing')
  })

  it('returns 403 (tenant_mismatch) when body tenant_id differs', async () => {
    mockAssert.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'mismatch')
    })
    const res = await POST(makeReq({ ...validBody, tenant_id: OTHER_TENANT }))
    expect(res.status).toBe(403)
    expect((await res.json()).error).toBe('tenant_mismatch')
    expect(mockSmsSend).not.toHaveBeenCalled()
  })

  it('returns 429 when rate limit exceeded', async () => {
    mockRateLimit.mockRejectedValueOnce(new FakeAuthApiError(429, 'rate_limit_exceeded', 'too many'))
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(429)
    expect(mockSmsSend).not.toHaveBeenCalled()
  })

  it('returns 200 and uses the authenticated tenant_id for the tenants lookup', async () => {
    const res = await POST(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(200)
    expect(mockSmsSend).toHaveBeenCalledTimes(1)
  })

  it('returns 200 when body has no tenant_id', async () => {
    const res = await POST(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(mockSmsSend).toHaveBeenCalledTimes(1)
  })
})
