'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, RefreshCw } from 'lucide-react'
import { getActivityMessage, getActivityIcon, getActivityColor } from '@/lib/activity-tracker'
import { formatDateTime } from '@/lib/dates'

interface ActivityLogItem {
  id: string
  user_id: string
  action_type: string
  entity_type: string
  entity_id: string
  details: Record<string, any>
  created_at: string
  user?: {
    id: string
    full_name: string
    role: string
  }
}

export function ActivityFeedTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [activities, setActivities] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    loadActivities()
  }, [tenantId])

  const loadActivities = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('user_activity_log')
        .select(`
          *,
          user:app_users(id, full_name, role)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setActivities(data || [])
    } catch (error) {
      console.error('Error loading activities:', JSON.stringify(error, null, 2))
      // Gracefully fail - show empty state
      setActivities([])
      // Don't show error to user - empty state is fine
    } finally {
      setLoading(false)
    }
  }

  const getColorClass = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-800 border-green-200'
      case 'blue': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'purple': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'red': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Feed
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            See what your team has been working on
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={loadActivities} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
          <CardDescription>Last 50 actions across your practice</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-gray-300" />
              <p>Loading activities...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No activities yet</p>
              <p className="text-sm text-gray-400">
                Activity will appear here as your team works
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => {
                const userName = activity.user?.full_name || 'Unknown User'
                const message = getActivityMessage(activity.action_type as any, userName, activity.details)
                const icon = getActivityIcon(activity.action_type as any)
                const color = getActivityColor(activity.action_type as any)

                return (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {/* Icon */}
                    <div className={`h-8 w-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${getColorClass(color)}`}>
                      <span className="text-sm">{icon}</span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(activity.created_at)}
                        </span>
                        {activity.user?.role && (
                          <>
                            <span className="text-gray-300">•</span>
                            <Badge variant="outline" className="text-xs">
                              {activity.user.role}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {/* User Avatar */}
                    {activity.user && (
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs bg-purple-100 text-purple-700">
                          {activity.user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      {activities.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Activity Stats (Last 50)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {activities.filter(a => a.action_type.includes('created')).length}
                </div>
                <div className="text-xs text-gray-600">Items Created</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {activities.filter(a => a.action_type.includes('updated')).length}
                </div>
                <div className="text-xs text-gray-600">Items Updated</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {activities.filter(a => a.action_type === 'deal_assigned').length}
                </div>
                <div className="text-xs text-gray-600">Deals Assigned</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {activities.filter(a => a.action_type === 'task_completed').length}
                </div>
                <div className="text-xs text-gray-600">Tasks Completed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

