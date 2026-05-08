/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — initiate route tests.
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
const { GET } = require('../route')

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'

interface FakeBuilder {
  select: jest.Mock
  eq: jest.Mock
  maybeSingle: jest.Mock
  update: jest.Mock
}

function makeSupabase(): {
  from: jest.Mock
  builder: FakeBuilder
  finalUpdateEq: jest.Mock
} {
  const finalUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const update = jest.fn(() => ({ eq: finalUpdateEq }))
  const builder: FakeBuilder = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'cfg-1' }, error: null }),
    update,
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  const from = jest.fn(() => builder)
  return { from, builder, finalUpdateEq }
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/integrations/google-ads/oauth/initiate', {
    method: 'GET',
  })
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid'
})
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('GET /api/integrations/google-ads/oauth/initiate', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await GET(makeReq())
    expect(res.status).toBe(401)
  })

  it('returns 403 when role is not in the management list', async () => {
    const { from } = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'staff' },
    })
    const res = await GET(makeReq())
    expect(res.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })

  it('returns 400 webhook_not_generated_yet when no active config row', async () => {
    const { from, builder } = makeSupabase()
    builder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await GET(makeReq())
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBe('webhook_not_generated_yet')
  })

  it('persists oauth_pending_state and 302s to Google consent URL on the happy path', async () => {
    const { from, builder, finalUpdateEq } = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'owner' },
    })

    const res = await GET(makeReq())
    expect(res.status).toBe(302)

    const loc = res.headers.get('location') ?? ''
    expect(loc.startsWith('https://accounts.google.com/o/oauth2/v2/auth?')).toBe(true)
    const url = new URL(loc)
    expect(url.searchParams.get('client_id')).toBe('cid')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/adwords')
    expect(url.searchParams.get('access_type')).toBe('offline')
    expect(url.searchParams.get('prompt')).toBe('consent')
    expect(url.searchParams.get('redirect_uri')).toBe(
      'http://localhost:3000/api/integrations/google-ads/oauth/callback'
    )
    expect(url.searchParams.get('state')).toMatch(/^[a-f0-9]{64}$/)

    expect(builder.update).toHaveBeenCalledTimes(1)
    const patch = builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(typeof patch.oauth_pending_state).toBe('string')
    expect(typeof patch.oauth_pending_state_expires_at).toBe('string')
    expect(finalUpdateEq).toHaveBeenCalledTimes(1)
  })
})
