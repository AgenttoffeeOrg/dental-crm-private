/**
 * Phase 2b.2.a.3 — `findReusableOpenDeal` unit tests.
 *
 * Verifies the engine's open-deal lookup contract:
 *   - "open" = `pipeline_stages.is_won = false AND is_lost = false`
 *   - returns the most-recently-touched open deal id when one exists
 *   - returns null when no open deal exists (no deals at all OR all closed)
 *   - no pipeline filter — open deals in any pipeline qualify for reuse
 *   - DB error → null (graceful, never throws)
 *
 * Strategy: a tiny in-memory fake supabase that mirrors the small subset of
 * the JS client `findReusableOpenDeal` actually uses
 * (`from().select().eq().is().order().limit().maybeSingle()`). The fake
 * applies the requested `.eq('pipeline_stages.is_won', false)` and
 * `.eq('pipeline_stages.is_lost', false)` filters against the embedded join
 * shape so each test stages a single canonical row set and asserts which
 * row(s) survive the filter + ordering.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { findReusableOpenDeal } from '../deal-creation'

interface FakeDealRow {
  id: string
  tenant_id: string
  contact_id: string
  pipeline_id: string
  last_activity_at: string | null
  updated_at: string | null
  deleted_at: string | null
  pipeline_stages: { is_won: boolean; is_lost: boolean }
}

interface FakeActivityRow {
  deal_id: string
  occurred_at: string
  tenant_id: string
}

interface CapturedQuery {
  table: string
  selectCols: string | null
  eqs: Array<[string, unknown]>
  isFilters: Array<[string, unknown]>
  inFilters: Array<[string, string[]]>
  orders: Array<{ col: string; ascending: boolean; nullsFirst: boolean }>
  limitN: number | null
  terminal: 'maybeSingle' | 'single' | null
}

function makeFakeClient(
  deals: FakeDealRow[],
  opts: {
    dealsError?: { message: string }
    activitiesError?: { message: string }
    activities?: FakeActivityRow[]
  } = {}
) {
  const captured: CapturedQuery[] = []
  const activities = opts.activities ?? []

  const client = {
    from(table: string) {
      const q: CapturedQuery = {
        table,
        selectCols: null,
        eqs: [],
        isFilters: [],
        inFilters: [],
        orders: [],
        limitN: null,
        terminal: null,
      }
      captured.push(q)

      const builder: any = {
        select: (cols: string) => {
          q.selectCols = cols
          return builder
        },
        eq: (col: string, val: unknown) => {
          q.eqs.push([col, val])
          return builder
        },
        is: (col: string, val: unknown) => {
          q.isFilters.push([col, val])
          return builder
        },
        in: (col: string, vals: string[]) => {
          q.inFilters.push([col, vals])
          return builder
        },
        order: (col: string, opts2: { ascending?: boolean; nullsFirst?: boolean } = {}) => {
          q.orders.push({
            col,
            ascending: opts2.ascending ?? true,
            nullsFirst: opts2.nullsFirst ?? false,
          })
          return builder
        },
        limit: (n: number) => {
          q.limitN = n
          return builder
        },
        maybeSingle: () => {
          q.terminal = 'maybeSingle'
          if (table === 'deals' && opts.dealsError) {
            return Promise.resolve({ data: null, error: opts.dealsError })
          }
          const filtered = applyFilters(deals, q)
          const ordered = applyOrders(filtered, q)
          return Promise.resolve({ data: ordered[0] ?? null, error: null })
        },
        then: (resolve: (v: { data: unknown; error: unknown }) => void) => {
          if (table === 'activities') {
            if (opts.activitiesError) {
              return Promise.resolve({ data: null, error: opts.activitiesError }).then(resolve)
            }
            let rows = activities.slice()
            for (const [col, val] of q.eqs) {
              rows = rows.filter((r) => (r as Record<string, unknown>)[col] === val)
            }
            for (const [col, vals] of q.inFilters) {
              if (col === 'deal_id') {
                rows = rows.filter((r) => vals.includes(r.deal_id))
              }
            }
            return Promise.resolve({ data: rows, error: null }).then(resolve)
          }
          if (table === 'deals') {
            if (opts.dealsError) {
              return Promise.resolve({ data: null, error: opts.dealsError }).then(resolve)
            }
            const filtered = applyFilters(deals, q)
            return Promise.resolve({ data: filtered, error: null }).then(resolve)
          }
          return Promise.resolve({ data: [], error: null }).then(resolve)
        },
      }
      return builder
    },
  } as unknown as SupabaseClient

  return { client, captured }
}

// Per-column filter predicates. Keeping these as a small lookup table keeps
// `applyFilters` itself flat (no chained if/else for new columns).
const EQ_FILTERS: Record<string, (r: FakeDealRow, val: unknown) => boolean> = {
  tenant_id: (r, val) => r.tenant_id === val,
  contact_id: (r, val) => r.contact_id === val,
  'pipeline_stages.is_won': (r, val) => r.pipeline_stages.is_won === val,
  'pipeline_stages.is_lost': (r, val) => r.pipeline_stages.is_lost === val,
}

function applyFilters(rows: FakeDealRow[], q: CapturedQuery): FakeDealRow[] {
  let out = rows.slice()
  for (const [col, val] of q.eqs) {
    const pred = EQ_FILTERS[col]
    if (pred) out = out.filter((r) => pred(r, val))
  }
  for (const [col, val] of q.isFilters) {
    if (col === 'deleted_at' && val === null) {
      out = out.filter((r) => r.deleted_at === null)
    }
  }
  return out
}

/**
 * Comparator for one ORDER BY clause. Handles null placement (NULLS LAST by
 * default) before delegating to a value compare. Extracted out so the main
 * `applyOrders` doesn't accumulate every branch into a single comparator.
 */
