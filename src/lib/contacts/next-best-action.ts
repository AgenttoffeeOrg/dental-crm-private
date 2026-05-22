/**
 * Phase 2b.31.2 — Next-Best-Action engine for a contact.
 *
 * Given the contact's open deals + inbound/outbound activity
 * timestamps, decide what the operator should DO next. Pure
 * function — no DB calls. The detail page fetches the inputs and
 * passes them in; tests cover the rule chain in isolation.
 *
 * Rules fire in strict priority order — the first match wins. This
 * means urgent reply-now beats follow-up-stale beats move-stage
 * beats create-deal beats all-good.
 */

const HOUR = 60 * 60 * 1000
const DAY = 24 * HOUR

export interface OpenDealRef {
  id: string
  title: string | null
  pipelineId: string | null
  pipelineName: string | null
  stageName: string | null
  /** Last activity time on this specific deal (ISO). */
  lastActivityAt: string | null
  /** When the deal row was last touched (ISO). Used as a stage-stuck proxy. */
  updatedAt: string | null
}

export interface NextBestActionInput {
  /** Most recent inbound activity (SMS/WhatsApp/email/call) timestamp, ISO. Null if none. */
  lastInboundAt: string | null
  /** Most recent outbound activity timestamp, ISO. Null if none. */
  lastOutboundAt: string | null
  /** Currently-open deals for this contact. Empty array if none. */
  openDeals: OpenDealRef[]
  /** Now-ish — defaults to Date.now() but injectable for testing. */
  nowMs?: number
}

export type NextBestActionKind =
  | 'reply_inbound'
  | 'follow_up_stale'
  | 'move_stage'
  | 'create_deal'
  | 'on_track'
  | 'first_touch'
  | 'no_signal'

export type NbaCta =
  | { kind: 'send_sms' }
  | { kind: 'send_email' }
  | { kind: 'send_whatsapp' }
  | { kind: 'create_deal' }
  | { kind: 'view_deal'; dealId: string }
  | { kind: 'none' }

export interface NextBestAction {
  kind: NextBestActionKind
  title: string
  subtitle: string
  priority: 'urgent' | 'high' | 'normal' | 'info'
  cta: NbaCta
}

