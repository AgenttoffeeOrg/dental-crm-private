/**
 * Phase 2a.2a — `ingestLead()` unit tests.
 *
 * Strategy: a fakeSupabase that records every insert/update/select per table.
 * Specific tests pre-stage what `select(...).maybeSingle()` returns for
 * existing contact / event_id replay lookups.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  ingestLead,
  IngestLeadValidationError,
  setNotificationEmitter,
  type IngestLeadInput,
} from '../ingest-lead'

interface TableState {
  /** Pre-staged rows that select-by-id / maybeSingle will return. */
  rows: any[]
  /** Pre-staged result for the next .select(...).single() insert chain. */
  insertReturns: any[]
  /** Captured insert payloads. */
  inserts: any[]
  /** Captured update payloads. */
  updates: Array<{ patch: any; eqs: any[] }>
  /**
   * Phase 2a.8: captured `.eq(col, val)` predicate sets, one entry per
   * terminal call (.maybeSingle / .single / .then). Used to assert that
   * select queries apply specific filters (e.g. `is_active = true`).
   */
  selectFilters: Array<Array<[string, unknown]>>
}

function emptyTable(): TableState {
  return { rows: [], insertReturns: [], inserts: [], updates: [], selectFilters: [] }
}

interface FakeState {
  contacts: TableState
  attribution_touchpoints: TableState
  activities: TableState
  dedup_review_queue: TableState
  channel_identifiers: TableState
  lead_sla_rules: TableState
  practice_treatment_offerings: TableState
  // Phase 2a.7 — deal-creation reads pipelines/stages, looks up prior-deal
  // owners, falls back to practice_notification_routing for the SLA-routed
  // user, and inserts into `deals`. All four tables need fakes.
  pipelines: TableState
  pipeline_stages: TableState
  deals: TableState
  practice_notification_routing: TableState
}

function makeFake(): { client: SupabaseClient; state: FakeState } {
  const state: FakeState = {
    contacts: emptyTable(),
    attribution_touchpoints: emptyTable(),
    activities: emptyTable(),
    dedup_review_queue: emptyTable(),
    channel_identifiers: emptyTable(),
    lead_sla_rules: emptyTable(),
    practice_treatment_offerings: emptyTable(),
    pipelines: emptyTable(),
    pipeline_stages: emptyTable(),
    deals: emptyTable(),
    practice_notification_routing: emptyTable(),
  }

  function buildBuilder(tableName: keyof FakeState) {
    const t = state[tableName]
    let mode: 'select' | 'insert' | 'update' | null = null
    let pendingInsert: any = null
    let pendingUpdate: any = null
    let limitN: number | null = null
    const eqs: Array<[string, unknown]> = []

    const builder: any = {
      select: (_cols?: string) => {
        if (mode === null) mode = 'select'
        return builder
      },
      insert: (payload: any) => {
        mode = 'insert'
        pendingInsert = payload
        t.inserts.push(payload)
        return builder
      },
      update: (patch: any) => {
        mode = 'update'
        pendingUpdate = patch
        return builder
      },
      eq: (col: string, val: unknown) => {
        eqs.push([col, val])
        return builder
      },
      ilike: () => builder,
      or: () => builder,
      is: () => builder,
      not: () => builder,
      order: () => builder,
      // Phase 2a.7: .limit(N) is now chainable AND records the limit count
      // so the .then() terminal drains only N rows (preserving the rest for
      // a subsequent .maybeSingle() call when the same test stages multiple
      // rows for sequential queries on the same table).
      limit: (n?: number) => {
        if (typeof n === 'number') limitN = n
        return builder
      },
      maybeSingle: () => {
        if (mode === 'select') {
          t.selectFilters.push(eqs.slice())
          // Return pre-staged row if any.
          const row = t.rows.shift() ?? null
          return Promise.resolve({ data: row, error: null })
        }
        return Promise.resolve({ data: null, error: null })
      },
      single: () => {
        if (mode === 'insert') {
          // Return next pre-staged insert result.
          const ret = t.insertReturns.shift() ?? { id: `${tableName}-generated-${t.inserts.length}` }
          return Promise.resolve({ data: ret, error: null })
        }
        if (mode === 'select') {
          t.selectFilters.push(eqs.slice())
          const row = t.rows.shift() ?? null
          return Promise.resolve({
            data: row,
            error: row ? null : { code: 'PGRST116', message: 'no rows' },
          })
        }
        return Promise.resolve({ data: null, error: null })
      },
      // Update returns "void"-ish when not chained with .select; if .eq()s
      // are recorded the update is "applied". For select-mode .then() we drain
      // the staged rows so the dedup engine (which uses
      // .select(...).eq(...).limit(N).then(...)) sees its candidates.
      then: (onFulfilled: any, _onRejected: any) => {
        if (mode === 'update') {
          t.updates.push({ patch: pendingUpdate, eqs })
          return Promise.resolve({ data: null, error: null }).then(onFulfilled)
        }
        if (mode === 'select') {
          t.selectFilters.push(eqs.slice())
          const count = limitN ?? t.rows.length
          const drained = t.rows.splice(0, count)
          return Promise.resolve({ data: drained, error: null }).then(onFulfilled)
        }
        return Promise.resolve({ data: null, error: null }).then(onFulfilled)
      },
    }
    return builder
  }

  const client = {
    from: (table: string) => {
      if (!(table in state)) throw new Error(`Unexpected from(${table}) in ingestLead test stub`)
      return buildBuilder(table as keyof FakeState)
    },
  } as unknown as SupabaseClient

  return { client, state }
}

