/**
 * @jest-environment node
 *
 * Phase 2b.11.5b / 2b.11.5b.1 — PATCH /api/activities/[id] deal reassignment tests.
 * Audit writes go through logAuditServer (service role); tests assert real row shape.
 */

import { NextRequest } from 'next/server'
import { AuditLogWriteError } from '@/lib/auto-audit'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const OTHER_TENANT = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const USER = '224bdacf-dc6b-4b13-a9b8-f2f23fe08d53'
const ACTIVITY_ID = '11111111-1111-1111-1111-111111111111'
const DEAL_A = '22222222-2222-2222-2222-222222222222'
const DEAL_B = '33333333-3333-3333-3333-333333333333'
const CONTACT = '44444444-4444-4444-4444-444444444444'
const OTHER_CONTACT = '55555555-5555-5555-5555-555555555555'
const AUDIT_ROW_ID = '99999999-9999-9999-9999-999999999999'

let permissionGrant = true
let authError: { status: number; message: string } | null = null
let auditInsertFails = false

const tables = {
  activities: [
    {
      id: ACTIVITY_ID,
      tenant_id: TENANT,
      contact_id: CONTACT,
      deal_id: DEAL_A,
      location_id: null,
    },
  ] as Record<string, unknown>[],
  deals: [
    { id: DEAL_A, tenant_id: TENANT, contact_id: CONTACT, deleted_at: null },
    { id: DEAL_B, tenant_id: TENANT, contact_id: CONTACT, deleted_at: null },
    {
      id: '66666666-6666-6666-6666-666666666666',
      tenant_id: OTHER_TENANT,
      contact_id: CONTACT,
      deleted_at: null,
    },
    {
      id: '77777777-7777-7777-7777-777777777777',
      tenant_id: TENANT,
      contact_id: OTHER_CONTACT,
      deleted_at: null,
    },
  ] as Record<string, unknown>[],
  audit_trail: [] as Record<string, unknown>[],
}

const mockLogAuditServer = jest.fn()
const mockDeleteAuditRowServer = jest.fn()

jest.mock('@/lib/auto-audit', () => {
  const actual = jest.requireActual('@/lib/auto-audit')
  return {
    ...actual,
    logAuditServer: (...args: unknown[]) => mockLogAuditServer(...args),
    deleteAuditRowServer: (...args: unknown[]) => mockDeleteAuditRowServer(...args),
  }
})

jest.mock('@/lib/api/context', () => {
  const { ApiContextError } = jest.requireActual('@/lib/api/context')
  return {
    ApiContextError,
    getApiRequestContext: jest.fn(async () => {
      if (authError) throw new ApiContextError(authError.status, authError.message)
      return {
        supabase: makeSupabase(),
        user: { id: USER, email: 'test@example.com' },
        tenantId: TENANT,
        activeLocationId: null,
        membership: { id: 'm-1', role: 'owner', status: 'active', all_locations: true },
        accessibleLocationIds: null,
      }
    }),
  }
})

function makeSupabase() {
  return {
    rpc: async (name: string) => {
      if (name === 'user_has_permission') {
        return { data: permissionGrant, error: null }
      }
      return { data: null, error: null }
    },
    from(table: keyof typeof tables) {
      return makeBuilder(table)
    },
  }
}

function makeBuilder(table: keyof typeof tables) {
  const eqs: Array<[string, unknown]> = []
  let patch: Record<string, unknown> | null = null

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      eqs.push([col, val])
      return builder
    },
    update: (values: Record<string, unknown>) => {
      patch = values
      return builder
    },
    single: () => {
      const rows = filterRows(tables[table], eqs)
      if (patch) {
        for (const row of rows) Object.assign(row, patch)
      }
      return Promise.resolve({ data: rows[0] ?? null, error: rows[0] ? null : { code: 'PGRST116' } })
    },
    then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
      const rows = filterRows(tables[table], eqs)
      if (patch) {
        for (const row of rows) Object.assign(row, patch)
        return Promise.resolve({ data: rows[0] ?? null, error: null }).then(resolve)
      }
      return Promise.resolve({ data: rows, error: null }).then(resolve)
    },
  }
  return builder
}

function filterRows(rows: Record<string, unknown>[], eqs: Array<[string, unknown]>) {
  return rows.filter((row) => eqs.every(([col, val]) => row[col] === val))
}

