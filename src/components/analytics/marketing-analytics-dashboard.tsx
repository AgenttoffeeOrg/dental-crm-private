'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  DollarSign,
  TrendingUp,
  Mail,
  MessageSquare,
  Phone,
  Share2,
  Award,
  Download,
  Target,
  Users,
  Zap,
  BarChart3
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { 
  BarChart, 
  Bar, 
  LineChart,
  Line,
  AreaChart,
  Area,
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

interface MarketingROI {
  channel: string
  campaigns: number
  sent: number
  opened: number
  clicked: number
  open_rate: number
  click_rate: number
  leads: number
  deals: number
  revenue: number
  roi: number
}

interface CampaignPerformance {
  id: string
  name: string
  type: string
  status: string
  sent: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  open_rate: number
  click_rate: number
  conversion_rate: number
  leads_generated: number
  revenue: number
  cost: number
  roi: number
}

interface AttributionData {
  touchpoint: string
  contacts: number
  deals: number
  revenue: number
  contribution_percent: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#c471ed']

export function MarketingAnalyticsDashboard({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [roiData, setRoiData] = useState<MarketingROI[]>([])
  const [campaigns, setCampaigns] = useState<CampaignPerformance[]>([])
  const [attributionData, setAttributionData] = useState<AttributionData[]>([])
  const [selectedView, setSelectedView] = useState<'overview' | 'campaigns' | 'channels' | 'attribution'>('overview')
  const [totalSpend, setTotalSpend] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [totalLeads, setTotalLeads] = useState(0)
  const [avgCAC, setAvgCAC] = useState(0)

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadROIData(),
      loadCampaigns(),
      loadAttributionData(),
      loadSummaryMetrics()
    ])
    setLoading(false)
  }

  const loadROIData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('marketing_roi_summary')
        .select('*')
        .eq('tenant_id', tenantId)

      if (!data) return

      const roi: MarketingROI[] = data.map((r: any) => {
        const revenue = (r.revenue_generated_cents || 0) / 100
        const spend = (r.total_sent || 0) * 0.5 // Estimate cost
        return {
          channel: r.type || 'Unknown',
          campaigns: r.total_campaigns || 0,
          sent: r.total_sent || 0,
          opened: r.total_opened || 0,
          clicked: r.total_clicked || 0,
          open_rate: r.avg_open_rate || 0,
          click_rate: r.avg_click_rate || 0,
          leads: r.leads_generated || 0,
          deals: r.deals_created || 0,
          revenue: revenue,
          roi: spend > 0 ? ((revenue - spend) / spend) * 100 : 0
        }
      })

      setRoiData(roi)
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading ROI data:', error)
    }
  }

  const loadCampaigns = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('total_sends', { ascending: false })
        .limit(20)

      if (!data) return

      const campaigns: CampaignPerformance[] = data.map((c: any) => {
        const sent = c.total_sends || 0
        const opened = c.total_opens || 0
        const clicked = c.total_clicks || 0
        const bounced = c.total_bounces || 0
        const unsubscribed = c.total_unsubscribes || 0
        const openRate = sent > 0 ? (opened / sent) * 100 : 0
        const clickRate = opened > 0 ? (clicked / opened) * 100 : 0
        const conversionRate = sent > 0 ? ((c.leads_generated || 0) / sent) * 100 : 0
        const cost = sent * 0.5
        const revenue = (c.revenue_generated_cents || 0) / 100
        const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0

        return {
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          sent,
          opened,
          clicked,
          bounced,
          unsubscribed,
          open_rate: openRate,
          click_rate: clickRate,
          conversion_rate: conversionRate,
          leads_generated: c.leads_generated || 0,
          revenue,
          cost,
          roi
        }
      })

      setCampaigns(campaigns)
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading campaigns:', error)
    }
  }

  const loadAttributionData = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('marketing_campaign_attribution')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('revenue_generated_cents', { ascending: false })

      if (!data) return

      const totalRevenue = data.reduce((sum: number, d: any) => sum + (d.revenue_generated_cents || 0), 0)

      const attribution: AttributionData[] = data.map((a: any) => ({
        touchpoint: a.campaign_name || 'Unknown',
        contacts: a.total_contacts || 0,
        deals: a.deals_created || 0,
        revenue: (a.revenue_generated_cents || 0) / 100,
        contribution_percent: totalRevenue > 0 ? ((a.revenue_generated_cents || 0) / totalRevenue) * 100 : 0
      }))

      setAttributionData(attribution)
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading attribution:', error)
    }
  }

  const loadSummaryMetrics = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      
      // Get CAC data
      const { data: cacData } = await supabase
        .from('marketing_cac_analysis')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('month', { ascending: false })
        .limit(1)

      if (cacData && cacData.length > 0) {
        const cac = cacData[0]
        setTotalSpend((cac.total_marketing_spend_cents || 0) / 100)
        setTotalRevenue((cac.total_revenue_cents || 0) / 100)
        setTotalLeads(cac.total_leads || 0)
        setAvgCAC((cac.cac_cents || 0) / 100)
      }
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading summary metrics:', error)
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

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading marketing analytics...</p>
        </div>
      </div>
    )
  }

  const totalROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0
  const totalSent = roiData.reduce((sum, r) => sum + r.sent, 0)
  const totalClicked = roiData.reduce((sum, r) => sum + r.clicked, 0)
  const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing Analytics</h2>
          <p className="text-sm text-gray-600">Campaign performance, ROI, and attribution insights</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export Marketing Report
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
          variant={selectedView === 'campaigns' ? 'default' : 'outline'}
          onClick={() => setSelectedView('campaigns')}
        >
          Campaigns
        </Button>
        <Button
          variant={selectedView === 'channels' ? 'default' : 'outline'}
          onClick={() => setSelectedView('channels')}
        >
          Channels
        </Button>
        <Button
          variant={selectedView === 'attribution' ? 'default' : 'outline'}
          onClick={() => setSelectedView('attribution')}
        >
          Attribution
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
                  <p className="text-sm font-medium text-gray-600">Marketing ROI</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatPercent(totalROI)}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {formatCurrency(totalRevenue)} revenue / {formatCurrency(totalSpend)} spend
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Target className="h-5 w-5 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Customer Acq Cost</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(avgCAC)}</p>
                <p className="text-xs text-gray-500 mt-2">{formatNumber(totalLeads)} leads acquired</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Avg Click Rate</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{formatPercent(avgClickRate)}</p>
                <p className="text-xs text-gray-500 mt-2">{formatNumber(totalClicked)} clicks / {formatNumber(totalSent)} sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Award className="h-5 w-5 text-orange-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {roiData.reduce((sum, r) => sum + r.campaigns, 0)}
                </p>
                <p className="text-xs text-gray-500 mt-2">Across all channels</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Channel ROI Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Channel ROI Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
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
                    <Bar dataKey="roi" fill="#667eea" name="ROI (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roiData}
                      dataKey="revenue"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.channel}: ${formatCurrency(entry.revenue)}`}
                    >
                      {roiData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Metrics */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Metrics by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Channel</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Campaigns</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Sent</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Opened</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Clicked</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Open Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Click Rate</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Leads</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roiData.map((channel, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900">{channel.channel}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">{channel.campaigns}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.sent)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.opened)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.clicked)}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant="secondary">{formatPercent(channel.open_rate)}</Badge>
                        </td>
                        <td className="text-right py-3 px-4">
                          <Badge variant="secondary">{formatPercent(channel.click_rate)}</Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.leads)}</td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900">
                          {formatCurrency(channel.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Campaigns Tab */}
      {selectedView === 'campaigns' && (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Performance Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campaign</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Type</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Status</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Sent</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Open Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Click Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Conv. Rate</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Leads</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((campaign) => (
                    <tr key={campaign.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900 max-w-xs truncate">
                        {campaign.name}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant="outline">{campaign.type}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          className={
                            campaign.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : campaign.status === 'active'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">{formatNumber(campaign.sent)}</td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{formatPercent(campaign.open_rate)}</Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{formatPercent(campaign.click_rate)}</Badge>
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge variant="secondary">{formatPercent(campaign.conversion_rate)}</Badge>
                      </td>
                      <td className="text-right py-3 px-4 text-gray-700">{campaign.leads_generated}</td>
                      <td className="text-right py-3 px-4 font-semibold text-gray-900">
                        {formatCurrency(campaign.revenue)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <Badge
                          className={campaign.roi > 100 ? 'bg-green-600' : campaign.roi > 0 ? 'bg-yellow-600' : 'bg-red-600'}
                        >
                          {formatPercent(campaign.roi)}
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

      {/* Channels Tab */}
      {selectedView === 'channels' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Open Rates by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>Open Rates by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
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
                    <Bar dataKey="open_rate" fill="#43e97b" name="Open Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Click Rates by Channel */}
            <Card>
              <CardHeader>
                <CardTitle>Click Rates by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={roiData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
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
                    <Bar dataKey="click_rate" fill="#f093fb" name="Click Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leads Generated by Channel</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={roiData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
                  <YAxis stroke="#6b7280" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="leads" fill="#667eea" name="Leads" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="deals" fill="#764ba2" name="Deals" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attribution Tab */}
      {selectedView === 'attribution' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Marketing Attribution Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <PieChart>
                  <Pie
                    data={attributionData}
                    dataKey="contribution_percent"
                    nameKey="touchpoint"
                    cx="50%"
                    cy="50%"
                    outerRadius={150}
                    label={(entry) => `${entry.touchpoint}: ${entry.contribution_percent.toFixed(1)}%`}
                  >
                    {attributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Touchpoint Contribution Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Touchpoint</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Contacts</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deals</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Contribution %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributionData.map((touchpoint, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900">{touchpoint.touchpoint}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(touchpoint.contacts)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(touchpoint.deals)}</td>
                        <td className="text-right py-3 px-4 font-semibold text-gray-900">
                          {formatCurrency(touchpoint.revenue)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600 rounded-full"
                                style={{ width: `${touchpoint.contribution_percent}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPercent(touchpoint.contribution_percent)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