const TENANT = '11111111-1111-1111-1111-111111111111'
const TEST_PHONE = '+447911123456'

const baseInput = (overrides: Partial<IngestLeadInput> = {}): IngestLeadInput => ({
  tenant_id: TENANT,
  source_channel: 'form_embedded',
  contact: {
    email: 'lead@example.com',
    phone: TEST_PHONE,
    first_name: 'Test',
    last_name: 'Lead',
  },
  raw_payload: { foo: 'bar' },
  ...overrides,
})

beforeEach(() => {
  // Reset the notification emitter to a no-op so failing emitters from one
  // test don't bleed into the next.
  setNotificationEmitter(async () => {})
})

describe('ingestLead — validation', () => {
  it('throws IngestLeadValidationError when tenant_id is missing', async () => {
    const { client } = makeFake()
    await expect(
      ingestLead({ ...baseInput(), tenant_id: '' as string }, client)
    ).rejects.toBeInstanceOf(IngestLeadValidationError)
  })

  it('throws when source_channel is invalid', async () => {
    const { client } = makeFake()
    await expect(
      ingestLead({ ...baseInput(), source_channel: 'not_a_channel' as any }, client)
    ).rejects.toBeInstanceOf(IngestLeadValidationError)
  })

  it('throws when no email/phone/channel_identifier provided', async () => {
    const { client } = makeFake()
    await expect(
      ingestLead({ ...baseInput(), contact: { first_name: 'X' } }, client)
    ).rejects.toBeInstanceOf(IngestLeadValidationError)
  })
})

describe('ingestLead — happy path: new contact', () => {
  it('creates contact + touchpoint + activity, resolves SLA, returns IDs', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'contact-new-1' })
    state.attribution_touchpoints.insertReturns.push({ id: 'touchpoint-1' })
    state.activities.insertReturns.push({ id: 'activity-1' })

    const result = await ingestLead(baseInput(), client)

    expect(result.dedup_decision).toBe('new')
    expect(result.contact_id).toBe('contact-new-1')
    expect(result.attribution_touchpoint_id).toBe('touchpoint-1')
    expect(result.activity_id).toBe('activity-1')
    expect(result.sla?.minutes).toBe(15) // system fallback (no rules, no offering)
    expect(result.sla?.rule_source).toBe('system_fallback')

    // Touchpoint received the event payload + treatment_offering_id null
    expect(state.attribution_touchpoints.inserts[0]).toMatchObject({
      tenant_id: TENANT,
      contact_id: 'contact-new-1',
      source_channel: 'form_embedded',
    })
    // Activity carries source_channel and direction inbound
    expect(state.activities.inserts[0]).toMatchObject({
      tenant_id: TENANT,
      contact_id: 'contact-new-1',
      type: 'form_submission',
      direction: 'inbound',
      source_channel: 'form_embedded',
    })
  })
})

