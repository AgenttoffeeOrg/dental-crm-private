'use client'

/**
 * Phase 2b.41 — Chat-bubble render shell.
 *
 * Replaces the big-card layout from `activity-feed-enterprise.tsx`
 * `renderActivityCard()` with a compact WhatsApp-style bubble.
 *
 * Direction rule (locked in the 2026-05-23 product discussion):
 *   - Practice / us  → RIGHT (blue / amber bubble).
 *   - Patient / them → LEFT  (grey / white bubble).
 *   - Notes (practice-authored only) → RIGHT (yellow bubble).
 *
 * What this phase deliberately keeps minimal:
 *   - No inline AI labels yet (2b.42 adds those).
 *   - Email bodies render unmolested (2b.43 will summarise them).
 *   - Calls show duration + outcome, no transcript (2b.44 adds it).
 *   - No deep AI suggestion UI inside the bubble — just the existing
 *     "AI unsure" amber pill so the marker doesn't disappear from
 *     the UI; suggest accept/dismiss lives in the legacy badge
 *     plumbing until 2b.42 ports it over.
 *   - Click bubble → opens the existing ActivityDetailSlideIn (wired
 *     by the parent via `onClick`).
 */

import { useEffect, useRef, useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  FileText,
  MessageCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface BubbleActivity {
  id: string
  type: 'call' | 'email' | 'whatsapp' | 'note' | 'sms' | 'meeting'
  direction?: 'inbound' | 'outbound'
  subject?: string
  snippet?: string
  description?: string
  occurred_at: string
  duration_seconds?: number
  outcome?: string
  message_status?: string
  metadata?: any
  deal_id?: string | null
  deal_title?: string | null
}

// 2b.42 — AI inline label suggestion state (mirrors the shape used
// by activity-feed-enterprise.tsx; the parent owns the map and
// passes the per-activity entry in).
export type AiSuggestionEntry =
  | { status: 'fetching' }
  | { status: 'accepting' }
  | { status: 'none'; message: string }
  | {
      status: 'ready'
      kind: 'reuse_matching_pipeline' | 'new_pipeline'
      pipelineName: string | null
      dealId: string | null
      confidence: number | null
      source: 'keyword' | 'ai'
    }

interface ActivityChatBubbleProps {
  activity: BubbleActivity
  onClick?: () => void
  isDragging?: boolean
  // 2b.42 — AI inline-suggest handlers wired in from the parent feed.
  // All optional; bubble renders gracefully when omitted (e.g. on
  // the deal detail page if it ever mounts this component standalone).
  aiSuggestion?: AiSuggestionEntry
  onFetchAiSuggestion?: (activityId: string) => void
  onAcceptAiSuggestion?: (activityId: string) => void
  onDismissAiSuggestion?: (activityId: string) => void
}

/**
 * Decide bubble side. Notes are always practice-authored so they
 * sit on the right. Calls + messages + emails follow the activity's
 * direction. Activities lacking a direction (rare; meetings without
 * an explicit direction tag) default to the right because the
 * operator is the one in the system.
 */
function bubbleSide(activity: BubbleActivity): 'left' | 'right' {
  if (activity.type === 'note') return 'right'
  return activity.direction === 'inbound' ? 'left' : 'right'
}

/**
 * Resolve the displayable text of the bubble.
 *
 *   - SMS / WhatsApp: body is in `snippet` (outbound composer path)
 *     or `description` (ingestLead inbound path). Render verbatim;
 *     they're short by nature.
 *   - Emails (2b.44): prefer the cached AI summary from
 *     `metadata.ai_email_summary` (lazy-populated by 2b.43). Falls
 *     back to a body preview while the summariser is running so
 *     the bubble is never empty.
 *   - Calls (2b.44): prefer the call's `metadata.ai_summary` (which
 *     the call-transcribe pipeline writes). Falls back to a status
 *     line ("5m 23s · Connected") when no summary is cached — Q4
 *     audit decision: graceful fallback, don't block call display
 *     on AI processing.
 *   - Notes / meetings: snippet / description.
 */
function bubbleText(
  activity: BubbleActivity,
  opts?: { emailSummary?: string | null }
): string {
  // Emails: AI summary preferred.
  if (activity.type === 'email') {
    const cachedSummary = (activity.metadata?.ai_email_summary as string | undefined) ?? null
    const summary = opts?.emailSummary ?? cachedSummary
    if (summary && summary.trim()) return summary.trim()
    // No summary yet — show a short body preview.
    const fallbackSource =
      activity.snippet?.trim() || activity.description?.trim() || activity.subject?.trim() || ''
    return fallbackSource ? fallbackSource.slice(0, 200) : '(email)'
  }

  // Calls: AI transcript summary preferred.
  if (activity.type === 'call') {
    const callSummary = activity.metadata?.ai_summary as string | undefined
    if (callSummary && callSummary.trim()) return callSummary.trim()
    // Fallback: short status line. The footer also shows duration +
    // outcome so this can be brief.
    if (activity.duration_seconds) {
      const mins = Math.floor(activity.duration_seconds / 60)
      const secs = activity.duration_seconds % 60
      const dur = mins === 0 ? `${secs}s` : secs === 0 ? `${mins}m` : `${mins}m ${secs}s`
      return activity.outcome
        ? `${dur} · ${activity.outcome.replace(/_/g, ' ')}`
        : `${dur} call`
    }
    return activity.outcome
      ? `Call · ${activity.outcome.replace(/_/g, ' ')}`
      : '(call)'
  }

  // Everything else: snippet → description → subject.
  const candidates = [activity.snippet, activity.description, activity.subject]
  for (const c of candidates) {
    if (c && c.trim()) return c.trim()
  }
  return `(${activity.type})`
}

const TYPE_ICON: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  sms: MessageCircle,
  whatsapp: MessageSquare,
  meeting: Calendar,
  note: FileText,
}

