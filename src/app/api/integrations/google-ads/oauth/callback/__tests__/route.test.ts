/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — OAuth callback now redirects to
 * `/settings/integrations/google` instead of rendering HTML. One test per
 * branch from the prompt's redirect-URL table.
 *
 * The supabase service client and `fetch` are mocked at the module boundary
 * so we can exercise every branch without hitting the DB or Google.
 */

import { NextRequest } from 'next/server'

// ----- mocks -----------------------------------------------------------------

type MaybeSingleResult = {
  data:
    | {
        id: string
        tenant_id: string
        oauth_pending_state_expires_at: string | null
      }
    | null
  error: { message: string } | null
}

const mockMaybeSingle = jest.fn<Promise<MaybeSingleResult>, []>()
const mockEqIsActive = jest.fn(() => ({ maybeSingle: mockMaybeSingle }))
const mockEqState = jest.fn(() => ({ eq: mockEqIsActive }))
const mockSelect = jest.fn(() => ({ eq: mockEqState }))

const mockUpdateEq = jest.fn<Promise<{ error: { message: string } | null }>, []>()
const mockUpdate = jest.fn<{ eq: () => Promise<{ error: { message: string } | null }> }, [Record<string, unknown>]>(
  () => ({ eq: () => mockUpdateEq() })
)

const mockFrom = jest.fn(() => ({ select: mockSelect, update: mockUpdate }))

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: () => ({ from: mockFrom }),
}))

jest.mock('@/lib/crypto/integration-credentials', () => ({
  encryptIntegrationCredential: (s: string) => `enc:${s}`,
}))

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { GET } = require('../route')

// ----- helpers ---------------------------------------------------------------

const STATE = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'

function callbackReq(query: Record<string, string | undefined>): NextRequest {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined) params.set(k, v)
  }
  return new NextRequest(
    `http://localhost/api/integrations/google-ads/oauth/callback?${params.toString()}`,
    { method: 'GET' }
  )
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
  process.env.GOOGLE_OAUTH_CLIENT_ID = 'cid'
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = 'csec'
  mockUpdateEq.mockResolvedValue({ error: null })
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  jest.restoreAllMocks()
})

function locationOf(res: Response): URL {
  const loc = res.headers.get('location')
  if (!loc) throw new Error('no Location header')
  return new URL(loc)
}

// ----- tests -----------------------------------------------------------------

describe('GET /api/integrations/google-ads/oauth/callback', () => {
  it('redirects with status=connected on the happy path', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        tenant_id: TENANT,
        oauth_pending_state_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    })
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/adwords',
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const res = await GET(callbackReq({ code: 'authcode', state: STATE }))
    expect(res.status).toBe(302)
    const loc = locationOf(res)
    expect(loc.pathname).toBe('/settings/integrations/google')
    expect(loc.searchParams.get('status')).toBe('connected')
    expect(loc.searchParams.get('reason')).toBeNull()

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const patch = mockUpdate.mock.calls[0]![0]
    expect(patch.oauth_refresh_token_encrypted).toBe('enc:rt')
    expect(patch.oauth_scope).toBe('https://www.googleapis.com/auth/adwords')
    expect(patch.oauth_pending_state).toBeNull()
    expect(patch.oauth_pending_state_expires_at).toBeNull()
  })

  it('redirects with reason=expired when state is past TTL', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        tenant_id: TENANT,
        oauth_pending_state_expires_at: new Date(Date.now() - 60_000).toISOString(),
      },
      error: null,
    })

    const res = await GET(callbackReq({ code: 'c', state: STATE }))
    expect(res.status).toBe(302)
    const loc = locationOf(res)
    expect(loc.searchParams.get('status')).toBe('error')
    expect(loc.searchParams.get('reason')).toBe('expired')
  })

  it('redirects with reason=invalid_state when state lookup returns null', async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null })

    const res = await GET(callbackReq({ code: 'c', state: STATE }))
    expect(res.status).toBe(302)
    const loc = locationOf(res)
    expect(loc.searchParams.get('status')).toBe('error')
    expect(loc.searchParams.get('reason')).toBe('invalid_state')
  })

  it('redirects with reason=invalid_state when code or state missing', async () => {
    const res1 = await GET(callbackReq({ state: STATE }))
    expect(locationOf(res1).searchParams.get('reason')).toBe('invalid_state')
    const res2 = await GET(callbackReq({ code: 'c' }))
    expect(locationOf(res2).searchParams.get('reason')).toBe('invalid_state')
    expect(mockMaybeSingle).not.toHaveBeenCalled()
  })

  it('redirects with reason=oauth_failed when Google reports an error', async () => {
    const res = await GET(
      callbackReq({
        error: 'access_denied',
        error_description: 'sensitive details we should not leak',
        state: STATE,
      })
    )
    expect(res.status).toBe(302)
    const loc = locationOf(res)
    expect(loc.searchParams.get('reason')).toBe('oauth_failed')
    // Must NOT leak Google's error_description into the URL.
    expect(loc.search).not.toContain('sensitive')
  })

  it('redirects with reason=oauth_failed when token exchange returns non-2xx', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        tenant_id: TENANT,
        oauth_pending_state_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    })
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response('{"error":"invalid_grant"}', { status: 400 })
    )

    const res = await GET(callbackReq({ code: 'c', state: STATE }))
    expect(locationOf(res).searchParams.get('reason')).toBe('oauth_failed')
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('redirects with reason=unknown when persist update fails', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        tenant_id: TENANT,
        oauth_pending_state_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    })
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'at',
          refresh_token: 'rt',
          expires_in: 3599,
          scope: 's',
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    mockUpdateEq.mockResolvedValueOnce({ error: { message: 'db down' } })

    const res = await GET(callbackReq({ code: 'c', state: STATE }))
    expect(locationOf(res).searchParams.get('reason')).toBe('unknown')
  })

  it('redirects with reason=unknown when token response omits refresh_token', async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'cfg-1',
        tenant_id: TENANT,
        oauth_pending_state_expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
      error: null,
    })
    jest.spyOn(global, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          access_token: 'at',
          expires_in: 3599,
          scope: 's',
          token_type: 'Bearer',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    const res = await GET(callbackReq({ code: 'c', state: STATE }))
    expect(locationOf(res).searchParams.get('reason')).toBe('unknown')
  })
})