describe('ingestLead — review_required path', () => {
  it('queues review item and returns null contact_id, no touchpoint, no activity', async () => {
    const { client, state } = makeFake()

    // Force a review_required by stuffing 2 contacts into the email-tier lookup.
    state.contacts.rows.push({ id: 'a' }, { id: 'b' }) // first dedup query (email)
    state.dedup_review_queue.insertReturns.push({ id: 'queue-1' })

    const result = await ingestLead(baseInput(), client)

    expect(result.dedup_decision).toBe('review_required')
    expect(result.contact_id).toBeNull()
    expect(result.attribution_touchpoint_id).toBeNull()
    expect(result.activity_id).toBeNull()
    expect(result.queue_item_id).toBe('queue-1')
    expect(state.attribution_touchpoints.inserts.length).toBe(0)
    expect(state.activities.inserts.length).toBe(0)
    expect(state.dedup_review_queue.inserts[0]).toMatchObject({
      tenant_id: TENANT,
      source_channel: 'form_embedded',
      candidate_email: 'lead@example.com',
      candidate_phone: TEST_PHONE,
      matched_contact_ids: ['a', 'b'],
    })
  })
})

describe('ingestLead — best-effort notifications', () => {
  it('does NOT fail ingestion when emitNotification throws', async () => {
    setNotificationEmitter(() => {
      throw new Error('notification system down')
    })
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'contact-X' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-X' })
    state.activities.insertReturns.push({ id: 'act-X' })

    const result = await ingestLead(baseInput(), client)
    expect(result.contact_id).toBe('contact-X')
    expect(result.activity_id).toBe('act-X')
  })
})

describe('ingestLead — touchpoint metadata carries treatment_offering_id', () => {
  it('writes treatment_offering_id onto the touchpoint row', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c1' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp1' })
    state.activities.insertReturns.push({ id: 'a1' })

    await ingestLead(baseInput({ treatment_offering_id: 'offering-99' }), client)
    expect(state.attribution_touchpoints.inserts[0].treatment_offering_id).toBe('offering-99')
  })
})

describe('ingestLead — activity row is correctly typed', () => {
  it('source_channel column is populated from input', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c2' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp2' })
    state.activities.insertReturns.push({ id: 'a2' })

    await ingestLead(baseInput({ source_channel: 'whatsapp_website_button' }), client)
    expect(state.activities.inserts[0].source_channel).toBe('whatsapp_website_button')
    expect(state.activities.inserts[0].type).toBe('whatsapp')
  })
})

// Phase 2a.5: routing_log_id is plumbed on IngestLeadResult for 2b's webhook
// handlers to correlate routing decisions back to the inbound webhook. Today
// ingestLead() doesn't invoke routeDealWithAdapter() (routing is downstream
// of deal creation), so the value is always null. These tests lock the shape
// in place so 2b can populate it without re-asserting the contract.
describe('ingestLead — Phase 2a.5 routing_log_id contract', () => {
  it('returns routing_log_id: null on the happy path', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-route-1' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-route-1' })
    state.activities.insertReturns.push({ id: 'act-route-1' })

    const result = await ingestLead(baseInput(), client)

    expect(result).toHaveProperty('routing_log_id')
    expect(result.routing_log_id).toBeNull()
  })

  it('returns routing_log_id: null on the review_required path', async () => {
    const { client, state } = makeFake()
    state.contacts.rows.push({ id: 'a' }, { id: 'b' })
    state.dedup_review_queue.insertReturns.push({ id: 'q-route-1' })

    const result = await ingestLead(baseInput(), client)

    expect(result.dedup_decision).toBe('review_required')
    expect(result).toHaveProperty('routing_log_id')
    expect(result.routing_log_id).toBeNull()
  })
})

