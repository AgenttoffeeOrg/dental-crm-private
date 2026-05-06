/**
 * Phase 2a.2a — Dedup engine.
 *
 * Resolves a candidate lead to one of three outcomes:
 *   - matched: an existing contact is the same person → update additively
 *   - new: nobody matches → caller creates a new contact
 *   - review_required: ambiguous / conflicting → caller queues for human review
 *
 * Tiering (per the planner):
 *   1. Exact normalised email (within tenant)
 *   2. E.164 phone (within tenant) — but NEVER auto-merge if the matched
 *      contact already has a *different* email (family-sharing-a-phone case)
 *   3. Channel identifier (e.g. WhatsApp number, Instagram handle)
 *   4. New contact
 *
 * Important: this module does NOT insert anything into dedup_review_queue
 * itself. It returns the decision; ingestLead handles queue insertion so the
 * caller can keep the queue row, the touchpoint, and the activity in one
 * consistent place.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import type { ChannelIdentifierKind } from './types'
import { normaliseEmail, normalisePhoneE164 } from './normalise'

export interface DedupCandidate {
  tenant_id: string
  email?: string | null
  phone?: string | null
  first_name?: string | null
  last_name?: string | null
  full_name?: string | null
  channel_identifier?: {
    kind: ChannelIdentifierKind
    value: string
  } | null
}

export interface DedupSignals {
  email_normalised?: string
  phone_normalised_e164?: string
  email_match: boolean
  phone_match: boolean
  channel_identifier_match: boolean
  conflict_reason?:
    | 'phone_matches_different_email'
    | 'multiple_email_matches'
    | 'multiple_phone_matches'
    | 'multiple_channel_matches'
    | 'internal_error'
    | null
}

export type DedupDecision =
  | { decision: 'matched'; contact_id: string; signals: DedupSignals }
  | { decision: 'new'; signals: DedupSignals }
  | {
      decision: 'review_required'
      matched_contact_ids: string[]
      signals: DedupSignals
    }

/**
 * Internal helper: build a baseline signals object from normalised inputs.
 */
function baseSignals(emailNorm: string | null, phoneE164: string | null): DedupSignals {
  return {
    email_normalised: emailNorm ?? undefined,
    phone_normalised_e164: phoneE164 ?? undefined,
    email_match: false,
    phone_match: false,
    channel_identifier_match: false,
    conflict_reason: null,
  }
}

/**
 * Resolve a candidate to a dedup decision. Always filters by tenant_id so
 * cross-tenant isolation is preserved even though we run with the service-role
 * client (which bypasses RLS).
 *
 * @param candidate - the incoming lead's identifying fields
 * @param client    - optional supabase client (default: service role). Tests
 *                    inject a stub that hits a transactional sandbox.
 */
