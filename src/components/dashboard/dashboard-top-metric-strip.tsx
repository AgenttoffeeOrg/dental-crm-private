'use client'

/**
 * Phase 2b.49 — Dashboard top metric strip.
 *
 * Five at-a-glance numbers on one line at the top of /dashboard,
 * per the 2026-05-23 product discussion:
 *
 *   1. Total open deals
 *   2. Total open deal value (£)
 *   3. New leads this week
 *   4. Replies needed (inbound > 4h with no outbound after — the
 *      "we're losing them" number)
 *   5. Avg response time, 7-day (minutes between inbound arrival
 *      and first outbound reply)
 *
 * Each number is clickable and routes to a sensible target.
 * Counts auto-refresh every 60 seconds in the foreground.
 *
 * Data source: client-side Supabase queries (RLS enforces tenant
 * isolation). Counts use `head: true` for cheap `count = exact`.
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface DashboardMetrics {
  openDealsCount: number
  openDealsValueCents: number
  newLeadsThisWeek: number
  repliesNeeded: number
  avgResponseMinutes7d: number | null
}

const EMPTY: DashboardMetrics = {
  openDealsCount: 0,
  openDealsValueCents: 0,
  newLeadsThisWeek: 0,
  repliesNeeded: 0,
  avgResponseMinutes7d: null,
}

const REFRESH_MS = 60_000
const REPLIES_NEEDED_THRESHOLD_HOURS = 4

interface DashboardTopMetricStripProps {
  tenantId: string | null | undefined
}

function formatCurrency(cents: number): string {
  if (cents === 0) return '£0'
  if (cents >= 1_000_000_00) {
    return `£${(cents / 100_000_000).toFixed(1)}M`
  }
  if (cents >= 1_000_00) {
    return `£${Math.round(cents / 100_000)}k`
  }
  return `£${Math.round(cents / 100)}`
}

function formatResponseTime(minutes: number | null): string {
  if (minutes === null) return '—'
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = minutes / 60
  if (hours < 24) {
    const h = Math.floor(hours)
    const m = Math.round(minutes - h * 60)
    return m === 0 ? `${h}h` : `${h}h ${m}m`
  }
  return `${Math.round(hours / 24)}d`
}

async function loadMetrics(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<DashboardMetrics> {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString()
  const fourHoursAgo = new Date(now.getTime() - REPLIES_NEEDED_THRESHOLD_HOURS * 3600 * 1000).toISOString()

  // 1. Open deals — pull rows + values (no good way to get sum +
  // count in a single Supabase query without an RPC).
  const openDealsRes = await supabase
    .from('deals')
    .select('value_estimate_cents, pipeline_stages!inner(is_won, is_lost)')
    .eq('tenant_id', tenantId)
    .eq('pipeline_stages.is_won', false)
    .eq('pipeline_stages.is_lost', false)
    .is('deleted_at', null)

  const openRows = (openDealsRes.data ?? []) as Array<{ value_estimate_cents: number | null }>
  const openDealsCount = openRows.length
  const openDealsValueCents = openRows.reduce((s, r) => s + (r.value_estimate_cents ?? 0), 0)

  // 2. New leads this week — contacts created in the last 7d with
  // any source except 'manual_entry' (so operator-typed contacts
  // don't inflate the count).
  const newLeadsRes = await supabase
    .from('contacts')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('created_at', weekAgo)
    .neq('source', 'manual_entry')

  // 3. Replies needed — derived from activities. Pull last-touch
  // direction per contact in the window, then count contacts where
  // the latest direction is inbound. This is a coarse client-side
  // computation; a stored function would be cheaper if this becomes
  // hot.
  const repliesScanRes = await supabase
    .from('activities')
    .select('contact_id, direction, occurred_at')
    .eq('tenant_id', tenantId)
    .lt('occurred_at', fourHoursAgo)
    .gte('occurred_at', new Date(now.getTime() - 14 * 24 * 3600 * 1000).toISOString())
    .in('direction', ['inbound', 'outbound'])
    .order('occurred_at', { ascending: false })
    .limit(2000)

  const lastDirByContact = new Map<string, 'inbound' | 'outbound'>()
  for (const row of (repliesScanRes.data ?? []) as Array<{
    contact_id: string | null
    direction: 'inbound' | 'outbound' | null
  }>) {
    if (!row.contact_id || !row.direction) continue
    if (!lastDirByContact.has(row.contact_id)) lastDirByContact.set(row.contact_id, row.direction)
  }
  let repliesNeeded = 0
  for (const dir of lastDirByContact.values()) {
    if (dir === 'inbound') repliesNeeded += 1
  }

  // 4. Avg response time (last 7 days). Pair each inbound with the
  // first outbound after it on the same contact; average the
  // diffs. Bounded scan (limit 1000 inbound activities).
  const responseScanRes = await supabase
    .from('activities')
    .select('contact_id, direction, occurred_at')
    .eq('tenant_id', tenantId)
    .gte('occurred_at', weekAgo)
    .in('direction', ['inbound', 'outbound'])
    .order('occurred_at', { ascending: true })
    .limit(1000)

  const responseRows = (responseScanRes.data ?? []) as Array<{
    contact_id: string | null
    direction: 'inbound' | 'outbound' | null
    occurred_at: string
  }>
  const pendingByContact = new Map<string, string>()
  const responseMinutes: number[] = []
  for (const r of responseRows) {
    if (!r.contact_id || !r.direction) continue
    if (r.direction === 'inbound') {
      if (!pendingByContact.has(r.contact_id)) pendingByContact.set(r.contact_id, r.occurred_at)
    } else if (r.direction === 'outbound') {
      const inboundTs = pendingByContact.get(r.contact_id)
      if (inboundTs) {
        const diffMin = (new Date(r.occurred_at).getTime() - new Date(inboundTs).getTime()) / 60_000
        if (diffMin > 0 && diffMin < 14 * 24 * 60) responseMinutes.push(diffMin)
        pendingByContact.delete(r.contact_id)
      }
    }
  }
  const avgResponseMinutes7d =
    responseMinutes.length === 0
      ? null
      : responseMinutes.reduce((s, n) => s + n, 0) / responseMinutes.length

  return {
    openDealsCount,
    openDealsValueCents,
    newLeadsThisWeek: newLeadsRes.count ?? 0,
    repliesNeeded,
    avgResponseMinutes7d,
  }
}

export function DashboardTopMetricStrip({ tenantId }: DashboardTopMetricStripProps) {
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setLoading(false)
      return
    }
    let cancelled = false
    const supabase = createClient()
    const fetch = async () => {
      try {
        const next = await loadMetrics(supabase, tenantId)
        if (!cancelled) {
          setMetrics(next)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'load_failed')
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
    <div className="bg-white border border-gray-200 rounded-lg px-5 py-3">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-3 text-sm">
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading dashboard numbers…</span>
          </div>
        ) : error ? (
          <div className="text-sm text-red-600">Couldn&apos;t load metrics: {error}</div>
        ) : (
          <>
            <MetricItem
              label="Open deals"
              value={metrics.openDealsCount.toLocaleString('en-GB')}
              onClick={() => router.push('/deals')}
            />
            <MetricItem
              label="Open value"
              value={formatCurrency(metrics.openDealsValueCents)}
              onClick={() => router.push('/deals')}
            />
            <MetricItem
              label="New leads this week"
              value={metrics.newLeadsThisWeek.toLocaleString('en-GB')}
              onClick={() => router.push('/contacts')}
            />
            <MetricItem
              label="Replies needed"
              value={metrics.repliesNeeded.toLocaleString('en-GB')}
              accent={metrics.repliesNeeded > 0 ? 'urgent' : 'neutral'}
              // Routes to a /deals filter once 2b.51 surfaces the
              // Unread Inbound triage lane.
              onClick={() => router.push('/deals')}
            />
            <MetricItem
              label="Avg response (7d)"
              value={formatResponseTime(metrics.avgResponseMinutes7d)}
              onClick={() => router.push('/deals')}
              dimmedIfEmpty={metrics.avgResponseMinutes7d === null}
            />
          </>
        )}
      </div>
    </div>
  )
}

interface MetricItemProps {
  label: string
  value: string
  onClick?: () => void
  accent?: 'urgent' | 'neutral'
  dimmedIfEmpty?: boolean
}

function MetricItem({ label, value, onClick, accent = 'neutral', dimmedIfEmpty }: MetricItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left flex items-baseline gap-1.5 hover:bg-gray-50 rounded px-1 -mx-1 transition-colors"
    >
      <span
        className={cn(
          'text-lg font-semibold',
          accent === 'urgent' ? 'text-red-700' : 'text-gray-900',
          dimmedIfEmpty && 'text-gray-400'
        )}
      >
        {value}
      </span>
      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
    </button>
  )
}
