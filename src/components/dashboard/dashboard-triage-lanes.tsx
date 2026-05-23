'use client'

/**
 * Phase 2b.50 / 2b.51 — Dashboard triage lanes ("do these now").
 *
 * Eight clickable cards arranged in a grid. Each card has:
 *   - Lane name
 *   - Count badge with an icon
 *   - Optional one-line subtitle
 *   - Click → routes to the appropriate workspace
 *
 * 2b.50 ships the first four (Today's Priorities, Today's Calls,
 * New Inquiries, Stale Follow-ups). 2b.51 adds the rest (Unread
 * Inbound, Failed Sends, Voicemails, AI-Needs-Your-Eye).
 *
 * Data sources per lane are documented inline; auto-refresh every
 * 60 seconds.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Flame,
  Phone,
  Sparkles,
  Hourglass,
  Loader2,
  MessageSquare,
  AlertTriangle,
  Voicemail,
  Eye,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface TriageCounts {
  todaysPriorities: number
  todaysCalls: number
  newInquiries: number
  staleFollowUps: number
  // 2b.51 — the secondary triage cluster.
  unreadInbound: number
  failedSends: number
  voicemailsMissed: number
  aiNeedsEye: number
}

const EMPTY: TriageCounts = {
  todaysPriorities: 0,
  todaysCalls: 0,
  newInquiries: 0,
  staleFollowUps: 0,
  unreadInbound: 0,
  failedSends: 0,
  voicemailsMissed: 0,
  aiNeedsEye: 0,
}

const REFRESH_MS = 60_000
const STALE_DAYS = 7

interface DashboardTriageLanesProps {
  tenantId: string | null | undefined
}

function startOfTodayIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function endOfTodayIso(): string {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

async function loadTriageCounts(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<TriageCounts> {
  const startToday = startOfTodayIso()
  const endToday = endOfTodayIso()
  const staleCutoff = new Date(Date.now() - STALE_DAYS * 24 * 3600 * 1000).toISOString()

  // 1. Today's Priorities — tasks due today (any type), not completed.
  //    Includes overdue tasks (due_date < today, status != done).
  const prioritiesRes = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .lte('due_at', endToday)
    .neq('status', 'completed')
    .neq('status', 'cancelled')

  // 2. Today's Calls — tasks of type "call" scheduled today.
  //    Falls back to 0 when the tasks table lacks a `task_type` column
  //    (older schemas); we filter on a wider net then narrow client-side
  //    if needed. The simple version filters on task_type = 'call'.
  const callsRes = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('due_at', startToday)
    .lte('due_at', endToday)
    .eq('task_type', 'call')
    .neq('status', 'completed')
    .neq('status', 'cancelled')

  // 3. New Inquiries — deals currently sitting at the first stage of
  //    their pipeline (position = 1) with no outbound activity yet.
  //    A "new untouched" lead.
  //    Two-step: find deals at first stage, then exclude any that have
  //    outbound activities.
  const newDealsRes = await supabase
    .from('deals')
    .select('id, pipeline_stages!inner(position, is_won, is_lost)')
    .eq('tenant_id', tenantId)
    .eq('pipeline_stages.position', 1)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  const candidateIds = ((newDealsRes.data ?? []) as Array<{ id: string }>).map((d) => d.id)
  let newInquiries = 0
  if (candidateIds.length > 0) {
    // Exclude those with any outbound activity.
    const outboundRes = await supabase
      .from('activities')
      .select('deal_id')
      .eq('tenant_id', tenantId)
      .in('deal_id', candidateIds)
      .eq('direction', 'outbound')
    const touchedIds = new Set(
      ((outboundRes.data ?? []) as Array<{ deal_id: string | null }>)
        .map((r) => r.deal_id)
        .filter((id): id is string => Boolean(id))
    )
    newInquiries = candidateIds.filter((id) => !touchedIds.has(id)).length
  }

  // 4. Stale Follow-ups — open deals where last_activity_at > 7d ago
  //    AND no future task is set.
  //    deals.last_activity_at is known stale (P1-A in the audit) but
  //    we use it here because the alternative (MAX(activities.occurred_at)
  //    per deal) requires either a denormalised column or an N+1 scan.
  //    The Kanban card phase (2b.56) computes it properly; here a
  //    soft definition is acceptable for a count.
  const staleDealsRes = await supabase
    .from('deals')
    .select('id, last_activity_at, pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', tenantId)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .lt('last_activity_at', staleCutoff)
    .is('deleted_at', null)
    .limit(500)

  const staleCandidateIds = ((staleDealsRes.data ?? []) as Array<{ id: string }>).map((d) => d.id)
  let staleFollowUps = 0
  if (staleCandidateIds.length > 0) {
    // Exclude those with a future open task.
    const futureTasksRes = await supabase
      .from('tasks')
      .select('deal_id')
      .eq('tenant_id', tenantId)
      .in('deal_id', staleCandidateIds)
      .gt('due_at', new Date().toISOString())
      .neq('status', 'completed')
      .neq('status', 'cancelled')
    const scheduledIds = new Set(
      ((futureTasksRes.data ?? []) as Array<{ deal_id: string | null }>)
        .map((r) => r.deal_id)
        .filter((id): id is string => Boolean(id))
    )
    staleFollowUps = staleCandidateIds.filter((id) => !scheduledIds.has(id)).length
  }

  // ---------------------------------------------------------------
  // 2b.51 — Secondary cluster.
  // ---------------------------------------------------------------
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()

  // 5. Unread Inbound — contacts whose most-recent activity (within
  //    last 14d) is inbound. Same shape as the metric-strip's
  //    "replies needed" but without the 4h threshold so this lane
  //    catches everything pending. Bounded scan + client reduction.
  const unreadScanRes = await supabase
    .from('activities')
    .select('contact_id, direction, occurred_at')
    .eq('tenant_id', tenantId)
    .gte('occurred_at', fourteenDaysAgo)
    .in('direction', ['inbound', 'outbound'])
    .order('occurred_at', { ascending: false })
    .limit(2000)
  const lastDirByContactUnread = new Map<string, 'inbound' | 'outbound'>()
  for (const row of (unreadScanRes.data ?? []) as Array<{
    contact_id: string | null
    direction: 'inbound' | 'outbound' | null
  }>) {
    if (!row.contact_id || !row.direction) continue
    if (!lastDirByContactUnread.has(row.contact_id)) {
      lastDirByContactUnread.set(row.contact_id, row.direction)
    }
  }
  let unreadInbound = 0
  for (const dir of lastDirByContactUnread.values()) {
    if (dir === 'inbound') unreadInbound += 1
  }

  // 6. Failed Sends — activities with message_status='failed' in
  //    the last 7d.
  const failedRes = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('message_status', 'failed')
    .gte('occurred_at', sevenDaysAgo)

  // 7. Voicemails / Missed Calls — inbound calls with outcome in
  //    {voicemail, no_answer, missed} in the last 7d.
  const voicemailRes = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('type', 'call')
    .eq('direction', 'inbound')
    .in('outcome', ['voicemail', 'no_answer', 'missed'])
    .gte('occurred_at', sevenDaysAgo)

  // 8. AI Needs Your Eye — activities flagged uncertain by the
  //    2b.24 judge (or 2b.34.7 unsorted-fallback) that haven't been
  //    reassigned yet. Filtered server-side via the metadata JSON
  //    path. Bounded count.
  const aiEyeRes = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('metadata->>ai_attachment_uncertain', 'true')

  return {
    todaysPriorities: prioritiesRes.count ?? 0,
    todaysCalls: callsRes.count ?? 0,
    newInquiries,
    staleFollowUps,
    unreadInbound,
    failedSends: failedRes.count ?? 0,
    voicemailsMissed: voicemailRes.count ?? 0,
    aiNeedsEye: aiEyeRes.count ?? 0,
  }
}

export function DashboardTriageLanes({ tenantId }: DashboardTriageLanesProps) {
  const router = useRouter()
  const [counts, setCounts] = useState<TriageCounts>(EMPTY)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const supabase = createClient()
    const fetch = async () => {
      try {
        const next = await loadTriageCounts(supabase, tenantId)
        if (!cancelled) setCounts(next)
      } catch (err) {
        console.warn('[triage-lanes] count failed', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void fetch()
    const interval = setInterval(fetch, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [tenantId])

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-700">
        Triage — do these now
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <TriageLaneCard
          label="Today's priorities"
          count={counts.todaysPriorities}
          icon={Flame}
          tone="orange"
          loading={loading}
          subtitle="Tasks due today"
          onClick={() => router.push('/tasks?mode=queue')}
          ctaLabel="Start queue →"
        />
        <TriageLaneCard
          label="Today's calls"
          count={counts.todaysCalls}
          icon={Phone}
          tone="purple"
          loading={loading}
          subtitle="Calls scheduled today"
          onClick={() => router.push('/call-coaching?mode=queue')}
          ctaLabel="Open dialer →"
        />
        <TriageLaneCard
          label="New inquiries"
          count={counts.newInquiries}
          icon={Sparkles}
          tone="blue"
          loading={loading}
          subtitle="Untouched leads"
          onClick={() => router.push('/deals?view=kanban&filter=new-untouched')}
          ctaLabel="Open Kanban →"
        />
        <TriageLaneCard
          label="Stale follow-ups"
          count={counts.staleFollowUps}
          icon={Hourglass}
          tone="amber"
          loading={loading}
          subtitle={`> ${STALE_DAYS}d untouched, no task`}
          onClick={() => router.push('/deals?view=kanban&filter=stale')}
          ctaLabel="Open Kanban →"
        />

        {/* 2b.51 — Secondary lane cluster. Same primitive, more
            focused signals. Hidden cards remain in the grid as
            empty-state placeholders so the layout doesn't shift
            when a lane's count drops to zero. */}
        <TriageLaneCard
          label="Unread inbound"
          count={counts.unreadInbound}
          icon={MessageSquare}
          tone="red"
          loading={loading}
          subtitle="Patient texted, no reply yet"
          onClick={() => router.push('/deals?view=kanban&filter=unread-inbound')}
          ctaLabel="Reply →"
        />
        <TriageLaneCard
          label="Failed sends"
          count={counts.failedSends}
          icon={AlertTriangle}
          tone="amber"
          loading={loading}
          subtitle="Bounced in last 7d"
          onClick={() => router.push('/deals?view=kanban&filter=failed-sends')}
          ctaLabel="Review →"
        />
        <TriageLaneCard
          label="Voicemails / missed"
          count={counts.voicemailsMissed}
          icon={Voicemail}
          tone="purple"
          loading={loading}
          subtitle="Inbound calls last 7d"
          onClick={() => router.push('/deals?view=kanban&filter=voicemails')}
          ctaLabel="Call back →"
        />
        <TriageLaneCard
          label="AI needs your eye"
          count={counts.aiNeedsEye}
          icon={Eye}
          tone="blue"
          loading={loading}
          subtitle="Uncertain attachments"
          onClick={() => router.push('/deals?view=kanban&filter=ai-uncertain')}
          ctaLabel="Classify →"
        />
      </div>
    </div>
  )
}

