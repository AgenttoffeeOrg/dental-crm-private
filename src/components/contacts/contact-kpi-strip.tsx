'use client'

/**
 * Phase 2b.38 — Top KPI strip for the contact detail page.
 *
 * One compact line at the top of the contact detail's right column.
 * Replaces the 3-card grid (Active Deals · Pipeline Value · Last
 * Engagement) that was removed in 2b.37.
 *
 * Two clusters of numbers:
 *
 *   1. Deal counts: `N open · M closed`
 *      - Open = stage.is_won === false AND stage.is_lost === false.
 *      - Closed = stage.is_won === true OR stage.is_lost === true.
 *      - Per locked principle #9 (flag-based, never name-substring).
 *
 *   2. Lifetime value (LTV) split: `£open + £won + £lost = £total`
 *      - £open: sum of value_estimate_cents on open deals.
 *      - £won:  sum on closed-won deals.
 *      - £lost: sum on closed-lost deals.
 *      - Closed-lost contributes — the contact's lifetime relationship
 *        with the practice includes attempted treatments that didn't
 *        convert; that's still revenue the practice "saw" pass through.
 *
 * Visual: tight, one line on desktop, wraps gracefully on narrow
 * widths. No big cards, no icons.
 */

import { useMemo } from 'react'
import type { DealWithRelations } from '@/types/database'

interface ContactKpiStripProps {
  deals: DealWithRelations[]
}

function formatCurrency(cents: number): string {
  if (cents === 0) return '£0'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

export interface DealKpis {
  openCount: number
  closedCount: number
  openValueCents: number
  wonValueCents: number
  lostValueCents: number
}

/**
 * Exported for unit tests. Pure function over the `deals` array; no
 * side effects. Locked-principle #9: open/closed split is by the
 * stage's `is_won` / `is_lost` flags, NEVER by stage-name substring.
 */
export function computeKpis(deals: DealWithRelations[]): DealKpis {
  let openCount = 0
  let closedCount = 0
  let openValueCents = 0
  let wonValueCents = 0
  let lostValueCents = 0

  for (const deal of deals) {
    const stage = deal.stage as { is_won?: boolean | null; is_lost?: boolean | null } | null
    const isWon = Boolean(stage?.is_won)
    const isLost = Boolean(stage?.is_lost)
    const value = (deal.value_estimate_cents as number | null | undefined) ?? 0

    if (isWon) {
      closedCount += 1
      wonValueCents += value
    } else if (isLost) {
      closedCount += 1
      lostValueCents += value
    } else {
      openCount += 1
      openValueCents += value
    }
  }

  return { openCount, closedCount, openValueCents, wonValueCents, lostValueCents }
}

export function ContactKpiStrip({ deals }: ContactKpiStripProps) {
  const k = useMemo(() => computeKpis(deals), [deals])
  const totalValueCents = k.openValueCents + k.wonValueCents + k.lostValueCents

  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-sm text-gray-700">
      <div className="flex items-baseline gap-1.5">
        <span className="font-semibold text-gray-900">{k.openCount}</span>
        <span className="text-gray-500">open</span>
        <span className="text-gray-300">·</span>
        <span className="font-semibold text-gray-900">{k.closedCount}</span>
        <span className="text-gray-500">closed</span>
      </div>

      <span className="text-gray-300 hidden sm:inline">·</span>

      {/* LTV split. Each component muted; the total is the bold number
          on the right so an operator can scan total at a glance and
          drill into the breakdown on the left. */}
      <div className="flex items-baseline gap-1.5">
        <span className="text-blue-700 font-medium">{formatCurrency(k.openValueCents)}</span>
        <span className="text-gray-400 text-xs">open</span>
        <span className="text-gray-300">+</span>
        <span className="text-emerald-700 font-medium">{formatCurrency(k.wonValueCents)}</span>
        <span className="text-gray-400 text-xs">won</span>
        <span className="text-gray-300">+</span>
        <span className="text-red-700 font-medium">{formatCurrency(k.lostValueCents)}</span>
        <span className="text-gray-400 text-xs">lost</span>
        <span className="text-gray-300">=</span>
        <span className="font-semibold text-gray-900">{formatCurrency(totalValueCents)}</span>
        <span className="text-gray-500 text-xs uppercase tracking-wide">LTV</span>
      </div>
    </div>
  )
}
