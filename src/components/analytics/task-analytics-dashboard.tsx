'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  TrendingUp, 
  TrendingDown,
  CheckCircle2,
  Clock,
  AlertCircle,
  Award
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'

export function TaskAnalyticsDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [userStats, setUserStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Overall stats
      const { data: allTasks } = await supabase
        .from('tasks')
        .select('*')

      const { data: completedTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('status', 'done')

      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*')
        .lt('due_at', new Date().toISOString())
        .neq('status', 'done')

      // Calculate completion rate
      const totalTasks = allTasks?.length || 0
      const completed = completedTasks?.length || 0
      const completionRate = totalTasks > 0 ? (completed / totalTasks) * 100 : 0

      // Calculate average time to complete
      const completedWithDates = completedTasks?.filter(t => t.created_at && t.completed_at) || []
      const avgTimeToComplete = completedWithDates.length > 0
        ? completedWithDates.reduce((sum, task) => {
            const created = new Date(task.created_at)
            const completed = new Date(task.completed_at)
            return sum + (completed.getTime() - created.getTime())
          }, 0) / completedWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0

      setStats({
        total: totalTasks,
        completed,
        overdue: overdueTasks?.length || 0,
        completionRate,
        avgTimeToComplete
      })

      // User-level stats
      const { data: users } = await supabase
        .from('app_users')
        .select('*')

      const userStatsData = await Promise.all((users || []).map(async (user) => {
        const { data: userTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('assignee_user_id', user.id)

        const { data: userCompleted } = await supabase
          .from('tasks')
          .select('*')
          .eq('assignee_user_id', user.id)
          .eq('status', 'done')

        const userTotal = userTasks?.length || 0
        const userCompletedCount = userCompleted?.length || 0
        const userCompletionRate = userTotal > 0 ? (userCompletedCount / userTotal) * 100 : 0

        return {
          user,
          total: userTotal,
          completed: userCompletedCount,
          completionRate: userCompletionRate
        }
      }))

      setUserStats(userStatsData.sort((a, b) => b.completionRate - a.completionRate))
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    )
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Task Analytics</h2>
        <p className="text-gray-500 mt-1">Performance metrics and insights</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Tasks</CardDescription>
            <CardTitle className="text-3xl">{stats?.total || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span>All time</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Completed</CardDescription>
            <CardTitle className="text-3xl text-green-600">{stats?.completed || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={stats?.completionRate || 0} className="h-2" />
            <p className="text-xs text-gray-600 mt-2">
              {stats?.completionRate?.toFixed(1)}% completion rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Overdue</CardDescription>
            <CardTitle className="text-3xl text-red-600">{stats?.overdue || 0}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-red-600">
              <AlertCircle className="h-4 w-4" />
              <span>Needs attention</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg. Time to Complete</CardDescription>
            <CardTitle className="text-3xl">{stats?.avgTimeToComplete?.toFixed(1) || 0}d</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>Days on average</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
          <CardDescription>Task completion by team member</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {userStats.map((stat, index) => (
              <div key={stat.user.id} className="flex items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  {index === 0 && (
                    <Award className="h-5 w-5 text-yellow-500" />
                  )}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                      {getInitials(stat.user.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{stat.user.full_name}</p>
                    <p className="text-xs text-gray-500">
                      {stat.completed} of {stat.total} tasks completed
                    </p>
                  </div>
                </div>
                <div className="w-32">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{stat.completionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={stat.completionRate} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

