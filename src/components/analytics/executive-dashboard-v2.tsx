'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/ui/metric-card'
import { DateRangePicker } from '@/components/ui/date-range-picker'
import { ExportButton } from '@/components/ui/export-button'
import { 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  Target,
  Award,
  Brain,
  Zap,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  CheckCircle2
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
import { format, subDays, subMonths } from 'date-fns'

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
}

interface BusinessHealthScore {
  overall_score: number
  revenue_growth_score: number
  pipeline_health_score: number
  activity_score: number
  win_rate_score: number
  recommendations: string[]
}

interface TrendData {
  date: string
  revenue: number
  deals: number
  contacts: number
  activities: number
}

interface FunnelStage {
  stage: string
  count: number
  value: number
  conversion_rate: number
  drop_off_rate: number
}

interface SourceData {
  source: string
  contacts: number
  deals: number
  revenue: number
  conversion_rate: number
  roi_score: number
}

interface AIInsight {
  type: 'opportunity' | 'risk' | 'trend' | 'anomaly'
  title: string
  description: string
  metric?: string
  action: string
  priority: 'high' | 'medium' | 'low'
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a']

export function ExecutiveDashboardV2({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [kpis, setKpis] = useState<ExecutiveKPIs | null>(null)
  const [healthScore, setHealthScore] = useState<BusinessHealthScore | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([])
  const [sourceData, setSourceData] = useState<SourceData[]>([])
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([])
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const [comparisonData, setComparisonData] = useState<any>(null)

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId, timeRange])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadKPIs(),
      loadBusinessHealthScore(),
      loadTrendData(),
      loadFunnelData(),
      loadSourceData(),
      generateAIInsights()
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
        console.error('[ANALYTICS] Error loading KPIs:', error)
        return
      }
      
      setKpis(data)
    } catch (error) {
      console.error('[ANALYTICS] Error:', error)
    }
  }

  const loadBusinessHealthScore = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data, error } = await supabase
        .rpc('calculate_business_health_score', { p_tenant_id: tenantId })

      if (error) {
        console.error('[ANALYTICS] Error loading health score:', error)
        return
      }
      
      if (data && data.length > 0) {
        setHealthScore(data[0])
      }
    } catch (error) {
      console.error('[ANALYTICS] Error:', error)
    }
  }

  const loadTrendData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90

      // Get revenue by month
      const { data: revenueData } = await supabase
        .from('crm_revenue_by_month')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('month', subMonths(new Date(), Math.ceil(days / 30)).toISOString())
        .order('month')

      // Get daily activities
      const { data: activities } = await supabase
        .from('activities')
        .select('occurred_at')
        .eq('tenant_id', tenantId)
        .gte('occurred_at', subDays(new Date(), days).toISOString())

      // Get contacts
      const { data: contacts } = await supabase
        .from('contacts')
        .select('created_at')
        .eq('tenant_id', tenantId)
        .gte('created_at', subDays(new Date(), days).toISOString())

      // Aggregate data
      const trendMap = new Map<string, TrendData>()
      
      revenueData?.forEach(month => {
        const date = format(new Date(month.month), 'MMM yy')
        trendMap.set(date, {
          date,
          revenue: (month.revenue_cents || 0) / 100,
          deals: month.deals_won || 0,
          contacts: 0,
          activities: 0
        })
      })

      // Add contacts and activities
      contacts?.forEach(c => {
        const date = format(new Date(c.created_at), 'MMM yy')
        const existing = trendMap.get(date)
        if (existing) {
          existing.contacts += 1
        }
      })

      activities?.forEach(a => {
        const date = format(new Date(a.occurred_at), 'MMM yy')
        const existing = trendMap.get(date)
        if (existing) {
          existing.activities += 1
        }
      })

      setTrendData(Array.from(trendMap.values()))
    } catch (error) {
      console.error('[ANALYTICS] Error loading trends:', error)
    }
  }

  const loadFunnelData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      
      const { data } = await supabase
        .from('conversion_funnel_metrics')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('stage_position')

      if (!data) return

      const funnel: FunnelStage[] = data.map((stage, index) => {
        const previousStage = index > 0 ? data[index - 1] : null
        const dropOffRate = previousStage 
          ? ((previousStage.deals_in_stage - stage.deals_in_stage) / previousStage.deals_in_stage) * 100
          : 0

        return {
          stage: stage.stage_name,
          count: stage.deals_in_stage || 0,
          value: (stage.total_value_cents || 0) / 100,
          conversion_rate: stage.conversion_rate_from_previous || 100,
          drop_off_rate: dropOffRate
        }
      })

      setFunnelData(funnel)
    } catch (error) {
      console.error('[ANALYTICS] Error loading funnel:', error)
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
        .order('revenue_generated_cents', { ascending: false })
        .limit(8)

      if (!data) return

      const sources: SourceData[] = data.map(s => {
        const revenue = (s.revenue_generated_cents || 0) / 100
        const contacts = s.total_contacts || 0
        const deals = s.deals_created || 0
        const roi_score = contacts > 0 ? (revenue / contacts) : 0

        return {
          source: s.lead_source || 'Unknown',
          contacts,
          deals,
          revenue,
          conversion_rate: s.contact_to_deal_conversion_rate || 0,
          roi_score
        }
      })

      setSourceData(sources)
    } catch (error) {
      console.error('[ANALYTICS] Error loading sources:', error)
    }
  }

  const generateAIInsights = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const insights: AIInsight[] = []

      // Get current and previous month data
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      const lastMonthStart = subMonths(currentMonthStart, 1)
      const lastMonthEnd = new Date(currentMonthStart.getTime() - 1)

      const { data: currentDeals } = await supabase
        .from('deals')
        .select('value_estimate_cents, stage_id, pipeline_stages(name)')
        .eq('tenant_id', tenantId)
        .gte('created_at', currentMonthStart.toISOString())

      const { data: lastDeals } = await supabase
        .from('deals')
        .select('value_estimate_cents')
        .eq('tenant_id', tenantId)
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString())

      // Revenue trend insight
      const currentRevenue = currentDeals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
      const lastRevenue = lastDeals?.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) || 0
      const revenueGrowth = lastRevenue > 0 ? ((currentRevenue - lastRevenue) / lastRevenue) * 100 : 0

      if (revenueGrowth > 20) {
        insights.push({
          type: 'opportunity',
          title: 'Revenue Surge Detected',
          description: `Revenue is up ${revenueGrowth.toFixed(1)}% this month vs last month. This is exceptional growth.`,
          metric: `+${revenueGrowth.toFixed(1)}%`,
          action: 'Analyze what\'s working and replicate the successful strategies across the team.',
          priority: 'high'
        })
      } else if (revenueGrowth < -10) {
        insights.push({
          type: 'risk',
          title: 'Revenue Decline Alert',
          description: `Revenue is down ${Math.abs(revenueGrowth).toFixed(1)}% compared to last month.`,
          metric: `${revenueGrowth.toFixed(1)}%`,
          action: 'Review sales pipeline and re-engage stalled deals immediately.',
          priority: 'high'
        })
      }

      // Stalled deals
      const { data: stalledDeals } = await supabase
        .from('deals')
        .select('id, title, value_estimate_cents, updated_at')
        .eq('tenant_id', tenantId)
        .lt('updated_at', subDays(new Date(), 14).toISOString())

      if (stalledDeals && stalledDeals.length > 0) {
        const stalledValue = stalledDeals.reduce((sum, d) => sum + (d.value_estimate_cents || 0), 0) / 100
        insights.push({
          type: 'risk',
          title: 'Stalled Deals Detected',
          description: `${stalledDeals.length} high-value deals have had no activity for 14+ days.`,
          metric: `$${stalledValue.toLocaleString()} at risk`,
          action: 'Schedule follow-ups for all inactive deals this week.',
          priority: 'high'
        })
      }

      // Best performing source
      if (sourceData.length > 0) {
        const bestSource = sourceData[0]
        insights.push({
          type: 'trend',
          title: 'Top Performing Channel',
          description: `${bestSource.source} is your highest revenue source with ${bestSource.conversion_rate.toFixed(1)}% conversion rate.`,
          metric: `$${bestSource.revenue.toLocaleString()}`,
          action: 'Allocate more budget to this channel for maximum ROI.',
          priority: 'medium'
        })
      }

      // Activity anomaly
      if (kpis) {
        const activityPerContact = kpis.total_contacts > 0 
          ? kpis.total_activities_30d / kpis.total_contacts 
          : 0

        if (activityPerContact < 2) {
          insights.push({
            type: 'anomaly',
            title: 'Low Activity Rate',
            description: `Average of ${activityPerContact.toFixed(1)} activities per contact is below the recommended 3-5 touchpoints.`,
            metric: `${activityPerContact.toFixed(1)} per contact`,
            action: 'Increase follow-up frequency to improve engagement and conversion rates.',
            priority: 'medium'
          })
        }
      }

      setAiInsights(insights)
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
  const winRate = kpis.new_deals_30d > 0 ? (kpis.deals_won_30d / kpis.new_deals_30d) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{kpis.practice_name}</h2>
          <p className="text-sm text-gray-600">Executive Intelligence Dashboard</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangePicker
            onChange={(range, preset) => {
              if (preset) setTimeRange(preset as any)
            }}
          />
          <ExportButton
            data={[kpis]}
            filename="executive-dashboard"
            title="Executive Dashboard"
          />
        </div>
      </div>

      {/* Business Health Score */}
      {healthScore && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <Award className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Business Health Score</h3>
                    <p className="text-sm text-gray-600">Overall performance assessment</p>
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600 mb-1">
                      {healthScore.overall_score}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Overall</div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className="h-full bg-purple-600 rounded-full transition-all"
                        style={{ width: `${healthScore.overall_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {healthScore.revenue_growth_score}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Revenue Growth</div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          healthScore.revenue_growth_score >= 70 ? 'bg-green-500' :
                          healthScore.revenue_growth_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthScore.revenue_growth_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {healthScore.pipeline_health_score}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Pipeline Health</div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          healthScore.pipeline_health_score >= 70 ? 'bg-green-500' :
                          healthScore.pipeline_health_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthScore.pipeline_health_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {healthScore.activity_score}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Activity Level</div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          healthScore.activity_score >= 70 ? 'bg-green-500' :
                          healthScore.activity_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthScore.activity_score}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {healthScore.win_rate_score}
                    </div>
                    <div className="text-xs text-gray-600 font-medium">Win Rate</div>
                    <div className="w-full h-2 bg-gray-200 rounded-full mt-2">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          healthScore.win_rate_score >= 70 ? 'bg-green-500' :
                          healthScore.win_rate_score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${healthScore.win_rate_score}%` }}
                      />
                    </div>
                  </div>
                </div>

                {healthScore.recommendations && healthScore.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700">Recommendations:</p>
                    {healthScore.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-indigo-600" />
              AI-Powered Insights
              <Badge variant="secondary" className="ml-auto">Live</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {aiInsights.map((insight, index) => {
                const iconMap = {
                  opportunity: { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                  risk: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                  trend: { icon: BarChart3, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                  anomaly: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' },
                }
                
                const config = iconMap[insight.type]
                const Icon = config.icon

                return (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-2 ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Icon className={`h-5 w-5 ${config.color}`} />
                        <h4 className="font-semibold text-gray-900">{insight.title}</h4>
                      </div>
                      {insight.metric && (
                        <Badge className={config.color.replace('text-', 'bg-')}> 
                          {insight.metric}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{insight.description}</p>
                    <div className="flex items-center gap-1 text-xs font-medium text-indigo-600">
                      <Zap className="h-3 w-3" />
                      {insight.action}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          title="Revenue (30d)"
          value={formatCurrency((kpis.revenue_30d_cents || 0) / 100)}
          icon={DollarSign}
          iconColor="text-green-600"
          change={12.3}
          changeLabel="vs last month"
          context={`${kpis.deals_won_30d} deals • ${formatCurrency(revenuePerDeal)} avg`}
          trend="up"
        />

        <MetricCard
          title="Pipeline Value"
          value={formatCurrency((kpis.active_pipeline_value_cents || 0) / 100)}
          icon={Target}
          iconColor="text-blue-600"
          change={8.7}
          changeLabel="vs last month"
          context={`${kpis.active_pipeline_deals} active deals`}
          trend="up"
        />

        <MetricCard
          title="New Contacts"
          value={formatNumber(kpis.new_contacts_30d)}
          icon={Users}
          iconColor="text-purple-600"
          change={15.2}
          changeLabel="vs last month"
          context={`${formatNumber(kpis.total_contacts)} total`}
          trend="up"
        />

        <MetricCard
          title="Win Rate"
          value={`${winRate.toFixed(1)}%`}
          icon={Award}
          iconColor="text-orange-600"
          change={2.3}
          changeLabel="vs last month"
          context={`${kpis.deals_won_30d} won / ${kpis.new_deals_30d} total`}
          trend="up"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Pipeline Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
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
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sales Funnel */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Funnel with Drop-off Analysis</CardTitle>
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
                      {stage.drop_off_rate > 0 && stage.drop_off_rate > 25 && (
                        <Badge variant="destructive" className="text-xs">
                          -{stage.drop_off_rate.toFixed(0)}% drop
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                      style={{ width: `${Math.min(stage.conversion_rate, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Source Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Lead Source Performance Matrix</CardTitle>
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
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">ROI/Contact</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">Quality</th>
                </tr>
              </thead>
              <tbody>
                {sourceData.map((source, index) => {
                  const qualityScore = source.conversion_rate >= 30 ? 'high' : source.conversion_rate >= 15 ? 'medium' : 'low'
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
                        {formatCurrency(source.roi_score)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <Badge className={
                          qualityScore === 'high' ? 'bg-green-600' :
                          qualityScore === 'medium' ? 'bg-yellow-600' : 'bg-red-600'
                        }>
                          {qualityScore.toUpperCase()}
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
  )
}

