'use client'

/**
 * Phase 2b.89.2 — Call Coaching takeover panel.
 *
 * Full-screen overlay rendered by TaskQueuePanel when the current
 * task is `task_type='call'`. Per the 2026-05-24 product spec, the
 * queue should run calls back-to-back with the Coaching workspace
 * popping over for each call and returning when the outcome is
 * logged.
 *
 * What this panel shows during a call:
 *   - Contact header with phone number + initials
 *   - Persona insights (read from contact_psych_profiles if present)
 *   - Most recent activity inline for context
 *   - Five outcome buttons matching the 2b.65 log-call-outcome
 *     contract: Connected, Voicemail, No answer, Busy, Wrong number
 *   - Optional notes textarea piped into the outcome payload
 *
 * Outcome wiring goes through POST /api/tasks/[id]/log-call-outcome
 * which:
 *   - Closes the task (or leaves open for busy/wrong-number)
 *   - Auto-creates the appropriate follow-up task (voicemail = +24h,
 *     no-answer = +3h)
 *   - Writes the audit trail
 *
 * After the call's logged, this calls onComplete(skipped:false) so
 * the queue advances to the next task. The operator can also Skip
 * without logging (calls onComplete(skipped:true)).
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export type CallOutcome = 'connected' | 'voicemail' | 'no_answer' | 'busy' | 'wrong_number'

interface CallTakeoverPanelProps {
  taskId: string
  contactId: string | null
  taskTitle: string
  /** Called after operator logs an outcome or skips, with skipped=true if no outcome. */
  onComplete: (skipped: boolean) => void
  /** Closes the takeover and the parent queue panel. */
  onExit: () => void
  /** Position in queue, for "x of y" display. */
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
          toast.success(`Outcome logged. Follow-up task created.`)
        } else if (body.task_closed) {
          toast.success(`Outcome logged. Task closed.`)
        } else {
          toast.success(`Outcome logged. Task kept open.`)
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
    <div className="fixed inset-0 z-[60] bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50">
        <div className="flex items-center gap-3">
          <Phone className="h-5 w-5 text-emerald-600" />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Call Coaching</h2>
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

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-6 space-y-6">
          {/* Contact card */}
          {loading ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading contact…
            </div>
          ) : !contact ? (
            <Card>
              <CardContent className="py-6 text-sm text-gray-500">
                This call task isn't linked to a contact. Skip or log the outcome below.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-14 w-14">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base font-semibold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {contact.full_name ?? 'Unknown contact'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      {contact.primary_phone && (
                        <a
                          href={`tel:${contact.primary_phone}`}
                          className="inline-flex items-center gap-1.5 text-emerald-700 hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {contact.primary_phone}
                        </a>
                      )}
                      {contact.primary_email && (
                        <span className="text-gray-500">{contact.primary_email}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Persona insights — present only if AI has computed one */}
          {persona?.dominant_persona && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  Persona insights
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-xs uppercase tracking-wide text-gray-400">
                    Dominant persona
                  </span>
                  <p className="mt-0.5 text-lg font-semibold text-gray-900">
                    {persona.dominant_persona}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {persona.trust_score != null && (
                    <Badge variant="secondary" className="bg-red-50 text-red-700">
                      Trust {persona.trust_score}
                    </Badge>
                  )}
                  {persona.anxiety_level != null && (
                    <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                      Anxiety {persona.anxiety_level}
                    </Badge>
                  )}
                  {persona.communication_style && (
                    <Badge variant="outline" className="capitalize">
                      Communication: {persona.communication_style.toLowerCase()}
                    </Badge>
                  )}
                </div>
                {persona.snapshot?.recommended_approach && (
                  <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 text-sm text-blue-900">
                    <p className="font-medium">Recommended approach</p>
                    <p className="mt-1">{persona.snapshot.recommended_approach}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes (optional) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-gray-500" />
                Notes (optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Anything you want to capture about this call..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Outcome bar — sticky bottom */}
      <div className="border-t border-gray-200 bg-white px-6 py-4">
        <div className="mx-auto max-w-5xl">
          <p className="text-xs text-gray-600 mb-3">How did the call go?</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => submitOutcome('connected')}
              disabled={Boolean(submitting)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {submitting === 'connected' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
              )}
              Connected
            </Button>
            <Button
              onClick={() => submitOutcome('voicemail')}
              disabled={Boolean(submitting)}
              variant="outline"
            >
              {submitting === 'voicemail' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Voicemail className="h-4 w-4 mr-1.5" />
              )}
              Voicemail
            </Button>
            <Button
              onClick={() => submitOutcome('no_answer')}
              disabled={Boolean(submitting)}
              variant="outline"
            >
              {submitting === 'no_answer' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <PhoneMissed className="h-4 w-4 mr-1.5" />
              )}
              No answer
            </Button>
            <Button
              onClick={() => submitOutcome('busy')}
              disabled={Boolean(submitting)}
              variant="outline"
            >
              {submitting === 'busy' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <PhoneOff className="h-4 w-4 mr-1.5" />
              )}
              Busy
            </Button>
            <Button
              onClick={() => submitOutcome('wrong_number')}
              disabled={Boolean(submitting)}
              variant="outline"
            >
              {submitting === 'wrong_number' ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1.5" />
              )}
              Wrong number
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              onClick={() => onComplete(true)}
              disabled={Boolean(submitting)}
            >
              Skip
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
