'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  Award,
  Filter,
  Download,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts'

interface SalesPerformance {
  user_id: string
  user_name: string
  total_deals: number
  deals_won: number
  deals_lost: number
  total_revenue_cents: number
  win_rate: number
  avg_deal_size_cents: number
  avg_days_to_close: number
}

interface PipelineMetrics {
  pipeline_name: string
  stage_name: string
  deal_count: number
  total_value_cents: number
  avg_time_in_stage_days: number
}

interface Deal {
  id: string
  name: string
  value_estimate_cents: number
  stage_name: string
  contact_name: string
  owner_name: string
  created_at: string
  updated_at: string
  days_in_pipeline: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#c471ed']

export function CRMAnalyticsDashboard({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [salesPerformance, setSalesPerformance] = useState<SalesPerformance[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineMetrics[]>([])
  const [topDeals, setTopDeals] = useState<Deal[]>([])
  const [atRiskDeals, setAtRiskDeals] = useState<Deal[]>([])
  const [selectedView, setSelectedView] = useState<'overview' | 'reps' | 'pipeline' | 'deals'>('overview')

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadSalesPerformance(),
      loadPipelineMetrics(),
      loadTopDeals(),
      loadAtRiskDeals()
    ])
    setLoading(false)
  }

  const loadSalesPerformance = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('crm_sales_performance_by_user')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_revenue_cents', { ascending: false })

      if (!data) return

      const performance: SalesPerformance[] = data.map((p: any) => ({
        user_id: p.user_id,
        user_name: p.user_name || 'Unknown User',
        total_deals: p.total_deals || 0,
        deals_won: p.deals_won || 0,
        deals_lost: p.deals_lost || 0,
        total_revenue_cents: p.total_revenue_cents || 0,
        win_rate: p.win_rate || 0,
        avg_deal_size_cents: p.avg_deal_size_cents || 0,
        avg_days_to_close: p.avg_days_to_close || 0
      }))

