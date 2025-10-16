'use client'

import { format, isSameDay, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckSquare, Phone, Mail, Users, DollarSign } from 'lucide-react'
import { CalendarActivity } from '@/lib/calendar/activity-aggregator'

interface CalendarAgendaViewProps {
  startDate: Date
  activities: CalendarActivity[]
  onActivityClick: (id: string, type: string) => void
}

export function CalendarAgendaView({
  startDate,
  activities,
  onActivityClick
}: CalendarAgendaViewProps) {
  // Group activities by date
  const days = Array.from({ length: 30 }, (_, i) => addDays(startDate, i))

  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity =>
      isSameDay(activity.start_time, day)
    ).sort((a, b) => a.start_time.getTime() - b.start_time.getTime())
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task': return CheckSquare
      case 'call': return Phone
      case 'email': return Mail
      case 'meeting': return Users
      case 'deal': return DollarSign
      default: return Clock
    }
  }

  const getActivityTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1)
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {days.map((day) => {
        const dayActivities = getActivitiesForDay(day)
        if (dayActivities.length === 0) return null

        return (
          <div key={day.toISOString()}>
            {/* Date header */}
            <div className="sticky top-0 z-10 bg-gray-50 border-l-4 border-blue-500 px-4 py-2 mb-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-600">
                    {format(day, 'EEEE')}
                  </div>
                  <div className="text-lg font-bold text-gray-900">
                    {format(day, 'MMMM d, yyyy')}
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm">
                  {dayActivities.length} {dayActivities.length === 1 ? 'activity' : 'activities'}
                </Badge>
              </div>
            </div>

            {/* Activities list */}
            <div className="space-y-3">
              {dayActivities.map((activity) => {
                const Icon = getActivityIcon(activity.type)

                return (
                  <div
                    key={activity.id}
                    onClick={() => onActivityClick(activity.id, activity.type)}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Type indicator */}
                      <div
                        className="w-1 h-full rounded-full"
                        style={{ backgroundColor: activity.color }}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4" style={{ color: activity.color }} />
                              <div className="font-semibold text-lg text-gray-900">
                                {activity.title}
                              </div>
                            </div>
                            <div className="text-sm text-gray-600">
                              {getActivityTypeLabel(activity.type)}
                            </div>
                          </div>
                          {activity.status && (
                            <Badge variant="secondary" className="text-xs">
                              {activity.status}
                            </Badge>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(activity.start_time, 'h:mm a')}
                              {activity.duration_minutes && ` (${activity.duration_minutes} min)`}
                            </span>
                          </div>

                          {activity.contact_name && (
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4" />
                              <span>{activity.contact_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Description */}
                        {activity.description && (
                          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                            {activity.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {activities.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg">No activities scheduled</p>
          <p className="text-sm">Your calendar is clear!</p>
        </div>
      )}
    </div>
  )
}

