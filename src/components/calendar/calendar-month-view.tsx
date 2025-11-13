'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { CalendarActivity } from '@/lib/calendar/activity-aggregator'

interface CalendarMonthViewProps {
  month: Date
  activities: CalendarActivity[]
  onActivityClick: (id: string, type: string) => void
  onDayClick: (date: Date) => void
}

export function CalendarMonthView({
  month,
  activities,
  onActivityClick,
  onDayClick
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getActivitiesForDay = (day: Date) => {
    return activities.filter(activity =>
      isSameDay(activity.start_time, day)
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b bg-gray-50">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} className="p-3 text-center text-sm font-medium text-gray-600">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayActivities = getActivitiesForDay(day)
          const isCurrentMonth = isSameMonth(day, month)
          const isTodayDate = isToday(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onDayClick(day)
                }
              }}
              role="button"
              tabIndex={0}
              aria-label={`Select date ${day.toLocaleDateString()}`}
              className={cn(
                "min-h-[120px] p-2 border-r border-b cursor-pointer hover:bg-gray-50 transition-colors",
                !isCurrentMonth && "bg-gray-50/50 text-gray-400",
                isTodayDate && "bg-blue-50 border-2 border-blue-500"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn(
                  "text-sm font-medium",
                  isTodayDate && "text-blue-600 font-bold"
                )}>
                  {format(day, 'd')}
                </span>
                {dayActivities.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs px-1.5">
                    {dayActivities.length}
                  </Badge>
                )}
              </div>

              {/* Activities */}
              <div className="space-y-1">
                {dayActivities.slice(0, 3).map((activity) => {
                  return (
                    <div
                      key={activity.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onActivityClick(activity.id, activity.type)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          e.stopPropagation()
                          onActivityClick(activity.id, activity.type)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`View ${activity.type} activity`}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity text-white"
                      style={{ backgroundColor: activity.color }}
                    >
                      <span className="font-medium">
                        {format(activity.start_time, 'h:mm a')}
                      </span>
                      {' '}
                      {activity.title}
                    </div>
                  )
                })}
                {dayActivities.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayActivities.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

