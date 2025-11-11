'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { PhoneCall, MessageCircle, Mail, Sparkles, Loader2, Target, Clock, User, Shield } from 'lucide-react'

import { createClient } from '@/lib/supabase-client'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { ActivityFeedEnterprise } from '@/components/activities/activity-feed-enterprise'
import { NextBestScriptPanel } from '@/components/scripts/next-best-script-panel'
import { LearningLoopSummary } from '@/components/contacts/learning-loop-summary'
import { sanitizePhoneNumber } from '@/lib/utils/phone'
import {
  Contact,
  DealWithRelations,
  ContactPsychProfile,
  ContactPsychProfileHistory,
} from '@/types/database'

type CoachingDeal = DealWithRelations & {
  contact?: Contact | null
  stage?: { id: string; name: string } | null
}

const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
})

const formatCurrency = (valueInCents?: number | null) => {
  if (!valueInCents || Number.isNaN(valueInCents)) return '£0'
  return currencyFormatter.format(valueInCents / 100)
}

export function CallCoachingWorkspace() {
  const router = useRouter()
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()

  const [queue, setQueue] = useState<CoachingDeal[]>([])
  const [queueLoading, setQueueLoading] = useState(true)
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  const [persona, setPersona] = useState<ContactPsychProfile | null>(null)
  const [personaHistory, setPersonaHistory] = useState<ContactPsychProfileHistory[]>([])
  const [personaLoading, setPersonaLoading] = useState(false)
  const [personaRefreshing, setPersonaRefreshing] = useState(false)

  const [dialerOpen, setDialerOpen] = useState(false)
  const [emailComposerOpen, setEmailComposerOpen] = useState(false)
  const [smsComposerOpen, setSmsComposerOpen] = useState(false)

  const fetchQueue = useCallback(
    async (showSpinner = false) => {
      if (!tenantId) return
      if (showSpinner) {
        setQueueLoading(true)
      }

      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from('deals')
          .select(
            `
              *,
              contact:contacts(*),
              stage:pipeline_stages(*)
            `
          )
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(30)

        if (error) throw error

        const normalized: CoachingDeal[] =
          (data ?? []).map((item: any) => ({
            ...item,
            contact: item.contact ?? null,
            stage: item.stage ?? null,
          })) ?? []

        setQueue(normalized)
        setSelectedDealId((prev) => {
          if (prev && normalized.some((deal) => deal.id === prev)) {
            return prev
          }
          return normalized.length > 0 ? normalized[0].id : null
        })
      } catch (error) {
        console.error('[CallCoaching] Failed to load queue', error)
        toast.error('Unable to load call coaching queue right now. Please retry shortly.')
      } finally {
        if (showSpinner) {
          setQueueLoading(false)
        }
      }
    },
    [tenantId]
  )

  useEffect(() => {
    fetchQueue(true)
  }, [fetchQueue])

  const selectedDeal = useMemo<CoachingDeal | null>(
    () => (selectedDealId ? queue.find((deal) => deal.id === selectedDealId) ?? null : null),
    [queue, selectedDealId]
  )

  const selectedContact = selectedDeal?.contact ?? null
  const selectedContactId = selectedContact?.id ?? null

  const sanitizedPhone = useMemo(
    () => sanitizePhoneNumber(selectedContact?.primary_phone ?? ''),
    [selectedContact?.primary_phone]
  )

  const queueValue = useMemo(
    () => queue.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0),
    [queue]
  )

  const queueWithPhones = useMemo(
    () => queue.filter((deal) => Boolean(deal.contact?.primary_phone)).length,
    [queue]
  )

  const queueStaleCount = useMemo(
    () =>
      queue.filter(
        (deal) =>
          !deal.last_activity_at ||
          new Date().getTime() - new Date(deal.last_activity_at).getTime() > 1000 * 60 * 60 * 24 * 7
      ).length,
    [queue]
  )

  const loadPersonaInsights = useCallback(
    async (contactId: string) => {
      const supabase = createClient()
      setPersonaLoading(true)

      try {
        const [{ data: profileData, error: profileError }, { data: historyData, error: historyError }] =
          await Promise.all([
            supabase
              .from('contact_psych_profiles')
              .select('*')
              .eq('contact_id', contactId)
              .maybeSingle(),
            supabase
              .from('contact_psych_profile_history')
              .select('*')
              .eq('contact_id', contactId)
              .order('recorded_at', { ascending: false })
              .limit(5),
          ])

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError
        }

        if (historyError && historyError.code !== 'PGRST116') {
          throw historyError
        }

        setPersona(profileData ?? null)
        setPersonaHistory(historyData ?? [])
      } catch (error) {
        console.error('[CallCoaching] Failed to load persona insights', error)
        toast.error('Unable to load persona insights for this contact.')
        setPersona(null)
        setPersonaHistory([])
      } finally {
        setPersonaLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    if (!selectedContactId) {
      setPersona(null)
      setPersonaHistory([])
      return
    }
    loadPersonaInsights(selectedContactId)
  }, [selectedContactId, loadPersonaInsights])

  const handleRefreshPersonaInsights = async () => {
    if (!selectedContactId) return
    try {
      setPersonaRefreshing(true)
      const response = await fetch('/api/psych-profiles/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contactId: selectedContactId }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(body.error || 'Unable to refresh persona insights right now.')
      }

      await loadPersonaInsights(selectedContactId)
      toast.success('Persona insights updated')
    } catch (error) {
      console.error('[CallCoaching] Persona refresh failed', error)
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not refresh persona insights. Please try again shortly.'
      )
    } finally {
      setPersonaRefreshing(false)
    }
  }

  const handleOpenDialer = () => {
    if (!selectedContact) {
      toast.error('Select a contact to start coaching.')
      return
    }
    if (!selectedContact.primary_phone) {
      toast.error('No phone number available for this contact.')
      return
    }
    setDialerOpen(true)
  }

  const handleOpenSMS = () => {
    if (!selectedContact) {
      toast.error('Select a contact to send an SMS.')
      return
    }
    if (!selectedContact.primary_phone) {
      toast.error('Add a phone number before sending an SMS.')
      return
    }
    setSmsComposerOpen(true)
  }

  const handleOpenEmail = () => {
    if (!selectedContact) {
      toast.error('Select a contact to compose an email.')
      return
    }
    if (!selectedContact.primary_email) {
      toast.error('Add an email address before composing.')
      return
    }
    setEmailComposerOpen(true)
  }

  const personaLabel = useMemo(() => {
    if (!persona?.dominant_trait) return 'Needs insights'
    return persona.dominant_trait.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
  }, [persona?.dominant_trait])

  const personaTags = useMemo(() => {
    if (!persona?.snapshot) return []
    const tags = persona.snapshot as any
    const candidate = tags?.persona_tags
    return Array.isArray(candidate) ? candidate : []
  }, [persona?.snapshot])

  const personaUpdatedLabel = useMemo(() => {
    const timestamp = persona?.updated_at || personaHistory[0]?.recorded_at
    if (!timestamp) return 'Never analysed'
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch {
      return 'Recently updated'
    }
  }, [persona?.updated_at, personaHistory])

  const handleOpenContact = () => {
    if (selectedContactId) {
      router.push(`/contacts/${selectedContactId}`)
    }
  }

  const handleOpenDeal = () => {
    if (selectedDeal?.id) {
      router.push(`/deals/${selectedDeal.id}`)
    }
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] flex-col bg-gray-50 xl:flex-row">
      {/* Coaching Queue */}
      <div className="order-1 border-b border-gray-200 bg-white xl:order-none xl:h-full xl:w-80 xl:border-r">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">Call Coaching</p>
              <h2 className="text-lg font-semibold text-gray-900">Live Queue</h2>
            </div>
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {queue.length}
            </Badge>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            High-intent conversations prioritised by pipeline stage and recency.
          </p>
        </div>
        <div className="max-h-72 overflow-y-auto px-4 py-3 xl:h-[calc(100%-80px)] xl:max-h-none">
          {queueLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-xl border border-gray-100 bg-gray-100/60 p-4"
                >
                  <div className="mb-2 h-4 w-2/3 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : queue.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-white p-4 text-center">
              <p className="text-sm font-semibold text-gray-700">Nothing in the queue</p>
              <p className="mt-1 text-xs text-gray-500">
                Add contacts or deals to begin call coaching.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => router.push('/contacts')}
              >
                Go to Contacts
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {queue.map((deal) => {
                const isActive = selectedDealId === deal.id
                const contactName = deal.contact?.full_name || 'Unknown contact'
                const lastTouch = deal.last_activity_at
                  ? formatDistanceToNow(new Date(deal.last_activity_at), { addSuffix: true })
                  : 'No recent activity'

                return (
                  <button
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className={[
                      'w-full rounded-xl border px-4 py-3 text-left transition-all duration-150',
                      isActive
                        ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                        : 'border-transparent bg-white hover:border-gray-200 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-900">{contactName}</span>
                      {deal.stage?.name && (
                        <Badge
                          variant="outline"
                          className="text-xs font-medium text-blue-700 border-blue-200 bg-blue-50"
                        >
                          {deal.stage.name}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                      <span>{formatCurrency(deal.value_estimate_cents)}</span>
                      <span>{lastTouch}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Coaching Surface */}
      <div className="order-2 flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="border-b border-gray-200 bg-white px-6 py-4">
            {selectedContact ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                        {selectedContact.full_name
                          .split(' ')
                          .map((name) => name[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-xl font-semibold text-gray-900">
                        {selectedContact.full_name}
                      </h1>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                        {selectedDeal?.stage?.name && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                            <Target className="h-3 w-3 text-gray-500" />
                            {selectedDeal.stage.name}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                          <Clock className="h-3 w-3 text-gray-500" />
                          {selectedDeal?.last_activity_at
                            ? `Last touch ${formatDistanceToNow(new Date(selectedDeal.last_activity_at), {
                                addSuffix: true,
                              })}`
                            : 'No recent activity'}
                        </span>
                        {selectedDeal?.owner_user_id && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                            <User className="h-3 w-3 text-gray-500" />
                            Coach assigned
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={handleOpenDialer} className="bg-emerald-600 hover:bg-emerald-700">
                    <PhoneCall className="mr-2 h-4 w-4" />
                    Start Call
                  </Button>
                  <Button variant="outline" onClick={handleOpenSMS}>
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Send SMS
                  </Button>
                  <Button variant="outline" onClick={handleOpenEmail}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Email
                  </Button>
                  <Button variant="ghost" onClick={handleOpenDeal}>
                    View Deal
                  </Button>
                  <Button variant="ghost" onClick={handleOpenContact}>
                    Contact Record
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-2 text-sm text-gray-600">
                <h1 className="text-lg font-semibold text-gray-900">Select a contact</h1>
                <p>
                  Choose a deal from the queue to load scripts, persona insights, and communication
                  tools.
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {selectedContact ? (
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr),minmax(0,1fr)]">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card className="border-gray-200">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Deal Value</p>
                        <p className="mt-2 text-xl font-semibold text-gray-900">
                          {formatCurrency(selectedDeal?.value_estimate_cents)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedDeal?.currency || 'GBP'} • Weighted confidence from AI coaching
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-200">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Phone</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          {selectedContact.primary_phone || 'Not provided'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {selectedContact.primary_phone
                            ? 'Tap “Start Call” to launch the coaching dialer.'
                            : 'Capture a phone number to unlock calling.'}
                        </p>
                      </CardContent>
                    </Card>
                    <Card className="border-gray-200">
                      <CardContent className="p-4">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Email</p>
                        <p className="mt-2 text-sm font-medium text-gray-900">
                          {selectedContact.primary_email || 'Not provided'}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          Use email follow-ups to reinforce call outcomes.
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-gray-200">
                    <CardHeader className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Persona Insights
                      </CardTitle>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                        onClick={handleRefreshPersonaInsights}
                        disabled={personaRefreshing || personaLoading || !selectedContactId}
                      >
                        {personaRefreshing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Updating…
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            {persona ? 'Refresh' : 'Generate'}
                          </>
                        )}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                      {personaLoading ? (
                        <div className="space-y-3">
                          <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-2/4 animate-pulse rounded bg-gray-200" />
                        </div>
                      ) : persona ? (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-400">
                              Dominant Persona
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {personaLabel}
                            </p>
                            <p className="text-xs text-gray-500">Updated {personaUpdatedLabel}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="secondary"
                              className="bg-red-50 text-xs font-medium text-red-700"
                            >
                              Trust {persona.trust_score ?? '—'}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="bg-amber-50 text-xs font-medium text-amber-700"
                            >
                              Anxiety {persona.anxiety_level ?? '—'}
                            </Badge>
                            {persona.communication_style && (
                              <Badge
                                variant="outline"
                                className="text-xs capitalize text-purple-700 border-purple-200"
                              >
                                Communication: {persona.communication_style.toLowerCase()}
                              </Badge>
                            )}
                            {persona.decision_style && (
                              <Badge
                                variant="outline"
                                className="text-xs capitalize text-blue-700 border-blue-200"
                              >
                                Decision: {persona.decision_style.toLowerCase()}
                              </Badge>
                            )}
                          </div>
                          {personaTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {personaTags.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="text-[10px] capitalize">
                                  #{tag.replace(/_/g, ' ')}
                                </Badge>
                              ))}
                            </div>
                          )}
                          {persona.snapshot?.recommended_approach && (
                            <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-800">
                              <p className="font-semibold text-blue-900">Recommended Approach</p>
                              <p className="mt-1 text-blue-800">
                                {persona.snapshot.recommended_approach}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
                          Generate persona intelligence to tailor your coaching strategy.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Recent Activity
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ActivityFeedEnterprise
                        contactId={selectedContactId || ''}
                        dealId={selectedDeal?.id || undefined}
                        tenantId={tenantId || undefined}
                        userId={currentUserId || undefined}
                        contactEmail={selectedContact.primary_email || undefined}
                        contactPhone={selectedContact.primary_phone || undefined}
                        contactName={selectedContact.full_name}
                        onActivityCreated={() => fetchQueue(false)}
                        showAllContactActivities
                      />
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-gray-200">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        Coaching Health Snapshot
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 p-5">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">Queue Value</p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {formatCurrency(queueValue)}
                          </p>
                          <p className="text-xs text-gray-500">Active opportunities awaiting calls.</p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Phone Coverage
                          </p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">
                            {queue.length === 0
                              ? '0%'
                              : `${Math.round((queueWithPhones / queue.length) * 100)}%`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {queueWithPhones} of {queue.length} records ready to dial.
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Stale Conversations
                          </p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">{queueStaleCount}</p>
                          <p className="text-xs text-gray-500">
                            No touch in the last 7 days — prioritise these contacts.
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-white p-3">
                          <p className="text-xs uppercase tracking-wide text-gray-400">
                            Coach Availability
                          </p>
                          <p className="mt-2 text-lg font-semibold text-gray-900">Live</p>
                          <p className="text-xs text-gray-500">
                            Coaching tools are ready. Script library synced.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-gray-200">
                    <CardHeader className="px-5 py-4">
                      <CardTitle className="text-base font-semibold text-gray-900">
                        Coaching Intelligence
                      </CardTitle>
                      <p className="text-xs text-gray-500">
                        AI-ranked scripts and learning insights tailored to this contact.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-6 p-5">
                      {selectedContactId && (
                        <NextBestScriptPanel
                          contactId={selectedContactId}
                          dealId={selectedDeal?.id || undefined}
                        />
                      )}
                      <Separator />
                      {tenantId && (
                        <LearningLoopSummary
                          tenantId={tenantId}
                          onOpenCoaching={handleOpenDialer}
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
                <div className="max-w-sm text-center">
                  <h3 className="text-lg font-semibold text-gray-900">No contact selected</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Choose a contact from the coaching queue to launch scripts, persona insights, and
                    communication tools.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Communication Panels */}
      {selectedContact && (
        <>
          <EmailComposerPanel
            isOpen={emailComposerOpen}
            onClose={() => setEmailComposerOpen(false)}
            to={selectedContact.primary_email}
            contactId={selectedContact.id}
            dealId={selectedDeal?.id}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
          <SMSComposerPanel
            isOpen={smsComposerOpen}
            onClose={() => setSmsComposerOpen(false)}
            to={sanitizedPhone || selectedContact.primary_phone || ''}
            contactId={selectedContact.id}
            dealId={selectedDeal?.id}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
          <ClickToCallDialer
            isOpen={dialerOpen}
            onClose={() => setDialerOpen(false)}
            phoneNumber={sanitizedPhone || selectedContact.primary_phone || ''}
            contactName={selectedContact.full_name}
            contactId={selectedContact.id}
            dealId={selectedDeal?.id}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
        </>
      )}
    </div>
  )
}


