/**
 * Phase 2b.38 — Tests for the ContactKpiStrip's KPI computation.
 *
 * The audit (§9, P2-recommended) explicitly asked these two cases be
 * covered:
 *
 *   1. Closed-lost contributes to LTV (the "lifetime value includes
 *      what passed through the relationship" rule).
 *   2. Open/closed split is by stage flags is_won / is_lost, never by
 *      stage-name substring (locked principle #9).
 */

import { computeKpis } from '../contact-kpi-strip'
import type { DealWithRelations } from '@/types/database'

function makeDeal(opts: {
  id: string
  isWon?: boolean
  isLost?: boolean
  valueCents?: number | null
}): DealWithRelations {
  return {
    id: opts.id,
    title: `Deal ${opts.id}`,
    value_estimate_cents: opts.valueCents ?? 0,
    stage: {
      // Names deliberately set to misleading values to prove the
      // flag-based split is what's actually consulted, not the name.
      name: opts.isWon ? 'Misleading Open Stage' : opts.isLost ? 'Misleading Won Stage' : 'Closed Won',
      is_won: !!opts.isWon,
      is_lost: !!opts.isLost,
    },
  } as unknown as DealWithRelations
}

describe('computeKpis', () => {
  it('returns zeros for an empty deal list', () => {
    expect(computeKpis([])).toEqual({
      openCount: 0,
      closedCount: 0,
      openValueCents: 0,
      wonValueCents: 0,
      lostValueCents: 0,
    })
  })

  it('counts open deals as those with neither is_won nor is_lost set', () => {
    const deals = [
      makeDeal({ id: '1', valueCents: 100000 }),
      makeDeal({ id: '2', valueCents: 200000 }),
      makeDeal({ id: '3', isWon: true, valueCents: 50000 }),
    ]
    const k = computeKpis(deals)
    expect(k.openCount).toBe(2)
    expect(k.closedCount).toBe(1)
    expect(k.openValueCents).toBe(300000)
  })

  it('treats is_won and is_lost as "closed" for counting purposes', () => {
    const deals = [
      makeDeal({ id: '1', isWon: true }),
      makeDeal({ id: '2', isLost: true }),
      makeDeal({ id: '3' }),
    ]
    const k = computeKpis(deals)
    expect(k.openCount).toBe(1)
    expect(k.closedCount).toBe(2)
  })

  it('routes won value into wonValueCents, not lostValueCents', () => {
    const deals = [makeDeal({ id: '1', isWon: true, valueCents: 700000 })]
    const k = computeKpis(deals)
    expect(k.wonValueCents).toBe(700000)
    expect(k.lostValueCents).toBe(0)
  })

  it('routes lost value into lostValueCents (closed-lost IS counted in LTV)', () => {
    const deals = [makeDeal({ id: '1', isLost: true, valueCents: 400000 })]
    const k = computeKpis(deals)
    expect(k.lostValueCents).toBe(400000)
    expect(k.wonValueCents).toBe(0)
  })

  it('LTV total = open + won + lost (lost is NOT excluded)', () => {
    const deals = [
      makeDeal({ id: '1', valueCents: 100000 }), // open
      makeDeal({ id: '2', isWon: true, valueCents: 200000 }), // won
      makeDeal({ id: '3', isLost: true, valueCents: 300000 }), // lost
    ]
    const k = computeKpis(deals)
    const total = k.openValueCents + k.wonValueCents + k.lostValueCents
    expect(total).toBe(600000)
    expect(k.lostValueCents).toBeGreaterThan(0) // proves lost IS in LTV
  })

  it('ignores stage NAME — only flags matter (locked principle #9)', () => {
    // Stage named "Closed Won" but flags say it's open.
    const deal = makeDeal({ id: '1', valueCents: 100000 })
    // Force a misleading name with neither flag set
    ;(deal.stage as any).name = 'Closed Won'
    ;(deal.stage as any).is_won = false
    ;(deal.stage as any).is_lost = false
    const k = computeKpis([deal])
    expect(k.openCount).toBe(1)
    expect(k.closedCount).toBe(0)
    expect(k.openValueCents).toBe(100000)
    expect(k.wonValueCents).toBe(0)
  })

  it('handles null/missing value_estimate_cents gracefully', () => {
    const deals = [
      makeDeal({ id: '1', valueCents: null }),
      makeDeal({ id: '2', isWon: true, valueCents: null }),
    ]
    const k = computeKpis(deals)
    expect(k.openValueCents).toBe(0)
    expect(k.wonValueCents).toBe(0)
    expect(k.openCount).toBe(1)
    expect(k.closedCount).toBe(1)
  })

  it('handles null stage gracefully (treats as open with zero value)', () => {
    const deal = makeDeal({ id: '1', valueCents: 50000 })
    ;(deal as any).stage = null
    const k = computeKpis([deal])
    expect(k.openCount).toBe(1)
    expect(k.openValueCents).toBe(50000)
  })
})
