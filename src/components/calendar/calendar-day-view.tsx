'use client'

import { format, setHours, setMinutes, isWithinInterval, isSameHour, isSameMinute } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckSquare, Phone, Mail, Users, DollarSign } from 'lucide-react'
import { CalendarActivity } from '@/lib/calendar/activity-aggregator'

interface CalendarDayViewProps {
  date: Date
  activities: CalendarActivity[]
  onActivityClick: (id: string, type: string) => void
}

export function CalendarDayView({
  date,
  activities,
  onActivityClick
}: CalendarDayViewProps) {
  // Generate time slots from 7 AM to 7 PM (30-minute intervals)
  const hours = Array.from({ length: 13 }, (_, i) => 7 + i) // 7 AM to 7 PM

  const getActivityPosition = (activity: CalendarActivity) => {
    const start = activity.start_time
    const startHour = start.getHours()
    const startMinute = start.getMinutes()
    const top = ((startHour - 7) * 2 + startMinute / 30) * 3 // 3rem per 30min slot

    const duration = activity.duration_minutes || 30
    const height = (duration / 30) * 3 // 3rem per 30min

    return { top: `${top}rem`, height: `${height}rem` }
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

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="flex">
        {/* Time column */}
        <div className="w-20 flex-shrink-0 border-r">
          <div className="h-12 border-b" /> {/* Header spacer */}
          {hours.map((hour) => (
            <div key={hour} className="h-24 border-b flex items-start justify-end pr-2 pt-1">
              <span className="text-xs text-gray-500 font-medium">
                {format(setHours(new Date(), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="flex-1 relative">
          {/* Header */}
          <div className="h-12 border-b bg-gray-50 flex items-center justify-center">
            <span className="font-semibold text-gray-900">
              {format(date, 'EEEE, MMMM d')}
            </span>
          </div>

          {/* Time slots grid */}
          <div className="relative">
            {hours.map((hour) => (
              <div
                key={hour}
                className="h-12 border-b"
              />
            ))}

            {/* Activities overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {activities.map((activity) => {
                const { top, height } = getActivityPosition(activity)
                const Icon = getActivityIcon(activity.type)

                return (
                  <div
                    key={activity.id}
                    className="absolute left-1 right-1 pointer-events-auto cursor-pointer rounded-lg p-2 text-white shadow-md hover:shadow-lg transition-all overflow-hidden"
                    style={{
                      top,
                      height,
                      backgroundColor: activity.color,
                      minHeight: '3rem'
                    }}
                    onClick={() => onActivityClick(activity.id, activity.type)}
                  >
                    <div className="flex items-center gap-1">
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      <div className="text-sm font-semibold truncate">
                        {activity.title}
                      </div>
                    </div>
                    <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(activity.start_time, 'h:mm a')}
                      {activity.duration_minutes && ` (${activity.duration_minutes}m)`}
                    </div>
                    {activity.contact_name && (
                      <div className="text-xs opacity-90 truncate mt-1">
                        {activity.contact_name}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

