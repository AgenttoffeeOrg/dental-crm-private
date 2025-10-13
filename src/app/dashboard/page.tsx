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
        supabase.from('tasks').select('id').eq('tenant_id', tenantId).neq('status', 'completed')
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
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .neq('status', 'completed')
        .order('due_at', { ascending: true })
        .limit(5)

      setUpcomingTasks(tasks || [])

      // Load recent deals
      const { data: recentDealsData } = await supabase
        .from('deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)

      setRecentDeals(recentDealsData || [])

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
            </div>
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

          {/* Quick Actions */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3">
              <Link href="/contacts/new">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </Link>
              <Link href="/pipeline">
                <Button variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  New Deal
                </Button>
              </Link>
              <Link href="/tasks/new">
                <Button variant="outline">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Create Task
                </Button>
              </Link>
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
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Conversion Rate</span>
                      <span className="font-semibold text-green-600">24.5%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Deal Value</span>
                      <span className="font-semibold text-blue-600">{formatCurrency(stats.totalRevenue / Math.max(stats.totalDeals, 1))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Monthly Growth</span>
                      <span className="font-semibold text-purple-600">+12.3%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}