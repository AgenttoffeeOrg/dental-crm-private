/**
 * @jest-environment node
 *
 * Phase 2b.13 — /api/settings/practice-brain route tests.
 *
 * Focus areas:
 *   1. Auth gate (401 on unauthenticated, 403 on cross-tenant body).
 *   2. Audit-first invariant: logAuditServer is called BEFORE the upsert,
 *      and a db failure triggers the compensating delete.
 *   3. PATCH validation rejects malformed payloads.
 *   4. PATCH with no actual changes returns 200 without writing an audit row.
 *
 * The real audit_trail row is asserted by the agent-handleable operator
 * gate at the end of the phase (see docs/2b/2b-13-changes.md).
 */

import { NextRequest, NextResponse } from 'next/server'

const mockRequire = jest.fn()
const mockAssertBodyTenantMatches = jest.fn()
const mockLogAuditServer = jest.fn()
const mockDeleteAuditRowServer = jest.fn()
const mockLoadPracticeBrain = jest.fn()

class FakeAuthApiError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message)
    this.name = 'AuthApiError'
  }
}

jest.mock('@/lib/auth/api-auth-helpers', () => ({
  AuthApiError: FakeAuthApiError,
  requireAuthenticatedTenantUser: (...args: unknown[]) => mockRequire(...args),
  assertBodyTenantMatches: (...args: unknown[]) => mockAssertBodyTenantMatches(...args),
  authErrorResponse: (err: unknown) => {
    if (err instanceof FakeAuthApiError) {
      return NextResponse.json(
        { error: err.code, message: err.message },
        { status: err.status }
      )
    }
    return NextResponse.json({ error: 'internal_error' }, { status: 500 })
  },
}))

jest.mock('@/lib/auto-audit', () => {
  class FakeAuditLogWriteError extends Error {
    constructor(public internalErrorId: string, public causeDetail: unknown) {
      super('audit_trail insert failed')
      this.name = 'AuditLogWriteError'
    }
  }
  return {
    AuditLogWriteError: FakeAuditLogWriteError,
    logAuditServer: (...args: unknown[]) => mockLogAuditServer(...args),
    deleteAuditRowServer: (...args: unknown[]) => mockDeleteAuditRowServer(...args),
  }
})

jest.mock('@/lib/automations/practice-brain', () => ({
  loadPracticeBrain: (...args: unknown[]) => mockLoadPracticeBrain(...args),
  emptyPracticeBrain: (tenantId: string) => ({
    tenant_id: tenantId,
    brand_voice: null,
    practice_description: null,
    services_offered: [],
    pricing: [],
    opening_hours: {},
    faqs: [],
    escalation_rules: null,
    additional_instructions: null,
    updated_at: null,
  }),
}))

let upsertResolvedValue: { data: Record<string, unknown> | null; error: unknown } = {
  data: null,
  error: null,
}
let lastUpsertArg: Record<string, unknown> | null = null
let callOrder: string[] = []

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => ({
    from(table: string) {
      expect(table).toBe('tenant_ai_context')
      return {
        upsert: jest.fn((arg: Record<string, unknown>) => {
          callOrder.push('upsert')
          lastUpsertArg = arg
          return {
            select() {
              return {
                single: jest.fn().mockResolvedValue(upsertResolvedValue),
              }
            },
          }
        }),
      }
    },
  })),
}))

import { GET, PATCH } from '../route'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'

function makePatchReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/settings/practice-brain', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeGetReq(): NextRequest {
  return new NextRequest('http://localhost/api/settings/practice-brain', {
    method: 'GET',
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  callOrder = []
  upsertResolvedValue = {
    data: {
      tenant_id: TENANT,
      brand_voice: 'Warm.',
      practice_description: null,
      services_offered: [],
      pricing: [],
      opening_hours: {},
      faqs: [],
      escalation_rules: null,
      additional_instructions: null,
      updated_at: '2026-05-21T12:00:00.000Z',
    },
    error: null,
  }
  lastUpsertArg = null
  mockRequire.mockResolvedValue({
    userId: USER,
    tenantId: TENANT,
    email: 'me@example.com',
    role: 'owner',
    entitlements: [],
  })
  mockLoadPracticeBrain.mockResolvedValue({
    tenant_id: TENANT,
    brand_voice: null,
    practice_description: null,
    services_offered: [],
    pricing: [],
    opening_hours: {},
    faqs: [],
    escalation_rules: null,
    additional_instructions: null,
    updated_at: null,
  })
  mockLogAuditServer.mockImplementation(async () => {
    callOrder.push('audit')
    return 'audit-id-1'
  })
})