// ---- Card component ----------------------------------------------------

const TONE_CLASSES: Record<
  string,
  { bg: string; border: string; text: string; iconBg: string; iconText: string }
> = {
  orange: {
    bg: 'bg-orange-50/40',
    border: 'border-orange-200',
    text: 'text-orange-900',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600',
  },
  purple: {
    bg: 'bg-purple-50/40',
    border: 'border-purple-200',
    text: 'text-purple-900',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
  },
  blue: {
    bg: 'bg-blue-50/40',
    border: 'border-blue-200',
    text: 'text-blue-900',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
  },
  amber: {
    bg: 'bg-amber-50/40',
    border: 'border-amber-200',
    text: 'text-amber-900',
    iconBg: 'bg-amber-100',
    iconText: 'text-amber-600',
  },
  red: {
    bg: 'bg-red-50/40',
    border: 'border-red-200',
    text: 'text-red-900',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
  },
  emerald: {
    bg: 'bg-emerald-50/40',
    border: 'border-emerald-200',
    text: 'text-emerald-900',
    iconBg: 'bg-emerald-100',
    iconText: 'text-emerald-600',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-500',
  },
}

export interface TriageLaneCardProps {
  label: string
  count: number
  icon: typeof Flame
  tone: keyof typeof TONE_CLASSES
  subtitle?: string
  ctaLabel?: string
  loading?: boolean
  onClick?: () => void
}