function compareByOrder(
  av: string | null,
  bv: string | null,
  o: { ascending: boolean; nullsFirst: boolean }
): number {
  const aNull = av === null
  const bNull = bv === null
  if (aNull && bNull) return 0
  if (aNull) return o.nullsFirst ? -1 : 1
  if (bNull) return o.nullsFirst ? 1 : -1
  if (av === bv) return 0
  const cmp = (av as string) < (bv as string) ? -1 : 1
  return o.ascending ? cmp : -cmp
}

function applyOrders(rows: FakeDealRow[], q: CapturedQuery): FakeDealRow[] {
  const sorted = rows.slice()
  sorted.sort((a, b) => {
    for (const o of q.orders) {
      const av = (a as unknown as Record<string, string | null>)[o.col]
      const bv = (b as unknown as Record<string, string | null>)[o.col]
      const cmp = compareByOrder(av, bv, o)
      if (cmp !== 0) return cmp
    }
    return 0
  })
  return sorted
}

const TENANT = '11111111-1111-1111-1111-111111111111'
const CONTACT = '22222222-2222-2222-2222-222222222222'
const OTHER_CONTACT = '33333333-3333-3333-3333-333333333333'

// Defaults for the fake row builder. Kept as a separate constant so `deal()`
// itself stays a flat merge rather than a long ?-chain (Lizard CCN budget).
const DEAL_DEFAULTS: FakeDealRow = {
  id: 'deal-x',
  tenant_id: TENANT,
  contact_id: CONTACT,
  pipeline_id: 'pipeline-A',
  last_activity_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-01T00:00:00Z',
  deleted_at: null,
  pipeline_stages: { is_won: false, is_lost: false },
}

function deal(overrides: Partial<FakeDealRow>): FakeDealRow {
  // Object spread preserves explicit `null` overrides, which a `??` chain
  // would coalesce away (the original bug here masked the null
  // last_activity_at fallback test). Flat one-liner keeps CCN at 1.
  return { ...DEAL_DEFAULTS, ...overrides }
}

