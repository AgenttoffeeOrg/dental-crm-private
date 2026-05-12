/**
 * @jest-environment node
 *
 * Phase 2b.7 — settings/sms auth gate tests. Mocks the auth helper
 * boundary and the Supabase service client so this stays a unit test.
 * 5 cases — settings routes are NOT rate-limited per locked decision §0.3.
 */

/* eslint-disable @typescript-eslint/no-require-imports */
import { NextRequest } from 'next/server'

const mockRequire = jest.fn()
const mockAssert = jest.fn()

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

const mockSingle = jest.fn()
const mockSelect = jest.fn().mockImplementation(() => ({ single: mockSingle }))
const mockEq = jest.fn().mockImplementation(() => ({ select: mockSelect }))
const mockUpdate = jest.fn().mockImplementation(() => ({ eq: mockEq }))
const mockFrom = jest.fn().mockImplementation(() => ({ update: mockUpdate }))

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PATCH } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/settings/sms', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const validBody = {
  sms_provider: 'twilio',
  sms_api_key: 'AC_test',
  sms_api_secret: 'secret_test',
  sms_from_number: '+15551234567',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
  mockSingle.mockResolvedValue({ data: { id: TENANT }, error: null })
})

describe('PATCH /api/settings/sms — auth gate', () => {
  it('returns 401 when no session', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(401, 'unauthenticated', 'Login required')
    )
    const res = await PATCH(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('unauthenticated')
    expect(body.message).toBe('Login required')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 403 (entitlement_missing) when helper rejects on entitlement', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(403, 'entitlement_missing', 'Tenant does not have sms enabled')
    )
    const res = await PATCH(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('entitlement_missing')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 403 (tenant_mismatch) when body tenant_id differs', async () => {
    mockAssert.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'mismatch')
    })
    const res = await PATCH(makeReq({ ...validBody, tenant_id: OTHER_TENANT }))
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('tenant_mismatch')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('returns 200 and pins WHERE id to authenticated tenant when body tenant_id matches', async () => {
    const res = await PATCH(makeReq({ ...validBody, tenant_id: TENANT }))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockEq).toHaveBeenCalledWith('id', TENANT)
    const updatePayload = mockUpdate.mock.calls[0][0]
    expect(updatePayload).not.toHaveProperty('tenant_id')
    expect(updatePayload.sms_provider).toBe('twilio')
    expect(updatePayload.sms_from_number).toBe('+15551234567')
  })

  it('returns 200 when body has no tenant_id and still pins WHERE id to authenticated tenant', async () => {
    const res = await PATCH(makeReq(validBody))
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockEq).toHaveBeenCalledWith('id', TENANT)
  })
})
