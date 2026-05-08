/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — targets route tests.
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

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'

interface SbSpy {
  from: jest.Mock
  builder: {
    select: jest.Mock
    eq: jest.Mock
    maybeSingle: jest.Mock
    update: jest.Mock
  }
  finalUpdateEq: jest.Mock
}

function makeSupabase(): SbSpy {
  const finalUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq: finalUpdateEq }))
  const builder = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({
      data: { id: 'cfg-1', oauth_refresh_token_encrypted: 'enc:rt' },
      error: null,
    }),
    update,
  } as SbSpy['builder']
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  const from = jest.fn(() => builder)
  return { from, builder, finalUpdateEq }
}

function makeReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/integrations/google-ads/targets', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/integrations/google-ads/targets', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await POST(makeReq({}))
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
    const res = await POST(
      makeReq({
        customer_id: '1675268286',
        conversion_action_resource_name:
          'customers/1675268286/conversionActions/7600535419',
      })
    )
    expect(res.status).toBe(403)
  })

  it.each([
    ['missing fields', {}],
    ['non-digit customer_id', {
      customer_id: 'abc',
      conversion_action_resource_name: 'customers/1/conversionActions/2',
    }],
    ['malformed conversion_action_resource_name', {
      customer_id: '1675268286',
      conversion_action_resource_name: 'not-a-resource-name',
    }],
    ['non-digit login_customer_id', {
      customer_id: '1675268286',
      conversion_action_resource_name: 'customers/1675268286/conversionActions/7600535419',
      login_customer_id: 'abc',
    }],
  ])('returns 400 invalid_input when %s', async (_label, body) => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(makeReq(body))
    expect(res.status).toBe(400)
  })

  it('returns 400 invalid_json when body is not JSON', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(makeReq('this is not json'))
    expect(res.status).toBe(400)
  })

  it('returns 400 oauth_not_connected when refresh token missing', async () => {
    const sb = makeSupabase()
    sb.builder.maybeSingle.mockResolvedValueOnce({
      data: { id: 'cfg-1', oauth_refresh_token_encrypted: null },
      error: null,
    })
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(
      makeReq({
        customer_id: '1675268286',
        conversion_action_resource_name:
          'customers/1675268286/conversionActions/7600535419',
      })
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe('oauth_not_connected')
  })

  it('happy path persists targets and returns ok', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(
      makeReq({
        customer_id: '1675268286',
        conversion_action_resource_name:
          'customers/1675268286/conversionActions/7600535419',
        login_customer_id: '9374708799',
      })
    )
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('ok')
    const patch = sb.builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.customer_id).toBe('1675268286')
    expect(patch.login_customer_id).toBe('9374708799')
    expect(patch.conversion_action_resource_name).toBe(
      'customers/1675268286/conversionActions/7600535419'
    )
  })

  it('happy path with no manager account stores login_customer_id as null', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(
      makeReq({
        customer_id: '1675268286',
        conversion_action_resource_name:
          'customers/1675268286/conversionActions/7600535419',
      })
    )
    expect(res.status).toBe(200)
    const patch = sb.builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.login_customer_id).toBeNull()
  })
})