describe('findReusableOpenDeal', () => {
  it('returns null when the contact has no deals at all', async () => {
    const { client } = makeFakeClient([])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
  })

  it('returns the deal id when one open deal exists', async () => {
    const { client } = makeFakeClient([deal({ id: 'deal-open-1' })])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('deal-open-1')
  })

  it('returns null when the only deal is in a closed-won stage', async () => {
    const { client } = makeFakeClient([
      deal({ id: 'deal-won', pipeline_stages: { is_won: true, is_lost: false } }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
  })

  it('returns null when the only deal is in a closed-lost stage', async () => {
    const { client } = makeFakeClient([
      deal({ id: 'deal-lost', pipeline_stages: { is_won: false, is_lost: true } }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
  })

  it('returns the open deal with latest activity when multiple exist', async () => {
    const { client } = makeFakeClient(
      [
        deal({ id: 'older', updated_at: '2026-04-01T00:00:00Z' }),
        deal({ id: 'newer', updated_at: '2026-04-15T00:00:00Z' }),
        deal({ id: 'middle', updated_at: '2026-04-15T00:00:00Z' }),
      ],
      {
        activities: [
          { deal_id: 'older', occurred_at: '2026-04-01T00:00:00Z', tenant_id: TENANT },
          { deal_id: 'newer', occurred_at: '2026-05-08T00:00:00Z', tenant_id: TENANT },
          { deal_id: 'middle', occurred_at: '2026-05-01T00:00:00Z', tenant_id: TENANT },
        ],
      }
    )
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('newer')
  })

  it('falls back to updated_at when no activities exist on any open deal', async () => {
    const { client } = makeFakeClient([
      deal({ id: 'd-a', updated_at: '2026-05-01T00:00:00Z' }),
      deal({ id: 'd-b', updated_at: '2026-05-08T00:00:00Z' }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('d-b')
  })

  it('reuses the middle open deal when it has the latest activity (not created_at order)', async () => {
    const { client } = makeFakeClient(
      [
        deal({ id: 'first-created', updated_at: '2026-01-01T00:00:00Z' }),
        deal({ id: 'middle-hot', updated_at: '2026-02-01T00:00:00Z' }),
        deal({ id: 'last-created', updated_at: '2026-03-01T00:00:00Z' }),
      ],
      {
        activities: [
          { deal_id: 'middle-hot', occurred_at: '2026-05-20T12:00:00Z', tenant_id: TENANT },
          { deal_id: 'first-created', occurred_at: '2026-05-01T00:00:00Z', tenant_id: TENANT },
        ],
      }
    )
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('middle-hot')
  })

  it('returns the open deal when the contact has a mix of open and closed deals', async () => {
    const { client } = makeFakeClient([
      deal({
        id: 'closed-1',
        pipeline_stages: { is_won: true, is_lost: false },
        last_activity_at: '2026-05-08T00:00:00Z',
      }),
      deal({
        id: 'open-1',
        pipeline_stages: { is_won: false, is_lost: false },
        last_activity_at: '2026-05-01T00:00:00Z',
      }),
      deal({
        id: 'closed-2',
        pipeline_stages: { is_won: false, is_lost: true },
        last_activity_at: '2026-05-09T00:00:00Z',
      }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('open-1')
  })

  it('reuses an open deal across pipelines (no pipeline filter applied)', async () => {
    const { client } = makeFakeClient(
      [
        deal({ id: 'open-pipeline-A', pipeline_id: 'pipeline-A' }),
        deal({ id: 'open-pipeline-B', pipeline_id: 'pipeline-B' }),
      ],
      {
        activities: [
          { deal_id: 'open-pipeline-A', occurred_at: '2026-04-01T00:00:00Z', tenant_id: TENANT },
          { deal_id: 'open-pipeline-B', occurred_at: '2026-05-08T00:00:00Z', tenant_id: TENANT },
        ],
      }
    )
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('open-pipeline-B')
  })

  it('returns the open deal when the closed deal lives in a different pipeline', async () => {
    // Open in A + closed in B → returns the open A. Validates we don't
    // accidentally short-circuit on the existence of any deal for the
    // contact, regardless of stage.
    const { client } = makeFakeClient([
      deal({
        id: 'open-A',
        pipeline_id: 'pipeline-A',
        pipeline_stages: { is_won: false, is_lost: false },
      }),
      deal({
        id: 'closed-B',
        pipeline_id: 'pipeline-B',
        pipeline_stages: { is_won: true, is_lost: false },
        last_activity_at: '2099-01-01T00:00:00Z',
      }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('open-A')
  })

  it('does not match deals belonging to a different contact in the same tenant', async () => {
    const { client } = makeFakeClient([
      deal({ id: 'other-contact-deal', contact_id: OTHER_CONTACT }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
  })

  it('skips soft-deleted deals (deleted_at IS NOT NULL)', async () => {
    const { client } = makeFakeClient([
      deal({ id: 'soft-deleted', deleted_at: '2026-04-30T00:00:00Z' }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
  })

  it('returns null (does not throw) on supabase deals error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { client } = makeFakeClient([], { dealsError: { message: 'connection refused' } })
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[deal-resolver]'),
      expect.objectContaining({ tenantId: TENANT, contactId: CONTACT })
    )
    warnSpy.mockRestore()
  })

  it('queries open deals then activities for max occurred_at (Phase 2b.11.5b)', async () => {
    const { client, captured } = makeFakeClient([deal({ id: 'd-1' })])
    await findReusableOpenDeal(client, { tenantId: TENANT, contactId: CONTACT })

    expect(captured.length).toBeGreaterThanOrEqual(2)
    const dealsQ = captured.find((q) => q.table === 'deals')
    const actQ = captured.find((q) => q.table === 'activities')
    expect(dealsQ?.selectCols).toContain('pipeline_stages!inner(is_won, is_lost)')
    expect(dealsQ?.eqs).toEqual(
      expect.arrayContaining([
        ['tenant_id', TENANT],
        ['contact_id', CONTACT],
        ['pipeline_stages.is_won', false],
        ['pipeline_stages.is_lost', false],
      ])
    )
    expect(actQ?.eqs).toEqual(expect.arrayContaining([['tenant_id', TENANT]]))
    expect(actQ?.inFilters).toEqual(expect.arrayContaining([['deal_id', ['d-1']]]))
  })
})
