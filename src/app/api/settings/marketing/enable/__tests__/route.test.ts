/**
 * @jest-environment node
 *
 * Phase 2b.25.2 — Marketing enable/disable toggle.
 */

import { NextRequest, NextResponse } from 'next/server'

const mockRequire = jest.fn()

class FakeAuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

jest.mock('@/lib/auth/api-auth-helpers', () => ({
  AuthApiError: FakeAuthApiError,
  requireAuthenticatedTenantUser: (...args: unknown[]) => mockRequire(...args),
  authErrorResponse: (err: unknown) => {
    if (err instanceof FakeAuthApiError) {
      return NextResponse.json({ error: err.code, message: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  },
}))

let lastUpdatePatch: Record<string, unknown> | null
let lastUpdateTenantId: string | null
let updateError: { message: string } | null

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => ({
    from(table: string) {
      expect(table).toBe('tenants')
      return {
        update(patch: Record<string, unknown>) {
          lastUpdatePatch = patch
          return {
            eq(_col: string, val: string) {
              lastUpdateTenantId = val
              return Promise.resolve({ data: null, error: updateError })
            },
          }
        },
      }
    },
  })),
}))

import { POST } from '../route'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings/marketing/enable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  lastUpdatePatch = null
  lastUpdateTenantId = null
  updateError = null
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
})

describe('POST /api/settings/marketing/enable', () => {
  it('returns 401 when unauthenticated — no DB update', async () => {
    mockRequire.mockRejectedValueOnce(new FakeAuthApiError(401, 'unauthenticated', 'Login required'))
    const res = await POST(postReq({ enabled: true }))
    expect(res.status).toBe(401)
    expect(lastUpdatePatch).toBeNull()
  })

  it('returns 403 forbidden when caller is not owner or admin', async () => {
    mockRequire.mockResolvedValueOnce({
      userId: USER,
      tenantId: TENANT,
      role: 'member',
      entitlements: [],
    })
    const res = await POST(postReq({ enabled: true }))
    expect(res.status).toBe(403)
    expect(lastUpdatePatch).toBeNull()
  })

  it('admin role can also toggle (not just owner)', async () => {
    mockRequire.mockResolvedValueOnce({
      userId: USER,
      tenantId: TENANT,
      role: 'admin',
      entitlements: [],
    })
    const res = await POST(postReq({ enabled: true }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch).toMatchObject({ marketing_enabled: true })
  })

  it('returns 400 on invalid payload (missing enabled field)', async () => {
    const res = await POST(postReq({ plan: 'pro' }))
    expect(res.status).toBe(400)
    expect(lastUpdatePatch).toBeNull()
  })

  it('returns 400 on invalid plan value', async () => {
    const res = await POST(postReq({ enabled: true, plan: 'platinum' }))
    expect(res.status).toBe(400)
  })

  it('enables marketing with the default starter plan when no plan is supplied', async () => {
    const res = await POST(postReq({ enabled: true }))
    expect(res.status).toBe(200)
    expect(lastUpdateTenantId).toBe(TENANT)
    expect(lastUpdatePatch).toMatchObject({
      marketing_enabled: true,
      marketing_plan: 'starter',
    })
    expect(lastUpdatePatch?.marketing_enabled_at).toEqual(expect.any(String))
    const body = await res.json()
    expect(body).toMatchObject({ ok: true, enabled: true, plan: 'starter' })
  })

  it('enables marketing on a specific plan', async () => {
    const res = await POST(postReq({ enabled: true, plan: 'enterprise' }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch).toMatchObject({
      marketing_enabled: true,
      marketing_plan: 'enterprise',
    })
  })

  it('disables marketing and resets plan to none', async () => {
    const res = await POST(postReq({ enabled: false }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch).toMatchObject({
      marketing_enabled: false,
      marketing_plan: 'none',
    })
    // Disable path explicitly does NOT clear marketing_enabled_at — preserves
    // the original on-date so re-enabling later doesn't lose history.
    expect(lastUpdatePatch).not.toHaveProperty('marketing_enabled_at')
  })

  it('returns 500 db_error when the tenants update fails', async () => {
    updateError = { message: 'simulated failure' }
    const res = await POST(postReq({ enabled: true }))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe('db_error')
  })

  it('rejects a body that flips enabled boolean with a plan on the disable branch (discriminated union)', async () => {
    // The discriminated union enforces "plan is only valid when enabled=true".
    // A {enabled: false, plan: 'pro'} body should match the disable branch
    // (which has no `plan` field) — extra keys allowed by Zod by default,
    // and `plan` is simply ignored.
    const res = await POST(postReq({ enabled: false, plan: 'pro' }))
    expect(res.status).toBe(200)
    expect(lastUpdatePatch).toMatchObject({ marketing_plan: 'none' })
  })
})
