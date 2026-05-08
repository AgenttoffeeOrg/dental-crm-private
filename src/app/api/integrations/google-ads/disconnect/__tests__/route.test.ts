/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — disconnect route tests.
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
    maybeSingle: jest.fn().mockResolvedValue({ data: { id: 'cfg-1' }, error: null }),
    update,
  } as SbSpy['builder']
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)
  const from = jest.fn(() => builder)
  return { from, builder, finalUpdateEq }
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/integrations/google-ads/disconnect', {
    method: 'POST',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/integrations/google-ads/disconnect', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await POST(makeReq())
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
    const res = await POST(makeReq())
    expect(res.status).toBe(403)
    expect(sb.from).not.toHaveBeenCalled()
  })

  it('idempotent: returns 200 + already_disconnected:true when no active row', async () => {
    const sb = makeSupabase()
    sb.builder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'owner' },
    })
    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.already_disconnected).toBe(true)
    expect(sb.builder.update).not.toHaveBeenCalled()
  })

  it('happy path nulls out OAuth + targets but does NOT touch webhook_key/is_active', async () => {
    const sb = makeSupabase()
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })
    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const patch = sb.builder.update.mock.calls[0][0] as Record<string, unknown>
    expect(patch.oauth_refresh_token_encrypted).toBeNull()
    expect(patch.oauth_scope).toBeNull()
    expect(patch.oauth_connected_at).toBeNull()
    expect(patch.oauth_connected_by_user_id).toBeNull()
    expect(patch.customer_id).toBeNull()
    expect(patch.login_customer_id).toBeNull()
    expect(patch.conversion_action_resource_name).toBeNull()
    // Crucially we do NOT touch these:
    expect(patch.webhook_key).toBeUndefined()
    expect(patch.is_active).toBeUndefined()
  })
})
