'use client'

import { format, addDays, setHours, setMinutes, isWithinInterval } from 'date-fns'
import { cn } from '@/lib/utils'
import { Clock, User } from 'lucide-react'

interface CalendarTimelineViewProps {
  weekStart: Date
  appointments: any[]
  providers: any[]
  onAppointmentClick: (id: string) => void
  onSlotClick: (providerId: string, date: Date) => void
}

export function CalendarTimelineView({
  weekStart,
  appointments,
  providers,
  onAppointmentClick,
  onSlotClick
}: CalendarTimelineViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const hours = Array.from({ length: 13 }, (_, i) => 7 + i) // 7 AM to 7 PM

  const getAppointmentsForProviderDayHour = (providerId: string, day: Date, hour: number) => {
    const slotStart = setMinutes(setHours(new Date(day), hour), 0)
    const slotEnd = setMinutes(setHours(new Date(day), hour), 59)

    return appointments.filter(apt => {
      if (apt.provider_id !== providerId) return false
      const aptStart = new Date(apt.start_at)
      return aptStart >= slotStart && aptStart <= slotEnd
    })
  }

  const getAppointmentPosition = (appointment: any) => {
    const start = new Date(appointment.start_at)
    const startMinute = start.getMinutes()
    const left = (startMinute / 60) * 100 // Percentage within the hour

    const duration = appointment.duration_minutes || 30
    const width = (duration / 60) * 100 // Percentage width

    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
  }

  if (providers.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-12 text-center">
        <User className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="text-lg text-gray-900 mb-2">No providers configured</p>
        <p className="text-sm text-gray-600">
          Add providers in Settings to use the timeline view
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <div className="min-w-[1200px]">
        {/* Header with days */}
        <div className="flex border-b sticky top-0 bg-white z-20">
          <div className="w-32 flex-shrink-0 border-r" /> {/* Provider column spacer */}
          {days.map((day, dayIndex) => (
            <div key={dayIndex} className="flex-1 flex border-r last:border-r-0">
              {hours.map((hour, hourIndex) => (
                <div
                  key={hourIndex}
                  className={cn(
                    "flex-1 p-2 text-center border-r last:border-r-0",
                    hourIndex === 0 && "bg-gray-50"
                  )}
                >
                  {hourIndex === 0 && (
                    <div className="text-xs font-medium text-gray-900">
                      {format(day, 'EEE d')}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    {format(setHours(new Date(), hour), 'ha')}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Provider rows */}
        {providers.map((provider) => (
          <div key={provider.id} className="flex border-b hover:bg-gray-50/50 transition-colors">
            {/* Provider name column */}
            <div className="w-32 flex-shrink-0 border-r p-3 flex items-center gap-2 bg-white sticky left-0 z-10">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: provider.calendar_color }}
              />
              <span className="text-sm font-medium text-gray-900 truncate">
                {provider.name}
              </span>
            </div>

            {/* Days grid */}
            {days.map((day, dayIndex) => (
              <div key={dayIndex} className="flex-1 flex border-r last:border-r-0">
                {hours.map((hour, hourIndex) => {
                  const slotAppointments = getAppointmentsForProviderDayHour(provider.id, day, hour)

                  return (
                    <div
                      key={hourIndex}
                      className="flex-1 h-16 border-r last:border-r-0 relative hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => onSlotClick(provider.id, setHours(new Date(day), hour))}
                    >
                      {/* Appointments */}
                      {slotAppointments.map((apt) => {
                        const { left, width } = getAppointmentPosition(apt)
                        const color = apt.appointment_type?.color || provider.calendar_color || '#3B82F6'

                        return (
                          <div
                            key={apt.id}
                            className="absolute top-1 bottom-1 pointer-events-auto cursor-pointer rounded px-2 py-1 text-white shadow hover:shadow-md transition-all overflow-hidden"
                            style={{
                              left,
                              width,
                              backgroundColor: color,
                              minWidth: '60px'
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              onAppointmentClick(apt.id)
                            }}
                          >
                            <div className="text-xs font-semibold truncate">
                              {apt.contact?.full_name || apt.title}
                            </div>
                            <div className="text-xs opacity-90 truncate">
                              {format(new Date(apt.start_at), 'h:mm')} - {format(new Date(apt.end_at), 'h:mm')}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

