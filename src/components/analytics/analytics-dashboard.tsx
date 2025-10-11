'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  TrendingUp, 
  Users, 
  CheckSquare, 
  AlertTriangle,
  DollarSign,
  Calendar
} from 'lucide-react'
import { toast } from 'sonner'
import { getActivityAge, formatDate } from '@/lib/dates'
import type { DealWithRelations, Task, PipelineStage } from '@/types/database'

interface AnalyticsData {
  totalDeals: number
  totalValue: number
  dealsByStage: Array<{ stage: string; count: number; value: number }>
  openTasks: number
  overdueTasks: number
  staleDeals: DealWithRelations[]
  recentActivities: number
}

interface AnalyticsDashboardProps {
  tenantId?: string
}

export function AnalyticsDashboard({ tenantId = process.env.DEFAULT_TENANT_ID }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch deals with related data
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select(`
          *,
          contact:contacts(*),
          stage:pipeline_stages(*)
        `)
        .eq('tenant_id', tenantId)

      if (dealsError) throw dealsError

      // Fetch tasks
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .eq('tenant_id', tenantId)

      if (tasksError) throw tasksError

      // Fetch pipeline stages
      const { data: stagesData, error: stagesError } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('position')

      if (stagesError) throw stagesError

      // Fetch recent activities count (last 30 days)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { count: activitiesCount, error: activitiesError } = await supabase
        .from('activities')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (activitiesError) throw activitiesError

      // Process data
      const deals = dealsData as DealWithRelations[] || []
      const tasks = tasksData as Task[] || []
      const stages = stagesData as PipelineStage[] || []

      const totalValue = deals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)
      
      const dealsByStage = stages.map(stage => {
        const stageDeals = deals.filter(deal => deal.stage_id === stage.id)
        const stageValue = stageDeals.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0)
        return {
          stage: stage.name,
          count: stageDeals.length,
          value: stageValue
        }
      })

      const openTasks = tasks.filter(task => task.status === 'open' || task.status === 'in_progress').length
      const overdueTasks = tasks.filter(task => 
        task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done'
      ).length

      // Stale deals (no activity in 7+ days)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const staleDeals = deals
        .filter(deal => new Date(deal.last_activity_at) < sevenDaysAgo)
        .sort((a, b) => new Date(a.last_activity_at).getTime() - new Date(b.last_activity_at).getTime())
        .slice(0, 10) // Top 10 stale deals

      setData({
        totalDeals: deals.length,
        totalValue,
        dealsByStage,
        openTasks,
        overdueTasks,
        staleDeals,
        recentActivities: activitiesCount || 0
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
      toast.error('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [tenantId])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading analytics...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">No data available</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalDeals}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(data.totalValue)} total value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.openTasks}</div>
            <p className="text-xs text-muted-foreground">
              {data.overdueTasks} overdue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.recentActivities}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stale Deals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.staleDeals.length}</div>
            <p className="text-xs text-muted-foreground">
              No activity 7+ days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pipeline Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.dealsByStage.map(stage => (
              <div key={stage.stage} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{stage.stage}</div>
                  <Badge variant="secondary">{stage.count} deals</Badge>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(stage.value)}</div>
                  <div className="text-sm text-gray-500">
                    {stage.count > 0 ? formatCurrency(stage.value / stage.count) : '£0'} avg
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stale Deals Table */}
      {data.staleDeals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Stale Deals</CardTitle>
            <p className="text-sm text-gray-600">
              Deals with no activity in the last 7 days
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deal</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.staleDeals.map(deal => (
                  <TableRow key={deal.id}>
                    <TableCell>
                      <div className="font-medium">{deal.title}</div>
                      {deal.treatment_tags.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {deal.treatment_tags.slice(0, 2).map(tag => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {deal.treatment_tags.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{deal.treatment_tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{deal.contact.full_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{deal.stage.name}</Badge>
                    </TableCell>
                    <TableCell>
                      {deal.value_estimate_cents > 0 
                        ? formatCurrency(deal.value_estimate_cents)
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="destructive">
                        {getActivityAge(deal.last_activity_at)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {data.totalDeals === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No deals yet</h3>
            <p className="text-gray-600 mb-4">
              Create your first deal to start seeing analytics data
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
