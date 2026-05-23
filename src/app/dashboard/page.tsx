'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LABELS } from '@/lib/constants/labels'
import { 
  Plus, 
  DollarSign, 
  Users, 
  Target, 
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Download,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Building2
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils/formatters'
import { createClient } from '@/lib/supabase-client'
import { getDashboardMetrics } from '@/lib/dashboard-analytics'
import { format } from '@/lib/formatting'
import { MetricCard } from '@/components/ui/metric-card'
import { LoadingState } from '@/components/ui/loading-state'

// Components
import { SetupBanner } from '@/components/onboarding/setup-banner'
import { EnhancedOnboardingWizard } from '@/components/onboarding/enhanced-onboarding-wizard'
import { EmailVerificationBanner } from '@/components/onboarding/email-verification-banner'
import { CreateContactSlideOver } from '@/components/contacts/create-contact-slide-over'
import { CreateTaskSlideOver } from '@/components/tasks/create-task-slide-over'
import { CreateDealSlideOver } from '@/components/deals/create-deal-slide-over'
import { TodaysPriorities } from '@/components/dashboard/todays-priorities'
import { DashboardTopMetricStrip } from '@/components/dashboard/dashboard-top-metric-strip'
import { DashboardTriageLanes } from '@/components/dashboard/dashboard-triage-lanes'
import { DashboardSmartPrompts } from '@/components/dashboard/dashboard-smart-prompts'
import { DashboardQuickActions } from '@/components/dashboard/dashboard-quick-actions'
import { DashboardGlobalSearch } from '@/components/dashboard/dashboard-global-search'
import { AIInsightsWidget } from '@/components/dashboard/ai-insights-widget'
import { LiveCoachPanel } from '@/components/dashboard/live-coach-panel'
import { KeyboardShortcutsModal } from '@/components/dashboard/keyboard-shortcuts-modal'
import { ExportMenu } from '@/components/dashboard/export-menu'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useDataFreshness } from '@/hooks/use-data-freshness'
import { useDashboardRealtime } from '@/lib/realtime-service'
import { useOrgGuard, OrgRequiredModal } from '@/components/guards'
import { DashboardIntelligencePanel } from '@/components/dashboard/dashboard-intelligence-panel'

