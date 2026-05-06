/**
 * Phase 2b.1.b.1 — detect "first outbound activity per deal" and fire a
 * `FirstResponse` Google Ads conversion event when it matches.
 *
 * The DB trigger `activities_stamp_deal_first_response` (Task 1C) stamps
 * `deals.first_response_at` on the FIRST outbound activity per deal. This
 * detector is called application-side immediately after a canonical activity
 * insert; it reads back the freshly-stamped `deals.first_response_at` and, if
 * the timestamp matches the activity's `occurred_at` (within a 5s tolerance),
 * fires the conversion event.
 *
 * Safety:
 *   - Detector is best-effort: never throws, never blocks the caller.
 *   - Idempotency lives in `fireGoogleConversionEvent` (per-deal `success` row
 *     UNIQUE). Duplicate detector calls in close succession are safe — the
 *     second call's `fire()` will see the prior success and skip silently.
 *   - The 5s window guards against re-firing on later outbound activities for
 *     the same deal: those find `first_response_at` already stamped and stale
 *     relative to their `occurred_at`, so we no-op without even calling fire().
 *
 * Inputs come from the activity insert call site, NOT from a SELECT on
 * `activities` — keeping the detector cheap and free of read-after-write race
 * concerns. We only round-trip to read the deal + (optionally) the touchpoint
 * + the contact PII for hashing.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase-server'
import { fireGoogleConversionEvent } from './fire-conversion-event'

export interface DetectAndFireArgs {
  tenant_id: string
  contact_id: string | null
  deal_id: string | null
  direction: 'inbound' | 'outbound' | string
  /** ISO-8601 timestamp the activity claims to have occurred at. */
  occurred_at: string
}

/** Maximum drift between activity.occurred_at and deals.first_response_at to count as "this stamp". */
const MATCH_WINDOW_MS = 5_000

export async function detectAndFireFirstResponse(
  args: DetectAndFireArgs,
  client?: SupabaseClient
): Promise<void> {
  // Wrap the whole body so a crash in the detector can't poison the caller.
  try {
    await detectAndFireFirstResponseInner(args, client)
  } catch (e) {
    console.error('[conversions/google] detectAndFireFirstResponse crashed (non-fatal)', {
      deal_id: args.deal_id,
      error_message: (e as Error)?.message ?? String(e),
    })
  }
}

async function detectAndFireFirstResponseInner(
  args: DetectAndFireArgs,
  client?: SupabaseClient
): Promise<void> {
  if (args.direction !== 'outbound' || !args.deal_id) return

  const supabase = client ?? createServiceClient()

  // 1) Read the deal — we need first_response_at and (in case caller didn't
  // supply it) contact_id.
  const { data: deal, error: dealErr } = await supabase
    .from('deals')
    .select('id, contact_id, first_response_at, tenant_id')
    .eq('id', args.deal_id)
    .maybeSingle()
  if (dealErr || !deal) return
  if (!deal.first_response_at) return

  // 2) Window check — only proceed if THIS activity is what stamped first_response_at.
  const stampedAtMs = new Date(deal.first_response_at as string).getTime()
  const occurredAtMs = new Date(args.occurred_at).getTime()
  if (!Number.isFinite(stampedAtMs) || !Number.isFinite(occurredAtMs)) return
  if (Math.abs(stampedAtMs - occurredAtMs) > MATCH_WINDOW_MS) return

  // 3) Pick a contact: prefer caller-supplied (matches the activity row), fall
  // back to deal.contact_id (set during deal creation).
  const contactId = args.contact_id ?? (deal.contact_id as string | null)
  if (!contactId) return

  // 4) Pull the gclid from the most recent attribution touchpoint for this contact.
  // We deliberately use the most-recent (last_touch) gclid rather than first_touch,
  // matching Google's documented "use the click ID from the click that drove the
  // most recent visit" pattern for offline conversions.
  const { data: touchpoint } = await supabase
    .from('attribution_touchpoints')
    .select('gclid')
    .eq('contact_id', contactId)
    .not('gclid', 'is', null)
    .order('occurred_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: contact } = await supabase
    .from('contacts')
    .select('primary_email_norm, primary_email, primary_phone_e164')
    .eq('id', contactId)
    .maybeSingle()

  await fireGoogleConversionEvent(
    {
      tenant_id: args.tenant_id,
      deal_id: args.deal_id,
      contact_id: contactId,
      event_type: 'FirstResponse',
      gclid: (touchpoint?.gclid as string | null) ?? null,
      email:
        (contact?.primary_email_norm as string | null) ??
        (contact?.primary_email as string | null) ??
        null,
      phone_e164: (contact?.primary_phone_e164 as string | null) ?? null,
      occurred_at: args.occurred_at,
    },
    supabase
  )
}
