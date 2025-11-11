'use client'

import { useEffect, useMemo, useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  AlertTriangle,
  Bot,
  MessageCircle,
  Pause,
  Phone,
  Play,
  Plus,
  RefreshCw,
  ServerCrash,
  Smartphone,
  Timer,
  X,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import type {
  EngagementCampaign,
  EngagementEnrollment,
  EngagementEvent,
  EngagementStep,
  BotSession,
  BotTurn,
} from '@/types/database'
import { CampaignsPanel, StatusBadge } from '@/components/engagement/campaigns-panel'
import type {
  CampaignStepForm,
  CampaignWithMeta,
  EngagementEventLog,
  EnrollmentSummary,
} from '@/components/engagement/campaigns-panel'

const CAMPAIGN_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
]

const SESSION_FILTERS: { value: BotSession['status'] | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'closed', label: 'Closed (7d)' },
]

export default function EngagementPage() {
  const { appUser, loading: authLoading } = useAuth()
  const tenantId = appUser?.active_tenant_id || appUser?.tenant_id || null
  const supabase = useMemo(() => createClient(), [])

  const [activeTab, setActiveTab] = useState<'campaigns' | 'bot-console' | 'reliability'>('campaigns')
  const [campaigns, setCampaigns] = useState<CampaignWithMeta[]>([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [campaignError, setCampaignError] = useState<string | null>(null)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null)
  const [stepsByCampaign, setStepsByCampaign] = useState<Record<string, EngagementStep[]>>({})
  const [stepsLoading, setStepsLoading] = useState(false)
  const [enrollmentsByCampaign, setEnrollmentsByCampaign] = useState<Record<string, EnrollmentSummary[]>>({})
  const [eventsByCampaign, setEventsByCampaign] = useState<Record<string, EngagementEventLog[]>>({})

  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [newCampaignForm, setNewCampaignForm] = useState({
    name: '',
    description: '',
    goal: 'nurture',
    trigger: 'manual',
    timezone: 'UTC',
  })
  const [creatingCampaign, setCreatingCampaign] = useState(false)

  // Bot console state
  const [sessions, setSessions] = useState<BotSession[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionFilter, setSessionFilter] = useState<BotSession['status'] | 'all'>('active')
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionTurns, setSessionTurns] = useState<BotTurn[]>([])
  const [turnsLoading, setTurnsLoading] = useState(false)
  const [botInsights, setBotInsights] = useState<Record<string, any>>({})

  // Reliability state
  const [queueMetrics, setQueueMetrics] = useState<any>(null)
  const [failedEvents, setFailedEvents] = useState<EngagementEventLog[]>([])
  const [reliabilityLoading, setReliabilityLoading] = useState(true)

  const loadingInitial = authLoading || (tenantId === null)

  useEffect(() => {
    if (!tenantId) return
    loadCampaigns(tenantId)
    loadSessions(tenantId)
    loadReliability(tenantId)

    const interval = setInterval(() => {
      loadSessions(tenantId, true)
      loadReliability(tenantId, true)
    }, 30000)

    return () => clearInterval(interval)
  }, [tenantId])

  useEffect(() => {
    if (!selectedCampaignId && campaigns.length > 0) {
      setSelectedCampaignId(campaigns[0].id)
    }
  }, [campaigns, selectedCampaignId])

  useEffect(() => {
    if (!tenantId || !selectedCampaignId) return
    loadCampaignDetails(tenantId, selectedCampaignId)
  }, [tenantId, selectedCampaignId])

  const loadCampaigns = async (tenant: string) => {
    setCampaignsLoading(true)
    setCampaignError(null)
    try {
      const [{ data: campaignData, error: campaignErr }, { data: stepData, error: stepErr }, { data: enrollmentData, error: enrollErr }] =
        await Promise.all([
          supabase
            .from('engagement_campaigns')
            .select('*')
            .eq('tenant_id', tenant)
            .order('updated_at', { ascending: false }),
          supabase.from('engagement_steps').select('id,campaign_id').eq('tenant_id', tenant),
          supabase
            .from('engagement_enrollments')
            .select('id,campaign_id,status,next_run_at')
            .eq('tenant_id', tenant),
        ])

      if (campaignErr) throw campaignErr
      if (stepErr) throw stepErr
      if (enrollErr) throw enrollErr

      const stepCounts = new Map<string, number>()
      stepData?.forEach((step) => {
        stepCounts.set(step.campaign_id, (stepCounts.get(step.campaign_id) || 0) + 1)
      })

      const enrollmentAggregates = new Map<
        string,
        { total: number; active: number; nextRunAt: string | null }
      >()
      enrollmentData?.forEach((enrollment) => {
        const key = enrollment.campaign_id
        if (!enrollmentAggregates.has(key)) {
          enrollmentAggregates.set(key, { total: 0, active: 0, nextRunAt: null })
        }
        const agg = enrollmentAggregates.get(key)!
        agg.total += 1
        if (enrollment.status === 'active' || enrollment.status === 'waiting') {
          agg.active += 1
          if (enrollment.next_run_at) {
            if (!agg.nextRunAt || new Date(enrollment.next_run_at) < new Date(agg.nextRunAt)) {
              agg.nextRunAt = enrollment.next_run_at
            }
          }
        }
      })

      const enriched = (campaignData || []).map<CampaignWithMeta>((campaign) => ({
        ...campaign,
        stepCount: stepCounts.get(campaign.id) || 0,
        activeEnrollments: enrollmentAggregates.get(campaign.id)?.active || 0,
        totalEnrollments: enrollmentAggregates.get(campaign.id)?.total || 0,
        nextRunAt: enrollmentAggregates.get(campaign.id)?.nextRunAt || null,
      }))

      setCampaigns(enriched)
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to load campaigns', error)
      setCampaignError(error.message || 'Failed to load campaigns')
    } finally {
      setCampaignsLoading(false)
    }
  }

  const loadCampaignDetails = async (tenant: string, campaignId: string) => {
    setStepsLoading(true)
    try {
      const [{ data: steps, error: stepErr }, { data: enrollments, error: enrollmentErr }, { data: events, error: eventErr }] = await Promise.all([
        supabase
          .from('engagement_steps')
          .select('*')
          .eq('tenant_id', tenant)
          .eq('campaign_id', campaignId)
          .order('step_order', { ascending: true }),
        supabase
          .from('engagement_enrollments')
          .select('*')
          .eq('tenant_id', tenant)
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })
          .limit(50),
        supabase
          .from('engagement_events')
          .select('*')
          .eq('tenant_id', tenant)
          .eq('campaign_id', campaignId)
          .order('created_at', { ascending: false })
          .limit(50),
      ])

      if (stepErr) throw stepErr
      if (enrollmentErr) throw enrollmentErr
      if (eventErr) throw eventErr

      setStepsByCampaign((prev) => ({ ...prev, [campaignId]: steps || [] }))
      setEnrollmentsByCampaign((prev) => ({ ...prev, [campaignId]: enrollments || [] }))
      setEventsByCampaign((prev) => ({ ...prev, [campaignId]: events || [] }))
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to load campaign detail', error)
      toast.error(error.message || 'Failed to load campaign details')
    } finally {
      setStepsLoading(false)
    }
  }

  const handleCreateCampaign = async () => {
    if (!tenantId) return
    if (!newCampaignForm.name.trim()) {
      toast.error('Campaign name is required')
      return
    }

    setCreatingCampaign(true)
    try {
      const payload: Partial<EngagementCampaign> = {
        tenant_id: tenantId,
        name: newCampaignForm.name.trim(),
        description: newCampaignForm.description.trim() || null,
        status: 'draft',
        trigger_config: {
          type: newCampaignForm.trigger,
          goal: newCampaignForm.goal,
        },
        schedule_config: {
          timezone: newCampaignForm.timezone,
          cadence: 'continuous',
        },
        ai_config: {
          personalization: false,
        },
        timezone: newCampaignForm.timezone,
      }

      const { data, error } = await supabase
        .from('engagement_campaigns')
        .insert(payload)
        .select()
        .single()

      if (error) throw error

      toast.success('Campaign created')
      setCreateModalOpen(false)
      setNewCampaignForm({
        name: '',
        description: '',
        goal: 'nurture',
        trigger: 'manual',
        timezone: newCampaignForm.timezone,
      })
      await loadCampaigns(tenantId)
      if (data?.id) {
        setSelectedCampaignId(data.id)
      }
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to create campaign', error)
      toast.error(error.message || 'Failed to create campaign')
    } finally {
      setCreatingCampaign(false)
    }
  }

  const handleUpdateCampaignStatus = async (campaign: CampaignWithMeta, status: EngagementCampaign['status']) => {
    try {
      const { error } = await supabase
        .from('engagement_campaigns')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', campaign.id)
        .eq('tenant_id', campaign.tenant_id)

      if (error) throw error

      toast.success(`Campaign ${status === 'active' ? 'activated' : status === 'paused' ? 'paused' : 'archived'}`)
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaign.id
            ? {
                ...item,
                status,
              }
            : item
        )
      )
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to update status', error)
      toast.error(error.message || 'Failed to update campaign status')
    }
  }

  const handleAddStep = async (
    campaignId: string,
    form: CampaignStepForm
  ) => {
    if (!tenantId) return
    try {
      const currentSteps = stepsByCampaign[campaignId] || []
      const nextOrder = currentSteps.length + 1

      const config: Record<string, any> = {}
      if (form.type === 'send_email') {
        config.subject = form.subject || 'Untitled Email'
        config.html = form.html || '<p>Hi {{contact.first_name}},</p>'
      } else if (form.type === 'send_sms' || form.type === 'send_whatsapp') {
        config.message = form.message || 'Hello from Dental Sales Coach!'
      } else if (form.type === 'wait') {
        const multiplier =
          form.waitUnit === 'days' ? 86400 : form.waitUnit === 'hours' ? 3600 : 60
        config.wait_seconds = (form.waitAmount || 1) * multiplier
      } else if (form.type === 'notify_human') {
        config.note = form.note || 'Follow up with this contact.'
      } else if (form.type === 'webhook') {
        config.url = form.webhookUrl
        config.method = form.webhookMethod || 'POST'
        config.headers = form.webhookHeaders ? JSON.parse(form.webhookHeaders) : {}
      }

      const { data, error } = await supabase
        .from('engagement_steps')
        .insert({
          tenant_id: tenantId,
          campaign_id: campaignId,
          step_order: nextOrder,
          step_type: form.type,
          config,
          wait_duration_seconds:
            form.type === 'wait'
              ? config.wait_seconds
              : null,
        })
        .select()
        .single()

      if (error) throw error

      toast.success('Step added')
      setStepsByCampaign((prev) => ({
        ...prev,
        [campaignId]: [...(prev[campaignId] || []), data],
      }))
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaignId
            ? {
                ...item,
                stepCount: item.stepCount + 1,
              }
            : item
        )
      )
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to add step', error)
      toast.error(error.message || 'Failed to add step')
    }
  }

  const handleRemoveStep = async (campaignId: string, stepId: string) => {
    if (!tenantId) return
    try {
      const { error } = await supabase
        .from('engagement_steps')
        .delete()
        .eq('tenant_id', tenantId)
        .eq('campaign_id', campaignId)
        .eq('id', stepId)

      if (error) throw error

      toast.success('Step removed')
      setStepsByCampaign((prev) => ({
        ...prev,
        [campaignId]: (prev[campaignId] || []).filter((step) => step.id !== stepId),
      }))
      setCampaigns((prev) =>
        prev.map((item) =>
          item.id === campaignId
            ? {
                ...item,
                stepCount: Math.max(0, item.stepCount - 1),
              }
            : item
        )
      )
      // Refresh to keep order contiguous
      await loadCampaignDetails(tenantId, campaignId)
    } catch (error: any) {
      console.error('[ENGAGEMENT] Failed to remove step', error)
      toast.error(error.message || 'Failed to remove step')
    }
  }

  const loadSessions = async (tenant: string, silent = false) => {
    if (!silent) setSessionsLoading(true)
    try {
      const filterStatuses =
        sessionFilter === 'all'
          ? ['active', 'paused', 'escalated', 'closed']
          : sessionFilter === 'closed'
          ? ['closed']
          : [sessionFilter]

      const { data, error } = await supabase
        .from('bot_sessions')
        .select('*')
        .eq('tenant_id', tenant)
        .in('status', filterStatuses)
        .order('last_activity_at', { ascending: false })
        .limit(40)

      if (error) throw error

      const filtered =
        sessionFilter === 'closed'
          ? (data || []).filter((session) => {
              if (!session.closed_at) return false
              const closedAt = new Date(session.closed_at)
              const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
              return closedAt >= sevenDaysAgo
            })
          : data || []

      setSessions(filtered)
      if (!selectedSessionId && filtered.length > 0) {
        setSelectedSessionId(filtered[0].id)
      }
    } catch (error: any) {
      console.error('[BOT CONSOLE] Failed to load sessions', error)
      toast.error(error.message || 'Failed to load bot sessions')
    } finally {
      if (!silent) setSessionsLoading(false)
    }
  }

  useEffect(() => {
    if (tenantId) {
      loadSessions(tenantId)
    }
  }, [tenantId, sessionFilter])

  const loadSessionTurns = async (sessionId: string) => {
    setTurnsLoading(true)
    try {
      const { data, error } = await supabase
        .from('bot_turns')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (error) throw error

      setSessionTurns(data || [])

      const session = sessions.find((s) => s.id === sessionId)
      const context = session?.context || {}
      setBotInsights(context)
    } catch (error: any) {
      console.error('[BOT CONSOLE] Failed to load turns', error)
      toast.error(error.message || 'Failed to load conversation turns')
    } finally {
      setTurnsLoading(false)
    }
  }

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionTurns(selectedSessionId)
    } else {
      setSessionTurns([])
      setBotInsights({})
    }
  }, [selectedSessionId, sessions])

  const handleEscalateSession = async (session: BotSession) => {
    try {
      const response = await fetch('/api/bot/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: session.tenant_id,
          session_id: session.id,
          reason: 'Manual escalation from console',
        }),
      })
      if (!response.ok) {
        const json = await response.json().catch(() => ({}))
        throw new Error(json.error || 'Failed to escalate session')
      }
      toast.success('Session escalated')
      await loadSessions(session.tenant_id, true)
      await loadSessionTurns(session.id)
    } catch (error: any) {
      console.error('[BOT CONSOLE] Escalate failed', error)
      toast.error(error.message || 'Failed to escalate session')
    }
  }

  const handleCloseSession = async (session: BotSession) => {
    try {
      const { error } = await supabase
        .from('bot_sessions')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          context: {
            ...(session.context || {}),
            state: 'closed',
            manualCloseReason: 'Closed from bot console',
          },
        })
        .eq('id', session.id)
        .eq('tenant_id', session.tenant_id)

      if (error) throw error

      toast.success('Session closed')
      await loadSessions(session.tenant_id, true)
      setSelectedSessionId(null)
    } catch (error: any) {
      console.error('[BOT CONSOLE] Close failed', error)
      toast.error(error.message || 'Failed to close session')
    }
  }

  const loadReliability = async (tenant: string, silent = false) => {
    if (!silent) setReliabilityLoading(true)
    try {
      const [queuesResponse, failedEventsResp] = await Promise.all([
        fetch('/api/system/queues'),
        supabase
          .from('engagement_events')
          .select('*')
          .eq('tenant_id', tenant)
          .eq('status', 'failed')
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      const queuesJson = await queuesResponse.json().catch(() => ({}))
      if (queuesResponse.ok) {
        setQueueMetrics(queuesJson)
      } else {
        setQueueMetrics(null)
      }

      if (failedEventsResp.error) throw failedEventsResp.error
      setFailedEvents(failedEventsResp.data || [])
    } catch (error: any) {
      console.error('[RELIABILITY] Failed to load metrics', error)
      if (!silent) toast.error(error.message || 'Failed to load reliability data')
    } finally {
      if (!silent) setReliabilityLoading(false)
    }
  }

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null
  const selectedSteps = selectedCampaign ? stepsByCampaign[selectedCampaign.id] || [] : []
  const selectedEnrollments = selectedCampaign ? enrollmentsByCampaign[selectedCampaign.id] || [] : []
  const selectedEvents = selectedCampaign ? eventsByCampaign[selectedCampaign.id] || [] : []
  const selectedSession = selectedSessionId ? sessions.find((session) => session.id === selectedSessionId) || null : null

  if (loadingInitial) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh] text-gray-500">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Loading autonomous engagement…</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tenantId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[50vh] text-gray-500">
          <div className="text-center max-w-md">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No tenant selected</h2>
            <p className="text-gray-600 mb-6">
              Switch into an organization to manage autonomous engagement campaigns and bot sessions.
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto">
        <div className="p-8 space-y-6">
          <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                <Bot className="h-7 w-7 text-purple-600" />
                Autonomous Engagement
              </h1>
              <p className="text-gray-600">
                Orchestrate AI-led outreach, review live conversations, and monitor reliability from one command center.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => tenantId && loadCampaigns(tenantId)}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button className="bg-purple-600 hover:bg-purple-700" onClick={() => setCreateModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </div>
          </header>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3 md:w-[520px]">
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="bot-console">Bot Console</TabsTrigger>
              <TabsTrigger value="reliability">Reliability</TabsTrigger>
            </TabsList>

            <TabsContent value="campaigns" className="space-y-6">
              <CampaignsPanel
                campaigns={campaigns}
                loading={campaignsLoading}
                error={campaignError}
                selectedCampaignId={selectedCampaignId}
                onSelectCampaign={setSelectedCampaignId}
                selectedCampaign={selectedCampaign}
                steps={selectedSteps}
                stepsLoading={stepsLoading}
                enrollments={selectedEnrollments}
                events={selectedEvents}
                onAddStep={handleAddStep}
                onRemoveStep={handleRemoveStep}
                onStatusChange={handleUpdateCampaignStatus}
              />
            </TabsContent>

            <TabsContent value="bot-console">
              <BotConsolePanel
                sessions={sessions}
                loading={sessionsLoading}
                sessionFilter={sessionFilter}
                onSessionFilterChange={setSessionFilter}
                selectedSessionId={selectedSessionId}
                onSelectSession={setSelectedSessionId}
                turns={sessionTurns}
                turnsLoading={turnsLoading}
                onEscalate={handleEscalateSession}
                onCloseSession={handleCloseSession}
                onRefresh={() => tenantId && loadSessions(tenantId)}
                insights={botInsights}
                activeSession={selectedSession}
              />
            </TabsContent>

            <TabsContent value="reliability">
              <ReliabilityPanel
                loading={reliabilityLoading}
                metrics={queueMetrics}
                failedEvents={failedEvents}
                onRefresh={() => tenantId && loadReliability(tenantId)}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <CreateCampaignDialog
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        form={newCampaignForm}
        onFormChange={setNewCampaignForm}
        onSubmit={handleCreateCampaign}
        submitting={creatingCampaign}
      />
    </DashboardLayout>
  )
}

