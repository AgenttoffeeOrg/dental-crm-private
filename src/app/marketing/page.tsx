'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import Link from 'next/link'
import { 
  Mail, 
  MessageSquare,
  Phone,
  Users, 
  FileText, 
  GitBranch, 
  BarChart3,
  Send,
  Target,
  TrendingUp,
  TrendingDown,
  Plus,
  Layout,
  Sparkles,
  ArrowUpRight,
  Activity,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Zap,
  Rocket,
  Share2
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'

interface MarketingStats {
  totalContacts: number
  activeCampaigns: number
  emailsSentThisMonth: number
  smsSentThisMonth: number
  whatsappSentThisMonth: number
  avgOpenRate: number
  avgClickRate: number
  recentCampaigns: any[]
  upcomingCampaigns: any[]
}

export default function MarketingDashboard() {
  const { tenant } = useAuth()
  const [stats, setStats] = useState<MarketingStats>({
    totalContacts: 0,
    activeCampaigns: 0,
    emailsSentThisMonth: 0,
    smsSentThisMonth: 0,
    whatsappSentThisMonth: 0,
    avgOpenRate: 0,
    avgClickRate: 0,
    recentCampaigns: [],
    upcomingCampaigns: []
  })
  const [loading, setLoading] = useState(true)
  const [activeChannel, setActiveChannel] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')

  useEffect(() => {
    if (tenant?.id) {
      loadStats()
    }
  }, [tenant?.id])

  const loadStats = async () => {
    try {
      const supabase = createClient()
      const tenantId = tenant?.id || '550e8400-e29b-41d4-a716-446655440000'

      // Get total contacts with marketing consent
      const { count: contactCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)

      // Get active campaigns
      const { data: campaigns, count: activeCampaignsCount } = await supabase
        .from('marketing_campaigns')
        .select('*', { count: 'exact' })
        .eq('tenant_id', tenantId)
        .in('status', ['active', 'scheduled'])

      // Get campaign metrics for this month
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const { data: monthCampaigns } = await supabase
        .from('marketing_campaigns')
        .select('channel, metrics')
        .eq('tenant_id', tenantId)
        .gte('sent_at', startOfMonth.toISOString())

      let emailsSent = 0
      let smsSent = 0
      let whatsappSent = 0
      let totalOpens = 0
      let totalClicks = 0
      let totalSends = 0

      monthCampaigns?.forEach(campaign => {
        const metrics = campaign.metrics as any
        if (metrics) {
          if (campaign.channel === 'email') {
            emailsSent += metrics.sent || 0
            totalOpens += metrics.opened || 0
            totalClicks += metrics.clicked || 0
            totalSends += metrics.sent || 0
          } else if (campaign.channel === 'sms') {
            smsSent += metrics.sent || 0
          } else if (campaign.channel === 'whatsapp') {
            whatsappSent += metrics.sent || 0
          }
        }
      })

      // Get recent campaigns
      const { data: recentCampaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get upcoming campaigns
      const { data: upcomingCampaigns } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'scheduled')
        .order('scheduled_send_time', { ascending: true })
        .limit(5)

      setStats({
        totalContacts: contactCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        emailsSentThisMonth: emailsSent,
        smsSentThisMonth: smsSent,
        whatsappSentThisMonth: whatsappSent,
        avgOpenRate: totalSends > 0 ? (totalOpens / totalSends) * 100 : 0,
        avgClickRate: totalSends > 0 ? (totalClicks / totalSends) * 100 : 0,
        recentCampaigns: recentCampaigns || [],
        upcomingCampaigns: upcomingCampaigns || []
      })
    } catch (error) {
      console.error('[MARKETING] Error loading stats:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-blue-50/30">
        <div className="p-8 max-w-[1600px] mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
                <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Rocket className="h-7 w-7 text-white" />
                </div>
                Marketing Hub
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Multi-channel campaigns, automation & analytics in one place</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/marketing/reports">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Reports
                </Link>
              </Button>
              <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" asChild>
                <Link href="/marketing/campaigns/create">
                  <Plus className="h-4 w-4 mr-2" />
                  New Campaign
                </Link>
              </Button>
            </div>
          </div>

          {/* Channel Tabs */}
          <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as any)} className="w-full">
            <TabsList className="grid w-full max-w-2xl grid-cols-4 h-12">
              <TabsTrigger value="all" className="text-base">
                <Activity className="h-4 w-4 mr-2" />
                All Channels
              </TabsTrigger>
              <TabsTrigger value="email" className="text-base">
                <Mail className="h-4 w-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="text-base">
                <MessageSquare className="h-4 w-4 mr-2" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="text-base">
                <Phone className="h-4 w-4 mr-2" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            {/* All Channels Tab */}
            <TabsContent value="all" className="space-y-6 mt-6">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-white hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600 mb-1">Total Contacts</p>
                        <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.totalContacts.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          Ready for marketing
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-gradient-to-br from-green-50 to-white hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600 mb-1">Active Campaigns</p>
                        <p className="text-3xl font-bold text-gray-900">{loading ? '...' : stats.activeCampaigns}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <Activity className="h-3 w-3 text-green-600" />
                          Currently running
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Send className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600 mb-1">Avg Open Rate</p>
                        <p className="text-3xl font-bold text-gray-900">{loading ? '...' : `${stats.avgOpenRate.toFixed(1)}%`}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          This month
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Mail className="h-6 w-6 text-purple-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-white hover:shadow-lg transition-all cursor-pointer group">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600 mb-1">Avg Click Rate</p>
                        <p className="text-3xl font-bold text-gray-900">{loading ? '...' : `${stats.avgClickRate.toFixed(1)}%`}</p>
                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-600" />
                          Engagement
                        </p>
                      </div>
                      <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* This Month Stats */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-gray-600" />
                        This Month's Activity
                      </CardTitle>
                      <CardDescription>Messages sent across all channels</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-sm">
                      {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                      <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.emailsSentThisMonth.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">Emails Sent</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                      <div className="h-12 w-12 bg-green-600 rounded-lg flex items-center justify-center">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.smsSentThisMonth.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">SMS Sent</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 p-4 bg-purple-50 rounded-lg">
                      <div className="h-12 w-12 bg-purple-600 rounded-lg flex items-center justify-center">
                        <Phone className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">{stats.whatsappSentThisMonth.toLocaleString()}</p>
                        <p className="text-sm text-gray-600">WhatsApp Sent</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Two Column Layout */}
              <div className="grid grid-cols-2 gap-6">
                {/* Recent Campaigns */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-600" />
                        Recent Campaigns
                      </CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/marketing/campaigns">
                          View All
                          <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stats.recentCampaigns.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Send className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No campaigns yet</p>
                        <Button variant="link" asChild className="mt-2">
                          <Link href="/marketing/campaigns/create">Create your first campaign</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {stats.recentCampaigns.map((campaign) => (
                          <div key={campaign.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                                campaign.channel === 'email' ? 'bg-blue-100' :
                                campaign.channel === 'sms' ? 'bg-green-100' :
                                'bg-purple-100'
                              }`}>
                                {campaign.channel === 'email' ? <Mail className="h-5 w-5 text-blue-600" /> :
                                 campaign.channel === 'sms' ? <MessageSquare className="h-5 w-5 text-green-600" /> :
                                 <Phone className="h-5 w-5 text-purple-600" />}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{campaign.name}</p>
                                <p className="text-xs text-gray-500">
                                  {campaign.status === 'sent' ? 'Sent' : campaign.status === 'active' ? 'Active' : 'Draft'}
                                  {campaign.sent_at && ` • ${new Date(campaign.sent_at).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <Badge variant={
                              campaign.status === 'sent' ? 'default' :
                              campaign.status === 'active' ? 'default' :
                              'secondary'
                            } className="text-xs">
                              {campaign.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Campaigns */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-gray-600" />
                        Scheduled Campaigns
                      </CardTitle>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/marketing/campaigns?filter=scheduled">
                          View All
                          <ArrowUpRight className="h-4 w-4 ml-1" />
                        </Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stats.upcomingCampaigns.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm">No scheduled campaigns</p>
                        <Button variant="link" asChild className="mt-2">
                          <Link href="/marketing/campaigns/create">Schedule a campaign</Link>
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {stats.upcomingCampaigns.map((campaign) => (
                          <div key={campaign.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer border border-amber-200">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
                                <Clock className="h-5 w-5 text-amber-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{campaign.name}</p>
                                <p className="text-xs text-gray-600">
                                  Scheduled for {new Date(campaign.scheduled_send_time).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <CheckCircle2 className="h-5 w-5 text-amber-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Email Channel Tab */}
            <TabsContent value="email" className="space-y-6 mt-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <Mail className="h-16 w-16 mx-auto mb-4 text-blue-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Email Marketing</h3>
                  <p className="text-gray-600 mb-4">
                    {stats.emailsSentThisMonth.toLocaleString()} emails sent this month
                  </p>
                  <Button asChild>
                    <Link href="/marketing/campaigns/create?channel=email">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Email Campaign
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SMS Channel Tab */}
            <TabsContent value="sms" className="space-y-6 mt-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="h-16 w-16 mx-auto mb-4 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">SMS Marketing</h3>
                  <p className="text-gray-600 mb-4">
                    {stats.smsSentThisMonth.toLocaleString()} SMS sent this month
                  </p>
                  <Button asChild>
                    <Link href="/marketing/campaigns/create?channel=sms">
                      <Plus className="h-4 w-4 mr-2" />
                      Create SMS Campaign
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* WhatsApp Channel Tab */}
            <TabsContent value="whatsapp" className="space-y-6 mt-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <Phone className="h-16 w-16 mx-auto mb-4 text-purple-600" />
                  <h3 className="text-xl font-bold text-gray-900 mb-2">WhatsApp Marketing</h3>
                  <p className="text-gray-600 mb-4">
                    {stats.whatsappSentThisMonth.toLocaleString()} WhatsApp messages sent this month
                  </p>
                  <Button asChild>
                    <Link href="/marketing/campaigns/create?channel=whatsapp">
                      <Plus className="h-4 w-4 mr-2" />
                      Create WhatsApp Campaign
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

              {/* Quick Access Tools */}
              <div className="grid grid-cols-4 gap-4">
                <Link href="/marketing/audiences">
                  <Card className="cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                          <Target className="h-6 w-6 text-blue-600 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Audiences</p>
                          <p className="text-sm text-gray-600">Manage segments</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/marketing/templates">
                  <Card className="cursor-pointer hover:shadow-lg hover:border-purple-300 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                          <Layout className="h-6 w-6 text-purple-600 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Templates</p>
                          <p className="text-sm text-gray-600">Design & manage</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/marketing/journeys">
                  <Card className="cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-orange-100 rounded-xl flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                          <GitBranch className="h-6 w-6 text-orange-600 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Automation</p>
                          <p className="text-sm text-gray-600">Build journeys</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href="/marketing/social-media">
                  <Card className="cursor-pointer hover:shadow-lg hover:border-pink-300 transition-all group">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-br from-pink-100 to-purple-100 rounded-xl flex items-center justify-center group-hover:from-pink-600 group-hover:to-purple-600 transition-colors">
                          <Share2 className="h-6 w-6 text-pink-600 group-hover:text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Social Media</p>
                          <p className="text-sm text-gray-600">Post & engage</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
