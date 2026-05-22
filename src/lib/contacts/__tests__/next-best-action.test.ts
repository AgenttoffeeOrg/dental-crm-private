/**
 * @jest-environment node
 *
 * Phase 2b.31.2 — Next-Best-Action engine.
 *
 * Pure function tests — walks each rule's truth table with a frozen
 * `nowMs` so "X days ago" is deterministic.
 */

import { computeNextBestAction, type OpenDealRef } from '../next-best-action'

const NOW = Date.parse('2026-05-22T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

const isoAgo = (ms: number) => new Date(NOW - ms).toISOString()

const dealAt = (overrides: Partial<OpenDealRef> = {}): OpenDealRef => ({
  id: 'd1',
  title: 'Implants consult',
  pipelineId: 'p1',
  pipelineName: 'Implants',
  stageName: 'Consult booked',
  lastActivityAt: isoAgo(1 * DAY),
  updatedAt: isoAgo(1 * DAY),
  ...overrides,
})

describe('computeNextBestAction', () => {
  it('rule 1 — unreplied inbound in the last 48h wins everything', async () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(2 * 60 * 60 * 1000), // 2 hours ago
      lastOutboundAt: isoAgo(7 * DAY), // last reply was a week ago — doesn't count
      openDeals: [dealAt({ lastActivityAt: isoAgo(0.5 * DAY) })],
      nowMs: NOW,
    })
    expect(result.kind).toBe('reply_inbound')
    expect(result.priority).toBe('urgent')
    expect(result.subtitle).toContain('reached out')
    expect(result.cta).toEqual({ kind: 'send_sms' })
  })

  it('rule 1 does NOT fire if the practice has replied since the inbound', () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(10 * 60 * 60 * 1000), // 10 hours ago
      lastOutboundAt: isoAgo(2 * 60 * 60 * 1000), // 2 hours ago — replied
      openDeals: [dealAt({ lastActivityAt: isoAgo(0.5 * DAY) })],
      nowMs: NOW,
    })
    expect(result.kind).toBe('on_track')
  })

  it('rule 1 does NOT fire if inbound is older than 48h', () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(3 * DAY),
      lastOutboundAt: null,
      openDeals: [dealAt({ lastActivityAt: isoAgo(3 * DAY), updatedAt: isoAgo(3 * DAY) })],
      nowMs: NOW,
    })
    // 3-day stale, but not stuck enough for rule 2 (needs ≥7d). Falls
    // to on_track since open deal exists with semi-recent activity.
    expect(result.kind).toBe('on_track')
  })

  it('rule 2 — stalest deal with ≥ 7 days of silence', () => {
    const result = computeNextBestAction({
      lastInboundAt: null,
      lastOutboundAt: null,
      openDeals: [
        dealAt({ id: 'd-fresh', lastActivityAt: isoAgo(1 * DAY) }),
        dealAt({
          id: 'd-stale',
          title: 'Invisalign treatment plan',
          pipelineName: 'Invisalign',
          lastActivityAt: isoAgo(9 * DAY),
        }),
      ],
      nowMs: NOW,
    })
    expect(result.kind).toBe('follow_up_stale')
    expect(result.title).toContain('Invisalign treatment plan')
    expect(result.subtitle).toContain('9 days')
    expect(result.priority).toBe('high')
  })

  it('rule 3 — stuck stage (no row touch in ≥ 14 days) when activities are fresh enough', () => {
    const result = computeNextBestAction({
      lastInboundAt: null,
      lastOutboundAt: null,
      openDeals: [
        dealAt({
          id: 'd-stuck',
          stageName: 'Awaiting decision',
          lastActivityAt: isoAgo(6 * DAY), // not stale enough for rule 2
          updatedAt: isoAgo(20 * DAY), // very stuck
        }),
      ],
      nowMs: NOW,
    })
    expect(result.kind).toBe('move_stage')
    expect(result.title).toContain('Move stage')
    expect(result.subtitle).toContain('20 days')
    expect(result.cta).toEqual({ kind: 'view_deal', dealId: 'd-stuck' })
  })

  it('rule 4 — contact has inbound activity but no open deals = create_deal', () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(5 * DAY),
      lastOutboundAt: isoAgo(4 * DAY),
      openDeals: [],
      nowMs: NOW,
    })
    expect(result.kind).toBe('create_deal')
    expect(result.cta).toEqual({ kind: 'create_deal' })
  })

  it('rule 5 — on_track when there is an open deal with recent activity', () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(3 * DAY),
      lastOutboundAt: isoAgo(2 * DAY),
      openDeals: [dealAt({ lastActivityAt: isoAgo(1 * DAY), updatedAt: isoAgo(2 * DAY) })],
      nowMs: NOW,
    })
    expect(result.kind).toBe('on_track')
    expect(result.priority).toBe('info')
  })

  it('rule 6 — first_touch when contact is brand new (no activity, no deals)', () => {
    const result = computeNextBestAction({
      lastInboundAt: null,
      lastOutboundAt: null,
      openDeals: [],
      nowMs: NOW,
    })
    expect(result.kind).toBe('first_touch')
    expect(result.cta).toEqual({ kind: 'send_sms' })
  })

  it('rule 7 — no_signal when outbound exists but no inbound, no open deals', () => {
    const result = computeNextBestAction({
      lastInboundAt: null,
      lastOutboundAt: isoAgo(10 * DAY),
      openDeals: [],
      nowMs: NOW,
    })
    expect(result.kind).toBe('no_signal')
  })

  it('inbound activity 60 mins ago renders "1 hour ago" not minutes', () => {
    const result = computeNextBestAction({
      lastInboundAt: isoAgo(60 * 60 * 1000),
      lastOutboundAt: null,
      openDeals: [],
      nowMs: NOW,
    })
    expect(result.subtitle).toMatch(/1 hour/i)
  })

  it('long deal title gets truncated', () => {
    const result = computeNextBestAction({
      lastInboundAt: null,
      lastOutboundAt: null,
      openDeals: [
        dealAt({
          id: 'd-stuck',
          title: 'Comprehensive smile makeover with 12 veneers and at-home whitening',
          updatedAt: isoAgo(20 * DAY),
          lastActivityAt: isoAgo(5 * DAY),
        }),
      ],
      nowMs: NOW,
    })
    expect(result.title).toMatch(/…/) // ellipsis appended
    expect(result.title.length).toBeLessThan(80)
  })
})
