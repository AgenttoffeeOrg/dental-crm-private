'use client'

import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'

interface CalendarMonthViewProps {
  month: Date
  appointments: any[]
  onAppointmentClick: (id: string) => void
  onDayClick: (date: Date) => void
}

export function CalendarMonthView({
  month,
  appointments,
  onAppointmentClick,
  onDayClick
}: CalendarMonthViewProps) {
  const monthStart = startOfMonth(month)
  const monthEnd = endOfMonth(month)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd })

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.start_at), day)
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
          const dayAppointments = getAppointmentsForDay(day)
          const isCurrentMonth = isSameMonth(day, month)
          const isTodayDate = isToday(day)

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
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
                {dayAppointments.length > 0 && (
                  <Badge variant="secondary" className="h-5 text-xs px-1.5">
                    {dayAppointments.length}
                  </Badge>
                )}
              </div>

              {/* Appointments */}
              <div className="space-y-1">
                {dayAppointments.slice(0, 3).map((apt) => {
                  const color = apt.appointment_type?.color || apt.provider?.calendar_color || '#3B82F6'
                  return (
                    <div
                      key={apt.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onAppointmentClick(apt.id)
                      }}
                      className="text-xs p-1 rounded truncate cursor-pointer hover:opacity-80 transition-opacity text-white"
                      style={{ backgroundColor: color }}
                    >
                      <span className="font-medium">
                        {format(new Date(apt.start_at), 'h:mm a')}
                      </span>
                      {' '}
                      {apt.contact?.full_name || apt.title}
                    </div>
                  )
                })}
                {dayAppointments.length > 3 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{dayAppointments.length - 3} more
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

