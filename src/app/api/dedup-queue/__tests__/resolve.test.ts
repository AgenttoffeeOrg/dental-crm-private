/**
 * @jest-environment node
 *
 * Phase 2a.9 — Dedup queue resolve endpoint tests.
 *
 * Strategy: an in-memory Supabase fake covering the eight tables this route
 * touches (dedup_review_queue, contacts, attribution_touchpoints,
 * activities, practice_treatment_offerings, pipelines, pipeline_stages,
 * deals, practice_notification_routing). Builder semantics are deliberately
 * minimal — eq()/is() filter, maybeSingle/single resolve from the filtered
 * set, insert returns a generated id. We mount the route handler directly
 * and assert response shape + DB-side mutations.
 *
 * Focus: deal-creation behaviour added in 2a.9 — that the merge / create_new
 * paths produce a deal, that dismiss does not, that the deal-creation
 * graceful-skip cases return `deal_id: null` without failing the resolution,
 * and that owner inheritance / SLA-routed fallback work end-to-end.
 */

import { POST } from '@/app/api/dedup-queue/[id]/resolve/route'

// ---------------------------------------------------------------------------
// In-memory Supabase fake
// ---------------------------------------------------------------------------

interface Row {
  [k: string]: unknown
}

const tables = {
  dedup_review_queue: [] as Row[],
  contacts: [] as Row[],
  attribution_touchpoints: [] as Row[],
  activities: [] as Row[],
  practice_treatment_offerings: [] as Row[],
  pipelines: [] as Row[],
  pipeline_stages: [] as Row[],
  deals: [] as Row[],
  practice_notification_routing: [] as Row[],
}

type TableName = keyof typeof tables

function reset() {
  for (const k of Object.keys(tables) as TableName[]) {
    tables[k].length = 0
  }
}

let permissionGrant = true

function setPermission(v: boolean) {
  permissionGrant = v
}

// Force the next deals.insert(...) call to return an error, simulating the
// 'deal_insert_failed' graceful-skip path.
let dealInsertShouldFail = false

function makeBuilder(table: TableName) {
  let kind: 'select' | 'insert' | 'update' | null = null
  let pendingValues: Row | Row[] | null = null
  let pendingPatch: Row | null = null
  const eqs: Array<[string, unknown]> = []
  const isNullCols: string[] = []
  const notNullCols: string[] = []
  let limit: number | null = null
  let nextId = (tables[table].length + 1).toString()

  const matches = (row: Row) => {
    for (const [col, val] of eqs) if (row[col] !== val) return false
    for (const col of isNullCols) {
      if (row[col] !== null && row[col] !== undefined) return false
    }
    for (const col of notNullCols) {
      if (row[col] === null || row[col] === undefined) return false
    }
    return true
  }

  const filterRows = () => tables[table].filter(matches)
  const result = (data: unknown, error: unknown = null) => Promise.resolve({ data, error })

  // Loose typing — Supabase's PostgREST builder is a chained `any`-shaped
  // object in practice, and matching its full type here would balloon the
  // test fake without value.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const builder: any = {
    select() {
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
    not(col: string, _op: string, val: unknown) {
      if (val === null) notNullCols.push(col)
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
      const out = limit ? rows.slice(0, limit) : rows
      return result(out[0] ?? null)
    },
    single() {
      if (kind === 'insert') {
        if (table === 'deals' && dealInsertShouldFail) {
          return result(null, { message: 'deal_insert_failed (forced)' })
        }
        const v = Array.isArray(pendingValues)
          ? pendingValues[0]
          : (pendingValues as Row)
        const inserted: Row = { id: `${table}-gen-${nextId}`, ...v }
        nextId = (tables[table].length + 2).toString()
        tables[table].push(inserted)
        return result(inserted)
      }
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        return result(rows[0] ?? null, rows[0] ? null : { message: 'not found' })
      }
      const rows = filterRows()
      const out = limit ? rows.slice(0, limit) : rows
      return result(
        out[0] ?? null,
        out[0] ? null : { code: 'PGRST116', message: 'no rows' }
      )
    },
    then(resolveCb: (v: unknown) => void) {
      if (kind === 'update') {
        const rows = filterRows()
        for (const row of rows) Object.assign(row, pendingPatch)
        resolveCb({ data: rows, error: null })
        return
      }
      if (kind === 'insert') {
        // `await supabase.from(t).insert(...)` (no .single()) — used by the
        // resolve route for the activities table.
        const v = Array.isArray(pendingValues)
          ? pendingValues[0]
          : (pendingValues as Row)
        const inserted: Row = { id: `${table}-gen-${nextId}`, ...v }
        nextId = (tables[table].length + 2).toString()
        tables[table].push(inserted)
        resolveCb({ data: null, error: null })
        return
      }
      const rows = filterRows()
      const out = limit ? rows.slice(0, limit) : rows
      resolveCb({ data: out, error: null })
    },
  }

  return builder
}