// =============================================================================
// Phase 2a.7 — Deal creation in ingestLead()
// =============================================================================
//
// These tests verify the new behaviour: every non-review_required ingestion
// produces a Deal. Tests cover offering-driven happy paths, no-treatment
// fallback, re-engagement (owner inheritance), idempotent replays, and the
// graceful-skip cases (no default pipeline / zero stages / insert error).

const OFFERING_ID = 'offering-aaa'
const TREATMENT_PIPELINE_ID = 'pipeline-treatment'
const TREATMENT_STAGE_ID = 'stage-treatment-1'
const DEFAULT_PIPELINE_ID = 'pipeline-default'
const DEFAULT_STAGE_ID = 'stage-default-1'
const SLA_USER_ID = 'user-sla-routed'

/**
 * Pre-stage the supabase rows needed for deal-creation to succeed via the
 * offering branch. Each test that exercises the happy path with an offering
 * calls this and then layers any additional rows on top.
 *
 * Note on staging count: the SLA resolver also queries
 * `practice_treatment_offerings` (for custom_sla_minutes), and consumes one
 * row via .maybeSingle() before deal-creation runs its own offering lookup.
 * We push the row TWICE so both consumers get a hit.
 */
function stageOfferingHappyPath(state: FakeState, valueMin = 50000, valueMax = 70000) {
  const offeringRow = {
    id: OFFERING_ID,
    custom_label: 'Check-up',
    pipeline_id: TREATMENT_PIPELINE_ID,
    stage_id: null,
    custom_lead_value_cents_min: valueMin,
    custom_lead_value_cents_max: valueMax,
    custom_sla_minutes: null,
    treatment_types: { display_name: 'General Check-up', default_sla_minutes: null },
  }
  state.practice_treatment_offerings.rows.push(offeringRow, offeringRow)
  // Stage lookup (first stage of the resolved pipeline by position ASC).
  state.pipeline_stages.rows.push({ id: TREATMENT_STAGE_ID })
  // Deal insert returns a generated id (or callers can override via insertReturns).
}

function stageInquiryFallback(state: FakeState) {
  // Default pipeline lookup.
  state.pipelines.rows.push({ id: DEFAULT_PIPELINE_ID })
  // First stage of default pipeline.
  state.pipeline_stages.rows.push({ id: DEFAULT_STAGE_ID })
}

