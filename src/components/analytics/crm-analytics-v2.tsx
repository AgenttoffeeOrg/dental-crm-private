'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { ExportButton } from '@/components/ui/export-button'
import { 
  Users,
  DollarSign,
  Target,
  Clock,
  Award,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  Table as TableIcon,
  LineChart as LineChartIcon
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { type ColumnDef } from '@tanstack/react-table'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  ScatterChart,
  Scatter
} from 'recharts'

// Types
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
  source: string
}

interface SalesPerformance {
  user_name: string
  total_deals: number
  deals_won: number
  deals_lost: number
  total_revenue_cents: number
  win_rate: number
  avg_deal_size_cents: number
  avg_days_to_close: number
}

interface PipelineStage {
  pipeline_name: string
  stage_name: string
  deal_count: number
  total_value_cents: number
  avg_time_in_stage_days: number
  conversion_rate: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']

export function CRMAnalyticsV2({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'overview' | 'table' | 'performance' | 'pipeline' | 'forecasting'>('overview')
  const [deals, setDeals] = useState<Deal[]>([])
  const [salesPerformance, setSalesPerformance] = useState<SalesPerformance[]>([])
  const [pipelineMetrics, setPipelineMetrics] = useState<PipelineStage[]>([])
  const [atRiskDeals, setAtRiskDeals] = useState<Deal[]>([])

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadDeals(),
      loadSalesPerformance(),
      loadPipelineMetrics(),
      loadAtRiskDeals()
    ])
    setLoading(false)
  }

  const loadDeals = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select(`
          id,
          title,
          value_estimate_cents,
          source,
          created_at,
          updated_at,
          stage:pipeline_stages(name),
          contact:contacts(full_name),
          owner:app_users(full_name)
        `)
        .eq('tenant_id', tenantId)
        .order('value_estimate_cents', { ascending: false })
        .limit(100)

      if (!data) return

      const deals: Deal[] = data.map((d: any) => ({
        id: d.id,
        name: d.title,
        value_estimate_cents: d.value_estimate_cents || 0,
        stage_name: d.stage?.name || 'Unknown',
        contact_name: d.contact?.full_name || 'Unknown',
        owner_name: d.owner?.full_name || 'Unassigned',
        created_at: d.created_at,
        updated_at: d.updated_at,
        days_in_pipeline: Math.floor(
          (new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
        source: d.source || 'Unknown'
      }))

      setDeals(deals)
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading deals:', error)
    }
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

      setSalesPerformance(data.map((p: any) => ({
        user_name: p.user_name || 'Unknown',
        total_deals: p.total_deals || 0,
        deals_won: p.deals_won || 0,
        deals_lost: p.deals_lost || 0,
        total_revenue_cents: p.total_revenue_cents || 0,
        win_rate: p.win_rate || 0,
        avg_deal_size_cents: p.avg_deal_value_cents || 0,
        avg_days_to_close: Math.round(p.avg_days_to_close || 0)
      })))
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading performance:', error)
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
        .order('avg_days_in_stage', { ascending: false })

      if (!data) return

      setPipelineMetrics(data.map((m: any) => ({
        pipeline_name: m.pipeline_name || 'Unknown',
        stage_name: m.stage_name || 'Unknown',
        deal_count: m.current_deals || 0,
        total_value_cents: m.total_value_cents || 0,
        avg_time_in_stage_days: m.avg_days_in_stage || 0,
        conversion_rate: 0 // Calculate from funnel
      })))
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading pipeline:', error)
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
          title,
          value_estimate_cents,
          created_at,
          updated_at,
          source,
          stage:pipeline_stages(name),
          contact:contacts(full_name),
          owner:app_users(full_name)
        `)
        .eq('tenant_id', tenantId)
        .lt('updated_at', thirtyDaysAgo.toISOString())
        .order('updated_at', { ascending: true })
        .limit(20)

      if (!data) return

      setAtRiskDeals(data.map((d: any) => ({
        id: d.id,
        name: d.title,
        value_estimate_cents: d.value_estimate_cents || 0,
        stage_name: d.stage?.name || 'Unknown',
        contact_name: d.contact?.full_name || 'Unknown',
        owner_name: d.owner?.full_name || 'Unassigned',
        created_at: d.created_at,
        updated_at: d.updated_at,
        days_in_pipeline: Math.floor(
          (new Date().getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24)
        ),
        source: d.source || 'Unknown'
      })))
    } catch (error) {
      console.error('[CRM ANALYTICS] Error loading at-risk deals:', error)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(cents / 100)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Define table columns
  const dealColumns: ColumnDef<Deal>[] = [
    {
      accessorKey: 'name',
      header: 'Deal Name',
      cell: ({ row }) => (
        <div className="font-medium text-gray-900">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'contact_name',
      header: 'Contact',
    },
    {
      accessorKey: 'owner_name',
      header: 'Owner',
    },
    {
      accessorKey: 'stage_name',
      header: 'Stage',
      cell: ({ row }) => (
        <Badge variant="outline">{row.original.stage_name}</Badge>
      ),
    },
    {
      accessorKey: 'value_estimate_cents',
      header: 'Value',
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.value_estimate_cents)}</span>
      ),
    },
    {
      accessorKey: 'days_in_pipeline',
      header: 'Age',
      cell: ({ row }) => `${row.original.days_in_pipeline}d`,
    },
    {
      accessorKey: 'source',
      header: 'Source',
    },
  ]

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
  const totalPipelineValue = deals.reduce((sum, d) => sum + d.value_estimate_cents, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">CRM Sales Analytics</h2>
          <p className="text-sm text-gray-600">Deep dive into sales performance and pipeline health</p>
        </div>
        <ExportButton
          data={viewMode === 'table' ? deals : salesPerformance}
          filename={`crm-${viewMode}`}
          title="CRM Analytics"
        />
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={viewMode === 'overview' ? 'default' : 'outline'}
          onClick={() => setViewMode('overview')}
          size="sm"
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Overview
        </Button>
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          onClick={() => setViewMode('table')}
          size="sm"
        >
          <TableIcon className="h-4 w-4 mr-2" />
          Deals Table
        </Button>
        <Button
          variant={viewMode === 'performance' ? 'default' : 'outline'}
          onClick={() => setViewMode('performance')}
          size="sm"
        >
          <Award className="h-4 w-4 mr-2" />
          Performance
        </Button>
        <Button
          variant={viewMode === 'pipeline' ? 'default' : 'outline'}
          onClick={() => setViewMode('pipeline')}
          size="sm"
        >
          <Target className="h-4 w-4 mr-2" />
          Pipeline
        </Button>
        <Button
          variant={viewMode === 'forecasting' ? 'default' : 'outline'}
          onClick={() => setViewMode('forecasting')}
          size="sm"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Forecasting
        </Button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(totalRevenue)}
              icon={DollarSign}
              iconColor="text-green-600"
              context={`${totalWon} deals closed`}
            />
            <MetricCard
              title="Win Rate"
              value={`${avgWinRate.toFixed(1)}%`}
              icon={Target}
              iconColor="text-blue-600"
              context={`${totalWon} won / ${totalDeals} total`}
            />
            <MetricCard
              title="Avg Deal Size"
              value={formatCurrency(avgDealSize)}
              icon={Award}
              iconColor="text-purple-600"
              context="Per closed deal"
            />
            <MetricCard
              title="Pipeline Value"
              value={formatCurrency(totalPipelineValue)}
              icon={BarChart3}
              iconColor="text-orange-600"
              context={`${deals.length} active deals`}
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Sales Rep Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Sales Rep</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="user_name" 
                      stroke="#6b7280" 
                      fontSize={11} 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar 
                      dataKey="total_revenue_cents" 
                      fill="#667eea" 
                      name="Revenue" 
                      radius={[8, 8, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Win Rate by Rep */}
            <Card>
              <CardHeader>
                <CardTitle>Win Rate Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesPerformance.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="user_name" 
                      stroke="#6b7280" 
                      fontSize={11} 
                      angle={-45} 
                      textAnchor="end" 
                      height={100} 
                    />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => `${value.toFixed(1)}%`}
                    />
                    <Bar 
                      dataKey="win_rate" 
                      fill="#43e97b" 
                      name="Win Rate (%)" 
                      radius={[8, 8, 0, 0]} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Deals */}
          {atRiskDeals.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  At-Risk Deals (No Activity 30+ Days)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Deal</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Contact</th>
                        <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Owner</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Value</th>
                        <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Days Inactive</th>
                      </tr>
                    </thead>
                    <tbody>
                      {atRiskDeals.slice(0, 10).map((deal) => {
                        const daysInactive = Math.floor(
                          (new Date().getTime() - new Date(deal.updated_at).getTime()) / (1000 * 60 * 60 * 24)
                        )
                        return (
                          <tr key={deal.id} className="border-b border-gray-100 hover:bg-red-50">
                            <td className="py-3 px-4 font-medium text-gray-900">{deal.name}</td>
                            <td className="py-3 px-4 text-gray-700">{deal.contact_name}</td>
                            <td className="py-3 px-4 text-gray-700">{deal.owner_name}</td>
                            <td className="text-right py-3 px-4 font-semibold">
                              {formatCurrency(deal.value_estimate_cents)}
                            </td>
                            <td className="text-right py-3 px-4">
                              <Badge variant="destructive">{daysInactive} days</Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Table Mode */}
      {viewMode === 'table' && (
        <Card>
          <CardHeader>
            <CardTitle>All Deals</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={dealColumns}
              data={deals}
              searchPlaceholder="Search deals..."
              enableExport={true}
              exportFilename="deals-export"
            />
          </CardContent>
        </Card>
      )}

      {/* Performance Mode */}
      {viewMode === 'performance' && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Rep Leaderboard</CardTitle>
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
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Deal</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Close Time</th>
                  </tr>
                </thead>
                <tbody>
                  {salesPerformance.map((rep, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {index < 3 ? (
                          <Badge className={`${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 'bg-amber-600'
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
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(rep.total_revenue_cents)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {formatCurrency(rep.avg_deal_size_cents)}
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {rep.avg_days_to_close} days
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pipeline Mode */}
      {viewMode === 'pipeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Pipeline Stage Performance & Bottleneck Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Pipeline</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Stage</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deals</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Value</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Avg Time</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineMetrics.map((metric, index) => {
                    const isBottleneck = metric.avg_time_in_stage_days > 30
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-700">{metric.pipeline_name}</td>
                        <td className="py-3 px-4 font-medium text-gray-900">{metric.stage_name}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{metric.deal_count}</td>
                        <td className="text-right py-3 px-4 font-semibold">
                          {formatCurrency(metric.total_value_cents)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <Badge variant={isBottleneck ? 'destructive' : 'secondary'}>
                            {Math.round(metric.avg_time_in_stage_days)} days
                          </Badge>
                        </td>
                        <td className="text-center py-3 px-4">
                          {isBottleneck ? (
                            <Badge variant="destructive" className="gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Bottleneck
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              Healthy
                            </Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Forecasting Mode */}
      {viewMode === 'forecasting' && (
        <div className="space-y-6">
          <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <CardContent className="p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-8 w-8 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Revenue Forecast</h3>
                  <p className="text-gray-600">Based on current pipeline and historical win rates</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-6 border-2 border-gray-200">
                  <div className="text-sm font-medium text-gray-600 mb-2">Closed Won</div>
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {formatCurrency(totalRevenue)}
                  </div>
                  <div className="text-xs text-gray-500">Actual revenue (100% probability)</div>
                </div>

                <div className="bg-white rounded-lg p-6 border-2 border-purple-200">
                  <div className="text-sm font-medium text-gray-600 mb-2">Weighted Pipeline</div>
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {formatCurrency(totalPipelineValue * (avgWinRate / 100))}
                  </div>
                  <div className="text-xs text-gray-500">Expected close ({avgWinRate.toFixed(0)}% win rate)</div>
                </div>

                <div className="bg-white rounded-lg p-6 border-2 border-blue-200">
                  <div className="text-sm font-medium text-gray-600 mb-2">Total Forecast</div>
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {formatCurrency(totalRevenue + (totalPipelineValue * (avgWinRate / 100)))}
                  </div>
                  <div className="text-xs text-gray-500">Closed + Expected pipeline</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Deal Win Probability */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Win Probability (Top Opportunities)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {deals.slice(0, 10).map((deal) => {
                  // Simple probability based on stage and age
                  const baseProbability = deal.stage_name.toLowerCase().includes('proposal') ? 70 :
                                         deal.stage_name.toLowerCase().includes('negotiation') ? 85 :
                                         deal.stage_name.toLowerCase().includes('qualified') ? 50 : 30
                  const ageFactor = deal.days_in_pipeline > 60 ? -15 : deal.days_in_pipeline > 30 ? -5 : 0
                  const probability = Math.max(10, Math.min(95, baseProbability + ageFactor))

                  return (
                    <div key={deal.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{deal.name}</div>
                        <div className="text-sm text-gray-600">{deal.contact_name} • {deal.stage_name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{formatCurrency(deal.value_estimate_cents)}</div>
                        <div className="text-xs text-gray-500">{deal.days_in_pipeline} days old</div>
                      </div>
                      <div className="w-32">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                probability >= 70 ? 'bg-green-500' :
                                probability >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${probability}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-900 w-12 text-right">
                            {probability}%
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}


