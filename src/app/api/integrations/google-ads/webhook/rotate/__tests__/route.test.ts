/**
 * @jest-environment node
 *
 * Phase 2b.1.b.2 — webhook rotate route tests.
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

interface FakeBuilder {
  select: jest.Mock
  eq: jest.Mock
  maybeSingle: jest.Mock
  update: jest.Mock
  insert: jest.Mock
  single: jest.Mock
}

interface SupabaseSpy {
  from: jest.Mock
  builder: FakeBuilder
  finalUpdateEq: jest.Mock
  insertedValues: { capture: Record<string, unknown> | null }
}

function makeSupabase(): SupabaseSpy {
  const finalUpdateEq = jest.fn().mockResolvedValue({ error: null })
  const insertedValues = { capture: null as Record<string, unknown> | null }

  const single = jest.fn().mockResolvedValue({
    data: { webhook_key: 'new-key-uuid' },
    error: null,
  })
  const insert = jest.fn((values: Record<string, unknown>) => {
    insertedValues.capture = values
    return {
      select: () => ({ single }),
    }
  })
  const update = jest.fn(() => ({ eq: () => ({ eq: finalUpdateEq }) }))

  const builder: FakeBuilder = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    update,
    insert,
    single,
  }
  builder.select.mockReturnValue(builder)
  builder.eq.mockReturnValue(builder)

  const from = jest.fn(() => builder)
  return { from, builder, finalUpdateEq, insertedValues }
}

function makeReq(): NextRequest {
  return new NextRequest('http://localhost/api/integrations/google-ads/webhook/rotate', {
    method: 'POST',
  })
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
})
afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

describe('POST /api/integrations/google-ads/webhook/rotate', () => {
  it('returns 401 when not authenticated', async () => {
    const { ApiContextError } = jest.requireActual('@/lib/api/context')
    mockGetApiRequestContext.mockRejectedValueOnce(new ApiContextError(401, 'Unauthorized'))
    const res = await POST(makeReq())
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
    const res = await POST(makeReq())
    expect(res.status).toBe(403)
    expect(from).not.toHaveBeenCalled()
  })

  it('first-time setup: no previous row, inserts a clean active row', async () => {
    const sb = makeSupabase()
    sb.builder.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'u-1' },
      tenantId: TENANT,
      membership: { role: 'admin' },
    })

    const res = await POST(makeReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.webhook_key).toBe('new-key-uuid')
    expect(body.webhook_url).toBe('http://localhost:3000/api/webhooks/google-lead-form')

    const inserted = sb.insertedValues.capture as Record<string, unknown>
    expect(inserted.tenant_id).toBe(TENANT)
    expect(inserted.is_active).toBe(true)
    expect(inserted.created_by).toBe('u-1')
    expect(inserted.oauth_refresh_token_encrypted).toBeNull()
    expect(inserted.customer_id).toBeNull()
  })

  it('rotation: previous active rows OAuth + targets carry over to the new row', async () => {
    const sb = makeSupabase()
    sb.builder.maybeSingle.mockResolvedValueOnce({
      data: {
        oauth_refresh_token_encrypted: 'enc:rt',
        oauth_scope: 'https://www.googleapis.com/auth/adwords',
        oauth_connected_at: '2026-05-06T10:00:00Z',
        oauth_connected_by_user_id: 'old-user',
        customer_id: '1675268286',
        login_customer_id: '9374708799',
        conversion_action_resource_name:
          'customers/1675268286/conversionActions/7600535419',
      },
      error: null,
    })
    mockGetApiRequestContext.mockResolvedValueOnce({
      supabase: { from: sb.from },
      user: { id: 'new-user' },
      tenantId: TENANT,
      membership: { role: 'owner' },
    })

    const res = await POST(makeReq())
    expect(res.status).toBe(200)

    const inserted = sb.insertedValues.capture as Record<string, unknown>
    expect(inserted.tenant_id).toBe(TENANT)
    expect(inserted.is_active).toBe(true)
    expect(inserted.created_by).toBe('new-user')
    expect(inserted.oauth_refresh_token_encrypted).toBe('enc:rt')
    expect(inserted.oauth_scope).toBe('https://www.googleapis.com/auth/adwords')
    expect(inserted.customer_id).toBe('1675268286')
    expect(inserted.login_customer_id).toBe('9374708799')
    expect(inserted.conversion_action_resource_name).toBe(
      'customers/1675268286/conversionActions/7600535419'
    )

    expect(sb.builder.update).toHaveBeenCalledWith({ is_active: false })
  })
})