const fakeService = {
  from: (table: string) => makeBuilder(table as TableName),
  rpc: (_name: string, _args: unknown) =>
    Promise.resolve({ data: permissionGrant, error: null }),
}

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const TENANT_ID = '11111111-1111-4111-a111-111111111111'
const USER_ID = '22222222-2222-4222-a222-222222222222'

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
      user: { id: USER_ID, email: 'test@example.com' },
      tenantId: TENANT_ID,
      activeLocationId: null,
      membership: { id: 'm1', role: 'manager', status: 'active', all_locations: true },
      accessibleLocationIds: null,
    })),
  }
})

// Stub the notification router so we don't need email infrastructure.
jest.mock('@/lib/notifications/notification-router', () => ({
  emitNotification: jest.fn(async () => undefined),
}))

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

const PIPELINE_DEFAULT = '33333333-3333-4333-a333-333333333331'
const PIPELINE_TREATMENT = '33333333-3333-4333-a333-333333333332'
const STAGE_DEFAULT_1 = '44444444-4444-4444-a444-444444444441'
const STAGE_TREATMENT_1 = '44444444-4444-4444-a444-444444444442'
const TREATMENT_TYPE_ID = '55555555-5555-4555-a555-555555555551'
const OFFERING_ID = '66666666-6666-4666-a666-666666666661'
const SLA_USER_ID = '77777777-7777-4777-a777-777777777771'
const PRIOR_OWNER_ID = '88888888-8888-4888-a888-888888888881'
const TARGET_CONTACT_ID = '99999999-9999-4999-a999-999999999991'
const QUEUE_ITEM_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaa1'

function seedPipelinesAndOffering() {
  tables.pipelines.push(
    { id: PIPELINE_DEFAULT, name: 'Default', is_default: true, tenant_id: TENANT_ID, deleted_at: null },
    { id: PIPELINE_TREATMENT, name: 'Treatment', is_default: false, tenant_id: TENANT_ID, deleted_at: null }
  )
  tables.pipeline_stages.push(
    { id: STAGE_DEFAULT_1, pipeline_id: PIPELINE_DEFAULT, name: 'Inquiry', position: 1 },
    { id: STAGE_TREATMENT_1, pipeline_id: PIPELINE_TREATMENT, name: 'New', position: 1 }
  )
  tables.practice_treatment_offerings.push({
    id: OFFERING_ID,
    tenant_id: TENANT_ID,
    treatment_type_id: TREATMENT_TYPE_ID,
    custom_label: 'Implants',
    pipeline_id: PIPELINE_TREATMENT,
    stage_id: null,
    custom_lead_value_cents_min: 200000,
    custom_lead_value_cents_max: 400000,
    is_active: true,
    deleted_at: null,
    // The 1:1 join `treatment_types ( display_name )` is faked via the
    // fact that our select() returns the row as-is; createDealForLead reads
    // `offering.treatment_types` so we attach a stub here.
    treatment_types: { display_name: 'Implants (canonical)' },
  })
  // SLA-routed fallback: tenant-default routing row.
  tables.practice_notification_routing.push({
    tenant_id: TENANT_ID,
    event_key: 'lead.arrived',
    pipeline_id: null,
    is_active: true,
    primary_user_id: SLA_USER_ID,
  })
}

function seedQueueRow(payload: Record<string, unknown>) {
  tables.dedup_review_queue.push({
    id: QUEUE_ITEM_ID,
    tenant_id: TENANT_ID,
    candidate_payload: payload,
    candidate_email: 'lead@example.com',
    candidate_phone: '+447911123456',
    candidate_name: 'Test Lead',
    source_channel: 'form_embedded',
    matched_contact_ids: [TARGET_CONTACT_ID],
    match_signals: {},
    status: 'pending',
    created_at: '2026-05-05T00:00:00Z',
    updated_at: '2026-05-05T00:00:00Z',
    expires_at: '2026-06-05T00:00:00Z',
  })
}

