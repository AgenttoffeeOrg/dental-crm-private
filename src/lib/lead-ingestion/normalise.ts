/**
 * Phase 2a.2a — input normalisation helpers shared by the dedup engine and
 * ingestLead. Centralised so dedup matching uses *exactly* the same
 * normalised forms that are written into contacts.primary_email_norm /
 * primary_phone_e164.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js'

/**
 * RFC-5322 minimal sanity check. We deliberately don't try to validate the
 * full grammar — the goal is "could this plausibly be an email?", not "is this
 * deliverable?". Anything that fails this check is treated as "no email".
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normaliseEmail(raw?: string | null): string | null {
  if (!raw) return null
  // NFKC + trim + lowercase. NFKC folds full-width chars and other unicode
  // confusables that occasionally arrive from copy-paste.
  const cleaned = raw.normalize('NFKC').trim().toLowerCase()
  if (!cleaned || !EMAIL_RE.test(cleaned)) return null
  return cleaned
}

/**
 * Parse a phone number to E.164 with default region GB. Returns null if
 * parsing fails or the result isn't a valid number for its region.
 */
export function normalisePhoneE164(raw?: string | null, defaultRegion: 'GB' | 'US' = 'GB'): string | null {
  if (!raw) return null
  const cleaned = raw.trim()
  if (!cleaned) return null
  try {
    const parsed = parsePhoneNumberFromString(cleaned, defaultRegion)
    if (!parsed || !parsed.isValid()) return null
    return parsed.number
  } catch {
    return null
  }
}

/**
 * Combine first/last/full name into a single canonical full_name.
 * - Prefers explicit `full_name` if provided.
 * - Otherwise concatenates `${first} ${last}` (skipping blanks).
 * - Returns 'Unknown Lead' as last-resort default — `contacts.full_name` is
 *   NOT NULL in the DB, so we must always have something.
 */
export function buildFullName(input: {
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
}): string {
  const fromFull = input.full_name?.trim()
  if (fromFull) return fromFull

  const first = input.first_name?.trim() ?? ''
  const last = input.last_name?.trim() ?? ''
  const combined = `${first} ${last}`.trim()
  if (combined) return combined

  return 'Unknown Lead'
}
