'use client'

/**
 * Phase 2b.95 — Task Context Briefing panel.
 *
 * Drop-in right column for the TaskQueuePanel on non-call tasks
 * (sms, whatsapp, email, todo, follow-up). All real data — no
 * template strings. Three sections:
 *
 *   1. AI brief: 2-3 sentence relationship recap + 3-5 talking
 *      points specific to this patient. Powered by the same
 *      /api/contacts/[id]/pre-call-brief endpoint we built for
 *      the call takeover. Channel-agnostic — the talking points
 *      help whether you're typing or talking.
 *
 *   2. Recent conversation history: last 8 activities for this
 *      contact with channel/direction icons, when, body or AI
 *      summary if cached. Tells the operator what's already been
 *      said.
 *
 *   3. Talking points & objection handling via the existing
 *      NextBestScriptPanel — trigger picker for Price / Anxiety /
 *      Timing / Trust / Finance / Comparing alternatives / Pain
 *      and urgency / Second opinion / Universal.
 *
 * Same content surface as CallTakeoverPanel (DRY between call +
 * non-call paths intentional — both flows need this context).
 */

import { useCallback, useEffect, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Sparkles,
  Loader2,
  History,
  Shield,
  Phone,
  Mail,
  MessageSquare,
  Calendar,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { NextBestScriptPanel } from '@/components/scripts/next-best-script-panel'

interface TaskContextBriefingProps {
  contactId: string | null
  dealId: string | null
  taskTitle: string
  taskType: string | null
}

interface PreCallBrief {
  summary: string
  talking_points: string[]
  generated_at: string
}

interface ActivityRow {
  id: string
  occurred_at: string
  type: string | null
  direction: string | null
  subject: string | null
  body: string | null
  metadata: any
  duration_seconds: number | null
}

function activityIcon(type: string | null) {
  switch (type) {
    case 'call':
      return Phone
    case 'email':
      return Mail
    case 'sms':
    case 'whatsapp':
      return MessageSquare
    case 'meeting':
      return Calendar
    default:
      return MessageSquare
  }
}

function activityLabel(row: ActivityRow): string {
  const aiSummary = row.metadata?.ai_summary
  if (aiSummary && typeof aiSummary === 'string') return aiSummary
  if (row.subject) return row.subject
  if (row.body) return row.body.slice(0, 220)
  return row.type ?? 'Activity'
}

// Channel-flavoured label so the brief card reads right for any
// task type (we reuse the same backend endpoint for all).
function briefTitle(taskType: string | null): string {
  switch (taskType) {
    case 'call':
      return 'Pre-call brief'
    case 'sms':
    case 'whatsapp':
    case 'email':
      return 'Pre-message brief'
    default:
      return 'Task brief'
  }
}

export function TaskContextBriefing({
  contactId,
  dealId,
  taskTitle,
  taskType,
}: TaskContextBriefingProps) {
  const [brief, setBrief] = useState<PreCallBrief | null>(null)
  const [briefStale, setBriefStale] = useState(false)
  const [briefLoading, setBriefLoading] = useState(false)
  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [loadingActivities, setLoadingActivities] = useState(false)

  // Fetch cached brief on mount.
  useEffect(() => {
    if (!contactId) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/contacts/${contactId}/pre-call-brief`, {
          credentials: 'include',
        })
        if (!res.ok) return
        const body = await res.json()
        if (!cancelled) {
          setBrief(body.brief ?? null)
          setBriefStale(Boolean(body.stale))
        }
      } catch {
        /* silent — UI shows Generate button */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [contactId])

  // Load recent activities for the history rail.
  useEffect(() => {
    if (!contactId) return
    let cancelled = false
    const supabase = createClient()
    ;(async () => {
      setLoadingActivities(true)
      try {
        const { data } = await supabase
          .from('activities')
          .select('id, occurred_at, type, direction, subject, body, metadata, duration_seconds')
          .eq('contact_id', contactId)
          .order('occurred_at', { ascending: false })
          .limit(8)
        if (!cancelled) setActivities((data ?? []) as ActivityRow[])
      } finally {
        if (!cancelled) setLoadingActivities(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [contactId])

  const generateBrief = useCallback(async () => {
    if (!contactId) return
    setBriefLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/pre-call-brief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ taskTitle }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      const body = await res.json()
      setBrief(body.brief)
      setBriefStale(false)
    } catch (err) {
      toast.error(`Couldn't generate brief: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBriefLoading(false)
    }
  }, [contactId, taskTitle])

  if (!contactId) {
    return (
      <ScrollArea className="bg-gray-50/50">
        <div className="p-6">
          <Card>
            <CardContent className="py-8 text-center text-sm text-gray-500">
              <Sparkles className="h-6 w-6 mx-auto mb-2 text-gray-300" />
              Link this task to a contact to see the AI brief, recent
              history, and talking points.
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="bg-gray-50/50">
      <div className="p-5 space-y-4">
        {/* AI Brief */}
        <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                {briefTitle(taskType)}
              </span>
              {brief && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={generateBrief}
                  disabled={briefLoading}
                >
                  {briefLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : briefStale ? (
                    'Refresh'
                  ) : (
                    'Regenerate'
                  )}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            {brief ? (
              <>
                <p className="text-sm text-gray-800 leading-relaxed">{brief.summary}</p>
                {brief.talking_points.length > 0 && (
                  <div>
                    <p className="text-xs uppercase tracking-wide text-gray-500 mb-1.5">
                      What to bring up
                    </p>
                    <ul className="space-y-1.5">
                      {brief.talking_points.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-800">
                          <span className="text-purple-600 font-medium shrink-0">{i + 1}.</span>
                          <span>{p}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {briefStale && (
                  <p className="text-[10px] text-amber-700">
                    ⚠ New activity since this brief was generated — click Refresh.
                  </p>
                )}
                <p className="text-[10px] text-gray-400">
                  Generated {formatDistanceToNow(new Date(brief.generated_at), { addSuffix: true })}
                </p>
              </>
            ) : (
              <div className="text-center py-2">
                <p className="text-xs text-gray-600 mb-3">
                  Let Claude read this patient's history + persona and prep a 2-line
                  recap + 3-5 talking points specific to them.
                </p>
                <Button
                  size="sm"
                  onClick={generateBrief}
                  disabled={briefLoading}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {briefLoading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Generate brief
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent conversation history */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <History className="h-3.5 w-3.5 text-gray-500" />
              Recent conversation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingActivities ? (
              <div className="text-xs text-gray-500 flex items-center gap-2 py-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </div>
            ) : activities.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-2">
                No previous activity with this patient. This is the first touch.
              </p>
            ) : (
              <div className="space-y-3">
                {activities.map((row) => {
                  const Icon = activityIcon(row.type)
                  return (
                    <div key={row.id} className="flex gap-3 text-xs">
                      <div className="flex flex-col items-center pt-0.5">
                        <div className="h-6 w-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0">
                          <Icon className="h-3 w-3 text-gray-600" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className="text-[10px] capitalize px-1.5 py-0"
                          >
                            {row.direction === 'inbound' ? '← in' : '→ out'} {row.type}
                          </Badge>
                          <span className="text-gray-500">
                            {formatDistanceToNow(new Date(row.occurred_at), { addSuffix: true })}
                          </span>
                          {row.duration_seconds != null && row.type === 'call' && (
                            <span className="text-gray-500">
                              · {Math.floor(row.duration_seconds / 60)}m{' '}
                              {row.duration_seconds % 60}s
                            </span>
                          )}
                        </div>
                        <p className="text-gray-700 line-clamp-3">{activityLabel(row)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Talking points + objection handling */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Shield className="h-3.5 w-3.5 text-emerald-600" />
              Talking points & objections
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <NextBestScriptPanel
              contactId={contactId}
              dealId={dealId ?? undefined}
              defaultTrigger="universal"
            />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
