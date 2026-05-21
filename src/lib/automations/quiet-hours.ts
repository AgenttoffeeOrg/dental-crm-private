/**
 * Phase 2b.17 — Quiet hours helper.
 *
 * Reads Practice Brain `opening_hours` and decides whether a send is
 * inside operating hours or, if not, what the next opening moment
 * is. Engine `send_*` and `send_ai_reply` nodes consult this when
 * the workflow's `respect_quiet_hours = true`.
 *
 * The opening_hours shape comes from the Practice Brain settings UI:
 *   { monday: { open: "09:00", close: "17:00" }, sunday: { closed: true }, ... }
 *
 * Times are interpreted in the practice's local time. For v1 we
 * assume Europe/London — the test tenant is UK-only. A future phase
 * adds per-tenant `time_zone` and threads it through here.
 */

import type { OpeningHours } from '@/lib/automations/practice-brain'

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

export interface QuietHoursCheck {
  /** True when send may proceed right now. */
  isOpenNow: boolean
  /** When the next open window starts (only set when isOpenNow=false). */
  nextOpenAt?: Date
}

export function evaluateQuietHours(
  openingHours: OpeningHours,
  now: Date = new Date(),
  tz: string = 'Europe/London'
): QuietHoursCheck {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    // No opening hours configured → don't gate sends.
    return { isOpenNow: true }
  }

  const dowInTz = localWeekdayName(now, tz)
  const todayHours = openingHours[dowInTz]
  if (todayHours && !('closed' in todayHours && todayHours.closed === true)) {
    if ('open' in todayHours && 'close' in todayHours) {
      const minutesNow = localMinutesOfDay(now, tz)
      const openMin = parseHM(todayHours.open)
      const closeMin = parseHM(todayHours.close)
      if (openMin != null && closeMin != null && minutesNow >= openMin && minutesNow < closeMin) {
        return { isOpenNow: true }
      }
      if (openMin != null && closeMin != null && minutesNow < openMin) {
        return { isOpenNow: false, nextOpenAt: setLocalTime(now, openMin, tz) }
      }
    }
  }

  // Walk forward up to 7 days to find the next open day.
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000)
    const dow = localWeekdayName(candidate, tz)
    const hrs = openingHours[dow]
    if (!hrs) continue
    if ('closed' in hrs && hrs.closed === true) continue
    if ('open' in hrs) {
      const openMin = parseHM(hrs.open)
      if (openMin != null) {
        return { isOpenNow: false, nextOpenAt: setLocalTime(candidate, openMin, tz) }
      }
    }
  }

  // No open window found in the next week → fall back to open-now so we
  // don't park forever. A practice with no open hours at all shouldn't
  // be running automations anyway.
  return { isOpenNow: true }
}

// ---------------------------------------------------------------------------
// Time-zone helpers (UTC-aware)
// ---------------------------------------------------------------------------

function localWeekdayName(d: Date, tz: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      weekday: 'long',
    })
    return formatter.format(d).toLowerCase()
  } catch {
    return DAYS[d.getUTCDay()]
  }
}

function localMinutesOfDay(d: Date, tz: string): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(d)
    const hh = parts.find((p) => p.type === 'hour')?.value
    const mm = parts.find((p) => p.type === 'minute')?.value
    if (!hh || !mm) return d.getUTCHours() * 60 + d.getUTCMinutes()
    return parseInt(hh, 10) * 60 + parseInt(mm, 10)
  } catch {
    return d.getUTCHours() * 60 + d.getUTCMinutes()
  }
}

function parseHM(s: string): number | null {
  if (typeof s !== 'string') return null
  const m = s.match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = parseInt(m[1], 10)
  const mm = parseInt(m[2], 10)
  if (Number.isNaN(h) || Number.isNaN(mm)) return null
  return h * 60 + mm
}

/**
 * Return a Date representing `minutes` since midnight in `tz` on the
 * same calendar day as `base` (in `tz`). Implemented by sampling the
 * tz offset at `base` and constructing the UTC time accordingly. Good
 * enough for the quiet-hours use case (we accept a ±1h DST edge
 * shift around switchovers — sends will simply happen at the
 * post-switch local hour, which is what the practice expects).
 */
function setLocalTime(base: Date, minutes: number, tz: string): Date {
  // Build a string like "2026-05-21T<HH>:<MM>:00" in tz, then parse.
  const dateInTz = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(base) // YYYY-MM-DD
  const hh = Math.floor(minutes / 60)
  const mm = minutes % 60
  const isoLocal = `${dateInTz}T${pad2(hh)}:${pad2(mm)}:00`
  // Compute tz offset for that exact local time.
  const utcGuess = new Date(`${isoLocal}Z`)
  const localFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(utcGuess)
  const lY = part(localFmt, 'year')
  const lM = part(localFmt, 'month')
  const lD = part(localFmt, 'day')
  const lH = part(localFmt, 'hour')
  const lMin = part(localFmt, 'minute')
  if (!lY || !lM || !lD || !lH || !lMin) return utcGuess
  const observed = Date.UTC(
    parseInt(lY, 10),
    parseInt(lM, 10) - 1,
    parseInt(lD, 10),
    parseInt(lH, 10),
    parseInt(lMin, 10)
  )
  const offsetMs = utcGuess.getTime() - observed
  return new Date(utcGuess.getTime() + offsetMs)
}

function part(parts: Intl.DateTimeFormatPart[], type: string): string | null {
  return parts.find((p) => p.type === type)?.value ?? null
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}
