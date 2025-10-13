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
  ArrowRight
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { formatCurrency } from '@/lib/utils/formatters'
import { SkeletonCard } from '@/components/ui/skeleton-loader'
import { QuickActionsWidget } from '@/components/ui/quick-actions-widget'
import { ActivityFeedWidget } from '@/components/ui/activity-feed-widget'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

export default function DashboardPage() {
  const { appUser, loading: authLoading } = useAuth()
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (appUser?.tenant_id) {
      loadDashboardData()
    }
  }, [appUser])

  const loadDashboardData = async () => {
    const supabase = createClient()
    const tenantId = appUser?.tenant_id

    try {
      // Load stats
      const [dealsRes, contactsRes, tasksRes] = await Promise.all([
        supabase.from('deals').select('value_estimate_cents, created_at').eq('tenant_id', tenantId),
        supabase.from('contacts').select('id').eq('tenant_id', tenantId),
        supabase.from('tasks').select('id').eq('tenant_id', tenantId).neq('status', 'done')
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
        totalContacts: contactsRes.data?.length || 0,
        activeTasks: tasksRes.data?.length || 0,
        dealsThisMonth: dealsThisMonth.length,
        revenueThisMonth
      })

      // Load upcoming tasks
      const { data: tasks } = await supabase
        .from('tasks_with_associations')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'done')
        .order('due_at', { ascending: true })
        .limit(5)

      setUpcomingTasks(tasks || [])

      // Load recent deals
      const { data: recentDealsData } = await supabase
        .from('deals_with_contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentDeals(recentDealsData || [])

    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-indigo-50/30">
        <div className="p-8 max-w-[1800px] mx-auto">
          {/* Welcome Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {appUser?.full_name}! 👋
            </h1>
            <p className="text-gray-600 mt-1">Here's what's happening with your practice today</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
                <p className="text-sm text-gray-600 mt-1">
                  {formatCurrency(stats.revenueThisMonth)} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Deals</CardTitle>
                <Target className="h-5 w-5 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalDeals}</div>
                <p className="text-sm text-gray-600 mt-1">
                  +{stats.dealsThisMonth} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Contacts</CardTitle>
                <Users className="h-5 w-5 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.totalContacts}</div>
                <p className="text-sm text-gray-600 mt-1">Active patients & leads</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Active Tasks</CardTitle>
                <CheckCircle className="h-5 w-5 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats.activeTasks}</div>
                <p className="text-sm text-gray-600 mt-1">Need your attention</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Upcoming Tasks */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-indigo-600" />
                      Upcoming Tasks
                    </CardTitle>
                    <Link href="/tasks">
                      <Button variant="ghost" size="sm">
                        View All
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {upcomingTasks.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No upcoming tasks
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingTasks.map(task => (
                        <div key={task.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{task.title}</p>
                            {task.contact_name && (
                              <p className="text-sm text-gray-600">For: {task.contact_name}</p>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {task.due_at && formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Deals */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Recent Deals
                    </CardTitle>
                    <Link href="/pipeline">
                      <Button variant="ghost" size="sm">
                        View Pipeline
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentDeals.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No recent deals
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentDeals.map(deal => (
                        <div key={deal.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                          <div>
                            <p className="font-medium">{deal.title}</p>
                            {deal.contact_name && (
                              <p className="text-sm text-gray-600">{deal.contact_name}</p>
                            )}
                          </div>
                          <div className="text-right">
                            {deal.value_estimate_cents && (
                              <p className="font-semibold text-green-600">
                                {formatCurrency(deal.value_estimate_cents)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">{deal.stage_name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Widgets */}
            <div className="space-y-6">
              <QuickActionsWidget />
              <ActivityFeedWidget />
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

