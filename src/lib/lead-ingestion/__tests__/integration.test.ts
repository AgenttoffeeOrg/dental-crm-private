/**
 * Phase 2a.2a — `ingestLead()` integration tests.
 *
 * Runs the engine end-to-end against the real Supabase database. Uses a
 * unique test-data prefix so we can selectively clean up afterward without
 * touching legitimate tenant data.
 *
 * Skipped automatically when SUPABASE_SERVICE_ROLE_KEY isn't in the env so
 * unit-only test runs (and CI without secrets) stay green.
 *
 * Run: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
 *      npm run test:integration -- src/lib/lead-ingestion/__tests__/integration.test.ts
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ingestLead, setNotificationEmitter } from '../ingest-lead'

const TENANT_ID = '5aadca14-9786-4aef-bc53-e9287cdd0bbf' // live test tenant
const TEST_PREFIX = `phase2a2a_test_${Date.now()}_`

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// jest.setup.js stamps placeholder values so unit tests have something to
// import; we skip integration unless we see a real (non-localhost) URL AND
// the LEAD_INGESTION_INTEGRATION=1 opt-in flag (so the suite never accidentally
// runs against production).
const HAS_LIVE_DB =
  !!SUPABASE_URL &&
  !!SUPABASE_SERVICE_ROLE_KEY &&
  !SUPABASE_URL.includes('localhost') &&
  SUPABASE_SERVICE_ROLE_KEY !== 'supabase-test-key' &&
  process.env.LEAD_INGESTION_INTEGRATION === '1'

const describeIfLive = HAS_LIVE_DB ? describe : describe.skip

// Pre-create a real service-role client; reuse across tests so cleanup hits
// the same connection.
let supabase: SupabaseClient

beforeAll(() => {
  if (!HAS_LIVE_DB) return
  supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  // Suppress notification dispatch during integration tests (we already test
  // it separately in 2a.2b's notification-router suite).
  setNotificationEmitter(async () => {})
})

afterAll(async () => {
  if (!HAS_LIVE_DB) return
  // Cascade cleanup: deleting contacts removes their touchpoints/activities
  // via FK + downstream cleanup. We also wipe queue rows by tenant since
  // they don't have a contact FK.
  await supabase
    .from('contacts')
    .delete()
    .eq('tenant_id', TENANT_ID)
    .ilike('full_name', `${TEST_PREFIX}%`)
  await supabase.from('dedup_review_queue').delete().eq('tenant_id', TENANT_ID).ilike('candidate_name', `${TEST_PREFIX}%`)
})

const uniqueEmail = (suffix: string) => `${TEST_PREFIX}${suffix}@example.com`

describeIfLive('ingestLead — integration (live DB)', () => {
  test('Webform happy path: creates contact, touchpoint, activity', async () => {
    const result = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: {
          email: uniqueEmail('happy1'),
          phone: '+447911111001',
          full_name: `${TEST_PREFIX} Happy Path`,
        },
        attribution: { utm_source: 'integration_test' },
        raw_payload: { foo: 'bar' },
      },
      supabase
    )

    expect(result.dedup_decision).toBe('new')
    expect(result.contact_id).toBeTruthy()
    expect(result.attribution_touchpoint_id).toBeTruthy()
    expect(result.activity_id).toBeTruthy()
    expect(result.sla?.minutes).toBeGreaterThan(0)

    const { data: contact } = await supabase
      .from('contacts')
      .select('id, full_name, primary_email_norm')
      .eq('id', result.contact_id!)
      .single()
    expect(contact?.primary_email_norm).toBe(uniqueEmail('happy1'))
  })

  test('Email dedup: second submit with same email returns same contact_id', async () => {
    const email = uniqueEmail('dup_email')
    const first = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email, full_name: `${TEST_PREFIX} Dup Email` },
        raw_payload: {},
      },
      supabase
    )
    const second = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email, full_name: `${TEST_PREFIX} Dup Email Again` },
        raw_payload: {},
      },
      supabase
    )
    expect(first.dedup_decision).toBe('new')
    expect(second.dedup_decision).toBe('matched')
    expect(second.contact_id).toBe(first.contact_id)
  })

  test('Phone-only conflict: phone matches existing contact with different email → review_required', async () => {
    const phone = '+447911111002'
    const existingEmail = uniqueEmail('existing')
    const newEmail = uniqueEmail('different')

    await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email: existingEmail, phone, full_name: `${TEST_PREFIX} Original` },
        raw_payload: {},
      },
      supabase
    )

    const conflict = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email: newEmail, phone, full_name: `${TEST_PREFIX} Different Person` },
        raw_payload: {},
      },
      supabase
    )

    expect(conflict.dedup_decision).toBe('review_required')
    expect(conflict.contact_id).toBeNull()
    expect(conflict.queue_item_id).toBeTruthy()
    expect(conflict.dedup_signals.conflict_reason).toBe('phone_matches_different_email')
  })

  test('Idempotency: same event_id returns identical result without double-insert', async () => {
    const eventId = `${TEST_PREFIX}event_${Math.random().toString(36).slice(2)}`
    const first = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email: uniqueEmail('idem'), full_name: `${TEST_PREFIX} Idempotent` },
        raw_payload: {},
        event_id: eventId,
      },
      supabase
    )
    const second = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email: uniqueEmail('idem'), full_name: `${TEST_PREFIX} Idempotent` },
        raw_payload: {},
        event_id: eventId,
      },
      supabase
    )
    expect(second.idempotent_replay).toBe(true)
    expect(second.contact_id).toBe(first.contact_id)
    expect(second.attribution_touchpoint_id).toBe(first.attribution_touchpoint_id)

    const { count } = await supabase
      .from('attribution_touchpoints')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .eq('event_id', eventId)
    expect(count).toBe(1)
  })

  test('SLA resolution: offering custom_sla_minutes wins when no matching rule', async () => {
    // Pick any tenant offering and override its custom_sla_minutes for this scenario.
    const { data: offering } = await supabase
      .from('practice_treatment_offerings')
      .select('id, custom_sla_minutes')
      .eq('tenant_id', TENANT_ID)
      .eq('is_active', true)
      .limit(1)
      .single()

    expect(offering).toBeTruthy()
    const offeringId = offering!.id as string
    const originalCustom = offering!.custom_sla_minutes

    // The platform seeds a default lead_sla_rule per source_channel. Deactivate
    // the form_embedded rule briefly so the offering's custom SLA can win
    // (Tier 2). Restore it in finally so we don't pollute global state.
    const { data: ruleRows } = await supabase
      .from('lead_sla_rules')
      .select('id')
      .eq('source_channel', 'form_embedded')
      .eq('is_active', true)
    const deactivatedRuleIds = (ruleRows ?? []).map((r) => r.id as string)

    await supabase.from('practice_treatment_offerings').update({ custom_sla_minutes: 7 }).eq('id', offeringId)
    if (deactivatedRuleIds.length > 0) {
      await supabase.from('lead_sla_rules').update({ is_active: false }).in('id', deactivatedRuleIds)
    }

    try {
      const result = await ingestLead(
        {
          tenant_id: TENANT_ID,
          source_channel: 'form_embedded',
          contact: { email: uniqueEmail('sla'), full_name: `${TEST_PREFIX} SLA Test` },
          treatment_offering_id: offeringId,
          raw_payload: {},
        },
        supabase
      )
      expect(result.sla?.minutes).toBe(7)
      expect(result.sla?.rule_source).toBe('offering_default')
    } finally {
      await supabase
        .from('practice_treatment_offerings')
        .update({ custom_sla_minutes: originalCustom ?? null })
        .eq('id', offeringId)
      if (deactivatedRuleIds.length > 0) {
        await supabase.from('lead_sla_rules').update({ is_active: true }).in('id', deactivatedRuleIds)
      }
    }
  })

  test('No offering: touchpoint records treatment_offering_id as null', async () => {
    const result = await ingestLead(
      {
        tenant_id: TENANT_ID,
        source_channel: 'form_embedded',
        contact: { email: uniqueEmail('no_offering'), full_name: `${TEST_PREFIX} No Offering` },
        raw_payload: {},
      },
      supabase
    )
    const { data: tp } = await supabase
      .from('attribution_touchpoints')
      .select('treatment_offering_id')
      .eq('id', result.attribution_touchpoint_id!)
      .single()
    expect(tp?.treatment_offering_id).toBeNull()
  })

  test('Concurrent submissions with same email produce exactly one contact', async () => {
    const email = uniqueEmail('concurrent')
    const calls = Array.from({ length: 5 }, () =>
      ingestLead(
        {
          tenant_id: TENANT_ID,
          source_channel: 'form_embedded',
          contact: { email, full_name: `${TEST_PREFIX} Concurrent` },
          raw_payload: {},
        },
        supabase
      )
    )
    const results = await Promise.allSettled(calls)
    const successful = results.filter((r) => r.status === 'fulfilled')
    expect(successful.length).toBeGreaterThan(0)

    const contactIds = new Set(
      successful
        .map((r) => (r as PromiseFulfilledResult<Awaited<ReturnType<typeof ingestLead>>>).value.contact_id)
        .filter(Boolean)
    )
    // The 5 concurrent calls may produce 1 contact (winning racer) or queue
    // items for losers (race detected as multiple_email_matches). Either way,
    // there should be at most 1 distinct contact_id.
    expect(contactIds.size).toBeLessThanOrEqual(1)

    // Verify the DB has exactly one row.
    const { count } = await supabase
      .from('contacts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', TENANT_ID)
      .eq('primary_email_norm', email)
    expect(count).toBe(1)
  })
})

if (!HAS_LIVE_DB) {
  // Emit a single skipped marker so consumers see why this file produced no results.
  test.skip('integration tests require NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY env', () => {
    /* skipped */
  })
}