function patchReq(body: Record<string, unknown>) {
  return new NextRequest(`http://localhost/api/activities/${ACTIVITY_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PATCH } = require('../route')

beforeEach(() => {
  permissionGrant = true
  authError = null
  auditInsertFails = false
  tables.activities[0].deal_id = DEAL_A
  tables.audit_trail.length = 0
  mockLogAuditServer.mockReset()
  mockDeleteAuditRowServer.mockReset()

  mockLogAuditServer.mockImplementation(async (params: Record<string, unknown>) => {
    if (auditInsertFails) {
      throw new AuditLogWriteError('test-internal-error-id', { message: 'simulated insert failure' })
    }
    const row = {
      id: AUDIT_ROW_ID,
      tenant_id: params.tenantId,
      user_id: params.userId,
      action_type: params.actionType,
      action_category: params.category,
      entity_type: params.entityType,
      entity_id: params.entityId,
      changed_fields: params.changedFields,
      before_state: params.beforeState,
      after_state: params.afterState,
    }
    tables.audit_trail.push(row)
    return AUDIT_ROW_ID
  })
})

describe('PATCH /api/activities/[id] — deal reassignment', () => {
  it('returns 401 when unauthenticated', async () => {
    authError = { status: 401, message: 'Unauthorized' }
    const res = await PATCH(patchReq({ deal_id: DEAL_B }), { params: { id: ACTIVITY_ID } })
    expect(res.status).toBe(401)
  })

  it('returns 403 when user lacks deals.edit permission', async () => {
    permissionGrant = false
    const res = await PATCH(patchReq({ deal_id: DEAL_B }), { params: { id: ACTIVITY_ID } })
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toBe('permission_denied')
  })

  it('reassigns deal A → deal B with 200 (audit before activity update)', async () => {
    const res = await PATCH(patchReq({ deal_id: DEAL_B }), { params: { id: ACTIVITY_ID } })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.activity.deal_id).toBe(DEAL_B)
    expect(tables.activities[0].deal_id).toBe(DEAL_B)
    expect(mockLogAuditServer).toHaveBeenCalledTimes(1)
  })

  it('writes audit_trail row with before/after deal_id via logAuditServer', async () => {
    await PATCH(patchReq({ deal_id: DEAL_B }), { params: { id: ACTIVITY_ID } })
    expect(mockLogAuditServer).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: TENANT,
        userId: USER,
        actionType: 'update',
        category: 'deal',
        entityType: 'activity',
        entityId: ACTIVITY_ID,
        changedFields: ['deal_id'],
        beforeState: { deal_id: DEAL_A },
        afterState: { deal_id: DEAL_B },
      })
    )
    expect(tables.audit_trail).toHaveLength(1)
    const row = tables.audit_trail[0]
    expect(row.entity_type).toBe('activity')
    expect(row.entity_id).toBe(ACTIVITY_ID)
    expect(row.changed_fields).toEqual(['deal_id'])
    expect(row.before_state).toEqual({ deal_id: DEAL_A })
    expect(row.after_state).toEqual({ deal_id: DEAL_B })
  })

  it('detaches deal (deal_id → null)', async () => {
    const res = await PATCH(patchReq({ deal_id: null }), { params: { id: ACTIVITY_ID } })
    expect(res.status).toBe(200)
    expect(tables.activities[0].deal_id).toBeNull()
    expect(tables.audit_trail[0].after_state).toEqual({ deal_id: null })
  })

  it('returns 500 audit_log_failed and does not change deal_id when audit insert fails', async () => {
    auditInsertFails = true
    const res = await PATCH(patchReq({ deal_id: DEAL_B }), { params: { id: ACTIVITY_ID } })
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.ok).toBe(false)
    expect(body.error).toBe('audit_log_failed')
    expect(body.internal_error_id).toBe('test-internal-error-id')
    expect(tables.activities[0].deal_id).toBe(DEAL_A)
    expect(tables.audit_trail).toHaveLength(0)
    expect(mockDeleteAuditRowServer).not.toHaveBeenCalled()
  })

  it('returns 400 when target deal is in a different tenant', async () => {
    const res = await PATCH(patchReq({ deal_id: '66666666-6666-6666-6666-666666666666' }), {
      params: { id: ACTIVITY_ID },
    })
    expect(res.status).toBe(400)
    expect(mockLogAuditServer).not.toHaveBeenCalled()
  })

  it('returns 400 when target deal belongs to a different contact', async () => {
    const res = await PATCH(patchReq({ deal_id: '77777777-7777-7777-7777-777777777777' }), {
      params: { id: ACTIVITY_ID },
    })
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('different contact')
    expect(mockLogAuditServer).not.toHaveBeenCalled()
  })
})
