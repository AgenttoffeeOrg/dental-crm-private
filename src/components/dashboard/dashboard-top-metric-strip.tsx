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

  // 3. Replies needed — server-side RPC (2b.57.2 fix for HIGH #3).
  // Previously a 2000-row client scan + reduction; now a single
  // scalar.
  const { data: repliesNeededRaw } = await supabase.rpc(
    'dashboard_replies_needed_count',
    {
      p_tenant_id: tenantId,
      p_window_days: 14,
      p_min_age_hours: REPLIES_NEEDED_THRESHOLD_HOURS,
    }
  )
  const repliesNeeded = typeof repliesNeededRaw === 'number' ? repliesNeededRaw : 0

  // 4. Avg response time (last 7 days) — server-side RPC (2b.57.2
  // fix for HIGH #4). Previously a 1000-row client scan + paired-
  // reduction; now a single numeric (or NULL when under-sample).
  const { data: avgRaw } = await supabase.rpc('dashboard_avg_response_minutes', {
    p_tenant_id: tenantId,
    p_window_days: 7,
  })
  const avgResponseMinutes7d =
    typeof avgRaw === 'number'
      ? avgRaw
      : avgRaw == null
      ? null
      : Number(avgRaw)

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