export function TriageLaneCard({
  label,
  count,
  icon: Icon,
  tone,
  subtitle,
  ctaLabel,
  loading,
  onClick,
}: TriageLaneCardProps) {
  const t = TONE_CLASSES[tone] ?? TONE_CLASSES.gray
  const isEmpty = !loading && count === 0

  return (
    <button
      type="button"
      onClick={isEmpty ? undefined : onClick}
      disabled={isEmpty}
      className={cn(
        'group text-left rounded-lg border p-4 transition-all',
        isEmpty
          ? 'bg-gray-50 border-gray-200 cursor-default'
          : cn(t.bg, t.border, 'hover:shadow-md hover:border-opacity-80 cursor-pointer')
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div
          className={cn(
            'h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0',
            isEmpty ? 'bg-gray-100 text-gray-400' : cn(t.iconBg, t.iconText)
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <span
          className={cn(
            'text-3xl font-bold leading-none',
            isEmpty ? 'text-gray-300' : t.text
          )}
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin opacity-60" /> : count}
        </span>
      </div>
      <div
        className={cn(
          'text-sm font-semibold',
          isEmpty ? 'text-gray-500' : t.text
        )}
      >
        {label}
      </div>
      {subtitle && (
        <div className={cn('text-xs mt-0.5', isEmpty ? 'text-gray-400' : 'text-gray-600')}>
          {isEmpty ? 'Nothing here ✓' : subtitle}
        </div>
      )}
      {!isEmpty && ctaLabel && (
        <div
          className={cn(
            'text-xs font-medium mt-2 opacity-0 group-hover:opacity-100 transition-opacity',
            t.iconText
          )}
        >
          {ctaLabel}
        </div>
      )}
    </button>
  )
}
