/**
 * Phase 2b.11.5b — resolveMostRecentlyActiveOpenDeal unit tests.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  isDealClosedByStage,
  isDealOpen,
  resolveMostRecentlyActiveOpenDeal,
  sortDealsByRecentActivity,
} from '../deal-resolver'

const TENANT = '5aadca14-9786-4aef-bc53-e9287cdd0bbf'
const CONTACT = 'contact-1'

interface FakeDeal {
  id: string
  title: string
  tenant_id: string
  contact_id: string
  updated_at: string | null
  deleted_at: string | null
  pipeline_stages: { is_won: boolean; is_lost: boolean }
}

interface FakeActivity {
  deal_id: string
  occurred_at: string
  tenant_id: string
}

function makeClient(deals: FakeDeal[], activities: FakeActivity[] = []) {
  const client = {
    from(table: string) {
      if (table === 'deals') {
        return makeDealsBuilder(deals)
      }
      if (table === 'activities') {
        return makeActivitiesBuilder(activities)
      }
      throw new Error(`unexpected table ${table}`)
    },
  } as unknown as SupabaseClient

  return client
}

function makeDealsBuilder(deals: FakeDeal[]) {
  const eqs: Array<[string, unknown]> = []
  const isFilters: Array<[string, unknown]> = []

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      eqs.push([col, val])
      return builder
    },
    is: (col: string, val: unknown) => {
      isFilters.push([col, val])
      return builder
    },
    then: undefined as unknown,
  }

  const run = () => {
    let rows = deals.filter((d) => {
      for (const [col, val] of eqs) {
        if (col === 'tenant_id' && d.tenant_id !== val) return false
        if (col === 'contact_id' && d.contact_id !== val) return false
      }
      for (const [col, val] of isFilters) {
        if (col === 'deleted_at' && val === null && d.deleted_at != null) return false
      }
      const stage = d.pipeline_stages
      const wonEq = eqs.find(([c]) => c === 'pipeline_stages.is_won')
      const lostEq = eqs.find(([c]) => c === 'pipeline_stages.is_lost')
      if (wonEq && stage.is_won !== wonEq[1]) return false
      if (lostEq && stage.is_lost !== lostEq[1]) return false
      return true
    })
    return Promise.resolve({ data: rows, error: null })
  }

  // PostgREST builders are thenable
  ;(builder as { then: (fn: (v: unknown) => void) => void }).then = (resolve) =>
    run().then(resolve)

  return builder
}

function makeActivitiesBuilder(activities: FakeActivity[]) {
  const eqs: Array<[string, unknown]> = []
  let inDealIds: string[] | null = null

  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: (col: string, val: unknown) => {
      eqs.push([col, val])
      return builder
    },
    in: (col: string, vals: string[]) => {
      if (col === 'deal_id') inDealIds = vals
      return builder
    },
    then: undefined as unknown,
  }

  const run = () => {
    let rows = activities
    for (const [col, val] of eqs) {
      rows = rows.filter((r) => (r as Record<string, unknown>)[col] === val)
    }
    if (inDealIds) {
      rows = rows.filter((r) => inDealIds!.includes(r.deal_id))
    }
    return Promise.resolve({ data: rows, error: null })
  }

  ;(builder as { then: (fn: (v: unknown) => void) => void }).then = (resolve) =>
    run().then(resolve)

  return builder
}

const openStage = { is_won: false, is_lost: false }
const wonStage = { is_won: true, is_lost: false }
const lostStage = { is_won: false, is_lost: true }

describe('resolveMostRecentlyActiveOpenDeal', () => {
  it('returns the only open deal when contact has one', async () => {
    const client = makeClient([
      {
        id: 'deal-a',
        title: 'Implants',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: openStage,
      },
    ])
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result).toEqual({ id: 'deal-a', title: 'Implants' })
  })

  it('returns deal with latest activity when multiple open deals exist', async () => {
    const client = makeClient(
      [
        {
          id: 'deal-a',
          title: 'Older',
          tenant_id: TENANT,
          contact_id: CONTACT,
          updated_at: '2026-05-01T00:00:00Z',
          deleted_at: null,
          pipeline_stages: openStage,
        },
        {
          id: 'deal-b',
          title: 'Hot',
          tenant_id: TENANT,
          contact_id: CONTACT,
          updated_at: '2026-01-01T00:00:00Z',
          deleted_at: null,
          pipeline_stages: openStage,
        },
      ],
      [
        { deal_id: 'deal-a', occurred_at: '2026-05-10T10:00:00Z', tenant_id: TENANT },
        { deal_id: 'deal-b', occurred_at: '2026-05-20T10:00:00Z', tenant_id: TENANT },
      ]
    )
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result?.id).toBe('deal-b')
  })

  it('uses updated_at tiebreaker when no activities exist', async () => {
    const client = makeClient([
      {
        id: 'deal-a',
        title: 'A',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-03-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: openStage,
      },
      {
        id: 'deal-b',
        title: 'B',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-05-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: openStage,
      },
    ])
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result?.id).toBe('deal-b')
  })

  it('ignores closed deals and returns the open one', async () => {
    const client = makeClient([
      {
        id: 'deal-won',
        title: 'Won',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-06-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: wonStage,
      },
      {
        id: 'deal-lost',
        title: 'Lost',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-06-02T00:00:00Z',
        deleted_at: null,
        pipeline_stages: lostStage,
      },
      {
        id: 'deal-open',
        title: 'Open',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-01-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: openStage,
      },
    ])
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result?.id).toBe('deal-open')
  })

  it('returns null when all deals are closed', async () => {
    const client = makeClient([
      {
        id: 'deal-won',
        title: 'Won',
        tenant_id: TENANT,
        contact_id: CONTACT,
        updated_at: '2026-06-01T00:00:00Z',
        deleted_at: null,
        pipeline_stages: wonStage,
      },
    ])
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result).toBeNull()
  })

  it('returns null when contact has no deals', async () => {
    const client = makeClient([])
    const result = await resolveMostRecentlyActiveOpenDeal({
      tenantId: TENANT,
      contactId: CONTACT,
      supabase: client,
    })
    expect(result).toBeNull()
  })
})

describe('isDealOpen / isDealClosedByStage', () => {
  it('treats won/lost flags as closed', () => {
    expect(isDealOpen({ is_won: false, is_lost: false })).toBe(true)
    expect(isDealClosedByStage({ is_won: true, is_lost: false })).toBe(true)
    expect(isDealClosedByStage({ is_won: false, is_lost: true })).toBe(true)
  })
})

describe('sortDealsByRecentActivity', () => {
  it('orders by max activity then updated_at', () => {
    const map = new Map([
      ['a', '2026-05-01T00:00:00Z'],
      ['b', '2026-05-20T00:00:00Z'],
    ])
    const sorted = sortDealsByRecentActivity(
      [
        { id: 'a', updated_at: '2026-06-01' },
        { id: 'b', updated_at: '2026-01-01' },
      ],
      map
    )
    expect(sorted[0].id).toBe('b')
  })
})
