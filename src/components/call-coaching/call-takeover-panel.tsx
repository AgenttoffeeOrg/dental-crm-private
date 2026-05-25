'use client'

/**
 * Phase 2b.92 — Call Coaching takeover panel (wider, two-column).
 *
 * Right-side slide-in modal, 1400px wide (roughly half the screen on
 * a 1440 viewport). Two-column layout so the operator can see both
 * the patient context AND the talking-points scripts at the same
 * time without scrolling.
 *
 * Left column (45%): patient context for the conversation
 *   - Contact card with phone + "Call now" button
 *   - Patient persona deep-dive (dominant + scores + style + key
 *     concerns + motivations + recommended approach)
 *   - Recent conversation history (last 8 activities, chronological,
 *     with AI summary if present + body excerpt)
 *
 * Right column (55%): coaching content
 *   - Talking points & objection handling via NextBestScriptPanel
 *     (trigger picker: Price / Anxiety / Timing / Trust / Finance /
 *      Comparing alternatives / Pain & urgency / Second opinion /
 *      Universal touchpoints)
 *   - Notes textarea
 *
 * Sticky bottom: outcome buttons (Connected / Voicemail / No answer /
 * Busy / Wrong number) + Skip.
 *
 * Per Toffee's 2026-05-25 feedback: the panel needs to actually give
 * the operator context to have the conversation. Recent history +
 * persona depth + scripts side-by-side is that context.
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
  Mail,
  Calendar,
  History,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
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
  decision_style: string | null
  snapshot: any
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
  if (row.body) return row.body.slice(0, 200)
  return `${row.type ?? 'Activity'}`
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
  const [activities, setActivities] = useState<ActivityRow[]>([])
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
        const [{ data: c }, { data: p }, { data: a }] = await Promise.all([
          supabase
            .from('contacts')
            .select('id, full_name, primary_phone, primary_email')
            .eq('id', contactId)
            .maybeSingle(),
          supabase
            .from('contact_psych_profiles')
            .select(
              'dominant_persona, trust_score, anxiety_level, communication_style, decision_style, snapshot'
            )
            .eq('contact_id', contactId)
            .maybeSingle(),
          supabase
            .from('activities')
            .select('id, occurred_at, type, direction, subject, body, metadata, duration_seconds')
            .eq('contact_id', contactId)
            .order('occurred_at', { ascending: false })
            .limit(8),
        ])
        setContact(c as ContactRow | null)
        setPersona(p as PersonaRow | null)
        setActivities((a ?? []) as ActivityRow[])
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
          'fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-2xl z-50',
          'flex flex-col animate-in slide-in-from-right duration-300',
          'w-[1400px] max-w-[95vw]'
        )}
      >
        {/* Header */}
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

        {/* Two-column body */}
        <div className="flex-1 grid grid-cols-[minmax(0,5fr)_minmax(0,6fr)] overflow-hidden">
          {/* LEFT COLUMN — patient context */}
          <ScrollArea className="border-r border-gray-200 bg-gray-50/50">
            <div className="px-6 py-5 space-y-5">
              {loading ? (
                <div className="text-sm text-gray-500 flex items-center gap-2 py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading patient context…
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
                      <Avatar className="h-14 w-14">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-base font-semibold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold text-gray-900">
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

                  {/* Patient persona — deep-dive */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                        Patient persona
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {persona ? (
                        <>
                          {persona.dominant_persona && (
                            <div>
                              <span className="text-xs uppercase tracking-wide text-gray-400">
                                Dominant persona
                              </span>
                              <p className="mt-0.5 text-base font-semibold text-gray-900">
                                {persona.dominant_persona}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1.5">
                            {persona.trust_score != null && (
                              <Badge
                                variant="secondary"
                                className="bg-red-50 text-red-700 text-xs"
                              >
                                Trust {persona.trust_score}
                              </Badge>
                            )}
                            {persona.anxiety_level != null && (
                              <Badge
                                variant="secondary"
                                className="bg-amber-50 text-amber-700 text-xs"
                              >
                                Anxiety {persona.anxiety_level}
                              </Badge>
                            )}
                            {persona.communication_style && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {persona.communication_style.toLowerCase()} comm
                              </Badge>
                            )}
                            {persona.decision_style && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {persona.decision_style.toLowerCase()} decisions
                              </Badge>
                            )}
                          </div>

                          {persona.snapshot?.recommended_approach && (
                            <div className="rounded-md border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
                              <p className="font-medium flex items-center gap-1.5 mb-1">
                                <Lightbulb className="h-3 w-3" />
                                Recommended approach
                              </p>
                              <p>{persona.snapshot.recommended_approach}</p>
                            </div>
                          )}

                          {Array.isArray(persona.snapshot?.key_concerns) &&
                            persona.snapshot.key_concerns.length > 0 && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">
                                  Key concerns
                                </p>
                                <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                                  {persona.snapshot.key_concerns.slice(0, 4).map(
                                    (c: string, i: number) => (
                                      <li key={i}>{c}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                          {Array.isArray(persona.snapshot?.motivations) &&
                            persona.snapshot.motivations.length > 0 && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-gray-400 mb-1.5">
                                  Motivations
                                </p>
                                <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                                  {persona.snapshot.motivations.slice(0, 4).map(
                                    (m: string, i: number) => (
                                      <li key={i}>{m}</li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 italic">
                          No AI persona generated for this contact yet. The recommended-approach +
                          key-concerns insights appear here once persona analysis runs (currently
                          triggered manually on the contact page).
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent conversation history */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <History className="h-3.5 w-3.5 text-gray-500" />
                        Recent conversation history
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {activities.length === 0 ? (
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
                                  <div className="flex items-center gap-2 mb-0.5">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] capitalize px-1.5 py-0"
                                    >
                                      {row.direction === 'inbound' ? '← in' : '→ out'} {row.type}
                                    </Badge>
                                    <span className="text-gray-500">
                                      {formatDistanceToNow(new Date(row.occurred_at), {
                                        addSuffix: true,
                                      })}
                                    </span>
                                    {row.duration_seconds != null && row.type === 'call' && (
                                      <span className="text-gray-500">
                                        · {Math.floor(row.duration_seconds / 60)}m{' '}
                                        {row.duration_seconds % 60}s
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-gray-700 line-clamp-3">
                                    {activityLabel(row)}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </ScrollArea>

          {/* RIGHT COLUMN — coaching content + notes */}
          <ScrollArea className="bg-white">
            <div className="px-6 py-5 space-y-5">
              {/* Talking points & objection handling */}
              {contactId ? (
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
              ) : (
                <Card>
                  <CardContent className="py-6 text-sm text-gray-500">
                    Link this task to a contact to surface talking points.
                  </CardContent>
                </Card>
              )}

              <Separator />

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2 flex items-center gap-1.5">
                  <MessageSquare className="h-3 w-3" />
                  Notes (optional)
                </label>
                <Textarea
                  placeholder="Anything you want to capture about this call..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={5}
                  className="text-sm"
                />
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Sticky outcome bar */}
        <div className="border-t border-gray-200 bg-white px-6 py-3">
          <p className="text-xs text-gray-600 mb-2 font-medium">How did the call go?</p>
          <div className="grid grid-cols-6 gap-2">
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
