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

export default function DashboardPage() {
  const { appUser, loading: authLoading } = useAuth()
  const [showSetupPanel, setShowSetupPanel] = useState(false)
  const [showCreateContact, setShowCreateContact] = useState(false)
  const [showCreateTask, setShowCreateTask] = useState(false)
  const [showCreateDeal, setShowCreateDeal] = useState(false)
  const [stats, setStats] = useState({
    totalDeals: 0,
    totalRevenue: 0,
    totalContacts: 0,
    activeTasks: 0,
    dealsThisMonth: 0,
    revenueThisMonth: 0
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

      const dealsThisMonth = deals.filter(d => new Date(d.created_at) >= thisMonth)
      const totalRevenue = deals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)
      const revenueThisMonth = dealsThisMonth.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0)

      setStats({
        totalDeals: deals.length,
        totalRevenue,
        totalContacts: contactsRes.count || 0,
        activeTasks: tasksRes.count || 0,
        dealsThisMonth: dealsThisMonth.length,
        revenueThisMonth
      })

      // Use already fetched data (no additional queries needed)
      setUpcomingTasks(upcomingTasksRes.data || [])
      setRecentDeals(recentDealsRes.data || [])

      // Load real chart data asynchronously (non-blocking)
      loadChartData()
      // Load real metrics asynchronously (non-blocking)
      loadMetrics()

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

      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1800px] mx-auto animate-in fade-in slide-in-from-bottom duration-500">
          {/* Welcome Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Welcome back, {appUser?.full_name}! 👋
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">Here's what's happening with your practice today</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowCreateContact(true)
                }}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1 sm:flex-none"
                type="button"
              >
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Contact</span>
                <span className="sm:hidden">New</span>
              </Button>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowCreateDeal(true)
                }}
                variant="outline" 
                className="flex-1 sm:flex-none"
                type="button"
              >
                <Target className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Deal</span>
              </Button>
              
              <Button 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowCreateTask(true)
                }}
                variant="outline"
                className="flex-1 sm:flex-none"
                type="button"
              >
                <CheckCircle className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Create Task</span>
              </Button>
              
              <Link href="/marketing/campaigns/create">
                <Button variant="outline">
                  <Mail className="h-4 w-4 mr-2" />
                  Start Campaign
                </Button>
              </Link>
            </div>
          </div>

          {/* KPI Cards - Enhanced with Clickable Links */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Link href="/pipeline">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-green-500 hover:border-l-green-600 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-700">{formatCurrency(stats.totalRevenue)}</div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-green-600" />
                    {formatCurrency(stats.revenueThisMonth)} this month
                  </p>
                  <p className="text-xs text-green-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to view pipeline →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/pipeline">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-blue-500 hover:border-l-blue-600 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Deals</CardTitle>
                  <Target className="h-5 w-5 text-blue-600 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-700">{stats.totalDeals}</div>
                  <p className="text-sm text-gray-600 mt-1 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1 text-blue-600" />
                    +{stats.dealsThisMonth} this month
                  </p>
                  <p className="text-xs text-blue-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to manage deals →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/contacts">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-purple-500 hover:border-l-purple-600 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
                  <Users className="h-5 w-5 text-purple-600 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-purple-700">{stats.totalContacts}</div>
                  <p className="text-sm text-gray-600 mt-1">Active patients & leads</p>
                  <p className="text-xs text-purple-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to view contacts →</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/tasks">
              <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer border-l-4 border-l-orange-500 hover:border-l-orange-600 group">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Active Tasks</CardTitle>
                  <CheckCircle className="h-5 w-5 text-orange-600 group-hover:scale-110 transition-transform" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-700">{stats.activeTasks}</div>
                  <p className="text-sm text-gray-600 mt-1">Need attention</p>
                  <p className="text-xs text-orange-600 mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity">Click to manage tasks →</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <RevenueChart data={revenueData} />
            <DealsFunnelChart data={dealsByStage} />
          </div>

          {/* Main Content Grid */}
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

            {/* Upcoming Tasks */}
            <div>
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
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <CheckCircle className="h-4 w-4 text-orange-600 mr-2" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{task.title}</p>
                              {task.due_at && (
                                <p className="text-xs text-gray-500">
                                  Due {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500">
                        <CheckCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No pending tasks</p>
                        <Link href="/tasks">
                          <Button variant="outline" size="sm" className="mt-2">
                            Create task
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="mt-6">
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
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Conversion Rate</span>
                        <span className={`font-semibold ${metrics.conversionRate > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                          {metrics.conversionRate > 0 ? `${metrics.conversionRate}%` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Avg. Deal Value</span>
                        <span className={`font-semibold ${metrics.averageDealValue > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                          {metrics.averageDealValue > 0 ? formatCurrency(metrics.averageDealValue) : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Monthly Growth</span>
                        <span className={`font-semibold ${
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
    </DashboardLayout>
  )
}