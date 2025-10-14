'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/ui/metric-card'
import { DataTable } from '@/components/ui/data-table'
import { ExportButton } from '@/components/ui/export-button'
import { 
  DollarSign,
  Target,
  Mail,
  MessageSquare,
  Share2,
  Award,
  TrendingUp,
  BarChart3,
  Table as TableIcon,
  Zap
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { type ColumnDef } from '@tanstack/react-table'
import { 
  BarChart, 
  Bar, 
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

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  total_sends: number
  total_opens: number
  total_clicks: number
  total_bounces: number
  open_rate: number
  click_rate: number
  conversion_rate: number
  revenue: number
  cost: number
  roi: number
}

interface ChannelMetrics {
  channel: string
  campaigns: number
  sent: number
  opened: number
  clicked: number
  open_rate: number
  click_rate: number
  leads: number
  revenue: number
  roi: number
}

interface AttributionTouchpoint {
  touchpoint: string
  contacts: number
  deals: number
  revenue: number
  contribution_percent: number
}

const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#30cfd0', '#c471ed']

export function MarketingAnalyticsV2({ tenantId }: { tenantId?: string }) {
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'overview' | 'campaigns' | 'channels' | 'attribution'>('overview')
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [channelMetrics, setChannelMetrics] = useState<ChannelMetrics[]>([])
  const [attributionData, setAttributionData] = useState<AttributionTouchpoint[]>([])
  const [totalSpend, setTotalSpend] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [avgCAC, setAvgCAC] = useState(0)

  useEffect(() => {
    if (tenantId) {
      loadAllData()
    }
  }, [tenantId])

  const loadAllData = async () => {
    setLoading(true)
    await Promise.all([
      loadCampaigns(),
      loadChannelMetrics(),
      loadAttributionData(),
      loadSummaryMetrics()
    ])
    setLoading(false)
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
        .limit(50)

      if (!data) return

      const campaigns: Campaign[] = data.map((c: any) => {
        const sent = c.total_sends || 0
        const opened = c.total_opens || 0
        const clicked = c.total_clicks || 0
        const openRate = sent > 0 ? (opened / sent) * 100 : 0
        const clickRate = opened > 0 ? (clicked / opened) * 100 : 0
        const cost = sent * 0.5 // Estimate
        const revenue = (c.revenue_generated_cents || 0) / 100
        const roi = cost > 0 ? ((revenue - cost) / cost) * 100 : 0

        return {
          id: c.id,
          name: c.name,
          type: c.type,
          status: c.status,
          total_sends: sent,
          total_opens: opened,
          total_clicks: clicked,
          total_bounces: c.total_bounces || 0,
          open_rate: openRate,
          click_rate: clickRate,
          conversion_rate: sent > 0 ? ((c.leads_generated || 0) / sent) * 100 : 0,
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

  const loadChannelMetrics = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
      const { data } = await supabase
        .from('marketing_roi_summary')
        .select('*')
        .eq('tenant_id', tenantId)

      if (!data) return

      setChannelMetrics(data.map((r: any) => {
        const revenue = (r.revenue_generated_cents || 0) / 100
        const cost = (r.total_sent || 0) * 0.5
        return {
          channel: r.type || 'Unknown',
          campaigns: r.total_campaigns || 0,
          sent: r.total_sent || 0,
          opened: r.total_opened || 0,
          clicked: r.total_clicked || 0,
          open_rate: r.avg_open_rate || 0,
          click_rate: r.avg_click_rate || 0,
          leads: r.leads_generated || 0,
          revenue,
          roi: cost > 0 ? ((revenue - cost) / cost) * 100 : 0
        }
      }))
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading channels:', error)
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
        .limit(10)

      if (!data) return

      const totalRevenue = data.reduce((sum: number, d: any) => sum + (d.revenue_generated_cents || 0), 0)

      setAttributionData(data.map((a: any) => ({
        touchpoint: a.campaign_name || 'Unknown',
        contacts: a.total_contacts || 0,
        deals: a.deals_created || 0,
        revenue: (a.revenue_generated_cents || 0) / 100,
        contribution_percent: totalRevenue > 0 ? ((a.revenue_generated_cents || 0) / totalRevenue) * 100 : 0
      })))
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading attribution:', error)
    }
  }

  const loadSummaryMetrics = async () => {
    try {
      if (!tenantId) return

      const supabase = createClient()
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
        setAvgCAC((cac.cac_cents || 0) / 100)
      }
    } catch (error) {
      console.error('[MARKETING ANALYTICS] Error loading summary:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value)
  }

  // Campaign table columns
  const campaignColumns: ColumnDef<Campaign>[] = [
    {
      accessorKey: 'name',
      header: 'Campaign Name',
      cell: ({ row }) => (
        <div className="font-medium text-gray-900 max-w-xs truncate">{row.original.name}</div>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant="outline">{row.original.type}</Badge>,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge className={
          row.original.status === 'completed' ? 'bg-green-600' :
          row.original.status === 'active' ? 'bg-blue-600' : 'bg-gray-600'
        }>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: 'total_sends',
      header: 'Sent',
      cell: ({ row }) => formatNumber(row.original.total_sends),
    },
    {
      accessorKey: 'open_rate',
      header: 'Open Rate',
      cell: ({ row }) => <Badge variant="secondary">{row.original.open_rate.toFixed(1)}%</Badge>,
    },
    {
      accessorKey: 'click_rate',
      header: 'Click Rate',
      cell: ({ row }) => <Badge variant="secondary">{row.original.click_rate.toFixed(1)}%</Badge>,
    },
    {
      accessorKey: 'revenue',
      header: 'Revenue',
      cell: ({ row }) => (
        <span className="font-semibold">{formatCurrency(row.original.revenue)}</span>
      ),
    },
    {
      accessorKey: 'roi',
      header: 'ROI',
      cell: ({ row }) => (
        <Badge className={
          row.original.roi > 100 ? 'bg-green-600' :
          row.original.roi > 0 ? 'bg-yellow-600' : 'bg-red-600'
        }>
          {row.original.roi.toFixed(0)}%
        </Badge>
      ),
    },
  ]

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
  const totalSent = channelMetrics.reduce((sum, c) => sum + c.sent, 0)
  const totalClicked = channelMetrics.reduce((sum, c) => sum + c.clicked, 0)
  const avgClickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0
  const totalCampaigns = channelMetrics.reduce((sum, c) => sum + c.campaigns, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Marketing Analytics</h2>
          <p className="text-sm text-gray-600">Campaign performance, ROI, and attribution insights</p>
        </div>
        <ExportButton
          data={viewMode === 'campaigns' ? campaigns : channelMetrics}
          filename={`marketing-${viewMode}`}
          title="Marketing Analytics"
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
          variant={viewMode === 'campaigns' ? 'default' : 'outline'}
          onClick={() => setViewMode('campaigns')}
          size="sm"
        >
          <TableIcon className="h-4 w-4 mr-2" />
          Campaigns
        </Button>
        <Button
          variant={viewMode === 'channels' ? 'default' : 'outline'}
          onClick={() => setViewMode('channels')}
          size="sm"
        >
          <Zap className="h-4 w-4 mr-2" />
          Channels
        </Button>
        <Button
          variant={viewMode === 'attribution' ? 'default' : 'outline'}
          onClick={() => setViewMode('attribution')}
          size="sm"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Attribution
        </Button>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Summary KPIs */}
          <div className="grid grid-cols-4 gap-4">
            <MetricCard
              title="Marketing ROI"
              value={`${totalROI.toFixed(0)}%`}
              icon={DollarSign}
              iconColor="text-green-600"
              context={`${formatCurrency(totalRevenue)} / ${formatCurrency(totalSpend)}`}
            />
            <MetricCard
              title="Customer Acq Cost"
              value={formatCurrency(avgCAC)}
              icon={Target}
              iconColor="text-blue-600"
              context="Per acquired customer"
            />
            <MetricCard
              title="Avg Click Rate"
              value={`${avgClickRate.toFixed(1)}%`}
              icon={Zap}
              iconColor="text-purple-600"
              context={`${formatNumber(totalClicked)} / ${formatNumber(totalSent)}`}
            />
            <MetricCard
              title="Total Campaigns"
              value={totalCampaigns}
              icon={Award}
              iconColor="text-orange-600"
              context="Across all channels"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Channel ROI */}
            <Card>
              <CardHeader>
                <CardTitle>ROI by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelMetrics}>
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
                    <Bar dataKey="roi" fill="#667eea" name="ROI (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={channelMetrics}
                      dataKey="revenue"
                      nameKey="channel"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={(entry) => `${entry.channel}: ${formatCurrency(entry.revenue)}`}
                    >
                      {channelMetrics.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Channel Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Channel Performance Breakdown</CardTitle>
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
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channelMetrics.map((channel, index) => (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900 capitalize">{channel.channel}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">{channel.campaigns}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.sent)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.opened)}</td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.clicked)}</td>
                        <td className="text-right py-3 px-4">
                          <Badge variant="secondary">{channel.open_rate.toFixed(1)}%</Badge>
                        </td>
                        <td className="text-right py-3 px-4">
                          <Badge variant="secondary">{channel.click_rate.toFixed(1)}%</Badge>
                        </td>
                        <td className="text-right py-3 px-4 text-gray-700">{formatNumber(channel.leads)}</td>
                        <td className="text-right py-3 px-4 font-semibold">{formatCurrency(channel.revenue)}</td>
                        <td className="text-right py-3 px-4">
                          <Badge className={channel.roi > 100 ? 'bg-green-600' : channel.roi > 0 ? 'bg-yellow-600' : 'bg-red-600'}>
                            {channel.roi.toFixed(0)}%
                          </Badge>
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

      {/* Campaigns Table Mode */}
      {viewMode === 'campaigns' && (
        <Card>
          <CardHeader>
            <CardTitle>All Marketing Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={campaignColumns}
              data={campaigns}
              searchPlaceholder="Search campaigns..."
              enableExport={true}
              exportFilename="marketing-campaigns"
            />
          </CardContent>
        </Card>
      )}

      {/* Channels Mode */}
      {viewMode === 'channels' && (
        <div className="space-y-6">
          {/* Engagement Metrics */}
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Open Rates by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="open_rate" fill="#43e97b" name="Open Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Click Rates by Channel</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={channelMetrics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="channel" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="click_rate" fill="#f093fb" name="Click Rate (%)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Engagement Funnels */}
          {channelMetrics.map((channel, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {channel.channel.toUpperCase()} Channel Engagement Funnel
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {/* Sent */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Sent</span>
                      <span className="text-sm text-gray-600">{formatNumber(channel.sent)} (100%)</span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: '100%' }} />
                    </div>
                  </div>

                  {/* Opened */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Opened</span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(channel.opened)} ({channel.open_rate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500" style={{ width: `${channel.open_rate}%` }} />
                    </div>
                  </div>

                  {/* Clicked */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Clicked</span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(channel.clicked)} ({channel.click_rate.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500" style={{ width: `${channel.click_rate}%` }} />
                    </div>
                  </div>

                  {/* Leads */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Leads Generated</span>
                      <span className="text-sm text-gray-600">
                        {formatNumber(channel.leads)} ({((channel.leads / channel.sent) * 100).toFixed(1)}%)
                      </span>
                    </div>
                    <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: `${(channel.leads / channel.sent) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Attribution Mode */}
      {viewMode === 'attribution' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Attribution by Campaign</CardTitle>
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
                    outerRadius={140}
                    label={(entry) => `${entry.contribution_percent.toFixed(1)}%`}
                  >
                    {attributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaign Attribution Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Campaign</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Contacts</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Deals</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Revenue</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">Contribution</th>
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
                        <td className="text-right py-3 px-4 font-semibold">{formatCurrency(touchpoint.revenue)}</td>
                        <td className="text-right py-3 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-600"
                                style={{ width: `${touchpoint.contribution_percent}%` }}
                              />
                            </div>
                            <span className="text-sm font-semibold text-gray-900 w-12">
                              {touchpoint.contribution_percent.toFixed(1)}%
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


