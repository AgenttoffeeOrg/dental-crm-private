'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useTenant, useCurrentUser } from '@/lib/hooks/use-tenant'
import { sanitizePhoneNumber } from '@/lib/utils/phone'
import { ClickToCallDialer } from '@/components/communications/click-to-call-dialer'
import { EmailComposerPanel } from '@/components/communications/email-composer-panel'
import { SMSComposerPanel } from '@/components/communications/sms-composer-panel'
import { WhatsAppComposerPanel } from '@/components/communications/whatsapp-composer-panel'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertTriangle,
  Calendar,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
  Sparkles,
} from 'lucide-react'

type ContactSummary = {
  id: string
  full_name: string
  primary_phone?: string | null
  primary_email?: string | null
  status?: string | null
  tags?: string[] | null
  city?: string | null
  country?: string | null
  state?: string | null
}

type DealSummary = {
  id: string
  title?: string | null
  value_estimate_cents?: number | null
  updated_at?: string | null
  status?: string | null
  stage?: {
    name?: string | null
  } | null
}

type TaskSummary = {
  id: string
  title?: string | null
  due_at?: string | null
  status?: string | null
}

type ActivitySummary = {
  id: string
  type?: string | null
  occurred_at?: string | null
  direction?: string | null
  snippet?: string | null
  description?: string | null
}

type PersonaSnapshot = {
  label: string
  tags: string[]
  updatedAt?: string | null
  recommendedApproach?: string | null
}

type ContactDetails = {
  contact: ContactSummary
  deals: DealSummary[]
  openDealCount: number
  pipelineValueCents: number
  upcomingTasks: TaskSummary[]
  lastActivity: ActivitySummary | null
  persona: PersonaSnapshot | null
}

type QueueAlertsState = {
  severity: 'info' | 'warning' | 'critical'
  incidents: any[]
  queues: any[]
  backupRuns: any[]
}

type FeatureFlagInsights = {
  enabledCount: number
  overrideCount: number
  flags: any[]
}

function formatCurrency(valueInCents?: number | null) {
  if (!valueInCents || Number.isNaN(valueInCents)) {
    return 'GBP 0'
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(valueInCents / 100)
}

function formatDueDate(dueAt?: string | null) {
  if (!dueAt) return 'No due date'
  try {
    return format(new Date(dueAt), 'EEE, d MMM p')
  } catch {
    return dueAt
  }
}

function formatRelative(date?: string | null, fallback = 'Not recorded') {
  if (!date) return fallback
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return fallback
  }
}