function seedTargetContact(overrides: Partial<Row> = {}) {
  tables.contacts.push({
    id: TARGET_CONTACT_ID,
    tenant_id: TENANT_ID,
    full_name: 'Existing Contact',
    primary_email: 'existing@example.com',
    primary_email_norm: 'existing@example.com',
    primary_phone: '+447911999000',
    primary_phone_e164: '+447911999000',
    treatment_offering_id: null,
    marketing_consent: false,
    email_consent: true,
    sms_consent: false,
    owner_user_id: null,
    deleted_at: null,
    ...overrides,
  })
}

beforeEach(() => {
  reset()
  setPermission(true)
  dealInsertShouldFail = false
})

function makeReq(body: unknown): Parameters<typeof POST>[0] {
  return {
    json: async () => body,
    headers: new Headers({ 'content-type': 'application/json' }),
    url: `http://localhost/api/dedup-queue/${QUEUE_ITEM_ID}/resolve`,
  } as unknown as Parameters<typeof POST>[0]
}

const params = { params: { id: QUEUE_ITEM_ID } }

// =============================================================================
// merge — with treatment offering
// =============================================================================
describe('POST /api/dedup-queue/[id]/resolve — merge', () => {
  it('with treatment_offering_id → creates a Deal on the offering pipeline with midpoint value, owner from SLA routing', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ treatment_offering_id: OFFERING_ID, email: 'lead@example.com' })
    seedTargetContact()

    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.action).toBe('merge')
    expect(body.deal_id).toBeTruthy()
    expect(body.deal_title).toBe('Implants')

    expect(tables.deals).toHaveLength(1)
    const deal = tables.deals[0]
    expect(deal.pipeline_id).toBe(PIPELINE_TREATMENT)
    expect(deal.stage_id).toBe(STAGE_TREATMENT_1)
    expect(deal.title).toBe('Implants')
    expect(deal.value_estimate_cents).toBe(300000)
    expect(deal.owner_user_id).toBe(SLA_USER_ID)
    expect(deal.contact_id).toBe(TARGET_CONTACT_ID)
    expect(deal.tenant_id).toBe(TENANT_ID)
    expect(deal.source).toBe('form_embedded')
    expect(deal.treatment_tags).toEqual(['Implants'])
    expect(deal.status).toBe('open')

    // Activity should reference the deal
    expect(tables.activities).toHaveLength(1)
    expect(tables.activities[0].deal_id).toBe(deal.id)

    // Queue row marked merged
    expect(tables.dedup_review_queue[0].status).toBe('merged')
    expect(tables.dedup_review_queue[0].resolved_contact_id).toBe(TARGET_CONTACT_ID)
  })

  it('with no treatment_offering_id on queue row → creates an "Inquiry" deal on the default pipeline', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ email: 'lead@example.com' }) // no treatment_offering_id
    seedTargetContact()

    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deal_id).toBeTruthy()
    expect(body.deal_title).toBe('Inquiry')

    expect(tables.deals).toHaveLength(1)
    const deal = tables.deals[0]
    expect(deal.pipeline_id).toBe(PIPELINE_DEFAULT)
    expect(deal.stage_id).toBe(STAGE_DEFAULT_1)
    expect(deal.title).toBe('Inquiry')
    expect(deal.value_estimate_cents).toBeNull()
    expect(deal.treatment_tags).toBeNull()
  })

  it('target contact has prior deals → owner inherits from the most recent prior deal', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ treatment_offering_id: OFFERING_ID })
    seedTargetContact()
    // Pre-existing deal on the target contact with a populated owner. The
    // resolveOwner helper queries `deals` filtered by tenant + contact +
    // owner_user_id NOT NULL. Our fake honours that filter and returns the
    // first matching row, which is sufficient for this test.
    tables.deals.push({
      id: 'prior-deal-1',
      tenant_id: TENANT_ID,
      contact_id: TARGET_CONTACT_ID,
      owner_user_id: PRIOR_OWNER_ID,
      created_at: '2026-04-01T00:00:00Z',
    })

    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    expect(res.status).toBe(200)

    // The new deal (the second row in the table) inherited the owner.
    const newDeal = tables.deals.find((d) => d.id !== 'prior-deal-1') as Row
    expect(newDeal.owner_user_id).toBe(PRIOR_OWNER_ID)
  })

  it('zero-stage pipeline → graceful skip, deal_id null, contact still resolved', async () => {
    // Same as the 'no offering' case BUT we drop the default pipeline's stage.
    tables.pipelines.push({
      id: PIPELINE_DEFAULT,
      name: 'Default',
      is_default: true,
      tenant_id: TENANT_ID,
      deleted_at: null,
    })
    // intentionally NO pipeline_stages row → resolveStageId returns null
    seedQueueRow({})
    seedTargetContact()

    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deal_id).toBeNull()
    expect(tables.deals).toHaveLength(0)
    // Queue row still resolved, contact still merged.
    expect(tables.dedup_review_queue[0].status).toBe('merged')
    expect(tables.activities).toHaveLength(1)
    expect(tables.activities[0].deal_id).toBeNull()
  })

  it('deals.insert error → graceful skip, deal_id null, contact still resolved', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ treatment_offering_id: OFFERING_ID })
    seedTargetContact()
    dealInsertShouldFail = true

    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deal_id).toBeNull()
    expect(tables.deals).toHaveLength(0)
    expect(tables.dedup_review_queue[0].status).toBe('merged')
  })
})