describe('ingestLead — Phase 2a.7 deal creation, with treatment, new contact', () => {
  it('inserts a deal titled by offering custom_label, with midpoint value, on the offering pipeline', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-2a7-1' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-2a7-1' })
    state.activities.insertReturns.push({ id: 'act-2a7-1' })
    state.deals.insertReturns.push({ id: 'deal-2a7-1' })
    stageOfferingHappyPath(state, 50000, 70000)
    // No prior deals for the new contact → SLA-routed lookup. Stage the
    // pipeline-specific routing row to return the SLA user.
    state.practice_notification_routing.rows.push({ primary_user_id: SLA_USER_ID })

    const result = await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    expect(result.deal_id).toBe('deal-2a7-1')
    expect(state.deals.inserts).toHaveLength(1)
    const insert = state.deals.inserts[0]
    expect(insert).toMatchObject({
      tenant_id: TENANT,
      contact_id: 'c-2a7-1',
      pipeline_id: TREATMENT_PIPELINE_ID,
      stage_id: TREATMENT_STAGE_ID,
      title: 'Check-up',
      currency: 'GBP',
      source: 'form_embedded',
      owner_user_id: SLA_USER_ID,
      value_estimate_cents: 60000, // midpoint of 50_000 and 70_000
      status: 'open',
    })
    // Activity now references the deal id.
    expect(state.activities.inserts[0].deal_id).toBe('deal-2a7-1')
  })

  it('falls back to canonical treatment_types.display_name when custom_label is null', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-2a7-2' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-2a7-2' })
    state.activities.insertReturns.push({ id: 'act-2a7-2' })
    state.deals.insertReturns.push({ id: 'deal-2a7-2' })

    const offeringRow = {
      id: OFFERING_ID,
      custom_label: null,
      pipeline_id: TREATMENT_PIPELINE_ID,
      stage_id: null,
      custom_lead_value_cents_min: null,
      custom_lead_value_cents_max: null,
      custom_sla_minutes: null,
      treatment_types: { display_name: 'Implants', default_sla_minutes: null },
    }
    // Twice: SLA resolver and deal-creation both query practice_treatment_offerings.
    state.practice_treatment_offerings.rows.push(offeringRow, offeringRow)
    state.pipeline_stages.rows.push({ id: TREATMENT_STAGE_ID })
    state.practice_notification_routing.rows.push({ primary_user_id: null })

    const result = await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    expect(result.deal_id).toBe('deal-2a7-2')
    expect(state.deals.inserts[0].title).toBe('Implants')
    // Both min and max null → value_estimate_cents stays null.
    expect(state.deals.inserts[0].value_estimate_cents).toBeNull()
  })

  it('honours the offering stage_id override when set', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-stg' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-stg' })
    state.activities.insertReturns.push({ id: 'act-stg' })
    state.deals.insertReturns.push({ id: 'deal-stg' })
    const offeringRow = {
      id: OFFERING_ID,
      custom_label: 'Veneers',
      pipeline_id: TREATMENT_PIPELINE_ID,
      stage_id: 'stage-override-xyz',
      custom_lead_value_cents_min: 100000,
      custom_lead_value_cents_max: 100000,
      custom_sla_minutes: null,
      treatment_types: { display_name: 'Veneers', default_sla_minutes: null },
    }
    state.practice_treatment_offerings.rows.push(offeringRow, offeringRow)
    // Override-validation lookup returns the row that matches the override.
    state.pipeline_stages.rows.push({ id: 'stage-override-xyz' })

    await ingestLead(baseInput({ treatment_offering_id: OFFERING_ID }), client)

    expect(state.deals.inserts[0].stage_id).toBe('stage-override-xyz')
  })
})

describe('ingestLead — Phase 2a.7 re-engagement (matched contact)', () => {
  it('creates a NEW deal on the matched contact and inherits owner from prior deal', async () => {
    const PRIOR_OWNER = 'user-prior-owner'
    const { client, state } = makeFake()

    // One contact pre-staged → dedup tier 1 .limit(2) drains 1 → "matched".
    // additivelyUpdateContact's follow-up .maybeSingle() returns null and
    // gracefully short-circuits (no patch); the test only asserts the deal,
    // so the update path is not exercised.
    state.contacts.rows.push({ id: 'existing-contact-1' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-reeng' })
    state.activities.insertReturns.push({ id: 'act-reeng' })
    state.deals.insertReturns.push({ id: 'deal-reeng' })
    stageOfferingHappyPath(state)
    // Prior-deal owner lookup returns a non-null user → owner inherited; no
    // SLA-routed lookup needed.
    state.deals.rows.push({ owner_user_id: PRIOR_OWNER })

    const result = await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    expect(result.dedup_decision).toBe('matched')
    expect(result.deal_id).toBe('deal-reeng')
    expect(state.deals.inserts[0].owner_user_id).toBe(PRIOR_OWNER)
    // The existing contact was NOT re-inserted; the deal was added on top.
    expect(state.contacts.inserts).toHaveLength(0)
  })

  it('produces a distinct deal on a second submission with the same email + treatment', async () => {
    // Simulating a second call: same email-tier dedup hit + a prior deal
    // already exists. We just assert that the deal-insert path runs and
    // produces a new id; no de-duplication of deals.
    const { client, state } = makeFake()
    state.contacts.rows.push({ id: 'existing-contact-2' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-second' })
    state.activities.insertReturns.push({ id: 'act-second' })
    state.deals.insertReturns.push({ id: 'deal-second' })
    stageOfferingHappyPath(state)
    state.deals.rows.push({ owner_user_id: 'user-existing' })

    const result = await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    expect(result.deal_id).toBe('deal-second')
    expect(state.deals.inserts).toHaveLength(1) // a fresh insert occurred
  })
})

describe('ingestLead — Phase 2a.7 no-treatment fallback', () => {
  it('lands on the tenant default pipeline first stage with title "Inquiry"', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-noT' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-noT' })
    state.activities.insertReturns.push({ id: 'act-noT' })
    state.deals.insertReturns.push({ id: 'deal-noT' })
    stageInquiryFallback(state)
    state.practice_notification_routing.rows.push({ primary_user_id: null })

    const result = await ingestLead(baseInput(), client) // no treatment_offering_id

    expect(result.deal_id).toBe('deal-noT')
    expect(state.deals.inserts[0]).toMatchObject({
      title: 'Inquiry',
      pipeline_id: DEFAULT_PIPELINE_ID,
      stage_id: DEFAULT_STAGE_ID,
      value_estimate_cents: null,
      treatment_tags: null,
    })
  })

  it('treatment specified but no matching offering → falls through to Inquiry on default pipeline', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-miss' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-miss' })
    state.activities.insertReturns.push({ id: 'act-miss' })
    state.deals.insertReturns.push({ id: 'deal-miss' })
    // No offering staged — the offering lookup returns null.
    stageInquiryFallback(state)

    const result = await ingestLead(
      baseInput({ treatment_offering_id: 'offering-doesnt-exist' }),
      client
    )

    expect(result.deal_id).toBe('deal-miss')
    expect(state.deals.inserts[0].title).toBe('Inquiry')
    expect(state.deals.inserts[0].pipeline_id).toBe(DEFAULT_PIPELINE_ID)
  })
})