function formatDuration(seconds?: number): string | null {
  if (!seconds || seconds <= 0) return null
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}s`
  if (secs === 0) return `${mins}m`
  return `${mins}m ${secs}s`
}

// Render a single 1-2 word AI label. Heuristic: collapse any input
// longer than two words to its first two; lowercase for visual
// quiet; truncate stupidly long values at 20 chars.
function shortLabel(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const s = raw.trim()
  if (!s) return null
  const words = s.split(/\s+/).slice(0, 2).join(' ').toLowerCase()
  return words.length > 20 ? words.slice(0, 20) + '…' : words
}

export function ActivityChatBubble({
  activity,
  onClick,
  isDragging,
  aiSuggestion,
  onFetchAiSuggestion,
  onAcceptAiSuggestion,
  onDismissAiSuggestion,
}: ActivityChatBubbleProps) {
  const side = bubbleSide(activity)
  const Icon = TYPE_ICON[activity.type] ?? FileText
  const isFailed = activity.message_status === 'failed'
  const isUncertain = activity.metadata?.ai_attachment_uncertain === true

  // 2b.42 — pull the AI labels off metadata. Compact 1-2 word format
  // per the 2026-05-23 product discussion. Outbound activities have
  // dispatcher-heuristic AI fields (per audit P2-A) — they look AI-
  // flavoured but are static; rendering them is still useful as a
  // glance signal until a future phase replaces them with real
  // Claude output.
  const aiPurpose = shortLabel(activity.metadata?.ai_purpose)
  // Calls are the only type with a real outcome label.
  const aiOutcome = activity.type === 'call' ? shortLabel(activity.metadata?.ai_outcome) : null
  const aiSentiment = shortLabel(activity.metadata?.ai_sentiment)
  const hasAiLabels = aiPurpose || aiOutcome || aiSentiment

  // 2b.43 — lazy email summariser. Fires once per bubble mount when
  // the activity is an email AND we don't already have a cached
  // summary on metadata. The local state holds whatever's been
  // fetched so re-renders during this session don't refire.
  const cachedEmailSummary = activity.metadata?.ai_email_summary as string | undefined
  const [lazyEmailSummary, setLazyEmailSummary] = useState<string | null>(
    cachedEmailSummary ?? null
  )
  const [emailSummarising, setEmailSummarising] = useState(false)
  const lazyFiredRef = useRef(false)
  useEffect(() => {
    if (activity.type !== 'email') return
    if (cachedEmailSummary) return
    if (lazyFiredRef.current) return
    lazyFiredRef.current = true
    let cancelled = false
    const run = async () => {
      setEmailSummarising(true)
      try {
        const res = await fetch(`/api/activities/${activity.id}/summarise-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
        })
        if (!res.ok) return
        const body = (await res.json().catch(() => null)) as { summary?: string } | null
        if (!cancelled && body?.summary) setLazyEmailSummary(body.summary)
      } catch (err) {
        // 2b.57.1 — log so flaky Claude calls are visible in the
        // browser console even though we fall back to the body
        // preview for the user (audit HIGH #1).
        console.warn('[activity-chat-bubble] summarise-email failed', {
          activityId: activity.id,
          err: err instanceof Error ? err.message : String(err),
        })
      } finally {
        if (!cancelled) setEmailSummarising(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id, activity.type])

  // 2b.61 — Lazy AI commitment detector. Same lazy-on-mount pattern
  // as the email summariser above. Fires once per bubble mount for
  // ANY activity (calls, SMS, WhatsApp, email, note) when no
  // commitment suggestion is cached on metadata. Below the
  // PILL_RENDER_CONFIDENCE_THRESHOLD (0.7), the pill stays hidden.
  const PILL_THRESHOLD = 0.7
  const cachedCommitmentRaw = activity.metadata?.ai_commitment_suggestion as
    | {
        has_commitment: boolean
        action: string | null
        deadline_iso: string | null
        confidence: number
        by: 'patient' | 'practice' | null
        dismissed_at?: string | null
        accepted_task_id?: string | null
      }
    | undefined
  const [commitmentSuggestion, setCommitmentSuggestion] = useState<typeof cachedCommitmentRaw>(
    cachedCommitmentRaw ?? undefined
  )
  const [commitmentAccepting, setCommitmentAccepting] = useState(false)
  const commitmentFiredRef = useRef(false)
  useEffect(() => {
    if (!activity.id) return
    if (cachedCommitmentRaw) return
    if (commitmentFiredRef.current) return
    commitmentFiredRef.current = true
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(
          `/api/activities/${activity.id}/detect-commitment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          }
        )
        if (!res.ok) return
        const body = (await res.json().catch(() => null)) as
          | { suggestion?: typeof cachedCommitmentRaw }
          | null
        if (!cancelled && body?.suggestion) setCommitmentSuggestion(body.suggestion)
      } catch (err) {
        console.warn('[activity-chat-bubble] detect-commitment failed', {
          activityId: activity.id,
          err: err instanceof Error ? err.message : String(err),
        })
      }
    }
    void run()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity.id])

  const showCommitmentPill = Boolean(
    commitmentSuggestion?.has_commitment &&
      commitmentSuggestion.confidence >= PILL_THRESHOLD &&
      commitmentSuggestion.action &&
      !commitmentSuggestion.dismissed_at &&
      !commitmentSuggestion.accepted_task_id
  )

  const acceptCommitment = async () => {
    if (!activity.id) return
    setCommitmentAccepting(true)
    try {
      const res = await fetch(
        `/api/activities/${activity.id}/accept-commitment-suggestion`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: '{}',
        }
      )
      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        console.warn('[activity-chat-bubble] accept commitment failed', errBody)
        return
      }
      const body = (await res.json()) as { task?: { id: string } }
      if (body.task?.id && commitmentSuggestion) {
        // Optimistic: mark accepted locally so pill disappears immediately.
        setCommitmentSuggestion({
          ...commitmentSuggestion,
          accepted_task_id: body.task.id,
        })
      }
    } finally {
      setCommitmentAccepting(false)
    }
  }

  const dismissCommitment = () => {
    if (commitmentSuggestion) {
      setCommitmentSuggestion({
        ...commitmentSuggestion,
        dismissed_at: new Date().toISOString(),
      })
    }
    // (Per-user dismiss persistence to localStorage / a small PATCH
    // would be a follow-up nicety; for now the dismissal lives only
    // for this session.)
  }

  // 2b.44 — resolve text after the lazy fetch state is known.
  const text = bubbleText(activity, { emailSummary: lazyEmailSummary })
  const isEmailSummarising = activity.type === 'email' && emailSummarising && !lazyEmailSummary && !cachedEmailSummary
  const usingAiEmailSummary =
    activity.type === 'email' && (Boolean(lazyEmailSummary) || Boolean(cachedEmailSummary))
  const usingAiCallSummary =
    activity.type === 'call' && Boolean(activity.metadata?.ai_summary)

  // Bubble styling by type + side.
  let bubbleClass: string
  if (activity.type === 'note') {
    bubbleClass = 'bg-amber-50 border-amber-200 text-amber-900'
  } else if (side === 'right') {
    if (isFailed) {
      bubbleClass = 'bg-red-50 border-red-300 text-red-900'
    } else {
      bubbleClass = 'bg-blue-50 border-blue-200 text-blue-900'
    }
  } else {
    bubbleClass = 'bg-white border-gray-200 text-gray-900'
  }

  const sideClass = side === 'right' ? 'justify-end' : 'justify-start'
  const alignClass = side === 'right' ? 'items-end' : 'items-start'

  const duration = formatDuration(activity.duration_seconds)

  return (
    <div
      className={cn(
        'flex w-full',
        sideClass,
        isDragging && 'opacity-40 pointer-events-none'
      )}
    >
      <div className={cn('flex flex-col gap-0.5 max-w-[78%] sm:max-w-[70%]', alignClass)}>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'group/bubble text-left px-3 py-2 rounded-2xl border transition-shadow hover:shadow-sm',
            bubbleClass,
            // Tighten the corner on the "speaking" side, WhatsApp-style.
            side === 'right' ? 'rounded-br-sm' : 'rounded-bl-sm'
          )}
        >
          {/* Subject for emails — small secondary line above the body */}
          {activity.type === 'email' && activity.subject && (
            <div
              className={cn(
                'text-[11px] font-medium mb-0.5 truncate flex items-center gap-1.5',
                side === 'right' ? 'text-blue-700' : 'text-gray-500'
              )}
            >
              <span className="truncate flex-1">{activity.subject}</span>
              {/* 2b.44 — "AI summary" pill when we're showing the
                  summary instead of the full body. Tiny visual signal
                  so the operator knows the bubble text isn't verbatim. */}
              {usingAiEmailSummary && (
                <span className="inline-flex items-center gap-0.5 px-1 rounded-sm bg-violet-100 text-violet-700 text-[9px] font-semibold uppercase tracking-wide flex-shrink-0">
                  <Sparkles className="h-2 w-2" />
                  AI
                </span>
              )}
            </div>
          )}

          <div className="text-sm leading-snug whitespace-pre-wrap break-words">
            {text}
          </div>

          {/* 2b.44 — "Summarising…" pulse line while the lazy email
              summariser is in flight. Hidden if a cached summary is
              already shown or if it's not an email. */}
          {isEmailSummarising && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1 text-[10px] italic',
                side === 'right' ? 'text-blue-600/70' : 'text-gray-400'
              )}
            >
              <Sparkles className="h-2.5 w-2.5 animate-pulse" />
              AI is summarising this email…
            </div>
          )}

          {/* 2b.44 — small "AI" pill for calls when we're showing
              the transcript summary instead of the status line. */}
          {usingAiCallSummary && (
            <div
              className={cn(
                'flex items-center gap-1 mt-1 text-[10px]',
                side === 'right' ? 'text-blue-600/70' : 'text-gray-400'
              )}
            >
              <Sparkles className="h-2.5 w-2.5" />
              <span className="uppercase tracking-wide font-semibold">AI transcript summary</span>
            </div>
          )}

          {/* Footer: icon · type · duration · outcome · failed · time.
              Compact, single line, no badges. */}
          <div
            className={cn(
              'flex items-center gap-1.5 mt-1 text-[10px]',
              side === 'right'
                ? activity.type === 'note'
                  ? 'text-amber-700'
                  : 'text-blue-600'
                : 'text-gray-500'
            )}
          >
            <Icon className="h-3 w-3" />
            <span className="capitalize">{activity.type}</span>
            {duration && (
              <>
                <span>·</span>
                <span>{duration}</span>
              </>
            )}
            {activity.outcome && (
              <>
                <span>·</span>
                <span className="capitalize">{activity.outcome.replace(/_/g, ' ')}</span>
              </>
            )}
            {isFailed && (
              <>
                <span>·</span>
                <span className="font-semibold">Failed</span>
              </>
            )}
            <span className="opacity-60 ml-auto">
              {formatDistanceToNow(new Date(activity.occurred_at), { addSuffix: true })}
            </span>
          </div>

          {/* 2b.42 — inline AI labels. Up to three 1-2 word hints
              underneath the body so an operator can scan the timeline
              for "what was each conversation about / how did it go /
              what was the patient's mood." No badges, no icons —
              just dimmed text separated by middle dots. Hidden
              entirely when no labels exist (the chat stays clean). */}
          {hasAiLabels && (
            <div
              className={cn(
                'flex items-center gap-1 mt-0.5 text-[10px] italic',
                side === 'right'
                  ? activity.type === 'note'
                    ? 'text-amber-600/80'
                    : 'text-blue-500/80'
                  : 'text-gray-400'
              )}
            >
              {aiPurpose && <span>{aiPurpose}</span>}
              {aiPurpose && (aiOutcome || aiSentiment) && <span className="opacity-60">·</span>}
              {aiOutcome && <span>{aiOutcome}</span>}
              {aiOutcome && aiSentiment && <span className="opacity-60">·</span>}
              {aiSentiment && <span>{aiSentiment}</span>}
            </div>
          )}
        </button>

        {/* 2b.42 — AI-uncertain marker + inline Suggest CTA wired
            against the parent's aiSuggestion handlers. Rendered
            BELOW the bubble (compact, doesn't widen the message)
            on the same side. Lifecycle: pill → Suggest button →
            Thinking… → "Looks like X · Accept / ✕" → Moving…
            On accept the activity moves onto the suggested deal
            and the marker is cleared (parent handler refetches
            and dismisses). */}
        {isUncertain && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1 text-[10px]',
              side === 'right' ? 'self-end justify-end' : 'self-start'
            )}
          >
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0 rounded font-medium bg-amber-50 border border-amber-200 text-amber-700"
              title="AI wasn't sure which deal this belongs to. Click Suggest to ask AI for a pipeline pick."
            >
              <AlertCircle className="h-2.5 w-2.5" />
              AI unsure
            </span>

            {!aiSuggestion && onFetchAiSuggestion && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onFetchAiSuggestion(activity.id)
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0 rounded font-medium bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100"
              >
                <Sparkles className="h-2.5 w-2.5" />
                Suggest
              </button>
            )}

            {aiSuggestion?.status === 'fetching' && (
              <span className="inline-flex items-center gap-1 text-violet-700">
                <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                Thinking…
              </span>
            )}

            {aiSuggestion?.status === 'none' && (
              <span className="inline-flex items-center gap-1 text-gray-500">
                {aiSuggestion.message}
                {onDismissAiSuggestion && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDismissAiSuggestion(activity.id)
                    }}
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                )}
              </span>
            )}

            {aiSuggestion?.status === 'ready' && (
              <span className="inline-flex items-center gap-1.5 px-1.5 py-0 rounded font-medium bg-violet-50 border border-violet-200 text-violet-800">
                <Sparkles className="h-2.5 w-2.5" />
                Looks like {aiSuggestion.pipelineName ?? 'a different pipeline'}
                {aiSuggestion.kind === 'new_pipeline' && (
                  <span className="text-violet-500">(new)</span>
                )}
                {onAcceptAiSuggestion && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onAcceptAiSuggestion(activity.id)
                    }}
                    className="ml-1 px-1.5 py-0 rounded bg-violet-600 text-white hover:bg-violet-700"
                  >
                    Accept
                  </button>
                )}
                {onDismissAiSuggestion && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDismissAiSuggestion(activity.id)
                    }}
                    className="text-violet-400 hover:text-violet-600 ml-0.5"
                    aria-label="Dismiss"
                  >
                    ✕
                  </button>
                )}
              </span>
            )}

            {aiSuggestion?.status === 'accepting' && (
              <span className="inline-flex items-center gap-1 text-violet-700">
                <Sparkles className="h-2.5 w-2.5 animate-pulse" />
                Moving…
              </span>
            )}
          </div>
        )}

        {/* Deal-attribution sub-line — only when this activity is
            attached to a deal AND the user is NOT currently filtering
            to that single deal (deal-chip filter already gives that
            context). Helps a long-tenured contact's timeline make
            sense across deals. */}
        {/* 2b.61 — AI commitment pill (Path 3 from product
            discussion). Renders below the bubble when AI detected
            a future-action commitment with confidence ≥ 0.7.
            One-click [Create task] uses the parsed defaults
            (action / deadline / tenant default assignee). [✕]
            dismisses for this session. Same compact pattern as the
            ai_attachment_uncertain marker above. */}
        {showCommitmentPill && commitmentSuggestion && (
          <div
            className={cn(
              'flex flex-wrap items-center gap-1 text-[10px] mt-0.5',
              side === 'right' ? 'self-end justify-end' : 'self-start'
            )}
          >
            <span className="inline-flex items-center gap-1 px-1.5 py-0 rounded font-medium bg-violet-50 border border-violet-200 text-violet-800">
              <Sparkles className="h-2.5 w-2.5" />
              AI heard:{' '}
              <span className="font-semibold">
                {commitmentSuggestion.action}
              </span>
              {commitmentSuggestion.deadline_iso && (
                <span className="text-violet-600">
                  ({new Date(commitmentSuggestion.deadline_iso).toLocaleString('en-GB', {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })})
                </span>
              )}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void acceptCommitment()
              }}
              disabled={commitmentAccepting}
              className="inline-flex items-center gap-1 px-1.5 py-0 rounded font-medium bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50"
              title="Create a task from this commitment"
            >
              {commitmentAccepting ? 'Creating…' : 'Create task'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                dismissCommitment()
              }}
              className="text-violet-400 hover:text-violet-600 ml-0.5"
              aria-label="Dismiss"
              title="Dismiss this suggestion"
            >
              ✕
            </button>
          </div>
        )}

        {/* Confirmation pill — when the operator just accepted, show
            a brief "Task created" badge so they know it worked
            without a toast. */}
        {commitmentSuggestion?.accepted_task_id && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] text-emerald-700 mt-0.5',
              side === 'right' ? 'self-end' : 'self-start'
            )}
          >
            <Sparkles className="h-2.5 w-2.5" />
            <span>Task created from this message</span>
          </div>
        )}

        {activity.deal_title && (
          <div
            className={cn(
              'text-[10px] text-gray-400 truncate max-w-full',
              side === 'right' ? 'self-end' : 'self-start'
            )}
          >
            on “{activity.deal_title}”
          </div>
        )}
      </div>
    </div>
  )
}
