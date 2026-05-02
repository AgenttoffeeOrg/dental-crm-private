'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  DollarSign, 
  Users, 
  Target, 
  CheckCircle, 
  TrendingUp,
  Phone,
  Mail,
  Plus,
  Calendar,
  ArrowRight,
  Activity,
  Clock,
  AlertTriangle,
  BarChart3,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils/formatters'
import { SkeletonCard } from '@/components/ui/skeleton-loader'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { 
  getRevenueChartData, 
  getDealsFunnelData, 
  getDashboardMetrics 
} from '@/lib/dashboard-analytics'
import dynamic from 'next/dynamic'

// Lazy load charts for better initial page load performance
const RevenueChart = dynamic(() => import('@/components/dashboard/revenue-chart').then(mod => ({ default: mod.RevenueChart })), {
  loading: () => (
    <div className="h-80 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading chart...</div>
    </div>
  ),
  ssr: false
})

const DealsFunnelChart = dynamic(() => import('@/components/dashboard/deals-funnel-chart').then(mod => ({ default: mod.DealsFunnelChart })), {
  loading: () => (
    <div className="h-80 flex items-center justify-center">
      <div className="animate-pulse text-gray-400">Loading chart...</div>
    </div>
  ),
  ssr: false
})
import { SetupBanner } from '@/components/onboarding/setup-banner'
import { ProfileSetupPanel } from '@/components/onboarding/profile-setup-panel'
import { EmailVerificationBanner } from '@/components/onboarding/email-verification-banner'
import { CreateContactSlideOver } from '@/components/contacts/create-contact-slide-over'
import { CreateTaskSlideOver } from '@/components/tasks/create-task-slide-over'
import { CreateDealSlideOver } from '@/components/deals/create-deal-slide-over'

// ENTERPRISE FEATURES
import { TodaysPriorities } from '@/components/dashboard/todays-priorities'
import { AIInsightsWidget } from '@/components/dashboard/ai-insights-widget'
import { EnhancedKPICard } from '@/components/dashboard/enhanced-kpi-card'
import { WidgetErrorBoundary } from '@/components/dashboard/widget-error-boundary'
import { useDataFreshness } from '@/hooks/use-data-freshness'
import { useDashboardRealtime } from '@/lib/realtime-service'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { KeyboardShortcutsModal } from '@/components/dashboard/keyboard-shortcuts-modal'
import { ExportMenu, type ExportData } from '@/components/dashboard/export-menu'
import { QuickFilters, type FilterType } from '@/components/dashboard/quick-filters'
import { useRouter } from 'next/navigation'

