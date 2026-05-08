/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — customers/list route tests.
 */

import { NextRequest } from 'next/server'

const mockGetApiRequestContext = jest.fn()
jest.mock('@/lib/api/context', () => {
  const actual = jest.requireActual('@/lib/api/context')
  return {
    ...actual,
    getApiRequestContext: (...args: unknown[]) => mockGetApiRequestContext(...args),
  }
})

const mockLoadOAuthOnly = jest.fn()
const mockListAccessibleCustomers = jest.fn()

jest.mock('@/lib/conversions/google-ads-client', () => {
  const actual = jest.requireActual('@/lib/conversions/google-ads-client')
  return {
    ...actual,
    loadGoogleAdsOAuthOnly: (...args: unknown[]) => mockLoadOAuthOnly(...args),
    GoogleAdsClient: class {
      // mirror the surface we use; all behaviour is on the mock fn above
      listAccessibleCustomers = mockListAccessibleCustomers
    },
  }
})

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET } = require('../route')
const {
  GoogleOAuthRevokedError,
  GoogleAdsApiError,
} = require('@/lib/conversions/google-ads-client')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'

interface SbSpy {
  from: jest.Mock
  finalEq: jest.Mock
}

function makeSupabase(): SbSpy {
  const finalEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({
    eq: () => ({ eq: finalEq }),
  }))
  const from = jest.fn(() => ({ update }))
  return { from, finalEq }
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/integrations/google-ads/customers/list', {
    method: 'GET',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/integrations/google-ads/customers/list', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not in the management list', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'staff' },
    })
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
    expect(mockLoadOAuthOnly).not.toHaveBeenCalled()
  })

  it('returns 400 oauth_not_connected when no OAuth on file', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    mockLoadOAuthOnly.mockResolvedValueOnce(null)
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('oauth_not_connected')
  })

  it('returns the customer list on the happy path', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    mockLoadOAuthOnly.mockResolvedValueOnce({
      oauth_refresh_token_encrypted: 'enc:rt',
      login_customer_id: null,
    })
    mockListAccessibleCustomers.mockResolvedValueOnce([
      { customer_id: '1675268286', resource_name: 'customers/1675268286' },
    ])

    const res = await GET(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.customers).toEqual([
      { customer_id: '1675268286', resource_name: 'customers/1675268286' },
    ])
  })

  it('returns 400 oauth_revoked AND nulls out the OAuth fields when Google returns 401', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    mockLoadOAuthOnly.mockResolvedValueOnce({
      oauth_refresh_token_encrypted: 'enc:rt',
      login_customer_id: null,
    })
    mockListAccessibleCustomers.mockRejectedValueOnce(new GoogleOAuthRevokedError())

    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('oauth_revoked')
    // Verify the null-out path ran (one update against google_lead_form_configs).
    expect(sb.from).toHaveBeenCalledWith('google_lead_form_configs')
    expect(sb.finalEq).toHaveBeenCalled()
  })

  it('returns 500 google_api_error on other Google failures', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    mockLoadOAuthOnly.mockResolvedValueOnce({
      oauth_refresh_token_encrypted: 'enc:rt',
      login_customer_id: null,
    })
    mockListAccessibleCustomers.mockRejectedValueOnce(
      new GoogleAdsApiError(500, 'INTERNAL')
    )
    const res = await GET(makeReq())
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('google_api_error')
  })
})
