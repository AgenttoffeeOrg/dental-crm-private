'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Plus, Settings as SettingsIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils/formatters'
import { SetupBanner } from '@/components/onboarding/setup-banner'
import { ProfileSetupPanel } from '@/components/onboarding/profile-setup-panel'
import { EmailVerificationBanner } from '@/components/onboarding/email-verification-banner'
import { CreateContactSlideOver } from '@/components/contacts/create-contact-slide-over'
import { CreateTaskSlideOver } from '@/components/tasks/create-task-slide-over'
import { CreateDealSlideOver } from '@/components/deals/create-deal-slide-over'

// NEW ENTERPRISE COMPONENTS
import { TodaysPriorities } from '@/components/dashboard/todays-priorities'
import { AIInsightsWidget } from '@/components/dashboard/ai-insights-widget'
import { EnhancedKPICard } from '@/components/dashboard/enhanced-kpi-card'
import { TimePeriodSelector, type DateRange } from '@/components/dashboard/time-period-selector'
import { QuickFilters, type FilterType } from '@/components/dashboard/quick-filters'
import { ExportMenu } from '@/components/dashboard/export-menu'
import { KeyboardShortcutsModal } from '@/components/dashboard/keyboard-shortcuts-modal'
import { WidgetCustomizer } from '@/components/dashboard/widget-customizer'
import { DashboardSkeleton } from '@/components/dashboard/widget-skeletons'
import { WidgetErrorBoundary } from '@/components/dashboard/widget-error-boundary'
import { CollapsibleCard } from '@/components/dashboard/collapsible-card'

// HOOKS
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useDataFreshness } from '@/hooks/use-data-freshness'
import { useDashboardRealtime } from '@/lib/realtime-service'
import { useLiveNotifications } from '@/components/dashboard/live-notification-badge'

// SERVICES  
import { getDashboardMetrics } from '@/lib/dashboard-analytics'
import { createClient } from '@/lib/supabase-client'
import { DollarSign, Users, Target, CheckCircle, Activity } from 'lucide-react'