export default function DashboardPage() {
  const router = useRouter()
  const { appUser, loading: authLoading } = useAuth()
  const [showSetupPanel, setShowSetupPanel] = useState(false)
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false)
  const [filter, setFilter] = useState<FilterType>('all')
  const [timePeriod, setTimePeriod] = useState('month')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    totalContacts: 0,
    activeTasks: 0,
    dealsThisMonth: 0,
    revenueThisMonth: 0,
    revenueLastMonth: 0
  })
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([])
  const [recentDeals, setRecentDeals] = useState<any[]>([])
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [dealsByStage, setDealsByStage] = useState<any[]>([])
  const [metrics, setMetrics] = useState({
    conversionRate: 0,
    monthlyGrowth: 0,
    averageDealValue: 0
  })
  const [loading, setLoading] = useState(true)
  const [chartsLoading, setChartsLoading] = useState(true)
  const [metricsLoading, setMetricsLoading] = useState(true)

  // Data freshness tracking
  const timeAgo = useDataFreshness(lastUpdated)

  // Real-time updates
  useDashboardRealtime(
    appUser?.tenant_id,
    () => {
      console.log('[Dashboard] Real-time update received, refreshing data')
      loadDashboardData()
    },
    true
  )

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onCreateContact: () => setShowCreateContact(true),
    onCreateDeal: () => setShowCreateDeal(true),
    onCreateTask: () => setShowCreateTask(true),
    onRefresh: () => { void loadDashboardData() },
    onShowHelp: () => setShowShortcutsHelp(true),
    onNavigate: (path) => router.push(path),
    enabled: true
  })

  useEffect(() => {
    if (appUser?.tenant_id) {
      loadDashboardData()
    }
  }, [appUser])

  const loadChartData = async () => {
    if (!appUser?.tenant_id) return
    
    setChartsLoading(true)
    try {
      const [revenueChartData, dealsFunnelData] = await Promise.all([
        getRevenueChartData(appUser.tenant_id, 6),
        getDealsFunnelData(appUser.tenant_id)
      ])
      
      setRevenueData(revenueChartData)
      setDealsByStage(dealsFunnelData)
    } catch (error) {
      console.error('[Dashboard] Error loading chart data:', error)
      // Set empty data on error so UI doesn't break
      setRevenueData([])
      setDealsByStage([])
    } finally {
      setChartsLoading(false)
    }
  }

  const loadMetrics = async () => {
    if (!appUser?.tenant_id) return
    
    setMetricsLoading(true)
    try {
      const dashboardMetrics = await getDashboardMetrics(appUser.tenant_id)
      setMetrics(dashboardMetrics)
    } catch (error) {
      console.error('[Dashboard] Error loading metrics:', error)
      // Keep default values on error
    } finally {
      setMetricsLoading(false)
    }
  }

  const loadDashboardData = async () => {
    const supabase = createClient()
    const tenantId = appUser?.tenant_id

    try {
      // OPTIMIZED: Combine queries and fetch related data in parallel
      const [dealsRes, contactsRes, tasksRes, upcomingTasksRes, recentDealsRes] = await Promise.all([
        // Deals with all needed fields
        supabase.from('deals').select('value_estimate_cents, created_at, stage_id, title').eq('tenant_id', tenantId),
        // Contacts count only
        supabase.from('contacts').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
        // Active tasks count only
        supabase.from('tasks').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).neq('status', 'completed'),
        // Upcoming tasks (needed for display)
        supabase.from('tasks').select('*').eq('tenant_id', tenantId).neq('status', 'completed').order('due_at', { ascending: true }).limit(5),
        // Recent deals (needed for display)
        supabase.from('deals').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(5)
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
        dealsThisMonth: dealsThisMonth.length,
        revenueThisMonth,
        revenueLastMonth
      })

      // Use already fetched data (no additional queries needed)
      setUpcomingTasks(upcomingTasksRes.data || [])
      setRecentDeals(recentDealsRes.data || [])

      // Load real chart data asynchronously (non-blocking)
      loadChartData()
      // Load real metrics asynchronously (non-blocking)
      loadMetrics()
      
      // Update last refreshed timestamp
      setLastUpdated(new Date())

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
          <div className="p-8 max-w-[1800px] mx-auto">
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      {/* Setup Banner */}
      <SetupBanner onSetupClick={() => setShowSetupPanel(true)} />

      {/* Profile Setup Panel */}
      <ProfileSetupPanel
        isOpen={showSetupPanel}
        onClose={() => setShowSetupPanel(false)}
        onComplete={() => {
          // Reload stats after profile completion
          if (appUser?.tenant_id) {
            loadDashboardData()
          }
        }}
      />

      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 via-white to-indigo-50/20">
        <div className="min-h-full p-6 sm:p-8 lg:p-10 max-w-[1600px] mx-auto pb-24">
          {/* Welcome Header - ENHANCED */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  Welcome back, {appUser?.full_name}! 👋
                </h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Here's your practice overview • {lastUpdated && `Updated ${timeAgo}`}
                </p>
              </div>
              
              {/* NEW: Export & Controls */}
              <div className="flex items-center gap-2">
                <ExportMenu
                  data={{
                    stats: {
                      ...stats,
                      conversionRate: metrics.conversionRate,
                      monthlyGrowth: metrics.monthlyGrowth
                    },
                    revenueData: revenueData,
                    dealsByStage: dealsByStage,
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
                  onClick={() => setShowShortcutsHelp(true)}
                  title="Keyboard shortcuts"
                >
                  ?
                </Button>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button 
                onClick={() => setShowCreateContact(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Contact</span>
                <span className="sm:hidden">New</span>
              </Button>
              
              <Button 
                onClick={() => setShowCreateDeal(true)}
                variant="outline" 
                className="flex-1 sm:flex-none"
              >
                <Target className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Deal</span>
              </Button>
              
              <Button 
                onClick={() => setShowCreateTask(true)}
                variant="outline"
                className="flex-1 sm:flex-none"
              >
                <CheckCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create Task</span>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <EnhancedKPICard
              title="Total Revenue"
              value={formatCurrency(stats.totalRevenue)}
              icon={<DollarSign className="h-5 w-5" />}
              trend={{
                value: stats.revenueLastMonth > 0 
                  ? ((stats.revenueThisMonth - stats.revenueLastMonth) / stats.revenueLastMonth) * 100 
                  : 0,
                period: 'vs. last month'
              }}
              subtitle={`${formatCurrency(stats.revenueThisMonth)} this month`}
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
              subtitle="In pipeline"
              href="/pipeline"
              color="blue"
              onRefresh={loadDashboardData}
              lastUpdated={timeAgo}
              tooltip="All deals across all pipeline stages"
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
              tooltip="All contacts including active patients and leads"
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

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <WidgetErrorBoundary widgetName="Revenue Chart">
              <RevenueChart data={revenueData} />
            </WidgetErrorBoundary>
            <WidgetErrorBoundary widgetName="Deals Funnel">
              <DealsFunnelChart data={dealsByStage} />
            </WidgetErrorBoundary>
          </div>

          {/* Bottom Section - Clean 3-Column Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-indigo-600" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentDeals.length > 0 ? (
                      recentDeals.map((deal, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                              <Target className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{deal.title || 'Untitled Deal'}</p>
                              <p className="text-sm text-gray-500">{formatCurrency(deal.value_estimate_cents || 0)}</p>
                            </div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(deal.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>No recent activity</p>
                        <Link href="/pipeline">
                          <Button variant="outline" size="sm" className="mt-2">
                            Create your first deal
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming Tasks & Quick Insights - CLEAN COLUMN */}
            <div className="space-y-6">
              {/* Upcoming Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-orange-600" />
                    Upcoming Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {upcomingTasks.length > 0 ? (
                      upcomingTasks.map((task, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <CheckCircle className="h-4 w-4 text-orange-600 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                            {task.due_at && (
                              <p className="text-xs text-gray-500">
                                Due {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <CheckCircle className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No pending tasks</p>
                        <Link href="/tasks">
                          <Button variant="outline" size="sm" className="mt-3">
                            Create task
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-purple-600" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {metricsLoading ? (
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Conversion Rate</span>
                        <span className={`text-lg font-bold ${metrics.conversionRate > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {metrics.conversionRate > 0 ? `${metrics.conversionRate}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-sm font-medium text-gray-700">Avg. Deal Value</span>
                        <span className={`text-lg font-bold ${metrics.averageDealValue > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {metrics.averageDealValue > 0 ? formatCurrency(metrics.averageDealValue) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-sm font-medium text-gray-700">Monthly Growth</span>
                        <span className={`text-lg font-bold ${
                          metrics.monthlyGrowth > 0 ? 'text-green-600' : 
                          metrics.monthlyGrowth < 0 ? 'text-red-600' : 
                          'text-gray-400'
                        }`}>
                          {metrics.monthlyGrowth !== 0 
                            ? `${metrics.monthlyGrowth > 0 ? '+' : ''}${metrics.monthlyGrowth}%` 
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Bottom Spacer for Clean Finish */}
          <div className="h-8"></div>
        </div>
      </div>

      {/* Create Contact Slide-Over */}
      <CreateContactSlideOver
        open={showCreateContact}
        onClose={() => setShowCreateContact(false)}
        onContactCreated={() => {
          loadDashboardData()
        }}
      />

      {/* Create Task Slide-Over */}
      <CreateTaskSlideOver
        open={showCreateTask}
        onClose={() => setShowCreateTask(false)}
        onTaskCreated={() => {
          loadDashboardData()
        }}
      />

      {/* Create Deal Slide-Over */}
      <CreateDealSlideOver
        open={showCreateDeal}
        onClose={() => setShowCreateDeal(false)}
        onDealCreated={() => {
          loadDashboardData()
        }}
      />

      {/* Keyboard Shortcuts Help Modal - NEW! */}
      <KeyboardShortcutsModal
        open={showShortcutsHelp}
        onClose={() => setShowShortcutsHelp(false)}
      />
    </DashboardLayout>
  )
}