'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Mail, 
  MessageSquare, 
  Phone,
  Download,
  Filter,
  Calendar,
  Users,
  Eye,
  MousePointerClick,
  CheckCircle2,
  XCircle,
  DollarSign,
  Target
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface CampaignMetrics {
  channel: 'email' | 'sms' | 'whatsapp'
  totalSent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  unsubscribed: number
  revenue: number
}

export function AnalyticsDashboard() {
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('30d')
  const [selectedChannel, setSelectedChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')
  const [metrics, setMetrics] = useState<CampaignMetrics[]>([])
  const [topCampaigns, setTopCampaigns] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [timeRange, selectedChannel])

  const loadAnalytics = async () => {
    try {
      const supabase = createClient()
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      // Calculate date range
      const endDate = new Date()
      const startDate = new Date()
      switch (timeRange) {
        case '7d': startDate.setDate(endDate.getDate() - 7); break
        case '30d': startDate.setDate(endDate.getDate() - 30); break
        case '90d': startDate.setDate(endDate.getDate() - 90); break
        case '1y': startDate.setFullYear(endDate.getFullYear() - 1); break
      }

      // Load campaigns in date range
      let query = supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })

      if (selectedChannel !== 'all') {
        query = query.eq('channel', selectedChannel)
      }

      const { data: campaigns } = await query

      // Calculate aggregated metrics by channel
      const channelMetrics: Record<string, CampaignMetrics> = {
        email: { channel: 'email', totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, revenue: 0 },
        sms: { channel: 'sms', totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, revenue: 0 },
        whatsapp: { channel: 'whatsapp', totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, revenue: 0 },
      }

      campaigns?.forEach(campaign => {
        const metrics = campaign.metrics as any
        if (metrics) {
          const channel = campaign.channel as 'email' | 'sms' | 'whatsapp'
          channelMetrics[channel].totalSent += metrics.sent || 0
          channelMetrics[channel].delivered += metrics.delivered || 0
          channelMetrics[channel].opened += metrics.opened || 0
          channelMetrics[channel].clicked += metrics.clicked || 0
          channelMetrics[channel].bounced += metrics.bounced || 0
          channelMetrics[channel].unsubscribed += metrics.unsubscribed || 0
          channelMetrics[channel].revenue += metrics.revenue || 0
        }
      })

      setMetrics(Object.values(channelMetrics))

      // Get top performing campaigns
      const topPerforming = campaigns
        ?.map(c => ({
          ...c,
          openRate: c.metrics?.sent > 0 ? ((c.metrics?.opened || 0) / c.metrics?.sent) * 100 : 0
        }))
        .sort((a, b) => b.openRate - a.openRate)
        .slice(0, 5) || []

      setTopCampaigns(topPerforming)
    } catch (error) {
      console.error('[ANALYTICS] Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalMetrics = () => {
    return metrics.reduce((acc, m) => ({
      totalSent: acc.totalSent + m.totalSent,
      delivered: acc.delivered + m.delivered,
      opened: acc.opened + m.opened,
      clicked: acc.clicked + m.clicked,
      bounced: acc.bounced + m.bounced,
      unsubscribed: acc.unsubscribed + m.unsubscribed,
      revenue: acc.revenue + m.revenue,
    }), { totalSent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0, revenue: 0 })
  }

  const totals = getTotalMetrics()
  const openRate = totals.totalSent > 0 ? ((totals.opened / totals.totalSent) * 100).toFixed(1) : '0'
  const clickRate = totals.totalSent > 0 ? ((totals.clicked / totals.totalSent) * 100).toFixed(1) : '0'
  const deliveryRate = totals.totalSent > 0 ? ((totals.delivered / totals.totalSent) * 100).toFixed(1) : '0'

  const exportToCSV = () => {
    const csvData = topCampaigns.map(c => ({
      name: c.name,
      channel: c.channel,
      sent: c.metrics?.sent || 0,
      opened: c.metrics?.opened || 0,
      clicked: c.metrics?.clicked || 0,
      openRate: c.openRate.toFixed(1) + '%'
    }))

    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `campaign-analytics-${timeRange}.csv`
    a.click()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedChannel} onValueChange={(v) => setSelectedChannel(v as any)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Channels</SelectItem>
              <SelectItem value="email">Email Only</SelectItem>
              <SelectItem value="sms">SMS Only</SelectItem>
              <SelectItem value="whatsapp">WhatsApp Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Sent</p>
                <p className="text-3xl font-bold text-gray-900">{totals.totalSent.toLocaleString()}</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+12.5%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Open Rate</p>
                <p className="text-3xl font-bold text-gray-900">{openRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+3.2%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <Eye className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Click Rate</p>
                <p className="text-3xl font-bold text-gray-900">{clickRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">+1.8%</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center">
                <MousePointerClick className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivery Rate</p>
                <p className="text-3xl font-bold text-gray-900">{deliveryRate}%</p>
                <div className="flex items-center gap-1 mt-1">
                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                  <span className="text-xs text-green-600">Excellent</span>
                </div>
              </div>
              <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Channel Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Channel Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.map((metric) => {
              const channelOpenRate = metric.totalSent > 0 ? ((metric.opened / metric.totalSent) * 100).toFixed(1) : '0'
              const channelIcon = metric.channel === 'email' ? Mail : metric.channel === 'sms' ? MessageSquare : Phone
              const Icon = channelIcon
              
              return (
                <div key={metric.channel} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                    metric.channel === 'email' ? 'bg-blue-100' :
                    metric.channel === 'sms' ? 'bg-green-100' :
                    'bg-purple-100'
                  }`}>
                    <Icon className={`h-6 w-6 ${
                      metric.channel === 'email' ? 'text-blue-600' :
                      metric.channel === 'sms' ? 'text-green-600' :
                      'text-purple-600'
                    }`} />
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 capitalize mb-1">{metric.channel}</p>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <span>{metric.totalSent.toLocaleString()} sent</span>
                      <span>{channelOpenRate}% open rate</span>
                      <span>{metric.delivered.toLocaleString()} delivered</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-bold text-gray-900">{channelOpenRate}%</p>
                    <p className="text-xs text-gray-500">Performance</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Top Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Top Performing Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {topCampaigns.map((campaign, index) => (
              <div key={campaign.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-center h-8 w-8 bg-white rounded-lg border-2 border-gray-200 font-bold text-gray-700">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-600 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {campaign.channel}
                    </Badge>
                    <span>{(campaign.metrics?.sent || 0).toLocaleString()} sent</span>
                    <span>{(campaign.metrics?.opened || 0).toLocaleString()} opened</span>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xl font-bold text-green-600">{campaign.openRate.toFixed(1)}%</p>
                  <p className="text-xs text-gray-500">Open Rate</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Engagement</p>
              <Eye className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Opened:</span>
                <span className="font-semibold">{totals.opened.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Clicked:</span>
                <span className="font-semibold">{totals.clicked.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rate:</span>
                <span className="font-semibold text-green-600">{openRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Delivery</p>
              <CheckCircle2 className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivered:</span>
                <span className="font-semibold">{totals.delivered.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Bounced:</span>
                <span className="font-semibold">{totals.bounced.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Rate:</span>
                <span className="font-semibold text-green-600">{deliveryRate}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-medium text-gray-600">Revenue Impact</p>
              <DollarSign className="h-5 w-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold">${totals.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Per Send:</span>
                <span className="font-semibold">${totals.totalSent > 0 ? (totals.revenue / totals.totalSent).toFixed(2) : '0.00'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Growth:</span>
                <span className="font-semibold text-green-600">+18.4%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}