/* Campaign panel moved to components/engagement/campaigns-panel */

interface BotConsolePanelProps {
  sessions: BotSession[]
  loading: boolean
  sessionFilter: BotSession['status'] | 'all'
  onSessionFilterChange: (filter: BotSession['status'] | 'all') => void
  selectedSessionId: string | null
  onSelectSession: (sessionId: string | null) => void
  turns: BotTurn[]
  turnsLoading: boolean
  onEscalate: (session: BotSession) => Promise<void>
  onCloseSession: (session: BotSession) => Promise<void>
  onRefresh: () => void
  insights: Record<string, any>
  activeSession: BotSession | null
}

function BotConsolePanel({
  sessions,
  loading,
  sessionFilter,
  onSessionFilterChange,
  selectedSessionId,
  onSelectSession,
  turns,
  turnsLoading,
  onEscalate,
  onCloseSession,
  onRefresh,
  insights,
  activeSession,
}: BotConsolePanelProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="border border-blue-100 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <MessageCircle className="h-5 w-5" />
            Live Sessions
          </CardTitle>
          <div className="flex items-center gap-2 mt-3">
            <Select value={sessionFilter} onValueChange={(value) => onSessionFilterChange(value as typeof sessionFilter)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SESSION_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center h-72 text-gray-500">
              <RefreshCw className="h-5 w-5 animate-spin" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-72 text-gray-500 gap-3 px-6 text-center">
              <MessageCircle className="h-10 w-10 text-blue-300" />
              <span className="font-medium text-gray-700">No sessions found</span>
              <p className="text-sm text-gray-500">
                Active bot conversations will appear here. Choose a filter to inspect escalated or closed sessions.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[420px]">
              <div className="px-2">
                {sessions.map((session) => {
                  const isActive = session.id === selectedSessionId
                  return (
                    <button
                      key={session.id}
                      onClick={() => onSelectSession(session.id)}
                      className={`w-full text-left rounded-lg border transition-all px-4 py-3 mb-2 ${
                        isActive ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">
                            {session.metadata?.contact_name || session.contact_id || 'Unknown contact'}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Updated {formatDistanceToNow(new Date(session.last_activity_at), { addSuffix: true })}
                          </p>
                        </div>
                        <StatusBadge status={session.status} />
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                        <ChannelBadge channel={session.channel} />
                        {session.metadata?.source && <Badge variant="outline">{session.metadata.source}</Badge>}
                      </div>
                      {session.context?.preview && (
                        <p className="text-xs text-gray-600 mt-2 line-clamp-2">{session.context.preview}</p>
                      )}
                    </button>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        {selectedSessionId && activeSession ? (
          <>
            <CardHeader className="pb-3 border-b">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <CardTitle className="text-gray-900">
                    {activeSession.metadata?.contact_name || activeSession.contact_id || 'Conversation'}
                  </CardTitle>
                  <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                    <ChannelBadge channel={activeSession.channel} />
                    {activeSession.metadata?.deal_title && (
                      <>
                        <span className="text-gray-300">•</span>
                        {activeSession.metadata.deal_title}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEscalate(activeSession)}
                    disabled={activeSession.status === 'escalated'}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Escalate
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => onCloseSession(activeSession)}>
                    <X className="mr-2 h-4 w-4" />
                    Close
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 lg:grid-cols-[2fr_1fr] p-0">
              <div className="p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Transcript</h3>
                <div className="border border-gray-100 rounded-lg bg-gray-50">
                  <ScrollArea className="h-[420px] p-4">
                    {turnsLoading ? (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      </div>
                    ) : turns.length === 0 ? (
                      <div className="text-center text-sm text-gray-500 py-10">
                        No messages exchanged yet. New turns will surface here automatically.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {turns.map((turn) => (
                          <div
                            key={turn.id}
                            className={`max-w-xl rounded-lg px-4 py-3 shadow-sm ${
                              turn.role === 'patient'
                                ? 'bg-white border border-blue-100'
                                : turn.role === 'bot'
                                ? 'bg-blue-600 text-white'
                                : 'bg-purple-600 text-white'
                            }`}
                          >
                            <div className="text-xs opacity-70 flex items-center gap-2 mb-1">
                              <span className="capitalize">{turn.role}</span>
                              <span>•</span>
                              <span>{formatDistanceToNow(new Date(turn.created_at), { addSuffix: true })}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{turn.message}</p>
                            {turn.intent && (
                              <p className="mt-2 text-xs opacity-70">
                                Intent: {turn.intent} ({Math.round((turn.confidence_score || 0) * 100)}%)
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </div>
              <div className="border-l border-gray-100 bg-gray-50/60 p-6 space-y-6">
                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <Timer className="h-4 w-4 text-blue-500" />
                    Session Summary
                  </h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-800">Status:</span>{' '}
                      <StatusBadge status={activeSession.status} />
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">Started:</span>{' '}
                      {formatDistanceToNow(new Date(activeSession.started_at), { addSuffix: true })}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">Last activity:</span>{' '}
                      {formatDistanceToNow(new Date(activeSession.last_activity_at), { addSuffix: true })}
                    </p>
                    {activeSession.closed_at && (
                      <p>
                        <span className="font-medium text-gray-800">Closed:</span>{' '}
                        {formatDistanceToNow(new Date(activeSession.closed_at), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-500" />
                    AI Insights
                  </h3>
                  {Object.keys(insights || {}).length === 0 ? (
                    <p className="text-sm text-gray-500">
                      No insights recorded yet. Once AI classification runs, you’ll see sentiment, intent, and recommendations here.
                    </p>
                  ) : (
                    <div className="space-y-2 text-sm text-gray-600">
                      {insights.sentiment && (
                        <p>
                          <span className="font-medium text-gray-800">Sentiment:</span> {insights.sentiment}
                        </p>
                      )}
                      {insights.intent && (
                        <p>
                          <span className="font-medium text-gray-800">Intent:</span> {insights.intent}
                        </p>
                      )}
                      {insights.urgencyScore !== undefined && (
                        <p>
                          <span className="font-medium text-gray-800">Urgency Score:</span> {insights.urgencyScore}
                        </p>
                      )}
                      {insights.recommendedAction && (
                        <p>
                          <span className="font-medium text-gray-800">Recommended Action:</span>{' '}
                          {insights.recommendedAction}
                        </p>
                      )}
                    </div>
                  )}
                </section>
              </div>
            </CardContent>
          </>
        ) : (
          <div className="flex items-center justify-center h-[520px] text-gray-500">
            <p>Select a session to inspect the transcript</p>
          </div>
        )}
      </Card>
    </div>
  )
}

function ChannelBadge({ channel }: { channel: BotSession['channel'] }) {
  const Icon =
    channel === 'sms' ? Smartphone : channel === 'voice' ? Phone : channel === 'whatsapp' ? MessageCircle : Bot
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600">
      <Icon className="h-3 w-3" />
      {channel}
    </span>
  )
}

interface ReliabilityPanelProps {
  loading: boolean
  metrics: any
  failedEvents: EngagementEventLog[]
  onRefresh: () => void
}

function ReliabilityPanel({ loading, metrics, failedEvents, onRefresh }: ReliabilityPanelProps) {
  const engagementQueue = metrics?.queues?.engagement
  const communicationsQueue = metrics?.queues?.communications

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <ServerCrash className="h-5 w-5 text-rose-500" />
          Queue Health & Reliability
        </h2>
        <Button variant="outline" onClick={onRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <QueueCard
          title="Engagement Queue"
          description="Handles campaign enrollments, waits, and AI dispatch actions."
          metrics={engagementQueue}
          loading={loading}
          accent="purple"
        />
        <QueueCard
          title="Communications Queue"
          description="Legacy queue for email/SMS/WhatsApp dispatch."
          metrics={communicationsQueue}
          loading={loading}
          accent="blue"
        />
      </div>

      <Card className="border border-amber-100">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
            Failed Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          {failedEvents.length === 0 ? (
            <p className="text-sm text-gray-600">No failed events in the last review window. All systems look healthy.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Occurred</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedEvents.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>{event.event_type}</TableCell>
                    <TableCell>
                      <StatusBadge status={event.status} />
                    </TableCell>
                    <TableCell>{formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-red-600">{event.error_message || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function QueueCard({
  title,
  description,
  metrics,
  loading,
  accent,
}: {
  title: string
  description: string
  metrics: any
  loading: boolean
  accent: 'purple' | 'blue'
}) {
  const colors =
    accent === 'purple'
      ? { border: 'border-purple-100', title: 'text-purple-700', pill: 'bg-purple-100 text-purple-700' }
      : { border: 'border-blue-100', title: 'text-blue-700', pill: 'bg-blue-100 text-blue-700' }

  return (
    <Card className={`border ${colors.border}`}>
      <CardHeader className="pb-2">
        <CardTitle className={`text-base ${colors.title}`}>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-gray-600">
        <p>{description}</p>
        {loading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading metrics…
          </div>
        ) : !metrics?.enabled ? (
          <p className="text-amber-600">Queue disabled or metrics unavailable.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500">Waiting Jobs</p>
              <p className="text-xl font-semibold text-gray-900">
                {metrics.metrics?.counts?.waiting ?? metrics.metrics?.counts?.waiting ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500">Active Jobs</p>
              <p className="text-xl font-semibold text-gray-900">{metrics.metrics?.counts?.active ?? 0}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500">Completed (7d)</p>
              <p className="text-xl font-semibold text-gray-900">
                {metrics.metrics?.metrics?.completed?.count ?? metrics.metrics?.metrics?.completed ?? 0}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-100 p-3">
              <p className="text-xs text-gray-500">Failed (7d)</p>
              <p className="text-xl font-semibold text-gray-900">
                {metrics.metrics?.metrics?.failed?.count ?? metrics.metrics?.metrics?.failed ?? 0}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface CreateCampaignDialogProps {
  open: boolean
  onOpenChange: (value: boolean) => void
  form: {
    name: string
    description: string
    goal: string
    trigger: string
    timezone: string
  }
  onFormChange: (value: CreateCampaignDialogProps['form']) => void
  onSubmit: () => Promise<void>
  submitting: boolean
}

function CreateCampaignDialog({ open, onOpenChange, form, onFormChange, onSubmit, submitting }: CreateCampaignDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Autonomous Campaign</DialogTitle>
          <DialogDescription>
            Define the purpose, trigger, and timezone. You can add steps after creating the campaign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Campaign Name</label>
            <Input
              value={form.name}
              onChange={(event) => onFormChange({ ...form, name: event.target.value })}
              placeholder="e.g., New Patient Reactivation"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(event) => onFormChange({ ...form, description: event.target.value })}
              placeholder="Outline the journey goal and outcome."
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Goal</label>
              <Select value={form.goal} onValueChange={(value) => onFormChange({ ...form, goal: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select goal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nurture">Nurture</SelectItem>
                  <SelectItem value="reactivation">Reactivation</SelectItem>
                  <SelectItem value="post_op">Post-Op Care</SelectItem>
                  <SelectItem value="collections">Collections</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Trigger</label>
              <Select value={form.trigger} onValueChange={(value) => onFormChange({ ...form, trigger: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select trigger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual Enrollment</SelectItem>
                  <SelectItem value="tag_added">Tag Added</SelectItem>
                  <SelectItem value="segment_entry">Segment Entry</SelectItem>
                  <SelectItem value="appointment_missed">Appointment Missed</SelectItem>
                  <SelectItem value="high_priority">High Priority Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Timezone</label>
            <Select value={form.timezone} onValueChange={(value) => onFormChange({ ...form, timezone: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {CAMPAIGN_TIMEZONES.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Create Campaign
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


