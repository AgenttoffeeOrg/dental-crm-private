'use client'

import { format, addDays, setHours, setMinutes, isToday, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock, CheckSquare, Phone, Mail, Users, DollarSign } from 'lucide-react'
import { CalendarActivity } from '@/lib/calendar/activity-aggregator'

interface CalendarWeekViewProps {
  weekStart: Date
  activities: CalendarActivity[]
  onActivityClick: (id: string, type: string) => void
}

export function CalendarWeekView({
  weekStart,
  activities,
  onActivityClick
}: CalendarWeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
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
          <div className="h-16 border-b" /> {/* Header spacer */}
          {hours.map((hour) => (
            <div key={hour} className="h-24 border-b flex items-start justify-end pr-2 pt-1">
              <span className="text-xs text-gray-500 font-medium">
                {format(setHours(new Date(), hour), 'h a')}
              </span>
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="flex-1 flex">
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="flex-1 border-r last:border-r-0">
              {/* Day header */}
              <div className={cn(
                "h-16 border-b flex flex-col items-center justify-center",
                isToday(day) && "bg-blue-50"
              )}>
                <span className="text-xs font-medium text-gray-600">
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "text-lg font-semibold",
                  isToday(day) ? "text-blue-600" : "text-gray-900"
                )}>
                  {format(day, 'd')}
                </span>
              </div>

              {/* Time slots */}
              <div className="relative">
                {hours.map((hour, hourIndex) => (
                  <div
                    key={hourIndex}
                    className="h-24 border-b"
                  />
                ))}

                {/* Activities overlay */}
                <div className="absolute inset-0 pointer-events-none px-1">
                  {activities
                    .filter(activity => {
                      return format(activity.start_time, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    })
                    .map((activity) => {
                      const { top, height } = getActivityPosition(activity)
                      const Icon = getActivityIcon(activity.type)

                      return (
                        <div
                          key={activity.id}
                          className="absolute left-1 right-1 pointer-events-auto cursor-pointer rounded-lg p-2 text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-xs"
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
                            <div className="font-semibold truncate">
                              {activity.title}
                            </div>
                          </div>
                          <div className="opacity-90 truncate">
                            {format(activity.start_time, 'h:mm a')}
                          </div>
                          {activity.contact_name && (
                            <div className="opacity-90 truncate">
                              {activity.contact_name}
                            </div>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