export default function DashboardRedesigned() {
  const router = useRouter()
  const { appUser, loading: authLoading } = useAuth()
  
  // Organization Guard
  const { requireOrg, showOrgModal, setShowOrgModal } = useOrgGuard()
  const [currentAction, setCurrentAction] = useState('')
  
  // UI State
  const [showSetupPanel, setShowSetupPanel] = useState(false)
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showAnalytics, setShowAnalytics] = useState(false)
  
  // Data State
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalContacts: 0,
    totalDeals: 0,
    activeTasks: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0
  })
  const [metrics, setMetrics] = useState({
    conversionRate: 0,
    monthlyGrowth: 0,
    averageDealValue: 0
  })
    const [loading, setLoading] = useState(true)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  
  const timeAgo = useDataFreshness(lastUpdated)
  
  // Check if user has a tenant
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  
  // Guarded action wrapper with custom action name
  const guardedAction = (actionName: string, fn: () => void) => {
    setCurrentAction(actionName)
    return requireOrg(fn)
  }

  // Real-time & Shortcuts
  useDashboardRealtime(appUser?.active_tenant_id || appUser?.tenant_id, () => loadData(), true)
  useKeyboardShortcuts({
    onCreateContact: () => {
      setCurrentAction('create this contact')
      requireOrg(() => setShowCreateContact(true))()
    },
    onCreateDeal: () => {
      setCurrentAction('create this deal')
      requireOrg(() => setShowCreateDeal(true))()
    },
    onCreateTask: () => {
      setCurrentAction('create this task')
      requireOrg(() => setShowCreateTask(true))()
    },
    onRefresh: () => { void loadData() },
    onShowHelp: () => setShowShortcutsHelp(true),
    onNavigate: (path) => router.push(path),
    enabled: true
  })

  useEffect(() => {
    // Only load data if user has a tenant
    if (appUser?.active_tenant_id || appUser?.tenant_id) {
      loadData()
    } else {
      // User has no tenant - set loading to false to show empty state
      setLoading(false)
    }
  }, [appUser])

  const loadData = async () => {
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id
    if (!tenantId) {
      setLoading(false)
      return
    }
    
    const supabase = createClient()

    try {
      setLoading(true)

      const [dealsRes, contactsRes, tasksRes, metricsData] = await Promise.all([
        supabase.from('deals').select('value_estimate_cents, created_at').eq('tenant_id', tenantId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).neq('status', 'completed'),
        getDashboardMetrics(tenantId)
      ])

      const deals = dealsRes.data || []
      const thisMonth = new Date()
      thisMonth.setDate(1)
      const lastMonth = new Date(thisMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const dealsThisMonth = deals.filter(d => new Date(d.created_at) >= thisMonth)
      const dealsLastMonth = deals.filter(d => {
        const date = new Date(d.created_at)
        return date >= lastMonth && date < thisMonth
      })

      const totalRevenue = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
      const revenueThisMonth = dealsThisMonth.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
      const revenueLastMonth = dealsLastMonth.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)

      setStats({
        totalRevenue,
        totalContacts: contactsRes.count || 0,
        totalDeals: deals.length,
        activeTasks: tasksRes.count || 0,
        revenueThisMonth,
        revenueLastMonth
      })

      setMetrics(metricsData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('[Dashboard] Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || (loading && hasTenant)) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading your dashboard..." size="lg" />
      </DashboardLayout>
    )
  }

  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <div className="h-full overflow-y-auto bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-indigo-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Dental CRM! 👋
              </h1>
              <p className="text-gray-600 mb-6">
                Get started by creating your organization. This will let you manage contacts, deals, and more.
              </p>
              <Button
                onClick={() => {
                  setCurrentAction('create your organization')
                  requireOrg(() => {
                    // This will trigger OrgRequiredModal
                    router.push('/settings/organizations/create')
                  })()
                }}
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Organization
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                You can explore the app, but you'll need an organization to create data.
              </p>
            </div>
          </div>
        </div>
        <OrgRequiredModal
          isOpen={showOrgModal}
          onClose={() => setShowOrgModal(false)}
          actionName={currentAction || 'access this feature'}
          onSuccess={() => {
            // Refresh after org creation
            window.location.reload()
          }}
        />
      </DashboardLayout>
    )
  }

  const getTrendData = (current: number, previous: number) => {
    if (previous === 0) return { change: 0, icon: Minus, color: 'text-gray-400' }
    const change = ((current - previous) / previous) * 100
    return {
      change,
      icon: change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus,
      color: change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-400'
    }
  }

  const revenueTrend = getTrendData(stats.revenueThisMonth, stats.revenueLastMonth)

  return (
    <DashboardLayout>
      <EmailVerificationBanner />
      <SetupBanner onOpenWizard={() => setShowSetupPanel(true)} />
      {showSetupPanel && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setShowSetupPanel(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setShowSetupPanel(false)
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Close setup panel"
          />
          
          {/* Side Sliding Modal */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-5xl bg-white shadow-2xl overflow-hidden animate-slide-in-right">
            <EnhancedOnboardingWizard 
              onClose={() => {
                setShowSetupPanel(false)
                loadData() // Refresh dashboard data after wizard closes
              }} 
            />
          </div>
        </>
      )}
      <OrgRequiredModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        actionName={currentAction || 'access this feature'}
        onSuccess={() => {
          // Refresh after org creation
          window.location.reload()
        }}
      />

      {/* CLEAN, MODERN LAYOUT - COMPACT & EFFICIENT */}
      <div className="h-full overflow-y-auto bg-gray-50">
        <div className="max-w-[1800px] mx-auto px-6 py-6 space-y-8 pb-24">
          
          {/* HEADER - Compact & Clean */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Welcome back, {appUser?.full_name?.split(' ')[0]} 👋
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {lastUpdated && ` • Updated ${timeAgo}`}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* 2b.53 — Global search in the header. ⌘K / Ctrl+K
                  focuses from anywhere on the dashboard. Searches
                  contacts + deals + activity bodies via parallel
                  RLS-scoped Supabase queries (no new endpoint). */}
              <DashboardGlobalSearch
                tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
              />

              <Button
                onClick={() => {
                  setCurrentAction('create this contact')
                  requireOrg(() => setShowCreateContact(true))()
                }}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Contact
              </Button>
              <Button
                onClick={() => {
                  setCurrentAction('create this deal')
                  requireOrg(() => setShowCreateDeal(true))()
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New {LABELS.DEAL.singular}
              </Button>
              <Button
                onClick={() => {
                  setCurrentAction('create this task')
                  requireOrg(() => setShowCreateTask(true))()
                }}
                size="sm"
                variant="outline"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Task
              </Button>
              <ExportMenu
                data={{
                  stats: { ...stats, ...metrics },
                  revenueData: [],
                  dealsByStage: [],
                  priorities: [],
                  metadata: {
                    generatedAt: new Date(),
                    generatedBy: appUser?.full_name || 'User',
                    period: 'month'
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowShortcutsHelp(true)}
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* 2b.49 — Top metric strip. Five at-a-glance numbers in
              one line, each clickable. Replaces the dashboard's
              "what's important right now" lens at the top of the
              page; the older KPI cards (Revenue / Contacts / Deals /
              Tasks) below stay for now and 2b.57 prunes them. */}
          <DashboardTopMetricStrip
            tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
          />

          {/* 2b.50/51 — Triage lanes: 8 clickable cards in a grid.
              Today's Priorities, Today's Calls, New Inquiries, Stale
              Follow-ups, Unread Inbound, Failed Sends, Voicemails,
              AI-Needs-Your-Eye. Each card routes to the relevant
              workspace. Auto-refresh every 60s. */}
          <DashboardTriageLanes
            tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
          />

          {/* 2b.52 — Smart-prompt nudges. Practice Setup Incomplete,
              Integration Warnings, AI Features Unconfigured (hide-
              if-resolved), Re-engagement Opportunity (forever-dismiss).
              Whole section vanishes when nothing applies. */}
          <DashboardSmartPrompts
            tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
          />

          {/* 2b.53 — Quick action buttons (New Contact / New Deal).
              Opens the existing slide-overs in place. */}
          <DashboardQuickActions
            tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
            onRefresh={() => loadData()}
          />

          {/* KPI CARDS - Compact & Efficient */}
          <div className="grid auto-rows-fr grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {/* Revenue */}
            <Card className="group h-full overflow-hidden transition-shadow duration-200 hover:shadow-md focus-within:shadow-md">
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Revenue</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {format.currency(stats.totalRevenue / 100)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-green-100">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
                {revenueTrend.change !== 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                    <revenueTrend.icon className={`h-3.5 w-3.5 ${revenueTrend.color}`} />
                    <span className={revenueTrend.color}>
                      {revenueTrend.change > 0 ? '+' : ''}{revenueTrend.change.toFixed(1)}%
                    </span>
                    <span className="text-gray-400">vs last month</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card
              className="group h-full cursor-pointer overflow-hidden transition-shadow duration-200 hover:shadow-md focus-within:shadow-md"
              onClick={() => router.push('/contacts')}
            >
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total Contacts</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {format.number(stats.totalContacts)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">Click to review your contact workspace</p>
              </CardContent>
            </Card>

            {/* Deals */}
            <Card
              className="group h-full cursor-pointer overflow-hidden transition-shadow duration-200 hover:shadow-md focus-within:shadow-md"
              onClick={() => router.push('/deals')}
            >
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Active {LABELS.DEAL.plural}</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {format.number(stats.totalDeals)}
                    </p>
                  </div>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-purple-100">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">Pipeline momentum across all open deals</p>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card
              className="group h-full cursor-pointer overflow-hidden transition-shadow duration-200 hover:shadow-md focus-within:shadow-md"
              onClick={() => router.push('/tasks')}
            >
              <CardContent className="flex h-full flex-col justify-between p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Pending Tasks</p>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {format.number(stats.activeTasks)}
                    </p>
                    {stats.activeTasks > 10 && (
                      <Badge variant="secondary" className="mt-2 w-fit bg-orange-100 text-xs font-semibold text-orange-700">
                        High
                      </Badge>
                    )}
                  </div>
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <p className="mt-4 text-xs text-gray-500">Stay on top of follow-ups and reminders</p>
              </CardContent>
            </Card>
          </div>

          {hasTenant && <LiveCoachPanel />}

          {/* MAIN CONTENT - Side by Side Layout */}
          <DashboardIntelligencePanel
            tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''}
            onOpenCoaching={() => router.push('/call-coaching')}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* LEFT: PRIORITIES - Compact */}
            {hasTenant && (
              <>
                <TodaysPriorities tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''} onRefresh={loadData} />
                {/* RIGHT: AI INSIGHTS */}
                <AIInsightsWidget tenantId={appUser?.active_tenant_id || appUser?.tenant_id || ''} />
              </>
            )}
          </div>

          {/* ANALYTICS - Collapsible by Default */}
          <Card className="border-0 shadow-sm">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors"
              onClick={() => setShowAnalytics(!showAnalytics)}
            >
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Analytics & Reports
                </CardTitle>
                <Button variant="ghost" size="sm">
                  {showAnalytics ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardHeader>
            {showAnalytics && (
              <CardContent className="pt-0">
                <p className="text-sm text-gray-500 mb-4">
                  Charts and detailed analytics will load here...
                </p>
              </CardContent>
            )}
          </Card>

          {/* CLEAN BOTTOM FINISH */}
          <div className="h-16"></div>
        </div>
      </div>

      {/* Modals */}
      <CreateContactSlideOver
        open={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onContactCreated={loadData}
      />
      <CreateTaskSlideOver
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={loadData}
      />
      <CreateDealSlideOver
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        onDealCreated={loadData}
      />
      <KeyboardShortcutsModal
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
      
      {/* Organization Required Modal */}
      <OrgRequiredModal
        isOpen={showOrgModal}
        onClose={() => setShowOrgModal(false)}
        actionName={currentAction}
        onSuccess={() => router.refresh()}
      />
    </DashboardLayout>
  )
}

