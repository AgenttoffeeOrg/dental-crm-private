/**
 * @jest-environment node
 *
 * Phase 2a.8 \u2014 Treatment offerings settings API tests.
 *
 * Strategy: a tiny in-memory Supabase fake for the four tables touched
 * (treatment_types, practice_treatment_offerings, pipelines, pipeline_stages),
 * plus a stubbed `user_has_permission` RPC. We mount each route handler
 * directly and assert the response status / body / DB-side mutations.
 *
 * Mocks `@/lib/api/context` so we don't need a real auth token; tests pass
 * `tenantId` and `user.id` straight in.
 */

import { GET, POST } from '@/app/api/settings/treatment-offerings/route'
import { PATCH, DELETE } from '@/app/api/settings/treatment-offerings/[id]/route'
import { POST as TOGGLE } from '@/app/api/settings/treatment-offerings/toggle/route'

// ---------------------------------------------------------------------------
// In-memory Supabase fake
// ---------------------------------------------------------------------------

interface Row {
  [k: string]: unknown
}

const tables = {
  treatment_types: [] as Row[],
  practice_treatment_offerings: [] as Row[],
  pipelines: [] as Row[],
  pipeline_stages: [] as Row[],
}

function reset() {
  tables.treatment_types.length = 0
  tables.practice_treatment_offerings.length = 0
  tables.pipelines.length = 0
  tables.pipeline_stages.length = 0
}

let permissionGrant = true
function setPermission(v: boolean) {
  permissionGrant = v
}

function makeBuilder(table: keyof typeof tables) {
  let kind: 'select' | 'insert' | 'update' | null = null
  let pendingValues: Row | Row[] | null = null
  let pendingPatch: Row | null = null
  const eqs: Array<[string, unknown]> = []
  const isNullCols: string[] = []
  let limit: number | null = null

  const matches = (row: Row) => {
    for (const [col, val] of eqs) if (row[col] !== val) return false
    for (const col of isNullCols) {
      if (row[col] !== null && row[col] !== undefined) return false
    }
    return true
  }

  const filterRows = () => tables[table].filter(matches)

  const result = (data: unknown, error: unknown = null) => Promise.resolve({ data, error })

  const builder: any = {
    select(_cols: string) {
      if (kind === null) kind = 'select'
      return builder
    },
    insert(values: Row | Row[]) {
      kind = 'insert'
      pendingValues = values
      return builder
    },
    update(patch: Row) {
      kind = 'update'
      pendingPatch = patch
      return builder
    },
    eq(col: string, val: unknown) {
      eqs.push([col, val])
      return builder
    },
    is(col: string, val: unknown) {
      if (val === null) isNullCols.push(col)
      return builder
    },
    order() {
      return builder
    },
    limit(n: number) {
      limit = n
      return builder
    },
    maybeSingle() {
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        return result(rows[0] ?? null)
      }
      const rows = filterRows()
      return result(rows[0] ?? null)
    },
    single() {
      if (kind === 'insert') {
        const v = Array.isArray(pendingValues) ? pendingValues[0] : (pendingValues as Row)
        const inserted: Row = { id: `gen-${tables[table].length + 1}`, ...v }
        tables[table].push(inserted)
        return result(inserted)
      }
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        return result(rows[0] ?? null, rows[0] ? null : { message: 'not found' })
      }
      const rows = filterRows()
      return result(rows[0] ?? null, rows[0] ? null : { message: 'not found' })
    },
    then(resolve: (v: unknown) => void) {
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        resolve({ data: rows, error: null })
        return
      }
      const rows = filterRows()
      const out = limit ? rows.slice(0, limit) : rows
      resolve({ data: out, error: null })
    },
  }

  return builder
}

