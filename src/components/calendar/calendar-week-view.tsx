'use client'

import { format, addDays, setHours, setMinutes, isWithinInterval, isSameHour, isSameMinute, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock, MapPin, User } from 'lucide-react'

interface CalendarWeekViewProps {
  weekStart: Date
  appointments: any[]
  providers: any[]
  onAppointmentClick: (id: string) => void
  onSlotClick: (date: Date) => void
}

export function CalendarWeekView({
  weekStart,
  appointments,
  providers,
  onAppointmentClick,
  onSlotClick
}: CalendarWeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 13 }, (_, i) => 7 + i) // 7 AM to 7 PM

  const getAppointmentsForDaySlot = (day: Date, hour: number) => {
    const slotStart = setMinutes(setHours(new Date(day), hour), 0)
    const slotEnd = setMinutes(setHours(new Date(day), hour), 59)

    return appointments.filter(apt => {
      const aptStart = new Date(apt.start_at)
      return aptStart >= slotStart && aptStart <= slotEnd
    })
  }

  const getAppointmentPosition = (appointment: any, dayStart: Date) => {
    const start = new Date(appointment.start_at)
    const startHour = start.getHours()
    const startMinute = start.getMinutes()
    const top = ((startHour - 7) * 2 + startMinute / 30) * 3 // 3rem per 30min slot

    const duration = appointment.duration_minutes || 30
    const height = (duration / 30) * 3 // 3rem per 30min

    return { top: `${top}rem`, height: `${height}rem` }
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
                    className="h-24 border-b hover:bg-blue-50 cursor-pointer transition-colors"
                    onClick={() => onSlotClick(setHours(new Date(day), hour))}
                  />
                ))}

                {/* Appointments overlay */}
                <div className="absolute inset-0 pointer-events-none px-1">
                  {appointments
                    .filter(apt => {
                      const aptDate = new Date(apt.start_at)
                      return format(aptDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')
                    })
                    .map((apt) => {
                      const { top, height } = getAppointmentPosition(apt, day)
                      const color = apt.appointment_type?.color || apt.provider?.calendar_color || '#3B82F6'

                      return (
                        <div
                          key={apt.id}
                          className="absolute left-1 right-1 pointer-events-auto cursor-pointer rounded-lg p-2 text-white shadow-md hover:shadow-lg transition-all overflow-hidden text-xs"
                          style={{
                            top,
                            height,
                            backgroundColor: color,
                            minHeight: '3rem'
                          }}
                          onClick={() => onAppointmentClick(apt.id)}
                        >
                          <div className="font-semibold truncate">
                            {apt.contact?.full_name || apt.title}
                          </div>
                          <div className="opacity-90 truncate">
                            {format(new Date(apt.start_at), 'h:mm a')}
                          </div>
                          {apt.provider && (
                            <div className="opacity-90 truncate">
                              {apt.provider.name}
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