export async function resolveDedup(
  candidate: DedupCandidate,
  client?: SupabaseClient
): Promise<DedupDecision> {
  const supabase = client ?? createServiceClient()

  const emailNorm = normaliseEmail(candidate.email)
  const phoneE164 = normalisePhoneE164(candidate.phone)
  const signals = baseSignals(emailNorm, phoneE164)

  // ---------------------------------------------------------------------------
  // Tier 1 — exact normalised email match
  // ---------------------------------------------------------------------------
  if (emailNorm) {
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('id')
        .eq('tenant_id', candidate.tenant_id)
        .ilike('primary_email', emailNorm) // ILIKE handles existing rows that aren't lowercased
        .is('deleted_at', null)
        .limit(2)

      if (error) {
        return failSafe(signals, 'internal_error')
      }

      if (data && data.length === 1) {
        signals.email_match = true
        return { decision: 'matched', contact_id: data[0].id, signals }
      }
      if (data && data.length > 1) {
        signals.email_match = true
        signals.conflict_reason = 'multiple_email_matches'
        return {
          decision: 'review_required',
          matched_contact_ids: data.map((row) => row.id),
          signals,
        }
      }
      // 0 results → fall through to Tier 2
    } catch {
      return failSafe(signals, 'internal_error')
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 2 — phone match (E.164 or raw fallback)
  // ---------------------------------------------------------------------------
  if (phoneE164) {
    try {
      // Match either the canonical E.164 column (primary_phone_e164) or the
      // raw primary_phone column. Some legacy rows only have raw phones and
      // some only have e164; covering both keeps dedup resilient until backfill.
      const { data, error } = await supabase
        .from('contacts')
        .select('id, primary_email, primary_phone_e164, primary_phone')
        .eq('tenant_id', candidate.tenant_id)
        .or(`primary_phone_e164.eq.${phoneE164},primary_phone.eq.${phoneE164}`)
        .is('deleted_at', null)
        .limit(5)

      if (error) {
        return failSafe(signals, 'internal_error')
      }

      if (data && data.length === 1) {
        signals.phone_match = true
        const existing = data[0]
        const existingEmailNorm = normaliseEmail(existing.primary_email)
        const candidateHasEmail = emailNorm !== null
        const existingHasEmail = existingEmailNorm !== null

        // Safe-merge cases:
        //   (a) neither side has email → treat as same person
        //   (b) one side has email, the other doesn't → fill the gap
        //   (c) both sides have the *same* email → already would have matched
        //       at tier 1; defensive check here in case primary_email isn't
        //       normalised in the DB row
        if (!existingHasEmail || !candidateHasEmail || existingEmailNorm === emailNorm) {
          return { decision: 'matched', contact_id: existing.id, signals }
        }

        // Conflicting emails → don't auto-merge.
        // This is the family-sharing-a-phone case (couples, parents/children).
        signals.conflict_reason = 'phone_matches_different_email'
        return {
          decision: 'review_required',
          matched_contact_ids: [existing.id],
          signals,
        }
      }

      if (data && data.length > 1) {
        signals.phone_match = true
        signals.conflict_reason = 'multiple_phone_matches'
        return {
          decision: 'review_required',
          matched_contact_ids: data.map((row) => row.id),
          signals,
        }
      }
      // 0 results → fall through to Tier 3
    } catch {
      return failSafe(signals, 'internal_error')
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 3 — channel_identifier match
  // ---------------------------------------------------------------------------
  // NB: live `channel_identifiers` table uses (channel, external_id), not the
  // (kind, value) shape sketched in the original prompt. We map our internal
  // ChannelIdentifierKind to the row's `channel` column.
  if (candidate.channel_identifier) {
    try {
      const { data, error } = await supabase
        .from('channel_identifiers')
        .select('contact_id')
        .eq('tenant_id', candidate.tenant_id)
        .eq('channel', candidate.channel_identifier.kind)
        .eq('external_id', candidate.channel_identifier.value)
        .not('contact_id', 'is', null)
        .limit(2)

      if (error) {
        return failSafe(signals, 'internal_error')
      }

      if (data && data.length === 1) {
        signals.channel_identifier_match = true
        return { decision: 'matched', contact_id: data[0].contact_id, signals }
      }
      if (data && data.length > 1) {
        signals.channel_identifier_match = true
        signals.conflict_reason = 'multiple_channel_matches'
        return {
          decision: 'review_required',
          matched_contact_ids: data.map((row) => row.contact_id),
          signals,
        }
      }
    } catch {
      return failSafe(signals, 'internal_error')
    }
  }

  // ---------------------------------------------------------------------------
  // Tier 4 — new contact
  // ---------------------------------------------------------------------------
  return { decision: 'new', signals }
}

/**
 * Fail-safe path: any unexpected DB error routes to the review queue rather
 * than risking an auto-merge or auto-create on bad data.
 */
function failSafe(
  signals: DedupSignals,
  reason: NonNullable<DedupSignals['conflict_reason']>
): DedupDecision {
  return {
    decision: 'review_required',
    matched_contact_ids: [],
    signals: { ...signals, conflict_reason: reason },
  }
}