      setSalesPerformance(performance)
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading sales performance:', error)
    }
  }

  const loadPipelineMetrics = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('crm_pipeline_stage_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('avg_time_in_stage_days', { ascending: false })

      if (!data) return

      const metrics: PipelineMetrics[] = data.map((m: any) => ({
        pipeline_name: m.pipeline_name || 'Unknown Pipeline',
        stage_name: m.stage_name || 'Unknown Stage',
        deal_count: m.deal_count || 0,
        total_value_cents: m.total_value_cents || 0,
        avg_time_in_stage_days: m.avg_time_in_stage_days || 0
      }))

      setPipelineMetrics(metrics)
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading pipeline metrics:', error)
    }
  }

  const loadTopDeals = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select(`
          id,
          name,
          value_estimate_cents,
          created_at,
          updated_at,
          stage:pipeline_stages(name),
          contact:contacts(full_name),
          owner:app_users(full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('value_estimate_cents', { ascending: false })
        .limit(10)

      if (!data) return

      const deals: Deal[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        value_estimate_cents: d.value_estimate_cents || 0,
        stage_name: d.stage?.name || 'Unknown',
        contact_name: d.contact?.full_name || 'Unknown',
        owner_name: d.owner?.full_name || 'Unassigned',
        created_at: d.created_at,
        updated_at: d.updated_at,
        days_in_pipeline: Math.floor(
          (new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      }))

      setTopDeals(deals)
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading top deals:', error)
    }
  }

  const loadAtRiskDeals = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data } = await supabase
        .from('deals')
        .select(`
          id,
          name,
          value_estimate_cents,
          created_at,
          updated_at,
          stage:pipeline_stages(name),
          contact:contacts(full_name),
          owner:app_users(full_name)
        `)
        .eq('tenant_id', tenantId)
        .lt('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(10)

      if (!data) return

      const deals: Deal[] = data.map((d: any) => ({
        id: d.id,
        name: d.name,
        value_estimate_cents: d.value_estimate_cents || 0,
        stage_name: d.stage?.name || 'Unknown',
        contact_name: d.contact?.full_name || 'Unknown',
        owner_name: d.owner?.full_name || 'Unassigned',
        created_at: d.created_at,
        updated_at: d.updated_at,
        days_in_pipeline: Math.floor(
          (new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        )
      }))

      setAtRiskDeals(deals)
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading at-risk deals:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading CRM analytics...</p>
        </div>
      </div>
    )
  }

  const totalRevenue = salesPerformance.reduce((sum, p) => sum + p.total_revenue_cents, 0)
  const totalDeals = salesPerformance.reduce((sum, p) => sum + p.total_deals, 0)
  const totalWon = salesPerformance.reduce((sum, p) => sum + p.deals_won, 0)
  const avgWinRate = totalDeals > 0 ? (totalWon / totalDeals) * 100 : 0
  const avgDealSize = totalWon > 0 ? totalRevenue / totalWon : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CRM Sales Analytics</h2>
          <p className="text-sm text-gray-600">Deep dive into sales performance and pipeline health</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export CRM Report
        </Button>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={selectedView === 'overview' ? 'default' : 'outline'}
          onClick={() => setSelectedView('overview')}
        >
          Overview
        </Button>
        <Button
          variant={selectedView === 'reps' ? 'default' : 'outline'}
          onClick={() => setSelectedView('reps')}
        >
          Sales Reps
        </Button>
        <Button
          variant={selectedView === 'pipeline' ? 'default' : 'outline'}
          onClick={() => setSelectedView('pipeline')}
        >
          Pipeline
        </Button>
        <Button
          variant={selectedView === 'deals' ? 'default' : 'outline'}
          onClick={() => setSelectedView('deals')}
        >
          Deals
        </Button>
      </div>

      {/* Overview Tab */}
      {selectedView === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
                <p className="text-xs text-gray-500 mt-2">{totalWon} deals closed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Win Rate</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{avgWinRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500 mt-2">{totalWon} won / {totalDeals} total</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Award className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgDealSize)}</p>
                <p className="text-xs text-gray-500 mt-2">Per closed deal</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Avg Close Time</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {salesPerformance.length > 0
                    ? Math.round(
                        salesPerformance.reduce((sum, p) => sum + p.avg_days_to_close, 0) /
                          salesPerformance.length
                      )
                    : 0}
                  d
                </p>
                <p className="text-xs text-gray-500 mt-2">Days to close</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Sales Rep Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Sales Rep Performance Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="user_name" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value * 100)}
                    />
                    <Legend />
                    <Bar dataKey="total_revenue_cents" fill="#667eea" name="Revenue" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Win Rate by Rep */}
            <Card>
              <CardHeader>
                <CardTitle>Win Rate by Sales Rep</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="user_name" stroke="#6b7280" fontSize={11} angle={-45} textAnchor="end" height={80} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                    <Legend />
                    <Bar dataKey="win_rate" fill="#43e97b" name="Win Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Deals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-red-600" />
                At-Risk Deals (No Activity in 30+ Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Deal Name</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Owner</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Value</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stage</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Days Inactive</th>
                    </tr>
                  </thead>
                  <tbody>
                    {atRiskDeals.map((deal) => {
                      const daysInactive = Math.floor(
                        (new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                      )
                      return (
                        <tr key={deal.id} className="border-b border-gray-100 hover:bg-red-50">
                          <td className="py-3 px-4 font-medium text-gray-900">{deal.name}</td>
                          <td className="py-3 px-4 text-gray-700">{deal.contact_name}</td>
                          <td className="py-3 px-4 text-gray-700">{deal.owner_name}</td>
                          <td className="text-right py-3 px-4 font-semibold text-gray-900">
                            {formatCurrency(deal.value_estimate_cents)}
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline">{deal.stage_name}</Badge>
                          </td>
                          <td className="text-right py-3 px-4">
                            <Badge variant="secondary" className="bg-red-100 text-red-700">
                              {daysInactive} days
                            </Badge>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sales Reps Tab */}
      {selectedView === 'reps' && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Rep Performance Leaderboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Sales Rep</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Deals</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Won</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Lost</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Win Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Deal Size</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Close Time</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPerformance.map((rep, index) => (
                    <tr key={rep.user_id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {index < 3 ? (
                          <Badge className={`${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                          }`}>
                            #{index + 1}
                          </Badge>
                        ) : (
                          <span className="text-gray-600">#{index + 1}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">{rep.user_name}</td>
                      <td className="text-right py-3 px-4 text-gray-700">{rep.total_deals}</td>
                      <td className="text-right py-3 px-4 text-green-600 font-semibold">{rep.deals_won}</td>
                      <td className="text-right py-3 px-4 text-red-600">{rep.deals_lost}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{rep.win_rate.toFixed(1)}%</Badge>
                      </td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        {formatCurrency(rep.total_revenue_cents)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {formatCurrency(rep.avg_deal_size_cents)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {Math.round(rep.avg_days_to_close)} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Tab */}
      {selectedView === 'pipeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pipeline</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stage</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deal Count</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Total Value</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Time in Stage</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineMetrics.map((metric, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-700">{metric.pipeline_name}</td>
                      <td className="py-3 px-4 font-medium text-gray-900">{metric.stage_name}</td>
                      <td className="text-right py-3 px-4 text-gray-700">{metric.deal_count}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        {formatCurrency(metric.total_value_cents)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">
                          {Math.round(metric.avg_time_in_stage_days)} days
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Deals Tab */}
      {selectedView === 'deals' && (
        <Card>
          <CardHeader>
            <CardTitle>Top Deals by Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Deal Name</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Owner</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Value</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stage</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Age</th>
                  </tr>
                </thead>
                <tbody>
                  {topDeals.map((deal) => (
                    <tr key={deal.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">{deal.name}</td>
                      <td className="py-3 px-4 text-gray-700">{deal.contact_name}</td>
                      <td className="py-3 px-4 text-gray-700">{deal.owner_name}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        {formatCurrency(deal.value_estimate_cents)}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{deal.stage_name}</Badge>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {deal.days_in_pipeline} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
