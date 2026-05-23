'use client'

/**
 * Phase 2b.46 — Pinned inline quick-reply for the chat-bubble timeline.
 *
 * Sits at the bottom of the chat (under the bubbles, above the page
 * edge). Operator types a short reply, picks a channel (defaults to
 * the last channel used with this contact), hits Send. Posts straight
 * to the dispatcher — no slide-over needed for short replies.
 *
 * Channel selector:
 *   - SMS / WhatsApp / Email — pickable; defaults to the most-recent
 *     outbound activity's type, falling back to SMS.
 *   - Email shows a tiny subject field; the others don't.
 *
 * The Note channel is intentionally NOT here — notes are a separate
 * affordance (the "Log activity" button on the sidebar) since they
 * have different semantics (practice-internal, no outbound dispatch).
 *
 * Deal context: the parent passes the active `effectiveOutboundDealId`
 * (which already respects the deal-chip filter from 2b.34.8). The
 * dispatcher uses that to attach the outbound activity to the right
 * deal — exact same behaviour as the existing composer panels.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  Send,
  MessageCircle,
  MessageSquare,
  Mail,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type ChannelKind = 'sms' | 'whatsapp' | 'email'

interface ChatQuickReplyProps {
  contactId: string | null | undefined
  contactName?: string | null
  contactPhone?: string | null
  contactEmail?: string | null
  tenantId?: string | null
  dealId?: string | null
  /**
   * Hint at which channel to pre-select. Parent passes the most-recent
   * outbound activity's type so the operator usually clicks straight
   * to send.
   */
  lastChannel?: ChannelKind | null
  /** Called after a successful send so the parent refreshes the feed. */
  onSent?: () => void
}

const CHANNEL_META: Record<
  ChannelKind,
  { label: string; icon: typeof MessageCircle; colorClass: string }
> = {
  sms: { label: 'SMS', icon: MessageCircle, colorClass: 'text-purple-600' },
  whatsapp: { label: 'WhatsApp', icon: MessageSquare, colorClass: 'text-emerald-600' },
  email: { label: 'Email', icon: Mail, colorClass: 'text-amber-600' },
}

function pickInitialChannel(
  hint: ChannelKind | null | undefined,
  hasPhone: boolean,
  hasEmail: boolean
): ChannelKind {
  if (hint) return hint
  if (hasPhone) return 'sms'
  if (hasEmail) return 'email'
  return 'sms'
}

export function ChatQuickReply({
  contactId,
  contactName,
  contactPhone,
  contactEmail,
  tenantId,
  dealId,
  lastChannel,
  onSent,
}: ChatQuickReplyProps) {
  const hasPhone = Boolean(contactPhone)
  const hasEmail = Boolean(contactEmail)
  const [channel, setChannel] = useState<ChannelKind>(() =>
    pickInitialChannel(lastChannel, hasPhone, hasEmail)
  )
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Channel hint can change when the parent refreshes activities and
  // the most-recent outbound channel changes. Only adopt the hint if
  // the operator hasn't started typing.
  const hintRef = useRef(lastChannel ?? null)
  useEffect(() => {
    if (message.trim().length === 0 && lastChannel && lastChannel !== hintRef.current) {
      setChannel(pickInitialChannel(lastChannel, hasPhone, hasEmail))
      hintRef.current = lastChannel
    }
  }, [lastChannel, hasPhone, hasEmail, message])

  // Auto-resize the textarea up to 6 rows.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const next = Math.min(el.scrollHeight, 6 * 24 + 16)
    el.style.height = `${next}px`
  }, [message])

  const channelAvailable = useMemo(() => {
    if (channel === 'sms' || channel === 'whatsapp') return hasPhone
    if (channel === 'email') return hasEmail
    return false
  }, [channel, hasPhone, hasEmail])

  const handleSend = async () => {
    if (!contactId) {
      toast.error('No contact selected.')
      return
    }
    if (!message.trim()) {
      toast.error('Write something to send first.')
      return
    }
    if (!channelAvailable) {
      toast.error(
        channel === 'email'
          ? 'No email address on this contact.'
          : 'No phone number on this contact.'
      )
      return
    }

    setSending(true)
    try {
      const endpoint =
        channel === 'sms'
          ? '/api/communications/send-sms'
          : channel === 'whatsapp'
          ? '/api/communications/send-whatsapp'
          : '/api/communications/send-email'

      const body: Record<string, unknown> = {
        contactId,
        dealId: dealId ?? undefined,
        tenantId: tenantId ?? undefined,
        message,
      }
      if (channel === 'email') {
        body.to = contactEmail
        body.subject = subject || `Quick reply to ${contactName ?? 'patient'}`
        // 2b.57.1 (audit HIGH #8) — send plain text only. Let the
        // /send-email endpoint route it through the dispatcher's
        // canonical plaintext→HTML + DOMPurify path. Previously we
        // hand-rolled HTML escaping here which risked diverging
        // from the dispatcher's sanitiser rules. The `message`
        // field on the endpoint accepts plain text and renders it
        // safely.
      } else {
        body.to = contactPhone
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => null)
        toast.error(errBody?.message ?? errBody?.error ?? 'Send failed.')
        return
      }

      toast.success(`${CHANNEL_META[channel].label} sent.`)
      setMessage('')
      setSubject('')
      onSent?.()
    } catch (err) {
      console.error('[chat-quick-reply] send failed', err)
      toast.error('Send failed (network).')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter sends. Plain Enter inserts a newline.
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      void handleSend()
    }
  }

  const ChannelIcon = CHANNEL_META[channel].icon

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 sticky bottom-0 z-10">
      {/* Channel selector — three small toggle pills */}
      <div className="flex items-center gap-1.5 mb-2">
        {(['sms', 'whatsapp', 'email'] as ChannelKind[]).map((c) => {
          const meta = CHANNEL_META[c]
          const Icon = meta.icon
          const available = c === 'email' ? hasEmail : hasPhone
          return (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              disabled={!available}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border transition-colors',
                channel === c
                  ? 'bg-gray-900 text-white border-gray-900'
                  : available
                  ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              )}
              title={
                available
                  ? `Switch to ${meta.label}`
                  : c === 'email'
                  ? 'No email address on this contact'
                  : 'No phone number on this contact'
              }
            >
              <Icon className={cn('h-3 w-3', channel === c ? 'text-white' : meta.colorClass)} />
              {meta.label}
            </button>
          )
        })}
        <span className="text-[10px] text-gray-400 ml-auto">⌘+Enter to send</span>
      </div>

      {channel === 'email' && (
        <Input
          placeholder={`Subject (default: "Quick reply to ${contactName ?? 'patient'}")`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mb-2 h-8 text-sm"
        />
      )}

      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          placeholder={
            channelAvailable
              ? `Reply via ${CHANNEL_META[channel].label}…`
              : channel === 'email'
              ? 'Add an email address to send via email'
              : 'Add a phone number to send via SMS or WhatsApp'
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          disabled={!channelAvailable || sending}
          className="flex-1 resize-none text-sm py-2 min-h-[40px]"
        />
        <Button
          onClick={() => void handleSend()}
          disabled={sending || !message.trim() || !channelAvailable}
          size="sm"
          className="flex-shrink-0"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ChannelIcon className="h-4 w-4 mr-1.5" />
              Send
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