describe('ingestLead — Phase 2a.7 review_required path', () => {
  it('does NOT create a deal when dedup decision is review_required', async () => {
    const { client, state } = makeFake()
    state.contacts.rows.push({ id: 'a' }, { id: 'b' }) // forces review_required
    state.dedup_review_queue.insertReturns.push({ id: 'q-noDeal' })

    const result = await ingestLead(baseInput(), client)

    expect(result.dedup_decision).toBe('review_required')
    expect(result.deal_id).toBeNull()
    expect(state.deals.inserts).toHaveLength(0)
  })
})

describe('ingestLead — Phase 2a.7 graceful failure cases', () => {
  it('zero-stage pipeline → deal_id null, no exception', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-zeroStg' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-zeroStg' })
    state.activities.insertReturns.push({ id: 'act-zeroStg' })
    // Default-pipeline lookup succeeds, but the pipeline_stages lookup
    // returns no rows (rows array is empty).
    state.pipelines.rows.push({ id: DEFAULT_PIPELINE_ID })

    const result = await ingestLead(baseInput(), client)

    expect(result.deal_id).toBeNull()
    expect(state.deals.inserts).toHaveLength(0)
    // The lead was still captured.
    expect(result.contact_id).toBe('c-zeroStg')
    expect(result.activity_id).toBe('act-zeroStg')
  })

  it('no default pipeline for tenant → deal_id null, lead still captured', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-noDefault' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-noDefault' })
    state.activities.insertReturns.push({ id: 'act-noDefault' })
    // No pipelines staged → default-pipeline lookup returns null.

    const result = await ingestLead(baseInput(), client)

    expect(result.deal_id).toBeNull()
    expect(state.deals.inserts).toHaveLength(0)
    expect(result.contact_id).toBe('c-noDefault')
  })
})