export function ReceptionWorkspace() {
  const { tenantId } = useTenant()
  const { userId: currentUserId } = useCurrentUser()
  const supabase = useMemo(() => createClient(), [])

  const [searchTerm, setSearchTerm] = useState('')
  const [contacts, setContacts] = useState<ContactSummary[]>([])
  const [contactLoading, setContactLoading] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [details, setDetails] = useState<ContactDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [queueAlerts, setQueueAlerts] = useState<QueueAlertsState | null>(null)
  const [queueLoading, setQueueLoading] = useState(true)
  const [flagsInsights, setFlagsInsights] = useState<FeatureFlagInsights | null>(null)
  const [flagsLoading, setFlagsLoading] = useState(true)

  const [dialerOpen, setDialerOpen] = useState(false)
  const [smsOpen, setSmsOpen] = useState(false)
  const [emailOpen, setEmailOpen] = useState(false)
  const [whatsappOpen, setWhatsAppOpen] = useState(false)

  const loadContacts = useCallback(
    async (query: string) => {
      if (!tenantId) return
      setContactLoading(true)
      try {
        let request = supabase
          .from('contacts')
          .select(
            'id, full_name, primary_phone, primary_email, tags, city, country, state'
          )
          .eq('tenant_id', tenantId)
          .order('updated_at', { ascending: false })
          .limit(25)

        const trimmed = query.trim()
        if (trimmed) {
          const escaped = trimmed.replace(/%/g, '\\%').replace(/_/g, '\\_')
          const like = `%${escaped}%`
          request = request.or(
            `full_name.ilike.${like},primary_email.ilike.${like},primary_phone.ilike.${like}`
          )
        }

        const { data, error } = await request
        if (error) throw error

        setContacts(data ?? [])
        setSelectedContactId((previous) => {
          if (previous && (data ?? []).some((contact) => contact.id === previous)) {
            return previous
          }
          if ((data ?? []).length > 0) {
            return data![0].id
          }
          return null
        })
      } catch (error) {
        console.error('[Reception] Failed to load contacts', error)
        toast.error('Unable to load contacts right now.')
      } finally {
        setContactLoading(false)
      }
    },
    [tenantId, supabase]
  )

  useEffect(() => {
    if (!tenantId) return
    loadContacts('')
  }, [tenantId, loadContacts])

  useEffect(() => {
    if (!tenantId) return
    const handler = setTimeout(() => {
      loadContacts(searchTerm)
    }, 300)
    return () => clearTimeout(handler)
  }, [searchTerm, tenantId, loadContacts])

  const loadContactDetails = useCallback(
    async (contactId: string) => {
      setDetailsLoading(true)
      try {
        const { data: contactData, error: contactError } = await supabase
          .from('contacts')
          .select(
            'id, full_name, primary_phone, primary_email, tags, city, country, state'
          )
          .eq('id', contactId)
          .maybeSingle()

        if (contactError) {
          throw contactError
        }
        if (!contactData) {
          setDetails(null)
          return
        }

        const [
          { data: dealsData, error: dealsError },
          { data: tasksData, error: tasksError },
          { data: activityData, error: activityError },
          { data: personaData, error: personaError },
        ] = await Promise.all([
          supabase
            .from('deals')
            .select('id, title, value_estimate_cents, updated_at, status, stage:pipeline_stages(name)')
            .eq('contact_id', contactId)
            .order('updated_at', { ascending: false })
            .limit(6),
          supabase
            .from('tasks')
            .select('id, title, due_at, status')
            .eq('contact_id', contactId)
            .in('status', ['open', 'in_progress'])
            .order('due_at', { ascending: true })
            .limit(3),
          supabase
            .from('activities')
            .select('id, type, occurred_at, direction, snippet, description')
            .eq('contact_id', contactId)
            .order('occurred_at', { ascending: false })
            .limit(1),
          supabase
            .from('contact_psych_profiles')
            .select('dominant_trait, updated_at, snapshot')
            .eq('contact_id', contactId)
            .maybeSingle(),
        ])

        if (dealsError) {
          console.error('[Reception] Deals load error', dealsError)
        }
        if (tasksError) {
          console.error('[Reception] Tasks load error', tasksError)
        }
        if (activityError) {
          console.error('[Reception] Activity load error', activityError)
        }
        if (personaError && personaError.code !== 'PGRST116') {
          console.error('[Reception] Persona load error', personaError)
        }

        const deals = (dealsData as DealSummary[]) ?? []
        const pipelineValueCents = deals.reduce(
          (sum, deal) => sum + (deal.value_estimate_cents || 0),
          0
        )
        const openDealCount = deals.filter((deal) => {
          const stageName = deal.stage?.name?.toLowerCase() ?? ''
          return !stageName.includes('closed_won') && !stageName.includes('closed_lost')
        }).length

        const tasks = (tasksData as TaskSummary[]) ?? []
        const lastActivityList = (activityData as ActivitySummary[]) ?? []
        const lastActivity = lastActivityList.length > 0 ? lastActivityList[0] : null

        let persona: PersonaSnapshot | null = null
        if (personaData) {
          const snapshot = (personaData.snapshot as any) ?? {}
          const tags = Array.isArray(snapshot.persona_tags) ? snapshot.persona_tags : []
          persona = {
            label: personaData.dominant_trait
              ? personaData.dominant_trait
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (char: string) => char.toUpperCase())
              : 'Needs insights',
            tags,
            updatedAt: personaData.updated_at,
            recommendedApproach: snapshot.recommended_approach ?? null,
          }
        }

        setDetails({
          contact: contactData as ContactSummary,
          deals,
          openDealCount,
          pipelineValueCents,
          upcomingTasks: tasks,
          lastActivity,
          persona,
        })
      } catch (error) {
        console.error('[Reception] Failed to load contact details', error)
        toast.error('Unable to load reception insights for this contact.')
        setDetails(null)
      } finally {
        setDetailsLoading(false)
      }
    },
    [supabase]
  )

  useEffect(() => {
    if (selectedContactId) {
      loadContactDetails(selectedContactId)
    } else {
      setDetails(null)
    }
  }, [selectedContactId, loadContactDetails])

  const fetchQueueAlerts = useCallback(async () => {
    setQueueLoading(true)
    try {
      const response = await fetch('/api/system/queues/alerts', { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`Queue alerts status ${response.status}`)
      }
      const data = await response.json()
      const incidents =
        data?.queues?.flatMap((queue: any) => queue.incidents || []) ?? []
      const severity = data?.queues?.some((queue: any) => queue.severity === 'critical')
        ? 'critical'
        : data?.queues?.some((queue: any) => queue.severity === 'warning')
        ? 'warning'
        : 'info'
      setQueueAlerts({
        severity,
        incidents,
        queues: data?.queues ?? [],
        backupRuns: data?.backupRuns ?? [],
      })
    } catch (error) {
      console.error('[Reception] Failed to load queue alerts', error)
      setQueueAlerts(null)
    } finally {
      setQueueLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchQueueAlerts()
  }, [fetchQueueAlerts])

  const fetchFeatureFlagInsights = useCallback(async () => {
    setFlagsLoading(true)
    try {
      const response = await fetch('/api/system/feature-flags', { credentials: 'include' })
      if (!response.ok) {
        throw new Error(`Feature flag status ${response.status}`)
      }
      const data = await response.json()
      const flags = data?.flags ?? []
      setFlagsInsights({
        enabledCount: flags.filter((flag: any) => flag.effectiveEnabled).length,
        overrideCount: flags.filter((flag: any) => flag.source === 'tenant').length,
        flags,
      })
    } catch (error) {
      if (error instanceof Error && /status 401/.test(error.message)) {
        // User lacks governance access; fall back to empty insights without logging noise
        setFlagsInsights(null)
      } else {
        console.error('[Reception] Failed to load feature flags', error)
        setFlagsInsights(null)
      }
    } finally {
      setFlagsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchFeatureFlagInsights()
  }, [fetchFeatureFlagInsights])

  const heroContact =
    details?.contact ?? contacts.find((contact) => contact.id === selectedContactId) ?? null

  const sanitizedPhone = useMemo(
    () => (heroContact?.primary_phone ? sanitizePhoneNumber(heroContact.primary_phone) : ''),
    [heroContact?.primary_phone]
  )

  const primaryDealId = details?.deals?.[0]?.id ?? null

  const enabledFlagBadges =
    flagsInsights?.flags?.filter((flag: any) => flag.effectiveEnabled).slice(0, 3) ?? []

  const queueIncidents = queueAlerts?.incidents?.slice(0, 3) ?? []
  const lastBackupRun = queueAlerts?.backupRuns?.[0] ?? null
  const queueSeverityTone: 'info' | 'warning' | 'critical' = queueAlerts?.severity ?? 'info'

  const severityAccent: Record<'info' | 'warning' | 'critical', string> = {
    info: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    warning: 'border-amber-200 bg-amber-50 text-amber-700',
    critical: 'border-red-200 bg-red-50 text-red-700',
  }

  const lastTouchLabel = details
    ? details.lastActivity
      ? formatRelative(details.lastActivity.occurred_at)
      : 'No recorded touchpoint'
    : 'No recorded touchpoint'

  const contactLocation = heroContact
    ? [heroContact.city, heroContact.state, heroContact.country].filter(Boolean).join(', ')
    : null

  const handleOpenDialer = () => {
    if (!heroContact) {
      toast.error('Select a contact first.')
      return
    }
    if (!heroContact.primary_phone) {
      toast.error('Add a phone number before placing a call.')
      return
    }
    setDialerOpen(true)
  }

  const handleOpenSMS = () => {
    if (!heroContact) {
      toast.error('Select a contact first.')
      return
    }
    if (!heroContact.primary_phone) {
      toast.error('Add a phone number before sending an SMS.')
      return
    }
    setSmsOpen(true)
  }

  const handleOpenEmail = () => {
    if (!heroContact) {
      toast.error('Select a contact first.')
      return
    }
    if (!heroContact.primary_email) {
      toast.error('Add an email address before composing.')
      return
    }
    setEmailOpen(true)
  }

  const handleOpenWhatsApp = () => {
    if (!heroContact) {
      toast.error('Select a contact first.')
      return
    }
    if (!heroContact.primary_phone) {
      toast.error('Add a phone number before sending a WhatsApp.')
      return
    }
    setWhatsAppOpen(true)
  }

  return (
    <div className="flex h-full min-h-[calc(100vh-3.5rem)] bg-gray-50">
      <aside className="hidden w-80 flex-col border-r border-gray-200 bg-white xl:flex">
        <div className="border-b border-gray-200 px-4 py-5">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-gray-400">Front Desk</p>
            <h2 className="text-lg font-semibold text-gray-900">Reception Workspace</h2>
            <p className="text-xs text-gray-500">
              Triage calls, monitor queues, and find contacts instantly.
            </p>
          </div>
          <div className="mt-4">
            <Input
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-4 px-4 py-5">
            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900">Queue Health</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  {queueLoading
                    ? 'Checking queues...'
                    : queueAlerts && queueAlerts.incidents.length > 0
                    ? `${queueAlerts.incidents.length} open incident${
                        queueAlerts.incidents.length === 1 ? '' : 's'
                      }`
                    : 'All queues healthy'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {queueLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : queueAlerts ? (
                  <>
                    <div
                      className={`rounded-lg border px-3 py-2 text-xs ${severityAccent[queueSeverityTone]}`}
                    >
                      <p className="text-sm font-semibold capitalize">{queueSeverityTone}</p>
                      <p>
                        {queueAlerts.incidents.length > 0
                          ? 'Action required before calling patients from impacted queues.'
                          : 'Workers are within healthy thresholds.'}
                      </p>
                    </div>
                    <div className="space-y-1 text-xs text-gray-600">
                      {queueAlerts.queues.slice(0, 3).map((queue: any) => (
                        <div className="flex items-center justify-between" key={queue.name}>
                          <span className="truncate capitalize">
                            {queue.name?.replace(':', ' / ') || 'Queue'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-xs capitalize ${
                              queue.severity === 'critical'
                                ? 'border-red-200 text-red-700 bg-red-50'
                                : queue.severity === 'warning'
                                ? 'border-amber-200 text-amber-700 bg-amber-50'
                                : 'border-emerald-200 text-emerald-700 bg-emerald-50'
                            }`}
                          >
                            {queue.severity || 'info'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-gray-500">Queue metrics unavailable.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900">Feature Access</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  {flagsLoading
                    ? 'Loading access...'
                    : flagsInsights
                    ? `${flagsInsights.enabledCount} features enabled`
                    : 'Unable to load feature flags'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {flagsLoading ? (
                  <Skeleton className="h-4 w-24" />
                ) : flagsInsights ? (
                  <>
                    <div className="flex gap-3 text-xs text-gray-600">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">Enabled</p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {flagsInsights.enabledCount}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-gray-400">
                          Tenant Overrides
                        </p>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                          {flagsInsights.overrideCount}
                        </p>
                      </div>
                    </div>
                    {enabledFlagBadges.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {enabledFlagBadges.map((flag: any) => (
                          <Badge key={flag.key} variant="outline" className="text-[10px] capitalize">
                            {flag.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-500">
                        No reception-specific features are currently enabled.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-gray-500">
                    Enable feature flag governance to surface access.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-gray-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-gray-900">Recent Contacts</CardTitle>
                <CardDescription className="text-xs text-gray-500">
                  {contactLoading
                    ? 'Searching...'
                    : contacts.length > 0
                    ? `${contacts.length} match${contacts.length === 1 ? '' : 'es'}`
                    : 'No matches found'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {contactLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-lg" />
                  ))
                ) : contacts.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-center text-sm text-gray-500">
                    Start typing to find patients, or add a new contact from the contacts workspace.
                  </div>
                ) : (
                  contacts.map((contact) => {
                    const isActive = contact.id === selectedContactId
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onClick={() => setSelectedContactId(contact.id)}
                        className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                          isActive
                            ? 'border-emerald-400 bg-emerald-50 shadow-sm'
                            : 'border-gray-100 bg-white hover:border-emerald-200 hover:bg-emerald-50/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="truncate text-sm font-medium text-gray-900">
                            {contact.full_name || 'Unnamed contact'}
                          </p>
                          {contact.status && (
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {contact.status}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate">
                            {contact.primary_phone ||
                              contact.primary_email ||
                              (contact.tags?.length ? contact.tags[0] : 'No contact details')}
                          </span>
                          {contact.last_activity_at && (
                            <span>{formatRelative(contact.last_activity_at)}</span>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="border-b border-gray-200 bg-white px-6 py-5">
          {heroContact ? (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                    {(heroContact.full_name || 'C')
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-semibold text-gray-900">
                      {heroContact.full_name || 'Unnamed contact'}
                    </h1>
                    {heroContact.status && (
                      <Badge className="bg-blue-50 text-blue-700">{heroContact.status}</Badge>
                    )}
                    {details && details.openDealCount > 0 && (
                      <Badge variant="outline" className="text-xs capitalize">
                        {details.openDealCount} open deal{details.openDealCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {heroContact.primary_phone && (
                      <span className="inline-flex items-center gap-1">
                        <PhoneCall className="h-3 w-3" />
                        {heroContact.primary_phone}
                      </span>
                    )}
                    {heroContact.primary_email && (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {heroContact.primary_email}
                      </span>
                    )}
                    {contactLocation && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {contactLocation}
                      </span>
                    )}
                    <span>Last touch {lastTouchLabel}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={handleOpenDialer}
                  className="bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  <PhoneCall className="mr-2 h-4 w-4" />
                  Call
                </Button>
                <Button variant="outline" onClick={handleOpenSMS}>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  SMS
                </Button>
                <Button variant="outline" onClick={handleOpenEmail}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline" onClick={handleOpenWhatsApp}>
                  <Sparkles className="mr-2 h-4 w-4 text-emerald-500" />
                  WhatsApp
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => window.open(`/contacts/${heroContact.id}`, '_blank')}
                >
                  View Contact
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <h1 className="text-lg font-semibold text-gray-900">Search for a patient</h1>
              <p className="text-sm text-gray-500">
                Use the left panel to find a contact and the workspace will load their context here.
              </p>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {detailsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-64 w-full rounded-2xl" />
            </div>
          ) : details ? (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr),minmax(0,1fr)]">
              <div className="space-y-6">
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Today at a Glance
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Front-desk metrics for this contact.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Open Deals</p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                          {details.openDealCount}
                        </p>
                        <p className="text-xs text-gray-500">
                          {details.openDealCount === 1
                            ? 'Active opportunity'
                            : 'Active opportunities'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Pipeline Value
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">
                          {formatCurrency(details.pipelineValueCents)}
                        </p>
                        <p className="text-xs text-gray-500">
                          Estimated value from linked deals
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-white p-3">
                        <p className="text-xs uppercase tracking-wide text-gray-400">
                          Last Engagement
                        </p>
                        <p className="mt-2 text-lg font-semibold text-gray-900">{lastTouchLabel}</p>
                        <p className="text-xs text-gray-500">Based on CRM activity log</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Upcoming Actions
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Keep the front desk ahead.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {details.upcomingTasks.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">
                        No open tasks linked to this contact.
                      </div>
                    ) : (
                      details.upcomingTasks.map((task) => (
                        <div
                          key={task.id}
                          className="rounded-lg border border-gray-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              {task.title || 'Untitled task'}
                            </p>
                            {task.status && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {task.status}
                              </Badge>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDueDate(task.due_at)}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Deals and Opportunities
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Latest opportunities tied to this contact.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {details.deals.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                        No deals associated yet. Create one from the contact record.
                      </div>
                    ) : (
                      details.deals.map((deal) => (
                        <div
                          key={deal.id}
                          className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">
                              {deal.title || 'Untitled deal'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatCurrency(deal.value_estimate_cents)} | Updated{' '}
                              {formatRelative(deal.updated_at)}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs capitalize">
                            {deal.stage?.name || 'No stage'}
                          </Badge>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      Persona Spotlight
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Guidance tailored for this contact.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {details.persona ? (
                      <>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {details.persona.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            Updated {formatRelative(details.persona.updatedAt, 'Recently')}
                          </p>
                        </div>
                        {details.persona.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {details.persona.tags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-[10px] uppercase"
                              >
                                {tag.replace(/_/g, ' ')}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {details.persona.recommendedApproach && (
                          <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-xs text-purple-800">
                            {details.persona.recommendedApproach}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                        Persona insights will appear here once generated from the contact workspace.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                      <MessageCircle className="h-4 w-4 text-sky-500" />
                      Latest Engagement
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Recent activity logged against this contact.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {details.lastActivity ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-gray-900">
                            {details.lastActivity.type || 'Activity'}
                          </p>
                          {details.lastActivity.direction && (
                            <Badge variant="outline" className="text-xs capitalize">
                              {details.lastActivity.direction}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">
                          {details.lastActivity.snippet ||
                            details.lastActivity.description ||
                            'No additional notes captured.'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Logged {formatRelative(details.lastActivity.occurred_at)}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-gray-200 bg-white p-4 text-sm text-gray-500">
                        Log a call, SMS, or email to see it appear here instantly.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Queue and Reliability
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Operational context for frontline teams.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {queueLoading ? (
                      <Skeleton className="h-4 w-1/2" />
                    ) : queueIncidents.length > 0 ? (
                      queueIncidents.map((incident) => (
                        <div
                          key={incident.id}
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"
                        >
                          <p className="text-sm font-semibold text-amber-900 capitalize">
                            {incident.queue_name?.replace(':', ' / ') || 'Queue'} -{' '}
                            {incident.severity || 'warning'}
                          </p>
                          <p>{incident.incident_type || 'Threshold breach'}</p>
                          <p className="mt-1 text-[10px] text-amber-700">
                            Detected {formatRelative(incident.detected_at)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                        All queues and workers are healthy.
                      </div>
                    )}
                    {lastBackupRun && (
                      <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                        <p className="text-sm font-semibold text-blue-900">
                          Backup verification {lastBackupRun.status?.toUpperCase?.() || 'PASS'}
                        </p>
                        <p>Ran {formatRelative(lastBackupRun.started_at)}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={fetchQueueAlerts}>
                        Refresh Health
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          window.open('/settings?section=system&tab=reliability', '_blank')
                        }
                      >
                        Open Reliability Settings
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-gray-200">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-gray-900">
                      Feature Access
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      Flags impacting reception workflows.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {flagsLoading ? (
                      <Skeleton className="h-4 w-28" />
                    ) : flagsInsights ? (
                      <>
                        <div className="flex gap-3 text-xs text-gray-600">
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">
                              Enabled
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {flagsInsights.enabledCount}
                            </p>
                          </div>
                          <div>
                            <p className="text-[11px] uppercase tracking-wide text-gray-400">
                              Tenant Overrides
                            </p>
                            <p className="mt-1 text-lg font-semibold text-gray-900">
                              {flagsInsights.overrideCount}
                            </p>
                          </div>
                        </div>
                        {enabledFlagBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {enabledFlagBadges.map((flag: any) => (
                              <Badge
                                key={flag.key}
                                variant="outline"
                                className="text-[10px] capitalize"
                              >
                                {flag.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-500">
                            No reception-specific features are currently enabled.
                          </p>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            window.open('/settings?section=system&tab=feature-flags', '_blank')
                          }
                        >
                          Manage Feature Flags
                        </Button>
                      </>
                    ) : (
                      <p className="text-xs text-gray-500">
                        Unable to load feature flag insights. Try refreshing later.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white">
              <div className="max-w-sm space-y-3 text-center">
                <h3 className="text-lg font-semibold text-gray-900">No contact selected</h3>
                <p className="text-sm text-gray-500">
                  Choose someone from the left to load their snapshots, tasks, and communication
                  actions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {heroContact && (
        <>
          <ClickToCallDialer
            isOpen={dialerOpen}
            onClose={() => setDialerOpen(false)}
            phoneNumber={sanitizedPhone || heroContact.primary_phone || ''}
            contactName={heroContact.full_name}
            contactId={heroContact.id}
            dealId={primaryDealId || undefined}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
          <SMSComposerPanel
            isOpen={smsOpen}
            onClose={() => setSmsOpen(false)}
            to={sanitizedPhone || heroContact.primary_phone || ''}
            contactId={heroContact.id}
            dealId={primaryDealId || undefined}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
          <EmailComposerPanel
            isOpen={emailOpen}
            onClose={() => setEmailOpen(false)}
            to={heroContact.primary_email || ''}
            contactId={heroContact.id}
            dealId={primaryDealId || undefined}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
          <WhatsAppComposerPanel
            isOpen={whatsappOpen}
            onClose={() => setWhatsAppOpen(false)}
            to={sanitizedPhone || heroContact.primary_phone || ''}
            contactId={heroContact.id}
            dealId={primaryDealId || undefined}
            tenantId={tenantId || undefined}
            userId={currentUserId || undefined}
          />
        </>
      )}
    </div>
  )
}


