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

interface CapturedQuery {
  table: string
  selectCols: string | null
  eqs: Array<[string, unknown]>
  isFilters: Array<[string, unknown]>
  orders: Array<{ col: string; ascending: boolean; nullsFirst: boolean }>
  limitN: number | null
  terminal: 'maybeSingle' | 'single' | null
}

function makeFakeClient(deals: FakeDealRow[], opts: { error?: { message: string } } = {}) {
  const captured: CapturedQuery[] = []

  const client = {
    from(table: string) {
      const q: CapturedQuery = {
        table,
        selectCols: null,
        eqs: [],
        isFilters: [],
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
          if (opts.error) return Promise.resolve({ data: null, error: opts.error })
          const filtered = applyFilters(deals, q)
          const ordered = applyOrders(filtered, q)
          return Promise.resolve({ data: ordered[0] ?? null, error: null })
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

  it('returns the most-recently-touched open deal when multiple exist (last_activity_at wins)', async () => {
    const { client } = makeFakeClient([
      deal({
        id: 'older',
        last_activity_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      }),
      deal({
        id: 'newer',
        last_activity_at: '2026-05-08T00:00:00Z',
        updated_at: '2026-04-15T00:00:00Z',
      }),
      deal({
        id: 'middle',
        last_activity_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-04-15T00:00:00Z',
      }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBe('newer')
  })

  it('falls back to updated_at when last_activity_at is null on the candidate row', async () => {
    // A deal whose last_activity_at is NULL but updated_at is more recent
    // than another deal's last_activity_at should still be sortable
    // (NULLs LAST keeps it after the populated row when last_activity_at is
    // the primary key, but among the NULL group the secondary updated_at
    // tiebreaker still ranks). When ALL candidates have last_activity_at,
    // updated_at is the tiebreaker.
    const { client } = makeFakeClient([
      deal({
        id: 'd-with-activity',
        last_activity_at: '2026-05-01T00:00:00Z',
        updated_at: '2026-05-01T00:00:00Z',
      }),
      deal({
        id: 'd-no-activity',
        last_activity_at: null,
        updated_at: '2026-05-08T00:00:00Z',
      }),
    ])
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    // last_activity_at is the primary order key (DESC, NULLS LAST), so the
    // populated row beats the NULL row regardless of updated_at deltas.
    // This locks in the documented "last_activity_at is canonical" choice.
    expect(result).toBe('d-with-activity')
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
    // Deal in pipeline B is more recently touched than the one in pipeline A.
    // The product rule explicitly does NOT filter by pipeline — any open deal
    // for the contact qualifies, regardless of which treatment offering /
    // pipeline lane.
    const { client } = makeFakeClient([
      deal({
        id: 'open-pipeline-A',
        pipeline_id: 'pipeline-A',
        last_activity_at: '2026-04-01T00:00:00Z',
      }),
      deal({
        id: 'open-pipeline-B',
        pipeline_id: 'pipeline-B',
        last_activity_at: '2026-05-08T00:00:00Z',
      }),
    ])
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

  it('returns null (does not throw) on supabase error', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { client } = makeFakeClient([], { error: { message: 'connection refused' } })
    const result = await findReusableOpenDeal(client, {
      tenantId: TENANT,
      contactId: CONTACT,
    })
    expect(result).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('findReusableOpenDeal'),
      expect.objectContaining({
        tenantId: TENANT,
        contactId: CONTACT,
      })
    )
    warnSpy.mockRestore()
  })

  it('issues exactly one query: SELECT from deals with pipeline_stages embedded join + tenant/contact filters', async () => {
    const { client, captured } = makeFakeClient([deal({ id: 'd-1' })])
    await findReusableOpenDeal(client, { tenantId: TENANT, contactId: CONTACT })

    expect(captured).toHaveLength(1)
    const q = captured[0]
    expect(q.table).toBe('deals')
    expect(q.selectCols).toContain('pipeline_stages!inner(is_won, is_lost)')
    expect(q.eqs).toEqual(
      expect.arrayContaining([
        ['tenant_id', TENANT],
        ['contact_id', CONTACT],
        ['pipeline_stages.is_won', false],
        ['pipeline_stages.is_lost', false],
      ])
    )
    expect(q.isFilters).toEqual(expect.arrayContaining([['deleted_at', null]]))
    expect(q.limitN).toBe(1)
    expect(q.terminal).toBe('maybeSingle')
    // Ordering is canonical: last_activity_at DESC, then updated_at DESC.
    expect(q.orders.map((o) => `${o.col} ${o.ascending ? 'ASC' : 'DESC'}`)).toEqual([
      'last_activity_at DESC',
      'updated_at DESC',
    ])
  })
})
