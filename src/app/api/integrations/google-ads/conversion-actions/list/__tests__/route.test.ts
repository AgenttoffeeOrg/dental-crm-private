/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — conversion-actions/list route tests.
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
const mockListConversionActions = jest.fn()

jest.mock('@/lib/conversions/google-ads-client', () => {
  const actual = jest.requireActual('@/lib/conversions/google-ads-client')
  return {
    ...actual,
    loadGoogleAdsOAuthOnly: (...args: unknown[]) => mockLoadOAuthOnly(...args),
    GoogleAdsClient: class {
      listConversionActions = mockListConversionActions
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

function makeReq(query: Record<string, string | undefined> = {}): NextRequest {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v)
  }
  return new NextRequest(
    `http://localhost/api/integrations/google-ads/conversion-actions/list?${params.toString()}`,
    { method: 'GET' }
  )
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/integrations/google-ads/conversion-actions/list', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await GET(makeReq({ customer_id: '1675268286' }))
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
    const res = await GET(makeReq({ customer_id: '1675268286' }))
    expect(res.status).toBe(403)
  })

  it.each([
    ['missing customer_id', {}],
    ['non-digit customer_id', { customer_id: 'abc' }],
    ['non-digit login_customer_id', { customer_id: '1675268286', login_customer_id: 'abc' }],
  ])('returns 400 invalid_customer_id when %s', async (_label, query) => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await GET(makeReq(query))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('invalid_customer_id')
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
    const res = await GET(makeReq({ customer_id: '1675268286' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('oauth_not_connected')
  })

  it('returns the conversion-action list on the happy path; passes login_customer_id through', async () => {
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
    mockListConversionActions.mockResolvedValueOnce([
      {
        id: '7600535419',
        resource_name: 'customers/1675268286/conversionActions/7600535419',
        name: 'Lead (test)',
        category: 'LEAD',
        status: 'ENABLED',
      },
    ])

    const res = await GET(
      makeReq({ customer_id: '1675268286', login_customer_id: '9374708799' })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.conversion_actions).toHaveLength(1)
    expect(mockListConversionActions).toHaveBeenCalledWith('1675268286', '9374708799')
  })

  it('returns 400 oauth_revoked and nulls out OAuth fields on 401 from Google', async () => {
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
    mockListConversionActions.mockRejectedValueOnce(new GoogleOAuthRevokedError())

    const res = await GET(makeReq({ customer_id: '1675268286' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('oauth_revoked')
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
    mockListConversionActions.mockRejectedValueOnce(new GoogleAdsApiError(500, 'INTERNAL'))
    const res = await GET(makeReq({ customer_id: '1675268286' }))
    expect(res.status).toBe(500)
  })
})
