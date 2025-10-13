'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Phone,
  Mail,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Download
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

interface CommunicationsAnalyticsDashboardProps {
  tenantId?: string
  dateRange?: 'today' | 'week' | 'month' | 'quarter' | 'year'
}

export function CommunicationsAnalyticsDashboard({
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  dateRange = 'month'
}: CommunicationsAnalyticsDashboardProps) {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({
    total_activities: 0,
    emails_sent: 0,
    calls_made: 0,
    sms_sent: 0,
    whatsapp_sent: 0,
    avg_response_time_hours: 0,
    email_response_rate: 0,
    call_connect_rate: 0
  })
  const [teamStats, setTeamStats] = useState<any[]>([])

  useEffect(() => {
    loadAnalytics()
  }, [dateRange])

  const loadAnalytics = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Load aggregate stats
      const { data: activities } = await supabase
        .from('activities')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('created_at', getDateRangeStart())

      if (activities) {
        const emails = activities.filter(a => a.type === 'email')
        const calls = activities.filter(a => a.type === 'call')
        const sms = activities.filter(a => a.type === 'sms')
        const whatsapp = activities.filter(a => a.type === 'whatsapp')

        setStats({
          total_activities: activities.length,
          emails_sent: emails.length,
          calls_made: calls.length,
          sms_sent: sms.length,
          whatsapp_sent: whatsapp.length,
          avg_response_time_hours: 2.5, // TODO: Calculate from actual data
          email_response_rate: 68, // TODO: Calculate
          call_connect_rate: Math.round((calls.filter(c => c.outcome === 'connected').length / calls.length) * 100) || 0
        })
      }

      // Load team member stats
      const { data: teamData } = await supabase
        .from('app_users')
        .select('id, full_name')
        .eq('tenant_id', tenantId)

      if (teamData) {
        const teamStatsData = await Promise.all(
          teamData.map(async (user) => {
            const { data: userActivities } = await supabase
              .from('activities')
              .select('*')
              .eq('agent_user_id', user.id)
              .gte('created_at', getDateRangeStart())

            return {
              user_name: user.full_name,
              total: userActivities?.length || 0,
              calls: userActivities?.filter(a => a.type === 'call').length || 0,
              emails: userActivities?.filter(a => a.type === 'email').length || 0
            }
          })
        )

        setTeamStats(teamStatsData.sort((a, b) => b.total - a.total))
      }
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getDateRangeStart = () => {
    const now = new Date()
    const ranges = {
      today: new Date(now.setHours(0, 0, 0, 0)),
      week: new Date(now.setDate(now.getDate() - 7)),
      month: new Date(now.setMonth(now.getMonth() - 1)),
      quarter: new Date(now.setMonth(now.getMonth() - 3)),
      year: new Date(now.setFullYear(now.getFullYear() - 1))
    }
    return ranges[dateRange].toISOString()
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading analytics...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communications Analytics</h2>
          <p className="text-gray-600 mt-1">Track your team's communication performance</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Activities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total_activities}</div>
            <p className="text-xs text-gray-600 mt-1">All communications</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{stats.emails_sent}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-xs text-green-600">+12% vs last period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.calls_made}</div>
            <p className="text-xs text-gray-600 mt-1">{stats.call_connect_rate}% connect rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{stats.sms_sent + stats.whatsapp_sent}</div>
            <p className="text-xs text-gray-600 mt-1">SMS + WhatsApp</p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Email Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Response Rate</span>
              <Badge variant="outline">{stats.email_response_rate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Response Time</span>
              <Badge variant="outline">{stats.avg_response_time_hours}h</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Open Rate</span>
              <Badge variant="outline">Coming Soon</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Call Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Connect Rate</span>
              <Badge variant="outline" className="bg-green-50 text-green-700">{stats.call_connect_rate}%</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Avg Duration</span>
              <Badge variant="outline">8m 32s</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Voicemail Rate</span>
              <Badge variant="outline">23%</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Message Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">SMS Sent</span>
              <Badge variant="outline">{stats.sms_sent}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">WhatsApp Sent</span>
              <Badge variant="outline">{stats.whatsapp_sent}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Delivery Rate</span>
              <Badge variant="outline">98%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Team Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {teamStats.map((member, idx) => (
              <div key={idx} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 flex-1">
                  <Badge variant={idx === 0 ? 'default' : 'outline'} className="w-8 h-8 rounded-full flex items-center justify-center">
                    {idx + 1}
                  </Badge>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.user_name}</p>
                    <p className="text-xs text-gray-600">{member.total} total activities</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="font-medium text-blue-600">{member.emails}</p>
                    <p className="text-xs text-gray-500">Emails</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium text-green-600">{member.calls}</p>
                    <p className="text-xs text-gray-500">Calls</p>
                  </div>
                </div>
              </div>
            ))}
            {teamStats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No team activity data yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

