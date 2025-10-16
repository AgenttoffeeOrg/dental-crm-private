'use client'

import { format, isSameDay, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Clock, MapPin, User, Phone, Mail } from 'lucide-react'

interface CalendarAgendaViewProps {
  startDate: Date
  appointments: any[]
  onAppointmentClick: (id: string) => void
}

export function CalendarAgendaView({
  startDate,
  appointments,
  onAppointmentClick
}: CalendarAgendaViewProps) {
  // Group appointments by date
  const days = Array.from({ length: 30 }, (_, i) => addDays(startDate, i))

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt =>
      isSameDay(new Date(apt.start_at), day)
    ).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime())
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'requested':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'arrived':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'in_progress':
        return 'bg-purple-100 text-purple-700 border-purple-200'
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'no_show':
        return 'bg-orange-100 text-orange-700 border-orange-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {days.map((day) => {
        const dayAppointments = getAppointmentsForDay(day)
        if (dayAppointments.length === 0) return null

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
                  {dayAppointments.length} {dayAppointments.length === 1 ? 'appointment' : 'appointments'}
                </Badge>
              </div>
            </div>

            {/* Appointments list */}
            <div className="space-y-3">
              {dayAppointments.map((apt) => {
                const color = apt.appointment_type?.color || apt.provider?.calendar_color || '#3B82F6'

                return (
                  <div
                    key={apt.id}
                    onClick={() => onAppointmentClick(apt.id)}
                    className="bg-white border rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-start gap-4">
                      {/* Time indicator */}
                      <div
                        className="w-1 h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />

                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-semibold text-lg text-gray-900">
                              {apt.contact?.full_name || apt.title}
                            </div>
                            {apt.appointment_type && (
                              <div className="text-sm text-gray-600">
                                {apt.appointment_type.name}
                              </div>
                            )}
                          </div>
                          <Badge className={cn("text-xs", getStatusColor(apt.status))}>
                            {apt.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>
                              {format(new Date(apt.start_at), 'h:mm a')} - {format(new Date(apt.end_at), 'h:mm a')}
                              <span className="text-gray-400 ml-1">
                                ({apt.duration_minutes} min)
                              </span>
                            </span>
                          </div>

                          {apt.provider && (
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span>{apt.provider.name}</span>
                            </div>
                          )}

                          {apt.operatory && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4" />
                              <span>{apt.operatory.name}</span>
                            </div>
                          )}

                          {apt.contact?.primary_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4" />
                              <span>{apt.contact.primary_phone}</span>
                            </div>
                          )}

                          {apt.contact?.primary_email && (
                            <div className="flex items-center gap-2 col-span-2">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{apt.contact.primary_email}</span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {apt.notes && (
                          <div className="mt-3 pt-3 border-t text-sm text-gray-600">
                            <span className="font-medium">Notes: </span>
                            {apt.notes}
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

      {appointments.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg">No appointments scheduled</p>
          <p className="text-sm">Create your first appointment to get started</p>
        </div>
      )}
    </div>
  )
}

