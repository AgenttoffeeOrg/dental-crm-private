/**
 * @jest-environment node
 *
 * Phase 2b.84 — Unit tests for computeNextDueAt (the deterministic
 * core of the recurring task generator). Date math is UTC throughout
 * so these tests don't depend on the host timezone.
 */

import { computeNextDueAt } from '../recurring-generator'

type Rule = Parameters<typeof computeNextDueAt>[0]

function makeRule(overrides: Partial<Rule>): Rule {
  return {
    id: 'rule-id',
    tenant_id: 'tenant-id',
    frequency: 'daily',
    interval_count: 1,
    weekly_days: null,
    monthly_day: null,
    rrule: null,
    occurrences_limit: null,
    ends_at: null,
    ...overrides,
  } as Rule
}

describe('computeNextDueAt — daily', () => {
  it('adds interval_count days', () => {
    const r = makeRule({ frequency: 'daily', interval_count: 1 })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z')
    expect(next).toBe('2026-05-25T10:00:00.000Z')
  })

  it('respects interval > 1', () => {
    const r = makeRule({ frequency: 'daily', interval_count: 3 })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z')
    expect(next).toBe('2026-05-27T10:00:00.000Z')
  })

  it('crosses month boundary', () => {
    const r = makeRule({ frequency: 'daily', interval_count: 10 })
    const next = computeNextDueAt(r, '2026-05-26T10:00:00.000Z')
    expect(next).toBe('2026-06-05T10:00:00.000Z')
  })
})

describe('computeNextDueAt — weekly', () => {
  it('adds one week with no weekly_days filter', () => {
    const r = makeRule({ frequency: 'weekly', interval_count: 1, weekly_days: null })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z') // Sunday
    expect(next).toBe('2026-05-31T10:00:00.000Z') // next Sunday
  })

  it('respects interval > 1', () => {
    const r = makeRule({ frequency: 'weekly', interval_count: 2, weekly_days: null })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z')
    expect(next).toBe('2026-06-07T10:00:00.000Z')
  })

  it('snaps to allowed weekday when filter set', () => {
    // Anchor Sun 2026-05-24 → +1 week = Sun 2026-05-31. Allowed days
    // = [Mon, Wed]. Walks forward from Sunday until Monday.
    const r = makeRule({ frequency: 'weekly', interval_count: 1, weekly_days: [1, 3] })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z')
    expect(next).toBe('2026-06-01T10:00:00.000Z') // Monday
  })

  it('weekly_days = current day → falls on that day', () => {
    // Anchor Sun → +1 week = Sun. Allowed = [Sunday] → stays.
    const r = makeRule({ frequency: 'weekly', interval_count: 1, weekly_days: [0] })
    const next = computeNextDueAt(r, '2026-05-24T10:00:00.000Z')
    expect(next).toBe('2026-05-31T10:00:00.000Z')
  })
})

describe('computeNextDueAt — monthly', () => {
  it('adds one month when monthly_day is null (same day)', () => {
    const r = makeRule({ frequency: 'monthly', interval_count: 1, monthly_day: null })
    const next = computeNextDueAt(r, '2026-05-15T10:00:00.000Z')
    expect(next).toBe('2026-06-15T10:00:00.000Z')
  })

  it('snaps to monthly_day when set', () => {
    const r = makeRule({ frequency: 'monthly', interval_count: 1, monthly_day: 1 })
    const next = computeNextDueAt(r, '2026-05-15T10:00:00.000Z')
    expect(next).toBe('2026-06-01T10:00:00.000Z')
  })

  it('respects interval > 1', () => {
    const r = makeRule({ frequency: 'monthly', interval_count: 2, monthly_day: null })
    const next = computeNextDueAt(r, '2026-05-15T10:00:00.000Z')
    expect(next).toBe('2026-07-15T10:00:00.000Z')
  })

  it('handles month-end overflow (Jan 31 + 1 month)', () => {
    // JS Date setUTCMonth wraps Jan 31 → Mar 3 (February has only 28
    // days in non-leap years). This is acceptable behaviour for v1;
    // documenting it here so a future change doesn't regress without
    // anyone noticing.
    const r = makeRule({ frequency: 'monthly', interval_count: 1, monthly_day: null })
    const next = computeNextDueAt(r, '2026-01-31T10:00:00.000Z')
    // 2026 is not a leap year — Feb has 28 days → +1 month from
    // Jan 31 lands on March 3.
    expect(next).toBe('2026-03-03T10:00:00.000Z')
  })
})

describe('computeNextDueAt — custom RRULE', () => {
  it('returns null (not yet implemented)', () => {
    const r = makeRule({ frequency: 'custom', interval_count: null, rrule: 'FREQ=DAILY' })
    expect(computeNextDueAt(r, '2026-05-24T10:00:00.000Z')).toBeNull()
  })
})
