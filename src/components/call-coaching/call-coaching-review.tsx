'use client'

/**
 * Phase 2b.89 — Call Coaching review screen.
 *
 * Replaces the standalone CallCoachingWorkspace on /call-coaching with
 * a pure post-call review surface. Per the 2026-05-24 product spec:
 *
 *   - All operator ACTIVITY (calling, messaging, doing tasks) happens
 *     in /tasks. The task queue with "Calls only" filter is the
 *     back-to-back-calls flow.
 *   - When the queue advances to a call task, the same coaching
 *     workspace gets rendered full-screen as a takeover. After the
 *     call's outcome is logged, the queue resumes.
 *   - /call-coaching standalone exists ONLY to look back: recent
 *     calls, AI coaching scores, recording playback if available.
 *     No "Start Call" / "Send SMS" / "Send Email" buttons here —
 *     this isn't an action surface.
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Phone, ChevronRight, Loader2, Headphones, Sparkles } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase-client'
import { useTenant } from '@/lib/hooks/use-tenant'

interface CallRow {
  id: string
  occurred_at: string
  direction: string | null
  duration_seconds: number | null
  contact_id: string | null
  metadata: any
  contact?: {
    id: string
    full_name: string | null
    primary_phone: string | null
  } | null
}

function formatDuration(sec: number | null): string {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function coachingScore(row: CallRow): number | null {
  const score = row.metadata?.ai_coaching?.score ?? row.metadata?.coaching_score ?? null
  if (typeof score === 'number') return Math.round(score * 100) / 100
  return null
}

function scoreBadgeColor(score: number | null): string {
  if (score == null) return 'bg-gray-100 text-gray-600'
  if (score >= 0.8) return 'bg-emerald-100 text-emerald-700'
  if (score >= 0.5) return 'bg-amber-100 text-amber-700'
  return 'bg-red-100 text-red-700'
}

export function CallCoachingReview() {
  const { tenantId } = useTenant()
  const [calls, setCalls] = useState<CallRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('activities')
          .select('id, occurred_at, direction, duration_seconds, contact_id, metadata, contact:contacts(id, full_name, primary_phone)')
          .eq('tenant_id', tenantId)
          .eq('type', 'call')
          .order('occurred_at', { ascending: false })
          .limit(50)
        setCalls((data ?? []) as CallRow[])
      } finally {
        setLoading(false)
      }
    })()
  }, [tenantId])

  const withScores = calls.filter((c) => coachingScore(c) != null)
  const avgScore =
    withScores.length > 0
      ? withScores.reduce((acc, c) => acc + (coachingScore(c) ?? 0), 0) / withScores.length
      : null

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Call Coaching</h1>
        <p className="mt-1 text-sm text-gray-600 max-w-2xl">
          Review your recent calls and AI coaching feedback. To make calls,
          go to <Link href="/tasks" className="text-emerald-700 underline">/tasks</Link>{' '}
          → filter "Calls only" → Start Queue. Each call in the queue opens this
          coaching workspace automatically.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calls last 30 days</CardDescription>
            <CardTitle className="text-2xl">{calls.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Calls scored by AI</CardDescription>
            <CardTitle className="text-2xl">{withScores.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Average coaching score</CardDescription>
            <CardTitle className="text-2xl">
              {avgScore != null ? avgScore.toFixed(2) : '—'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Phone className="h-4 w-4" />
            Recent calls
          </CardTitle>
          <CardDescription>
            Most recent first. Click a row to see the call detail + recording
            + AI coaching feedback on the contact's chat history.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : calls.length === 0 ? (
            <div className="text-sm text-gray-500 py-6">
              No calls logged yet. Make some calls via{' '}
              <Link href="/tasks" className="text-emerald-700 underline">/tasks</Link>{' '}
              and the coaching feedback will appear here.
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((row) => {
                const score = coachingScore(row)
                const name = row.contact?.full_name ?? row.contact?.primary_phone ?? '—'
                const initials = name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .substring(0, 2)
                  .toUpperCase()
                return (
                  <Link
                    key={row.id}
                    href={row.contact_id ? `/contacts/${row.contact_id}` : '#'}
                    className="flex items-center justify-between gap-4 rounded-md border border-gray-200 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-xs font-semibold">
                          {initials || '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{name}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                          <span>
                            {formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true })}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{row.direction ?? 'unknown'}</span>
                          <span>•</span>
                          <span>{formatDuration(row.duration_seconds)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {score != null && (
                        <Badge className={`${scoreBadgeColor(score)} font-medium`}>
                          <Sparkles className="h-3 w-3 mr-1" />
                          {score.toFixed(2)}
                        </Badge>
                      )}
                      {row.metadata?.recording_url && (
                        <Badge variant="outline" className="text-xs">
                          <Headphones className="h-3 w-3 mr-1" />
                          Recording
                        </Badge>
                      )}
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