export function computeNextBestAction(input: NextBestActionInput): NextBestAction {
  const now = input.nowMs ?? Date.now()
  const inAt = parseMs(input.lastInboundAt)
  const outAt = parseMs(input.lastOutboundAt)

  // RULE 1 — unreplied inbound in the last 48h beats everything else.
  // If the patient just messaged and nobody from the practice has
  // responded since, that's the most valuable action available.
  if (inAt !== null && now - inAt <= 2 * DAY) {
    const replied = outAt !== null && outAt > inAt
    if (!replied) {
      return {
        kind: 'reply_inbound',
        title: 'Reply to this patient',
        subtitle: `They reached out ${formatAgo(now - inAt)} and nobody has replied yet.`,
        priority: 'urgent',
        cta: { kind: 'send_sms' },
      }
    }
  }

  // RULE 2 — open deal stuck without any activity for > 7 days.
  // Same urgency as RULE 1 in the sense that it's a stalling deal
  // about to go cold, but lower since the practice hasn't been
  // outright ignored. We pick the staler of the open deals.
  const stalest = stalestDeal(input.openDeals, now)
  if (stalest && stalest.daysStale >= 7) {
    return {
      kind: 'follow_up_stale',
      title: `Follow up — "${shorten(stalest.deal.title)}"`,
      subtitle: `${stalest.deal.pipelineName ?? 'Deal'} hasn't moved in ${stalest.daysStale} days. Send a nudge.`,
      priority: 'high',
      cta: { kind: 'send_sms' },
    }
  }

  // RULE 3 — open deal whose row hasn't been touched (likely stuck
  // in the same stage) for > 14 days. Less urgent than activity
  // stagnation; suggests the team forgot to move the stage.
  const stuckest = stuckestDeal(input.openDeals, now)
  if (stuckest && stuckest.daysStuck >= 14) {
    return {
      kind: 'move_stage',
      title: `Move stage — "${shorten(stuckest.deal.title)}"`,
      subtitle: `Sitting in ${stuckest.deal.stageName ?? 'this stage'} for ${stuckest.daysStuck} days. Time to advance?`,
      priority: 'high',
      cta: { kind: 'view_deal', dealId: stuckest.deal.id },
    }
  }

  // RULE 4 — contact has touched us (inbound activity exists) but has
  // zero open deals. The team probably forgot to spin one up.
  if (input.openDeals.length === 0 && inAt !== null) {
    return {
      kind: 'create_deal',
      title: 'Create a deal for this lead',
      subtitle:
        'This contact has activity but no open deal. Spin one up so it shows in the pipeline.',
      priority: 'high',
      cta: { kind: 'create_deal' },
    }
  }

  // RULE 5 — open deal, recent activity (< 7 days), nothing to flag.
  if (input.openDeals.length > 0) {
    const freshest = freshestDeal(input.openDeals, now)
    return {
      kind: 'on_track',
      title: 'On track',
      subtitle: freshest
        ? `Latest activity ${formatAgo(freshest.ageMs)} on "${shorten(freshest.deal.title)}".`
        : 'Open deal in flight; no nudge needed right now.',
      priority: 'info',
      cta: { kind: 'none' },
    }
  }

  // RULE 6 — brand-new contact, no activity yet, no deals. Cold lead
  // that needs a first touch.
  if (inAt === null && outAt === null) {
    return {
      kind: 'first_touch',
      title: 'Make the first contact',
      subtitle:
        'This contact has no activity yet. Send a friendly opener or call to introduce the practice.',
      priority: 'normal',
      cta: { kind: 'send_sms' },
    }
  }

  // RULE 7 — fallback. Activity exists but no open deal, and the
  // activity is older than the 2-day reply window. Nothing
  // recommended; render an "all clear" state.
  return {
    kind: 'no_signal',
    title: 'Nothing urgent',
    subtitle: 'No open deals and no recent activity that needs attention.',
    priority: 'info',
    cta: { kind: 'none' },
  }
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function parseMs(iso: string | null): number | null {
  if (!iso) return null
  const t = Date.parse(iso)
  return Number.isFinite(t) ? t : null
}

function stalestDeal(deals: OpenDealRef[], now: number) {
  let stalest: { deal: OpenDealRef; daysStale: number } | null = null
  for (const d of deals) {
    const ms = parseMs(d.lastActivityAt)
    if (ms === null) continue
    const days = Math.floor((now - ms) / DAY)
    if (!stalest || days > stalest.daysStale) {
      stalest = { deal: d, daysStale: days }
    }
  }
  return stalest
}

function stuckestDeal(deals: OpenDealRef[], now: number) {
  let stuckest: { deal: OpenDealRef; daysStuck: number } | null = null
  for (const d of deals) {
    const ms = parseMs(d.updatedAt)
    if (ms === null) continue
    const days = Math.floor((now - ms) / DAY)
    if (!stuckest || days > stuckest.daysStuck) {
      stuckest = { deal: d, daysStuck: days }
    }
  }
  return stuckest
}

function freshestDeal(deals: OpenDealRef[], now: number) {
  let freshest: { deal: OpenDealRef; ageMs: number } | null = null
  for (const d of deals) {
    const ms = parseMs(d.lastActivityAt) ?? parseMs(d.updatedAt)
    if (ms === null) continue
    const age = now - ms
    if (!freshest || age < freshest.ageMs) {
      freshest = { deal: d, ageMs: age }
    }
  }
  return freshest
}

function formatAgo(ms: number): string {
  if (ms < HOUR) {
    const m = Math.max(1, Math.round(ms / (60 * 1000)))
    return `${m} minute${m === 1 ? '' : 's'} ago`
  }
  if (ms < DAY) {
    const h = Math.round(ms / HOUR)
    return `${h} hour${h === 1 ? '' : 's'} ago`
  }
  const d = Math.floor(ms / DAY)
  return `${d} day${d === 1 ? '' : 's'} ago`
}

function shorten(s: string | null | undefined, max = 40): string {
  const t = (s ?? 'Deal').toString().trim()
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}
