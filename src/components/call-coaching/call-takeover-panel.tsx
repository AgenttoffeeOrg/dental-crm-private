'use client'

/**
 * Phase 2b.91 — Call Coaching takeover panel (redesigned).
 *
 * Right-side slide-in modal matching the task queue style. Not a
 * full-screen takeover — operators want the same visual language as
 * the rest of the queue, just with coaching content.
 *
 * Layout (top to bottom):
 *   - Header with progress bar + close
 *   - Contact card with phone/email + prominent "Call now" button
 *     that opens ClickToCallDialer
 *   - Persona insights (if AI has generated one)
 *   - Talking points & objection-handling scripts via the existing
 *     NextBestScriptPanel — operator picks the trigger (price
 *     objection / dental anxiety / timing / etc) and the panel
 *     surfaces the matching recommendation.
 *   - Notes textarea
 *   - Sticky bottom: outcome buttons (Connected / Voicemail /
 *     No answer / Busy / Wrong number / Skip).
 *
 * On outcome the existing /api/tasks/[id]/log-call-outcome route
 * fires (closes the task, auto-creates the follow-up, audit-trail).
 */

import { useCallback, useEffect, useState } from 'react'
import {
  Phone,
  PhoneOff,
  PhoneMissed,
  Voicemail,
  X,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Sparkles,
  MessageSquare,
  Lightbulb,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase-client'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { NextBestScriptPanel } from '@/components/scripts/next-best-script-panel'

export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number'

interface CallTakeoverPanelProps {
  taskId: string
  contactId: string | null
  dealId: string | null
  taskTitle: string
  onComplete: (skipped: boolean) => void
  onExit: () => void
  position?: { current: number; total: number }
}

interface ContactRow {
  id: string
  full_name: string | null
  primary_phone: string | null
  primary_email: string | null
}

interface PersonaRow {
  dominant_persona: string | null
  trust_score: number | null
  anxiety_level: number | null
  communication_style: string | null
  snapshot: any
}

export function CallTakeoverPanel({
  taskId,
  contactId,
  dealId,
  taskTitle,
  onComplete,
  onExit,
  position,
}: CallTakeoverPanelProps) {
  const [contact, setContact] = useState<ContactRow | null>(null)
  const [persona, setPersona] = useState<PersonaRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState<CallOutcome | null>(null)
  const [dialerOpen, setDialerOpen] = useState(false)
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()

  useEffect(() => {
    if (!contactId) {
      setLoading(false)
      return
    }
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      try {
        const [{ data: c }, { data: p }] = await Promise.all([
          supabase
            .from('contacts')
            .select('id, full_name, primary_phone, primary_email')
            .eq('id', contactId)
            .maybeSingle(),
          supabase
            .from('contact_psych_profiles')
            .select('dominant_persona, trust_score, anxiety_level, communication_style, snapshot')
            .eq('contact_id', contactId)
            .maybeSingle(),
        ])
        setContact(c as ContactRow | null)
        setPersona(p as PersonaRow | null)
      } finally {
        setLoading(false)
      }
    })()
  }, [contactId])

  const submitOutcome = useCallback(
    async (outcome: CallOutcome) => {
      setSubmitting(outcome)
      try {
        const res = await fetch(`/api/tasks/${taskId}/log-call-outcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ outcome, note: note.trim() || undefined }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? body.message ?? `http_${res.status}`)
        }
        const body = await res.json()
        if (body.follow_up_task_id) {
          toast.success('Outcome logged. Follow-up task created.')
        } else if (body.task_closed) {
          toast.success('Outcome logged. Task closed.')
        } else {
          toast.success('Outcome logged. Task kept open.')
        }
        onComplete(false)
      } catch (err) {
        toast.error(`Couldn't log outcome: ${err instanceof Error ? err.message : 'unknown'}`)
      } finally {
        setSubmitting(null)
      }
    },
    [taskId, note, onComplete]
  )

  const initials =
    contact?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase() ?? '?'

  return (
    <>
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-[700px] bg-white border-l border-gray-200 shadow-2xl z-50',
          'flex flex-col animate-in slide-in-from-right duration-300'
        )}
      >
        {/* Header — matches task queue gradient header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-600 flex items-center justify-center">
              <Phone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Call Coaching</h2>
              <p className="text-xs text-gray-600">
                {position && `Call ${position.current} of ${position.total} · `}
                {taskTitle}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onExit} title="Exit queue">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress bar */}
        {position && position.total > 1 && (
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-teal-600 transition-all duration-300"
              style={{ width: `${(position.current / position.total) * 100}%` }}
            />
          </div>
        )}

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-5">
            {loading ? (
              <div className="text-sm text-gray-500 flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading contact…
              </div>
            ) : !contact ? (
              <Card>
                <CardContent className="py-6 text-sm text-gray-500">
                  This call task isn't linked to a contact. Skip or log the outcome below.
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Contact + Call Now */}
                <div className="rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {contact.full_name ?? 'Unknown contact'}
                      </h3>
                      {contact.primary_phone && (
                        <p className="mt-0.5 text-sm text-gray-700">{contact.primary_phone}</p>
                      )}
                      {contact.primary_email && (
                        <p className="text-xs text-gray-500 truncate">{contact.primary_email}</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setDialerOpen(true)}
                    disabled={!contact.primary_phone}
                    className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 h-11 text-base font-semibold"
                  >
                    <Phone className="h-5 w-5 mr-2" />
                    {contact.primary_phone ? 'Call now' : 'No phone on record'}
                  </Button>
                </div>

                {/* Persona insights — present only if AI has computed one */}
                {persona?.dominant_persona && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        Patient persona
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      <div>
                        <span className="text-xs uppercase tracking-wide text-gray-400">
                          Dominant
                        </span>
                        <p className="mt-0.5 text-base font-semibold text-gray-900">
                          {persona.dominant_persona}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {persona.trust_score != null && (
                          <Badge variant="secondary" className="bg-red-50 text-red-700 text-xs">
                            Trust {persona.trust_score}
                          </Badge>
                        )}
                        {persona.anxiety_level != null && (
                          <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                            Anxiety {persona.anxiety_level}
                          </Badge>
                        )}
                        {persona.communication_style && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {persona.communication_style.toLowerCase()} style
                          </Badge>
                        )}
                      </div>
                      {persona.snapshot?.recommended_approach && (
                        <div className="rounded-md border border-blue-100 bg-blue-50/50 p-2.5 text-xs text-blue-900">
                          <p className="font-medium flex items-center gap-1.5">
                            <Lightbulb className="h-3 w-3" />
                            Recommended approach
                          </p>
                          <p className="mt-1">{persona.snapshot.recommended_approach}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Talking points + objection handling — via existing
                    NextBestScriptPanel which has the trigger picker
                    (Price / Anxiety / Timing / Finance / etc) built in. */}
                {contactId && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Shield className="h-3.5 w-3.5 text-emerald-600" />
                        Talking points & objection handling
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
                )}

                <Separator />

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 block flex items-center gap-1.5">
                    <MessageSquare className="h-3 w-3" />
                    Notes (optional)
                  </label>
                  <Textarea
                    placeholder="Anything you want to capture about this call..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Sticky outcome bar */}
        <div className="border-t border-gray-200 bg-white px-6 py-3">
          <p className="text-xs text-gray-600 mb-2 font-medium">How did the call go?</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              onClick={() => submitOutcome('connected')}
              disabled={Boolean(submitting)}
              className="bg-emerald-600 hover:bg-emerald-700 h-9"
            >
              {submitting === 'connected' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Connected</span>
            </Button>
            <Button
              onClick={() => submitOutcome('voicemail')}
              disabled={Boolean(submitting)}
              variant="outline"
              className="h-9"
            >
              {submitting === 'voicemail' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Voicemail className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Voicemail</span>
            </Button>
            <Button
              onClick={() => submitOutcome('no_answer')}
              disabled={Boolean(submitting)}
              variant="outline"
              className="h-9"
            >
              {submitting === 'no_answer' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <PhoneMissed className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">No answer</span>
            </Button>
            <Button
              onClick={() => submitOutcome('busy')}
              disabled={Boolean(submitting)}
              variant="outline"
              className="h-9"
            >
              {submitting === 'busy' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <PhoneOff className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Busy</span>
            </Button>
            <Button
              onClick={() => submitOutcome('wrong_number')}
              disabled={Boolean(submitting)}
              variant="outline"
              className="h-9"
            >
              {submitting === 'wrong_number' ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <X className="h-3.5 w-3.5 mr-1" />
              )}
              <span className="text-xs">Wrong #</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => onComplete(true)}
              disabled={Boolean(submitting)}
              className="h-9"
            >
              <span className="text-xs">Skip</span>
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Dialer overlays the panel when "Call now" is pressed */}
      {contact?.primary_phone && (
        <ClickToCallDialer
          isOpen={dialerOpen}
          onClose={() => setDialerOpen(false)}
          phoneNumber={contact.primary_phone}
          contactName={contact.full_name ?? undefined}
          contactId={contact.id}
          dealId={dealId ?? undefined}
          tenantId={tenantId ?? undefined}
          userId={currentUserId ?? undefined}
        />
      )}
    </>
  )
}