export default function DashboardNewPage() {
  const router = useRouter()
  const { appUser, loading: authLoading } = useAuth()
  
  // UI State
  const [showSetupPanel, setShowSetupPanel] = useState(false)
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [showCustomizer, setShowCustomizer] = useState(false)
  
  // Data State
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    totalContacts: 0,
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
  
  // Filters
  const [timePeriod, setTimePeriod] = useState('month')
  const [filter, setFilter] = useState<FilterType>('all')

  // Notifications
  const { notifications, addNotification, dismissNotification, dismissAll } = useLiveNotifications()
  
  // Data freshness
  const timeAgo = useDataFreshness(lastUpdated)

  // Load data
  useEffect(() => {
    if (appUser?.tenant_id) {
      loadDashboardData()
    }
  }, [appUser])

  // Real-time updates
  useDashboardRealtime(
    appUser?.tenant_id,
    () => {
      loadDashboardData()
      addNotification({
        type: 'deal',
        action: 'created',
        title: 'Dashboard updated with new data'
      })
    },
    true
  )

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateContact: () => setShowCreateContact(true),
    onCreateDeal: () => setShowCreateDeal(true),
    onCreateTask: () => setShowCreateTask(true),
    onRefresh: () => loadDashboardData(),
    onShowHelp: () => setShowShortcutsHelp(true),
    onNavigate: (path) => router.push(path),
    enabled: true
  })

  const loadDashboardData = async () => {
    if (!appUser?.tenant_id) return
    
    const supabase = createClient()
    const tenantId = appUser.tenant_id

    try {
      setLoading(true)

      // Optimized parallel queries
      const [dealsRes, contactsRes, tasksRes, metricsData] = await Promise.all([
        supabase.from('deals').select('value_estimate_cents, created_at').eq('tenant_id', tenantId),
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).in('status', ['open', 'in_progress']),
        getDashboardMetrics(tenantId)
      ])

      const deals = dealsRes.data || []
      const thisMonth = new Date()
      thisMonth.setDate(1)
      thisMonth.setHours(0, 0, 0, 0)
      
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
        totalDeals: deals.length,
        totalRevenue,
        totalContacts: contactsRes.count || 0,
        activeTasks: tasksRes.count || 0,
        revenueThisMonth,
        revenueLastMonth
      })

      setMetrics(metricsData)
      setLastUpdated(new Date())
    } catch (error) {
      console.error('[Dashboard] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <DashboardSkeleton />
      </DashboardLayout>
    )
  }

  // Calculate trends for KPIs
  const revenueTrend = stats.revenueLastMonth > 0
    ? ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100
    : 0

  return (
    <DashboardLayout>
      <EmailVerificationBanner />
      <SetupBanner onSetupClick={() => setShowSetupPanel(true)} />
      <ProfileSetupPanel
        isOpen={showSetupPanel}
        onClose={() => setShowSetupPanel(false)}
        onComplete={() => loadDashboardData()}
      />

      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto">
          
          {/* Header with Controls */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Welcome back, {appUser?.full_name}! 👋
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Here's your practice overview • Updated {timeAgo}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <TimePeriodSelector
                value={timePeriod}
                onChange={(period, range) => setTimePeriod(period)}
              />
              <ExportMenu
                data={{
                  stats: {
                    ...stats,
                    conversionRate: metrics.conversionRate,
                    monthlyGrowth: metrics.monthlyGrowth
                  },
                  revenueData: [],
                  dealsByStage: [],
                  priorities: [],
                  metadata: {
                    generatedAt: new Date(),
                    generatedBy: appUser?.full_name || 'User',
                    period: timePeriod
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCustomizer(true)}
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Customize
              </Button>
            </div>
          </div>

          {/* Quick Filters */}
          <QuickFilters
            currentFilter={filter}
            onChange={setFilter}
            className="mb-6"
          />

          {/* Quick Actions */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowCreateContact(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Contact
              </Button>
              <Button
                onClick={() => setShowCreateDeal(true)}
                variant="outline"
              >
                <Target className="h-4 w-4 mr-2" />
                New Deal
              </Button>
              <Button
                onClick={() => setShowCreateTask(true)}
                variant="outline"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* TODAY'S PRIORITIES - NEW! */}
          <WidgetErrorBoundary widgetName="Today's Priorities">
            <div className="mb-6">
              <TodaysPriorities 
                tenantId={appUser?.tenant_id || ''} 
                onRefresh={loadDashboardData}
              />
            </div>
          </WidgetErrorBoundary>

          {/* ENHANCED KPI CARDS - NEW! */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <EnhancedKPICard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign className="h-5 w-5" />}
              trend={{
                value: revenueTrend,
                period: 'vs. last month'
              }}
              href="/pipeline"
              color="green"
              onRefresh={loadDashboardData}
              lastUpdated={timeAgo}
              tooltip="Total revenue from all deals in your pipeline"
            />

            <EnhancedKPICard
              title="Total Deals"
              value={stats.totalDeals}
              icon={<Target className="h-5 w-5" />}
              subtitle={`+${stats.totalDeals} active`}
              href="/pipeline"
              color="blue"
              onRefresh={loadDashboardData}
              lastUpdated={timeAgo}
              tooltip="All deals in your pipeline across all stages"
            />

            <EnhancedKPICard
              title="Total Contacts"
              value={stats.totalContacts}
              icon={<Users className="h-5 w-5" />}
              subtitle="Patients & leads"
              href="/contacts"
              color="purple"
              onRefresh={loadDashboardData}
              lastUpdated={timeAgo}
              tooltip="All contacts including patients and leads"
            />

            <EnhancedKPICard
              title="Active Tasks"
              value={stats.activeTasks}
              icon={<CheckCircle className="h-5 w-5" />}
              subtitle="Need attention"
              href="/tasks"
              color="orange"
              onRefresh={loadDashboardData}
              lastUpdated={timeAgo}
              tooltip="Tasks that haven't been completed yet"
            />
          </div>

          {/* AI INSIGHTS - NEW! */}
          <WidgetErrorBoundary widgetName="AI Insights">
            <div className="mb-6">
              <AIInsightsWidget tenantId={appUser?.tenant_id || ''} />
            </div>
          </WidgetErrorBoundary>

          {/* CHARTS - Collapsible */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <WidgetErrorBoundary widgetName="Revenue Chart">
              <CollapsibleCard
                title="Revenue Trend"
                defaultExpanded={true}
                storageKey="revenue-chart"
              >
                <div className="h-64">
                  {/* Placeholder - charts will be integrated */}
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Revenue chart loading...
                  </div>
                </div>
              </CollapsibleCard>
            </WidgetErrorBoundary>

            <WidgetErrorBoundary widgetName="Pipeline Funnel">
              <CollapsibleCard
                title="Pipeline Funnel"
                defaultExpanded={true}
                storageKey="pipeline-funnel"
              >
                <div className="h-64">
                  <div className="flex items-center justify-center h-full text-gray-400">
                    Funnel chart loading...
                  </div>
                </div>
              </CollapsibleCard>
            </WidgetErrorBoundary>
          </div>

          {/* Quick Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <CollapsibleCard
              title="Quick Insights"
              defaultExpanded={true}
              storageKey="quick-insights"
              className="lg:col-span-1"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Conversion Rate</span>
                  <span className="font-semibold text-green-600">
                    {metrics.conversionRate > 0 ? `${metrics.conversionRate}%` : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Deal Value</span>
                  <span className="font-semibold text-blue-600">
                    {metrics.averageDealValue > 0 ? formatCurrency(metrics.averageDealValue) : 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Growth</span>
                  <span className={`font-semibold ${
                    metrics.monthlyGrowth > 0 ? 'text-green-600' :
                    metrics.monthlyGrowth < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metrics.monthlyGrowth !== 0 
                      ? `${metrics.monthlyGrowth > 0 ? '+' : ''}${metrics.monthlyGrowth}%`
                      : 'N/A'}
                  </span>
                </div>
              </div>
            </CollapsibleCard>
          </div>

        </div>
      </div>

      {/* Modals */}
      <CreateContactSlideOver
        open={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onContactCreated={loadDashboardData}
      />

      <CreateTaskSlideOver
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={loadDashboardData}
      />

      <CreateDealSlideOver
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        onDealCreated={loadDashboardData}
      />

      <KeyboardShortcutsModal
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />

      <WidgetCustomizer
        open={showCustomizer}
        onClose={() => setShowCustomizer(false)}
        widgets={[
          { id: 'priorities', name: "Today's Priorities", visible: true, order: 1 },
          { id: 'kpis', name: 'KPI Cards', visible: true, order: 2 },
          { id: 'insights', name: 'AI Insights', visible: true, order: 3 },
          { id: 'charts', name: 'Charts', visible: true, order: 4 }
        ]}
        onSave={async (widgets) => {
          // Save to preferences
          console.log('Saving widget preferences:', widgets)
        }}
        onReset={async () => {
          console.log('Resetting to defaults')
        }}
      />
    </DashboardLayout>
  )
}