const fakeService = {
  from: (table: string) => makeBuilder(table as keyof typeof tables),
  rpc: (_name: string, _args: unknown) =>
    Promise.resolve({ data: permissionGrant, error: null }),
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('@/lib/supabase-server', () => ({
  createServiceClient: jest.fn(() => fakeService),
  createServerSupabaseClient: jest.fn(),
  createClient: jest.fn(),
}))

jest.mock('@/lib/api/context', () => {
  const actual = jest.requireActual('@/lib/api/context')
  return {
    ...actual,
    getApiRequestContext: jest.fn(async () => ({
      supabase: fakeService,
      user: { id: 'user-test-1', email: 'test@example.com' },
      tenantId: TENANT_ID,
      activeLocationId: null,
      membership: { id: 'm1', role: 'manager', status: 'active', all_locations: true },
      accessibleLocationIds: null,
    })),
  }
})

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const TENANT_ID = '11111111-1111-4111-a111-111111111111'
const TT_IMPLANTS = '22222222-2222-4222-a222-222222222221'
const TT_VENEERS = '22222222-2222-4222-a222-222222222222'
const PIPELINE_DEFAULT = '33333333-3333-4333-a333-333333333331'
const PIPELINE_OTHER = '33333333-3333-4333-a333-333333333332'
const STAGE_DEFAULT_1 = '44444444-4444-4444-a444-444444444441'
const STAGE_OTHER_1 = '44444444-4444-4444-a444-444444444444'

function seed() {
  tables.treatment_types.push(
    { id: TT_IMPLANTS, display_name: 'Implants', sort_order: 110 },
    { id: TT_VENEERS, display_name: 'Veneers', sort_order: 140 }
  )
  tables.pipelines.push(
    { id: PIPELINE_DEFAULT, name: 'Default', is_default: true, tenant_id: TENANT_ID, deleted_at: null },
    { id: PIPELINE_OTHER, name: 'Other', is_default: false, tenant_id: TENANT_ID, deleted_at: null }
  )
  tables.pipeline_stages.push(
    { id: STAGE_DEFAULT_1, pipeline_id: PIPELINE_DEFAULT, name: 'Inquiry', position: 1 },
    { id: STAGE_OTHER_1, pipeline_id: PIPELINE_OTHER, name: 'New', position: 1 }
  )
}

beforeEach(() => {
  reset()
  seed()
  setPermission(true)
})

// ---------------------------------------------------------------------------
// Helper: build a NextRequest-like object for a route
// ---------------------------------------------------------------------------

function makeReq(method: string, body?: unknown): any {
  return {
    method,
    json: async () => body,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: 'http://localhost/api/settings/treatment-offerings',
  } as unknown
}

// =============================================================================
// GET /api/settings/treatment-offerings
// =============================================================================
describe('GET /api/settings/treatment-offerings', () => {
  it('returns 403 when user lacks pipeline.edit', async () => {
    setPermission(false)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(403)
  })

  it('returns the four arrays (treatment_types, offerings, pipelines, stages)', async () => {
    const res = await GET(makeReq('GET'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.treatment_types).toHaveLength(2)
    expect(body.pipelines).toHaveLength(2)
    expect(body.stages).toHaveLength(2)
    expect(body.offerings).toHaveLength(0)
  })
})

// =============================================================================
// POST /api/settings/treatment-offerings/toggle
// =============================================================================
describe('POST /api/settings/treatment-offerings/toggle', () => {
  it('toggle ON for a canonical type with no row \u2192 creates with default pipeline', async () => {
    const res = await TOGGLE(
      makeReq('POST', { treatment_type_id: TT_IMPLANTS, is_active: true })
    )
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.state).toBe('created')
    expect(body.offering.treatment_type_id).toBe(TT_IMPLANTS)
    expect(body.offering.pipeline_id).toBe(PIPELINE_DEFAULT)
    expect(body.offering.is_active).toBe(true)
    expect(tables.practice_treatment_offerings).toHaveLength(1)
  })

  it('toggle ON when an inactive row already exists \u2192 reactivates (no new row)', async () => {
    tables.practice_treatment_offerings.push({
      id: 'existing-1',
      tenant_id: TENANT_ID,
      treatment_type_id: TT_IMPLANTS,
      pipeline_id: PIPELINE_OTHER,
      stage_id: STAGE_OTHER_1,
      custom_lead_value_cents_min: 50000,
      custom_lead_value_cents_max: 70000,
      is_active: false,
      deleted_at: null,
      custom_label: null,
      created_at: '2026-01-01',
    })

    const res = await TOGGLE(
      makeReq('POST', { treatment_type_id: TT_IMPLANTS, is_active: true })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.state).toBe('reactivated')
    expect(body.offering.id).toBe('existing-1')
    expect(body.offering.is_active).toBe(true)
    // Critical: prior pipeline + value range survived reactivation
    expect(body.offering.pipeline_id).toBe(PIPELINE_OTHER)
    expect(body.offering.custom_lead_value_cents_min).toBe(50000)
    expect(tables.practice_treatment_offerings).toHaveLength(1)
  })

  it('toggle OFF on an active row \u2192 sets is_active false (no soft-delete)', async () => {
    tables.practice_treatment_offerings.push({
      id: 'active-1',
      tenant_id: TENANT_ID,
      treatment_type_id: TT_IMPLANTS,
      pipeline_id: PIPELINE_DEFAULT,
      stage_id: null,
      is_active: true,
      deleted_at: null,
      custom_label: null,
      custom_lead_value_cents_min: null,
      custom_lead_value_cents_max: null,
      created_at: '2026-01-01',
    })

    const res = await TOGGLE(
      makeReq('POST', { treatment_type_id: TT_IMPLANTS, is_active: false })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.state).toBe('deactivated')
    expect(tables.practice_treatment_offerings[0].is_active).toBe(false)
    expect(tables.practice_treatment_offerings[0].deleted_at).toBeNull()
  })

  it('toggle OFF when no row exists \u2192 noop', async () => {
    const res = await TOGGLE(
      makeReq('POST', { treatment_type_id: TT_IMPLANTS, is_active: false })
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.state).toBe('noop')
    expect(tables.practice_treatment_offerings).toHaveLength(0)
  })

  it('rejects an unknown treatment_type_id', async () => {
    const res = await TOGGLE(
      makeReq('POST', {
        treatment_type_id: '99999999-9999-4999-a999-999999999999',
        is_active: true,
      })
    )
    expect(res.status).toBe(400)
  })
})

// =============================================================================
// POST /api/settings/treatment-offerings (create custom)
// =============================================================================
describe('POST /api/settings/treatment-offerings', () => {
  it('creates a custom offering with treatment_type_id null', async () => {
    const res = await POST(
      makeReq('POST', {
        custom_label: 'Sleep Dentistry',
        pipeline_id: PIPELINE_DEFAULT,
        custom_lead_value_pounds_min: 500,
        custom_lead_value_pounds_max: 800,
      })
    )
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.offering.treatment_type_id).toBeNull()
    expect(body.offering.custom_label).toBe('Sleep Dentistry')
    expect(body.offering.custom_lead_value_cents_min).toBe(50000)
    expect(body.offering.custom_lead_value_cents_max).toBe(80000)
    expect(body.offering.is_active).toBe(true)
  })

  it('rejects when neither treatment_type_id nor custom_label is provided', async () => {
    const res = await POST(
      makeReq('POST', { pipeline_id: PIPELINE_DEFAULT })
    )
    expect(res.status).toBe(400)
  })

  it('rejects when pipeline does not belong to tenant', async () => {
    const res = await POST(
      makeReq('POST', {
        custom_label: 'Bogus',
        pipeline_id: '99999999-9999-4999-a999-999999999999',
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects when stage does not belong to chosen pipeline', async () => {
    const res = await POST(
      makeReq('POST', {
        custom_label: 'Bogus',
        pipeline_id: PIPELINE_DEFAULT,
        stage_id: STAGE_OTHER_1, // belongs to PIPELINE_OTHER, not DEFAULT
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects max < min', async () => {
    const res = await POST(
      makeReq('POST', {
        custom_label: 'Backwards',
        pipeline_id: PIPELINE_DEFAULT,
        custom_lead_value_pounds_min: 800,
        custom_lead_value_pounds_max: 500,
      })
    )
    expect(res.status).toBe(400)
  })

  it('rejects 409 when a canonical offering already exists', async () => {
    tables.practice_treatment_offerings.push({
      id: 'pre-existing',
      tenant_id: TENANT_ID,
      treatment_type_id: TT_IMPLANTS,
      pipeline_id: PIPELINE_DEFAULT,
      is_active: true,
      deleted_at: null,
    })
    const res = await POST(
      makeReq('POST', {
        treatment_type_id: TT_IMPLANTS,
        pipeline_id: PIPELINE_DEFAULT,
      })
    )
    expect(res.status).toBe(409)
  })
})

// =============================================================================
// PATCH /api/settings/treatment-offerings/[id]
// =============================================================================
describe('PATCH /api/settings/treatment-offerings/[id]', () => {
  function seedOffering(opts: Partial<Row> = {}) {
    const row: Row = {
      id: 'offering-1',
      tenant_id: TENANT_ID,
      treatment_type_id: TT_IMPLANTS,
      custom_label: null,
      pipeline_id: PIPELINE_DEFAULT,
      stage_id: null,
      custom_lead_value_cents_min: null,
      custom_lead_value_cents_max: null,
      is_active: true,
      deleted_at: null,
      created_at: '2026-01-01',
      ...opts,
    }
    tables.practice_treatment_offerings.push(row)
    return row
  }

  it('updates the value range on an existing offering', async () => {
    seedOffering()
    const res = await PATCH(
      makeReq('PATCH', {
        custom_lead_value_pounds_min: 100,
        custom_lead_value_pounds_max: 200,
      }),
      { params: Promise.resolve({ id: 'offering-1' }) }
    )
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.offering.custom_lead_value_cents_min).toBe(10000)
    expect(body.offering.custom_lead_value_cents_max).toBe(20000)
  })

  it('rejects max < min', async () => {
    seedOffering()
    const res = await PATCH(
      makeReq('PATCH', {
        custom_lead_value_pounds_min: 200,
        custom_lead_value_pounds_max: 100,
      }),
      { params: Promise.resolve({ id: 'offering-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('rejects stage that does not belong to the chosen pipeline', async () => {
    seedOffering()
    const res = await PATCH(
      makeReq('PATCH', {
        pipeline_id: PIPELINE_DEFAULT,
        stage_id: STAGE_OTHER_1,
      }),
      { params: Promise.resolve({ id: 'offering-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('refuses to clear custom_label on a custom offering', async () => {
    seedOffering({ id: 'custom-1', treatment_type_id: null, custom_label: 'Sleep Dentistry' })
    const res = await PATCH(
      makeReq('PATCH', { custom_label: null }),
      { params: Promise.resolve({ id: 'custom-1' }) }
    )
    expect(res.status).toBe(400)
  })

  it('returns 404 for a non-existent id', async () => {
    seedOffering()
    const res = await PATCH(
      makeReq('PATCH', { is_active: false }),
      { params: Promise.resolve({ id: 'does-not-exist' }) }
    )
    expect(res.status).toBe(404)
  })
})

// =============================================================================
// DELETE /api/settings/treatment-offerings/[id]
// =============================================================================
describe('DELETE /api/settings/treatment-offerings/[id]', () => {
  it('soft-deletes a custom offering', async () => {
    tables.practice_treatment_offerings.push({
      id: 'custom-del-1',
      tenant_id: TENANT_ID,
      treatment_type_id: null,
      custom_label: 'Sleep Dentistry',
      pipeline_id: PIPELINE_DEFAULT,
      is_active: true,
      deleted_at: null,
    })

    const res = await DELETE(
      makeReq('DELETE'),
      { params: Promise.resolve({ id: 'custom-del-1' }) }
    )
    expect(res.status).toBe(204)
    const stored = tables.practice_treatment_offerings[0]
    expect(stored.deleted_at).toBeTruthy()
    expect(stored.is_active).toBe(false)
  })

  it('refuses to delete a standard offering with 400', async () => {
    tables.practice_treatment_offerings.push({
      id: 'std-1',
      tenant_id: TENANT_ID,
      treatment_type_id: TT_IMPLANTS,
      pipeline_id: PIPELINE_DEFAULT,
      is_active: true,
      deleted_at: null,
    })
    const res = await DELETE(
      makeReq('DELETE'),
      { params: Promise.resolve({ id: 'std-1' }) }
    )
    const body = await res.json()
    expect(res.status).toBe(400)
    expect(body.error).toBe('standard_offering_not_deletable')
  })
})
