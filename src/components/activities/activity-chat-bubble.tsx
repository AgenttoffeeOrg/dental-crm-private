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

interface ActivityChatBubbleProps {
  activity: BubbleActivity
  onClick?: () => void
  isDragging?: boolean
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
 * Resolve the displayable text of the bubble. SMS / WhatsApp put
 * the body in `snippet` (outbound composer) or `description`
 * (ingestLead inbound path). Emails put HTML in `rich_content`
 * elsewhere; here we use snippet/description as plain preview until
 * 2b.43's summariser ships.
 */
function bubbleText(activity: BubbleActivity): string {
  const candidates = [
    activity.snippet,
    activity.description,
    activity.subject,
  ]
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

export function ActivityChatBubble({
  activity,
  onClick,
  isDragging,
}: ActivityChatBubbleProps) {
  const side = bubbleSide(activity)
  const Icon = TYPE_ICON[activity.type] ?? FileText
  const text = bubbleText(activity)
  const isFailed = activity.message_status === 'failed'
  const isUncertain = activity.metadata?.ai_attachment_uncertain === true

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
                'text-[11px] font-medium mb-0.5 truncate',
                side === 'right' ? 'text-blue-700' : 'text-gray-500'
              )}
            >
              {activity.subject}
            </div>
          )}

          <div className="text-sm leading-snug whitespace-pre-wrap break-words">
            {text}
          </div>

          {/* Footer: icon · status · time. Compact. */}
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
        </button>

        {/* AI-uncertain marker outside the bubble so it doesn't widen
            the message. Phase 2b.42 will replace this with the inline
            1-2 word AI labels + the Suggest CTA wired into the new
            layout. For now keep the simple amber pill as a placeholder
            so the marker doesn't disappear. */}
        {isUncertain && (
          <div
            className={cn(
              'flex items-center gap-1 text-[10px] text-amber-700',
              side === 'right' ? 'self-end' : 'self-start'
            )}
            title="AI wasn't sure which deal this belongs to."
          >
            <AlertCircle className="h-2.5 w-2.5" />
            <span>AI unsure</span>
            <Sparkles className="h-2.5 w-2.5 opacity-60" />
            <span className="opacity-70">(suggest UI returning in 2b.42)</span>
          </div>
        )}

        {/* Deal-attribution sub-line — only when this activity is
            attached to a deal AND the user is NOT currently filtering
            to that single deal (deal-chip filter already gives that
            context). Helps a long-tenured contact's timeline make
            sense across deals. */}
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
