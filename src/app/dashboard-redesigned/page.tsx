'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  Sparkles
} from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils/formatters'
import { createClient } from '@/lib/supabase-client'
import { getDashboardMetrics } from '@/lib/dashboard-analytics'

// Components
import { SetupBanner } from '@/components/onboarding/setup-banner'
import { ProfileSetupPanel } from '@/components/onboarding/profile-setup-panel'
import { EmailVerificationBanner } from '@/components/onboarding/email-verification-banner'
import { CreateContactSlideOver } from '@/components/contacts/create-contact-slide-over'
import { CreateTaskSlideOver } from '@/components/tasks/create-task-slide-over'
import { CreateDealSlideOver } from '@/components/deals/create-deal-slide-over'
import { TodaysPriorities } from '@/components/dashboard/todays-priorities'
import { AIInsightsWidget } from '@/components/dashboard/ai-insights-widget'
import { KeyboardShortcutsModal } from '@/components/dashboard/keyboard-shortcuts-modal'
import { ExportMenu } from '@/components/dashboard/export-menu'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useDataFreshness } from '@/hooks/use-data-freshness'
import { useDashboardRealtime } from '@/lib/realtime-service'

export default function DashboardRedesigned() {
  const router = useRouter()
  const { appUser, loading: authLoading } = useAuth()
  
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

  // Real-time & Shortcuts
  useDashboardRealtime(appUser?.tenant_id, () => loadData(), true)
  useKeyboardShortcuts({
    onCreateContact: () => setShowCreateContact(true),
    onCreateDeal: () => setShowCreateDeal(true),
    onCreateTask: () => setShowCreateTask(true),
    onRefresh: () => loadData(),
    onShowHelp: () => setShowShortcutsHelp(true),
    onNavigate: (path) => router.push(path),
    enabled: true
  })

  useEffect(() => {
    if (appUser?.tenant_id) loadData()
  }, [appUser])

  const loadData = async () => {
    if (!appUser?.tenant_id) return
    
    const supabase = createClient()
    const tenantId = appUser.tenant_id

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

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
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
      <SetupBanner onSetupClick={() => setShowSetupPanel(true)} />
      <ProfileSetupPanel
        isOpen={showSetupPanel}
        onClose={() => setShowSetupPanel(false)}
        onComplete={loadData}
      />

      {/* CLEAN, MODERN LAYOUT */}
      <div className="h-full overflow-y-auto bg-white">
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8 pb-32">
          
          {/* HEADER - Minimal & Clean */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">
                Welcome back, {appUser?.full_name?.split(' ')[0]}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                {lastUpdated && ` • Updated ${timeAgo}`}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
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
                className="gap-2"
              >
                <HelpCircle className="h-4 w-4" />
                <span className="hidden sm:inline">Help</span>
              </Button>
            </div>
          </div>

          {/* QUICK ACTIONS - Prominent */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => setShowCreateContact(true)}
              className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Contact
            </Button>
            <Button
              onClick={() => setShowCreateDeal(true)}
              variant="outline"
              className="shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Deal
            </Button>
            <Button
              onClick={() => setShowCreateTask(true)}
              variant="outline"
              className="shadow-sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>

          {/* KPI CARDS - Clean, Minimal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Revenue */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <DollarSign className="h-5 w-5 text-gray-400" />
                  {revenueTrend.change !== 0 && (
                    <div className={`flex items-center gap-1 ${revenueTrend.color}`}>
                      <revenueTrend.icon className="h-4 w-4" />
                      <span className="text-xs font-semibold">
                        {revenueTrend.change > 0 ? '+' : ''}{revenueTrend.change.toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-sm text-gray-500 mt-1">Total Revenue</p>
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.totalContacts}
                </div>
                <p className="text-sm text-gray-500 mt-1">Contacts</p>
              </CardContent>
            </Card>

            {/* Deals */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Target className="h-5 w-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.totalDeals}
                </div>
                <p className="text-sm text-gray-500 mt-1">Active Deals</p>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle className="h-5 w-5 text-gray-400" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {stats.activeTasks}
                </div>
                <p className="text-sm text-gray-500 mt-1">Tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* PRIORITIES - Clean & Focused */}
          <TodaysPriorities tenantId={appUser?.tenant_id || ''} onRefresh={loadData} />

          {/* AI INSIGHTS - Collapsible */}
          <AIInsightsWidget tenantId={appUser?.tenant_id || ''} />

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
    </DashboardLayout>
  )
}

