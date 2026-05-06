/**
 * Phase 2a.2a — dedup engine unit tests.
 *
 * The supabase client is fully stubbed: each call to `.from(table)` returns a
 * fluent query builder whose terminal `.limit(n)` resolves to a pre-staged
 * `{ data, error }`. We pre-stage results per table so a single test can
 * exercise multiple tiers (e.g. "email miss → phone hit").
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { resolveDedup, type DedupCandidate } from '../dedup-engine'

type StagedResult = { data: any[]; error: any }

interface StubState {
  contactsByEmail: StagedResult
  contactsByPhone: StagedResult
  channelIdentifiers: StagedResult
}

function makeContactsBuilder(state: StubState) {
  // The dedup engine uses `.ilike(...)` only on the email tier and `.or(...)`
  // only on the phone tier. We watch which one fires before `.limit()` to
  // decide which staged result to return.
  let mode: 'email' | 'phone' | null = null
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    not: () => builder,
    order: () => builder,
    ilike: () => {
      mode = 'email'
      return builder
    },
    or: () => {
      mode = 'phone'
      return builder
    },
    limit: () => {
      if (mode === 'email') return Promise.resolve(state.contactsByEmail)
      if (mode === 'phone') return Promise.resolve(state.contactsByPhone)
      return Promise.resolve({ data: [], error: null })
    },
  }
  return builder
}

function makeChannelBuilder(state: StubState) {
  const builder: any = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    not: () => builder,
    limit: () => Promise.resolve(state.channelIdentifiers),
  }
  return builder
}

function makeStub(initial: Partial<StubState> = {}): {
  client: SupabaseClient
  state: StubState
} {
  const state: StubState = {
    contactsByEmail: { data: [], error: null },
    contactsByPhone: { data: [], error: null },
    channelIdentifiers: { data: [], error: null },
    ...initial,
  }

  const client = {
    from: (table: string) => {
      if (table === 'contacts') return makeContactsBuilder(state)
      if (table === 'channel_identifiers') return makeChannelBuilder(state)
      throw new Error(`Unexpected from(${table}) in dedup test stub`)
    },
  } as unknown as SupabaseClient

  return { client, state }
}

const TENANT = '00000000-0000-0000-0000-000000000001'

// Use a real UK mobile range (07911 = EE/T-Mobile). libphonenumber-js
// rejects 07700900xxx (Ofcom drama range) as invalid.
const TEST_PHONE_E164 = '+447911123456'

const baseCandidate = (overrides: Partial<DedupCandidate> = {}): DedupCandidate => ({
  tenant_id: TENANT,
  email: 'patient@example.com',
  phone: TEST_PHONE_E164,
  full_name: 'Test Patient',
  ...overrides,
})

describe('resolveDedup', () => {
  it('Tier 4: returns "new" when nothing matches', async () => {
    const { client } = makeStub()
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('new')
    expect(result.signals.email_normalised).toBe('patient@example.com')
    expect(result.signals.phone_normalised_e164).toBe('+447911123456')
    expect(result.signals.email_match).toBe(false)
    expect(result.signals.phone_match).toBe(false)
  })

  it('Tier 1: matches on email when one contact has the same email', async () => {
    const { client } = makeStub({
      contactsByEmail: { data: [{ id: 'contact-1' }], error: null },
    })
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('matched')
    if (result.decision === 'matched') expect(result.contact_id).toBe('contact-1')
    expect(result.signals.email_match).toBe(true)
  })

  it('Tier 1: review_required when multiple contacts share the email', async () => {
    const { client } = makeStub({
      contactsByEmail: { data: [{ id: 'a' }, { id: 'b' }], error: null },
    })
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('review_required')
    if (result.decision === 'review_required') {
      expect(result.matched_contact_ids).toEqual(['a', 'b'])
      expect(result.signals.conflict_reason).toBe('multiple_email_matches')
    }
  })

  it('Tier 2: matches on phone when neither side has email', async () => {
    const { client } = makeStub({
      contactsByPhone: {
        data: [{ id: 'contact-2', primary_email: null, primary_phone_e164: '+447911123456' }],
        error: null,
      },
    })
    const result = await resolveDedup(baseCandidate({ email: null }), client)
    expect(result.decision).toBe('matched')
    if (result.decision === 'matched') expect(result.contact_id).toBe('contact-2')
    expect(result.signals.phone_match).toBe(true)
  })

  it('Tier 2: matches on phone when candidate has email but contact does not', async () => {
    const { client } = makeStub({
      contactsByPhone: {
        data: [{ id: 'contact-3', primary_email: null, primary_phone_e164: '+447911123456' }],
        error: null,
      },
    })
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('matched')
    if (result.decision === 'matched') expect(result.contact_id).toBe('contact-3')
  })

  it('Tier 2: review_required when phone matches but emails differ (family-share case)', async () => {
    const { client } = makeStub({
      contactsByPhone: {
        data: [{ id: 'contact-4', primary_email: 'spouse@example.com', primary_phone_e164: '+447911123456' }],
        error: null,
      },
    })
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('review_required')
    if (result.decision === 'review_required') {
      expect(result.signals.conflict_reason).toBe('phone_matches_different_email')
      expect(result.matched_contact_ids).toEqual(['contact-4'])
    }
  })

  it('Tier 2: review_required when 2+ contacts share the phone', async () => {
    const { client } = makeStub({
      contactsByPhone: {
        data: [
          { id: 'a', primary_email: 'a@x.com', primary_phone_e164: '+447911123456' },
          { id: 'b', primary_email: 'b@x.com', primary_phone_e164: '+447911123456' },
        ],
        error: null,
      },
    })
    const result = await resolveDedup(baseCandidate({ email: null }), client)
    expect(result.decision).toBe('review_required')
    if (result.decision === 'review_required') {
      expect(result.signals.conflict_reason).toBe('multiple_phone_matches')
    }
  })

  it('Tier 3: matches on channel_identifier (e.g. WhatsApp number)', async () => {
    const { client } = makeStub({
      channelIdentifiers: { data: [{ contact_id: 'contact-wa' }], error: null },
    })
    const result = await resolveDedup(
      baseCandidate({
        email: null,
        phone: null,
        channel_identifier: { kind: 'whatsapp_phone', value: '+447911123457' },
      }),
      client
    )
    expect(result.decision).toBe('matched')
    if (result.decision === 'matched') expect(result.contact_id).toBe('contact-wa')
    expect(result.signals.channel_identifier_match).toBe(true)
  })

  it('Treats malformed email as no email and falls through to phone tier', async () => {
    const { client } = makeStub({
      contactsByPhone: {
        data: [{ id: 'contact-5', primary_email: null, primary_phone_e164: '+447911123456' }],
        error: null,
      },
    })
    const result = await resolveDedup(baseCandidate({ email: 'not-an-email' }), client)
    expect(result.decision).toBe('matched')
    expect(result.signals.email_normalised).toBeUndefined()
    expect(result.signals.phone_normalised_e164).toBe('+447911123456')
  })

  it('Treats malformed phone as no phone', async () => {
    const { client } = makeStub()
    const result = await resolveDedup(
      baseCandidate({ email: null, phone: 'definitely-not-a-phone' }),
      client
    )
    expect(result.decision).toBe('new')
    expect(result.signals.phone_normalised_e164).toBeUndefined()
  })

  it('Cross-tenant isolation: filters by tenant_id (verified by stub assertion)', async () => {
    // We capture the eq() call args via a richer stub.
    const eqCalls: Array<[string, unknown]> = []
    const builderForState = (result: StagedResult) => {
      const b: any = {
        select: () => b,
        eq: (col: string, val: unknown) => {
          eqCalls.push([col, val])
          return b
        },
        ilike: () => b,
        is: () => b,
        not: () => b,
        or: () => b,
        limit: () => Promise.resolve(result),
      }
      return b
    }
    const client = {
      from: () => builderForState({ data: [], error: null }),
    } as unknown as SupabaseClient

    await resolveDedup(baseCandidate({ tenant_id: 'tenant-A' }), client)

    const tenantFilters = eqCalls.filter(([col]) => col === 'tenant_id')
    expect(tenantFilters.length).toBeGreaterThan(0)
    expect(tenantFilters.every(([, val]) => val === 'tenant-A')).toBe(true)
  })

  it('On unexpected DB error, fails safe to review_required (never auto-creates)', async () => {
    const { client } = makeStub({
      contactsByEmail: { data: [], error: { message: 'boom' } },
    })
    const result = await resolveDedup(baseCandidate(), client)
    expect(result.decision).toBe('review_required')
    if (result.decision === 'review_required') {
      expect(result.signals.conflict_reason).toBe('internal_error')
    }
  })
})