// =============================================================================
// Phase 2a.8 — `is_active` filter on the offering lookup
// =============================================================================
describe('ingestLead — Phase 2a.8 inactive-offering routes to Inquiry fallback', () => {
  it('passes is_active=true to the offering lookup, so an inactive offering returns no row', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-2a8-inactive' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-2a8-inactive' })
    state.activities.insertReturns.push({ id: 'act-2a8-inactive' })
    state.deals.insertReturns.push({ id: 'deal-2a8-inactive' })

    // The SLA resolver also queries practice_treatment_offerings for
    // custom_sla_minutes; that lookup is NOT under the deal-creation 2a.8
    // filter (it lives in sla-resolver.ts and predates the toggle). We stage
    // a single offering row to satisfy it; deal-creation's own offering
    // lookup gets nothing because the row queue is now empty by the time
    // it runs. The point of this test is to lock in the *filter shape* on
    // the deal-creation lookup, not the data outcome \u2014 the live behaviour
    // (no row returned for inactive offerings) follows from the DB applying
    // the filter, which we don't simulate here.
    state.practice_treatment_offerings.rows.push({
      id: OFFERING_ID,
      custom_label: 'Implants',
      pipeline_id: TREATMENT_PIPELINE_ID,
      stage_id: null,
      custom_lead_value_cents_min: null,
      custom_lead_value_cents_max: null,
      custom_sla_minutes: null,
      treatment_types: { display_name: 'Implants', default_sla_minutes: null },
    })
    stageInquiryFallback(state)

    await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    // Two select calls land on practice_treatment_offerings: SLA resolver,
    // then deal-creation. Deal-creation\u2019s call (the second one) MUST include
    // .eq('is_active', true).
    const filterSets = state.practice_treatment_offerings.selectFilters
    expect(filterSets.length).toBeGreaterThanOrEqual(2)
    const dealCreationFilter = filterSets[filterSets.length - 1]
    expect(
      dealCreationFilter.some(([col, val]) => col === 'is_active' && val === true)
    ).toBe(true)
  })

  it('with no offering row staged for deal-creation (simulating an inactive row filtered out by DB), the deal lands on the Inquiry fallback', async () => {
    const { client, state } = makeFake()
    state.contacts.insertReturns.push({ id: 'c-2a8-falls-through' })
    state.attribution_touchpoints.insertReturns.push({ id: 'tp-2a8-falls-through' })
    state.activities.insertReturns.push({ id: 'act-2a8-falls-through' })
    state.deals.insertReturns.push({ id: 'deal-2a8-falls-through' })
    // Stage exactly one offering row \u2014 it gets consumed by the SLA resolver.
    // When deal-creation\u2019s lookup runs, no row remains, simulating the live
    // path where the DB returned no rows because is_active=false filtered the
    // row out. The fallback then kicks in.
    state.practice_treatment_offerings.rows.push({
      id: OFFERING_ID,
      custom_label: null,
      pipeline_id: TREATMENT_PIPELINE_ID,
      stage_id: null,
      custom_lead_value_cents_min: null,
      custom_lead_value_cents_max: null,
      custom_sla_minutes: null,
      treatment_types: { display_name: 'Implants', default_sla_minutes: null },
    })
    stageInquiryFallback(state)

    const result = await ingestLead(
      baseInput({ treatment_offering_id: OFFERING_ID }),
      client
    )

    expect(result.deal_id).toBe('deal-2a8-falls-through')
    expect(state.deals.inserts[0]).toMatchObject({
      title: 'Inquiry',
      pipeline_id: DEFAULT_PIPELINE_ID,
      stage_id: DEFAULT_STAGE_ID,
      treatment_tags: null,
    })
  })
})

describe('ingestLead — Phase 2a.7 idempotent replay', () => {
  it('replay does NOT create a duplicate deal; surfaces the prior deal_id from the activity', async () => {
    const { client, state } = makeFake()
    // Stage the touchpoint lookup hit (first DB call when event_id is set).
    state.attribution_touchpoints.rows.push({
      id: 'tp-replay',
      contact_id: 'c-replay',
      treatment_offering_id: null,
      occurred_at: new Date().toISOString(),
      source_channel: 'form_embedded',
    })
    // Stage the activity lookup that follows — this is where the deal_id is
    // surfaced from on replay.
    state.activities.rows.push({ id: 'act-replay', deal_id: 'deal-prior-xyz' })

    const result = await ingestLead(
      baseInput({ event_id: 'webhook-retry-key-1' }),
      client
    )

    expect(result.idempotent_replay).toBe(true)
    expect(result.deal_id).toBe('deal-prior-xyz')
    // No new deal insert happened during the replay short-circuit.
    expect(state.deals.inserts).toHaveLength(0)
  })
})