// =============================================================================
// create_new — fresh contact + deal
// =============================================================================
describe('POST /api/dedup-queue/[id]/resolve — create_new', () => {
  it('with treatment offering → inserts a fresh contact AND a deal', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({
      treatment_offering_id: OFFERING_ID,
      email: 'fresh@example.com',
      phone: '+447911555111',
      full_name: 'Fresh Lead',
    })

    const res = await POST(makeReq({ action: 'create_new' }), params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.action).toBe('create_new')
    expect(body.deal_id).toBeTruthy()

    // New contact created
    expect(tables.contacts).toHaveLength(1)
    const contact = tables.contacts[0]
    expect(contact.tenant_id).toBe(TENANT_ID)
    expect(contact.primary_email).toBe('fresh@example.com')
    expect(contact.full_name).toBe('Fresh Lead')

    // Deal created and links to the new contact
    expect(tables.deals).toHaveLength(1)
    const deal = tables.deals[0]
    expect(deal.contact_id).toBe(contact.id)
    expect(deal.title).toBe('Implants')
    expect(deal.pipeline_id).toBe(PIPELINE_TREATMENT)

    // Queue row marked new_contact
    expect(tables.dedup_review_queue[0].status).toBe('new_contact')
    expect(tables.dedup_review_queue[0].resolved_contact_id).toBe(contact.id)
  })
})

// =============================================================================
// dismiss — no deal, no contact, no touchpoint, no activity
// =============================================================================
describe('POST /api/dedup-queue/[id]/resolve — dismiss', () => {
  it('marks dismissed and creates no contact/deal/touchpoint/activity', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ treatment_offering_id: OFFERING_ID })

    const res = await POST(makeReq({ action: 'dismiss', notes: 'spam' }), params)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.action).toBe('dismiss')
    expect(body.deal_id).toBeNull()

    expect(tables.contacts).toHaveLength(0)
    expect(tables.attribution_touchpoints).toHaveLength(0)
    expect(tables.activities).toHaveLength(0)
    expect(tables.deals).toHaveLength(0)
    expect(tables.dedup_review_queue[0].status).toBe('dismissed')
    expect(tables.dedup_review_queue[0].resolution_notes).toBe('spam')
  })
})

// =============================================================================
// Idempotency — second resolve on the same row is a no-op (404)
// =============================================================================
describe('POST /api/dedup-queue/[id]/resolve — idempotency', () => {
  it('a second call after a successful merge returns 404 and does NOT create a duplicate deal', async () => {
    seedPipelinesAndOffering()
    seedQueueRow({ treatment_offering_id: OFFERING_ID })
    seedTargetContact()

    const first = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    expect(first.status).toBe(200)
    expect(tables.deals).toHaveLength(1)

    // The first resolve flipped status from 'pending' to 'merged'. The load
    // query at the top of the route filters status='pending', so the second
    // call cannot find it and returns 404 — that's the existing idempotency
    // contract this phase deliberately preserves.
    const second = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    expect(second.status).toBe(404)
    expect(tables.deals).toHaveLength(1)
  })
})

// =============================================================================
// Permission gating
// =============================================================================
describe('POST /api/dedup-queue/[id]/resolve — permission gating', () => {
  it('returns 403 when user lacks contacts.dedup_queue_manage', async () => {
    setPermission(false)
    seedPipelinesAndOffering()
    seedQueueRow({})
    const res = await POST(
      makeReq({ action: 'merge', merge_into_contact_id: TARGET_CONTACT_ID }),
      params
    )
    expect(res.status).toBe(403)
    expect(tables.deals).toHaveLength(0)
  })
})