describe('GET /api/settings/practice-brain', () => {
  it('returns 401 when unauthenticated', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(401, 'unauthenticated', 'Login required')
    )
    const res = await GET(makeGetReq())
    expect(res.status).toBe(401)
  })

  it('returns the loaded brain', async () => {
    mockLoadPracticeBrain.mockResolvedValueOnce({
      tenant_id: TENANT,
      brand_voice: 'Warm.',
      practice_description: null,
      services_offered: [],
      pricing: [],
      opening_hours: {},
      faqs: [],
      escalation_rules: null,
      additional_instructions: null,
      updated_at: null,
    })
    const res = await GET(makeGetReq())
    expect(res.status).toBe(200)
    const json = (await res.json()) as { brain: { brand_voice: string | null } }
    expect(json.brain.brand_voice).toBe('Warm.')
  })
})

describe('PATCH /api/settings/practice-brain', () => {
  it('returns 401 when unauthenticated — no upsert, no audit', async () => {
    mockRequire.mockRejectedValueOnce(
      new FakeAuthApiError(401, 'unauthenticated', 'Login required')
    )
    const res = await PATCH(makePatchReq({ brand_voice: 'Warm.' }))
    expect(res.status).toBe(401)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
    expect(callOrder).not.toContain('upsert')
  })

  it('returns 403 on tenant_id mismatch in body', async () => {
    mockAssertBodyTenantMatches.mockImplementationOnce(() => {
      throw new FakeAuthApiError(403, 'tenant_mismatch', 'mismatch')
    })
    const res = await PATCH(makePatchReq({ tenant_id: OTHER_TENANT, brand_voice: 'Warm.' }))
    expect(res.status).toBe(403)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
  })

  it('returns 400 on invalid payload (empty service name)', async () => {
    const res = await PATCH(
      makePatchReq({ services_offered: [{ name: '' }] })
    )
    expect(res.status).toBe(400)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
  })

  it('returns 400 when body has no recognised fields', async () => {
    const res = await PATCH(makePatchReq({ unknown_field: 'x' }))
    expect(res.status).toBe(400)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
  })

  it('returns 200 with no audit row when nothing actually changed', async () => {
    mockLoadPracticeBrain.mockResolvedValueOnce({
      tenant_id: TENANT,
      brand_voice: 'Warm.',
      practice_description: null,
      services_offered: [],
      pricing: [],
      opening_hours: {},
      faqs: [],
      escalation_rules: null,
      additional_instructions: null,
      updated_at: null,
    })
    const res = await PATCH(makePatchReq({ brand_voice: 'Warm.' }))
    expect(res.status).toBe(200)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
    expect(callOrder).not.toContain('upsert')
  })

  it('writes audit BEFORE upsert on a real change', async () => {
    const res = await PATCH(makePatchReq({ brand_voice: 'Warm and reassuring.' }))
    expect(res.status).toBe(200)
    expect(callOrder).toEqual(['audit', 'upsert'])
    expect(mockLogAuditServer).toHaveBeenCalledTimes(1)
    const auditArgs = mockLogAuditServer.mock.calls[0][0]
    expect(auditArgs.actionType).toBe('update')
    expect(auditArgs.category).toBe('setting')
    expect(auditArgs.entityType).toBe('tenant_ai_context')
    expect(auditArgs.tenantId).toBe(TENANT)
    expect(auditArgs.changedFields).toContain('brand_voice')
    expect(lastUpsertArg).toMatchObject({
      tenant_id: TENANT,
      brand_voice: 'Warm and reassuring.',
    })
  })

  it('aborts with 500 when audit insert fails (no upsert)', async () => {
    const { AuditLogWriteError } = jest.requireMock('@/lib/auto-audit') as {
      AuditLogWriteError: new (id: string, cause: unknown) => Error
    }
    mockLogAuditServer.mockImplementationOnce(async () => {
      callOrder.push('audit')
      throw new AuditLogWriteError('err-id', null)
    })
    const res = await PATCH(makePatchReq({ brand_voice: 'Warm.' }))
    expect(res.status).toBe(500)
    const json = (await res.json()) as { error: string }
    expect(json.error).toBe('audit_log_failed')
    expect(callOrder).toEqual(['audit']) // upsert never ran
  })

  it('compensating-deletes the audit row when upsert fails', async () => {
    upsertResolvedValue = { data: null, error: { message: 'db boom' } }
    const res = await PATCH(makePatchReq({ brand_voice: 'Warm.' }))
    expect(res.status).toBe(500)
    expect(mockDeleteAuditRowServer).toHaveBeenCalledWith('audit-id-1', TENANT)
  })
})
