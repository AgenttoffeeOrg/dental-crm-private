/**
 * Phase 2a.2a — SLA resolver unit tests.
 *
 * Stubbed supabase: route by table. The order method on the rule query is
 * a no-op in the stub (we just return staged rows in the order we want).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveSLA, SLA_SYSTEM_FALLBACK_MINUTES } from '../sla-resolver'

interface StubState {
  rules: { data: any[]; error: any }
  offering: { data: any; error: any }
}

function makeStub(state: StubState): SupabaseClient {
  const ruleBuilder: any = {
    select: () => ruleBuilder,
    eq: () => ruleBuilder,
    or: () => ruleBuilder,
    order: () => ruleBuilder,
    limit: () => Promise.resolve(state.rules),
  }
  const offeringBuilder: any = {
    select: () => offeringBuilder,
    eq: () => offeringBuilder,
    maybeSingle: () => Promise.resolve(state.offering),
  }
  return {
    from: (table: string) => {
      if (table === 'lead_sla_rules') return ruleBuilder
      if (table === 'practice_treatment_offerings') return offeringBuilder
      throw new Error(`Unexpected from(${table}) in sla test stub`)
    },
  } as unknown as SupabaseClient
}

const TENANT = 'tenant-A'
const ARRIVED = new Date('2026-05-03T12:00:00.000Z')
const OFFERING = 'offering-1'

const empty: StubState = {
  rules: { data: [], error: null },
  offering: { data: null, error: null },
}

describe('resolveSLA', () => {
  it('Tier 1: matched rule wins over offering default', async () => {
    const client = makeStub({
      rules: { data: [{ id: 'rule-1', first_response_minutes: 5, tenant_id: TENANT }], error: null },
      offering: {
        data: { custom_sla_minutes: 30, treatment_types: { default_sla_minutes: 60 } },
        error: null,
      },
    })
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: OFFERING, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('matched_rule')
    expect(out.sla_rule_id).toBe('rule-1')
    expect(out.first_response_minutes).toBe(5)
    expect(out.due_at.getTime()).toBe(ARRIVED.getTime() + 5 * 60_000)
  })

  it("Tier 2: offering's custom_sla_minutes when no rule matches", async () => {
    const client = makeStub({
      rules: { data: [], error: null },
      offering: {
        data: { custom_sla_minutes: 30, treatment_types: { default_sla_minutes: 60 } },
        error: null,
      },
    })
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: OFFERING, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('offering_default')
    expect(out.first_response_minutes).toBe(30)
    expect(out.sla_rule_id).toBeNull()
  })

  it('Tier 3: canonical default when no rule and no offering custom', async () => {
    const client = makeStub({
      rules: { data: [], error: null },
      offering: {
        data: { custom_sla_minutes: null, treatment_types: { default_sla_minutes: 45 } },
        error: null,
      },
    })
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: OFFERING, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('canonical_default')
    expect(out.first_response_minutes).toBe(45)
  })

  it('Tier 4: system fallback when nothing resolves', async () => {
    const client = makeStub({
      rules: { data: [], error: null },
      offering: {
        data: { custom_sla_minutes: null, treatment_types: { default_sla_minutes: null } },
        error: null,
      },
    })
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: OFFERING, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('system_fallback')
    expect(out.first_response_minutes).toBe(SLA_SYSTEM_FALLBACK_MINUTES)
  })

  it('NULL treatment_offering_id: falls straight to system fallback when no rule', async () => {
    const client = makeStub(empty)
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: null, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('system_fallback')
    expect(out.first_response_minutes).toBe(SLA_SYSTEM_FALLBACK_MINUTES)
  })

  it('Handles PostgREST returning treatment_types as an array', async () => {
    const client = makeStub({
      rules: { data: [], error: null },
      offering: {
        data: { custom_sla_minutes: null, treatment_types: [{ default_sla_minutes: 25 }] },
        error: null,
      },
    })
    const out = await resolveSLA(
      { tenant_id: TENANT, source_channel: 'form_embedded', treatment_offering_id: OFFERING, lead_arrived_at: ARRIVED },
      client
    )
    expect(out.source).toBe('canonical_default')
    expect(out.first_response_minutes).toBe(25)
  })
})
