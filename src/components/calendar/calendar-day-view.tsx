'use client'

import { format, setHours, setMinutes, isWithinInterval, isSameHour, isSameMinute } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, User } from 'lucide-react'

interface CalendarDayViewProps {
  date: Date
  appointments: any[]
  providers: any[]
  onAppointmentClick: (id: string) => void
  onSlotClick: (date: Date) => void
}

export function CalendarDayView({
  date,
  appointments,
  providers,
  onAppointmentClick,
  onSlotClick
}: CalendarDayViewProps) {
  // Generate time slots from 7 AM to 7 PM (30-minute intervals)
  const hours = Array.from({ length: 13 }, (_, i) => 7 + i) // 7 AM to 7 PM
  const slots = hours.flatMap(hour =>
    [0, 30].map(minute => setMinutes(setHours(new Date(date), hour), minute))
  )

  const getAppointmentsForSlot = (slotTime: Date) => {
    return appointments.filter(apt => {
      const aptStart = new Date(apt.start_at)
      const aptEnd = new Date(apt.end_at)
      return isWithinInterval(slotTime, { start: aptStart, end: aptEnd }) ||
        (isSameHour(slotTime, aptStart) && isSameMinute(slotTime, aptStart))
    })
  }

  const getAppointmentPosition = (appointment: any) => {
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
            {slots.map((slot, i) => (
              <div
                key={i}
                className={cn(
                  "h-12 border-b hover:bg-blue-50 cursor-pointer transition-colors",
                  i % 2 === 1 && "border-dashed"
                )}
                onClick={() => onSlotClick(slot)}
              />
            ))}

            {/* Appointments overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {appointments.map((apt) => {
                const { top, height } = getAppointmentPosition(apt)
                const color = apt.appointment_type?.color || apt.provider?.calendar_color || '#3B82F6'

                return (
                  <div
                    key={apt.id}
                    className="absolute left-1 right-1 pointer-events-auto cursor-pointer rounded-lg p-2 text-white shadow-md hover:shadow-lg transition-all overflow-hidden"
                    style={{
                      top,
                      height,
                      backgroundColor: color,
                      minHeight: '3rem'
                    }}
                    onClick={() => onAppointmentClick(apt.id)}
                  >
                    <div className="text-sm font-semibold truncate">
                      {apt.title || apt.contact?.full_name}
                    </div>
                    <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                      <Clock className="h-3 w-3" />
                      {format(new Date(apt.start_at), 'h:mm a')} - {format(new Date(apt.end_at), 'h:mm a')}
                    </div>
                    {apt.provider && (
                      <div className="text-xs opacity-90 flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        {apt.provider.name}
                      </div>
                    )}
                    {apt.operatory && (
                      <div className="text-xs opacity-90 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {apt.operatory.name}
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

