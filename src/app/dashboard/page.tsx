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
import { AIInsightsWidget } from '@/components/dashboard/ai-insights-widget'
import { KeyboardShortcutsModal } from '@/components/dashboard/keyboard-shortcuts-modal'
import { ExportMenu } from '@/components/dashboard/export-menu'
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts'
import { useDataFreshness } from '@/hooks/use-data-freshness'
import { useDashboardRealtime } from '@/lib/realtime-service'
import { useOrgGuard, OrgRequiredModal } from '@/components/guards'

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
    onRefresh: () => loadData(),
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
        <div className="max-w-[1800px] mx-auto px-4 py-4 space-y-4 pb-24">
          
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

          {/* KPI CARDS - Compact & Efficient */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Revenue */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {format.currency(stats.totalRevenue / 100)}
                    </p>
                    {revenueTrend.change !== 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <revenueTrend.icon className={`h-3 w-3 ${revenueTrend.color}`} />
                        <span className={`text-xs font-medium ${revenueTrend.color}`}>
                          {revenueTrend.change > 0 ? '+' : ''}{revenueTrend.change.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contacts */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/contacts')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Total Contacts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {format.number(stats.totalContacts)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deals */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/deals')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Active {LABELS.DEAL.plural}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {format.number(stats.totalDeals)}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tasks */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push('/tasks')}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Pending Tasks</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {format.number(stats.activeTasks)}
                    </p>
                    {stats.activeTasks > 10 && (
                      <Badge variant="secondary" className="mt-1 text-xs bg-orange-100 text-orange-700 border-orange-200">
                        High
                      </Badge>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* MAIN CONTENT - Side by Side Layout */}
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

