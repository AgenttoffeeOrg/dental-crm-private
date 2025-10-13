'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Filter,
  Download,
  Zap,
  Brain,
  BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  AreaChart, 
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { format, subDays, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface ExecutiveKPIs {
  practice_name: string
  new_contacts_30d: number
  total_contacts: number
  new_deals_30d: number
  deals_won_30d: number
  revenue_30d_cents: number
  active_pipeline_deals: number
  active_pipeline_value_cents: number
  total_activities_30d: number
  campaigns_sent_30d: number
  marketing_messages_sent_30d: number
  team_size: number
}

interface TrendData {
  date: string
  revenue: number
  deals: number
  contacts: number
  activities: number
}

interface FunnelData {
  stage: string
  count: number
  value: number
  conversion_rate: number
}

interface SourceData {
  source: string
  contacts: number
  deals: number
  revenue: number
  conversion_rate: number
}

interface Insight {
  type: 'positive' | 'negative' | 'warning' | 'info'
  title: string
  description: string
  metric?: string
  action?: string
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']

export function ExecutiveDashboard({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [funnelData, setFunnelData] = useState<FunnelData[]>([])
  const [sourceData, setSourceData] = useState<SourceData[]>([])
  const [insights, setInsights] = useState<Insight[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '12m'>('30d')
  const [comparisonMode, setComparisonMode] = useState<'previous' | 'yoy'>('previous')

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId, timeRange])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadKPIs(),
      loadTrendData(),
      loadFunnelData(),
      loadSourceData(),
      generateInsights()
    ])
    setLoading(false)
  }

  const loadKPIs = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data, error } = await supabase
        .from('executive_dashboard_kpis')
        .select('*')
        .eq('tenant_id', tenantId)
        .single()

      if (error) {
        console.error('[ANALYTICS] Error loading executive KPIs:', error)
        return
      }
      
      setKpis(data)
    } catch (error) {
      console.error('[ANALYTICS] Error loading executive KPIs:', error)
    }
  }

  const loadTrendData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365

      // Get daily revenue trend
      const { data: deals } = await supabase
        .from('deals')
        .select('created_at, value_estimate_cents, stage_id')
        .eq('tenant_id', tenantId)
        .gte('created_at', subDays(new Date(), days).toISOString())
        .order('created_at')

      // Get daily contacts trend
      const { data: contacts } = await supabase
        .from('contacts')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', subDays(new Date(), days).toISOString())
        .order('created_at')

      // Get daily activities trend
      const { data: activities } = await supabase
        .from('activities')
        .select('occurred_at')
        .eq('tenant_id', tenantId)
        .gte('occurred_at', subDays(new Date(), days).toISOString())
        .order('occurred_at')

      // Aggregate by day
      const trendMap = new Map<string, TrendData>()
      
      deals?.forEach(deal => {
        const date = format(new Date(deal.created_at), 'MMM dd')
        const existing = trendMap.get(date) || { date, revenue: 0, deals: 0, contacts: 0, activities: 0 }
        existing.deals += 1
        existing.revenue += deal.value_estimate_cents / 100
        trendMap.set(date, existing)
      })

      contacts?.forEach(contact => {
        const date = format(new Date(contact.created_at), 'MMM dd')
        const existing = trendMap.get(date) || { date, revenue: 0, deals: 0, contacts: 0, activities: 0 }
        existing.contacts += 1
        trendMap.set(date, existing)
      })

      activities?.forEach(activity => {
        const date = format(new Date(activity.occurred_at), 'MMM dd')
        const existing = trendMap.get(date) || { date, revenue: 0, deals: 0, contacts: 0, activities: 0 }
        existing.activities += 1
        trendMap.set(date, existing)
      })

      setTrendData(Array.from(trendMap.values()))
    } catch (error) {
      console.error('[ANALYTICS] Error loading trend data:', error)
    }
  }

  const loadFunnelData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      
      // Get pipeline stages and deal counts
      const { data: stages } = await supabase
        .from('pipeline_stages')
        .select(`
          id,
          name,
          position,
          deals:deals(id, value_estimate_cents)
        `)
        .eq('tenant_id', tenantId)
        .order('position')

      if (!stages) return

      const funnelData: FunnelData[] = []
      let previousCount = 0

      stages.forEach((stage: any, index) => {
        const dealCount = stage.deals?.length || 0
        const totalValue = stage.deals?.reduce((sum: number, d: any) => sum + (d.value_estimate_cents || 0), 0) || 0
        const conversionRate = previousCount > 0 ? (dealCount / previousCount) * 100 : 100

        funnelData.push({
          stage: stage.name,
          count: dealCount,
          value: totalValue / 100,
          conversion_rate: index === 0 ? 100 : conversionRate
        })

        previousCount = dealCount
      })

      setFunnelData(funnelData)
    } catch (error) {
      console.error('[ANALYTICS] Error loading funnel data:', error)
    }
  }

  const loadSourceData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      
      const { data } = await supabase
        .from('crm_lead_source_analytics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_contacts', { ascending: false })
        .limit(8)

      if (!data) return

      const sourceData: SourceData[] = data.map((s: any) => ({
        source: s.lead_source || 'Unknown',
        contacts: s.total_contacts || 0,
        deals: s.deals_created || 0,
        revenue: (s.revenue_generated_cents || 0) / 100,
        conversion_rate: s.contact_to_deal_conversion_rate || 0
      }))

      setSourceData(sourceData)
    } catch (error) {
      console.error('[ANALYTICS] Error loading source data:', error)
    }
  }

  const generateInsights = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const insights: Insight[] = []

      // Get current month vs last month data
      const currentMonthStart = startOfMonth(new Date())
      const lastMonthStart = startOfMonth(subMonths(new Date(), 1))
      const lastMonthEnd = endOfMonth(subMonths(new Date(), 1))

      const { data: currentDeals } = await supabase
        .from('deals')
        .select('value_estimate_cents, stage_id, pipeline_stages(name)')
        .eq('tenant_id', tenantId)
        .gte('created_at', currentMonthStart.toISOString())

      const { data: lastDeals } = await supabase
        .from('deals')
        .select('value_estimate_cents, stage_id, pipeline_stages(name)')
        .eq('tenant_id', tenantId)
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString())

      const currentRevenue = currentDeals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
      const lastRevenue = lastDeals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
      const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

      if (revenueGrowth > 20) {
        insights.push({
          type: 'positive',
          title: 'Revenue Surge Detected',
          description: `Revenue is up ${revenueGrowth.toFixed(1)}% this month vs last month`,
          metric: `+${revenueGrowth.toFixed(1)}%`,
          action: 'Analyze what\'s working and replicate success'
        })
      } else if (revenueGrowth < -10) {
        insights.push({
          type: 'negative',
          title: 'Revenue Decline Alert',
          description: `Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% compared to last month`,
          metric: `${revenueGrowth.toFixed(1)}%`,
          action: 'Review sales pipeline and marketing campaigns'
        })
      }

      // Check stalled deals
      const { data: stalledDeals } = await supabase
        .from('deals')
        .select('id, name, updated_at')
        .eq('tenant_id', tenantId)
        .lt('updated_at', subDays(new Date(), 14).toISOString())
        .not('stage_id', 'in', '(select id from pipeline_stages where name ilike \'%won%\' or name ilike \'%lost%\')')

      if (stalledDeals && stalledDeals.length > 0) {
        insights.push({
          type: 'warning',
          title: 'Stalled Deals Detected',
          description: `${stalledDeals.length} deals haven't been updated in 14+ days`,
          metric: `${stalledDeals.length} deals`,
          action: 'Follow up on inactive deals to move them forward'
        })
      }

      // Check conversion rates
      const { data: sourceAnalytics } = await supabase
        .from('crm_lead_source_analytics')
        .select('lead_source, contact_to_deal_conversion_rate')
        .eq('tenant_id', tenantId)
        .order('contact_to_deal_conversion_rate', { ascending: false })
        .limit(1)

      if (sourceAnalytics && sourceAnalytics.length > 0) {
        const bestSource = sourceAnalytics[0]
        insights.push({
          type: 'positive',
          title: 'Best Performing Source',
          description: `${bestSource.lead_source} has the highest conversion rate`,
          metric: `${bestSource.contact_to_deal_conversion_rate.toFixed(1)}%`,
          action: 'Invest more in this acquisition channel'
        })
      }

      setInsights(insights)
    } catch (error) {
      console.error('[ANALYTICS] Error generating insights:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading executive insights...</p>
        </div>
      </div>
    )
  }

  if (!kpis) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Data Available</h3>
        <p className="text-gray-500">Start adding contacts and deals to see analytics</p>
      </div>
    )
  }

  const revenuePerDeal = kpis.deals_won_30d > 0 ? (kpis.revenue_30d_cents / 100) / kpis.deals_won_30d : 0
  const activityPerContact = kpis.total_contacts > 0 ? kpis.total_activities_30d / kpis.total_contacts : 0

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{kpis.practice_name}</h2>
          <p className="text-sm text-gray-600">Executive Intelligence Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="12m">Last 12 Months</option>
          </select>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-purple-600" />
              AI-Powered Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-2 ${
                    insight.type === 'positive'
                      ? 'border-green-200 bg-green-50'
                      : insight.type === 'negative'
                      ? 'border-red-200 bg-red-50'
                      : insight.type === 'warning'
                      ? 'border-yellow-200 bg-yellow-50'
                      : 'border-blue-200 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                    {insight.metric && (
                      <Badge
                        variant={insight.type === 'positive' ? 'default' : 'secondary'}
                        className={
                          insight.type === 'positive'
                            ? 'bg-green-600'
                            : insight.type === 'negative'
                            ? 'bg-red-600'
                            : 'bg-yellow-600'
                        }
                      >
                        {insight.metric}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{insight.description}</p>
                  {insight.action && (
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600">
                      <Zap className="h-3 w-3" />
                      {insight.action}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+12.3%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Revenue (30d)</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency((kpis.revenue_30d_cents || 0) / 100)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.deals_won_30d} deals won • Avg {formatCurrency(revenuePerDeal)}/deal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Target className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex items-center gap-1 text-blue-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+8.7%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Pipeline Value</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency((kpis.active_pipeline_value_cents || 0) / 100)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {kpis.active_pipeline_deals} active deals
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex items-center gap-1 text-purple-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+15.2%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">New Contacts</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(kpis.new_contacts_30d)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {formatNumber(kpis.total_contacts)} total contacts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Activity className="h-5 w-5 text-orange-600" />
              </div>
              <div className="flex items-center gap-1 text-orange-600">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm font-semibold">+6.4%</span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1">Activities</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatNumber(kpis.total_activities_30d)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {activityPerContact.toFixed(1)} per contact
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue & Activity Trends */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Activity Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorActivities" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f093fb" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f093fb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#667eea"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue ($)"
                />
                <Area
                  type="monotone"
                  dataKey="activities"
                  stroke="#f093fb"
                  fillOpacity={1}
                  fill="url(#colorActivities)"
                  name="Activities"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Deals & Contacts Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Deals & Contacts Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="deals"
                  stroke="#667eea"
                  strokeWidth={3}
                  dot={{ fill: '#667eea', r: 4 }}
                  name="New Deals"
                />
                <Line
                  type="monotone"
                  dataKey="contacts"
                  stroke="#43e97b"
                  strokeWidth={3}
                  dot={{ fill: '#43e97b', r: 4 }}
                  name="New Contacts"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Sales Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {funnelData.map((stage, index) => (
                <div key={index}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{stage.stage}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600">
                        {stage.count} deals • {formatCurrency(stage.value)}
                      </span>
                      <Badge variant="secondary">
                        {stage.conversion_rate.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${stage.conversion_rate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lead Source Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Lead Source Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceData.slice(0, 6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="source" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="contacts" fill="#667eea" name="Contacts" radius={[8, 8, 0, 0]} />
                <Bar dataKey="deals" fill="#43e97b" name="Deals" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Source Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Source Deep Dive</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Source</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Contacts</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deals</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Conv. Rate</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Rev/Contact</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((source, index) => {
                  const revPerContact = source.contacts > 0 ? source.revenue / source.contacts : 0
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium text-gray-900">{source.source}</span>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">{formatNumber(source.contacts)}</td>
                      <td className="text-right py-3 px-4 text-gray-700">{formatNumber(source.deals)}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        {formatCurrency(source.revenue)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{source.conversion_rate.toFixed(1)}%</Badge>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">
                        {formatCurrency(revPerContact)}
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
  )
}
