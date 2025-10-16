'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Filter,
  Download,
  CalendarDays,
  List,
  LayoutGrid,
  Clock,
  Users
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths, isToday } from 'date-fns'
import { CalendarDayView } from '@/components/calendar/calendar-day-view'
import { CalendarWeekView } from '@/components/calendar/calendar-week-view'
import { CalendarMonthView } from '@/components/calendar/calendar-month-view'
import { CalendarAgendaView } from '@/components/calendar/calendar-agenda-view'
import { CalendarTimelineView } from '@/components/calendar/calendar-timeline-view'
import { CreateAppointmentSlideOver } from '@/components/calendar/create-appointment-slide-over'
import { cn } from '@/lib/utils'

type ViewMode = 'day' | 'week' | 'month' | 'agenda' | 'timeline'

export default function CalendarPage() {
  const supabase = createClient()
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [appointments, setAppointments] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createSlideOverOpen, setCreateSlideOverOpen] = useState(false)
  const [selectedProviders, setSelectedProviders] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [currentDate, viewMode])

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantId = '550e8400-e29b-41d4-a716-446655440000'

      // Calculate date range based on view
      let startDate: Date, endDate: Date
      switch (viewMode) {
        case 'day':
          startDate = new Date(currentDate)
          endDate = new Date(currentDate)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'week':
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
          endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
          break
        case 'month':
          startDate = startOfMonth(currentDate)
          endDate = endOfMonth(currentDate)
          break
        case 'agenda':
          startDate = new Date(currentDate)
          endDate = addDays(currentDate, 30)
          break
        case 'timeline':
          startDate = startOfWeek(currentDate, { weekStartsOn: 1 })
          endDate = endOfWeek(currentDate, { weekStartsOn: 1 })
          break
        default:
          startDate = currentDate
          endDate = currentDate
      }

      // Load appointments
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          contact:contacts(id, full_name, primary_phone, primary_email),
          provider:providers(id, name, calendar_color),
          operatory:operatories(id, name),
          appointment_type:appointment_types(id, name, color, duration_minutes)
        `)
        .eq('tenant_id', tenantId)
        .gte('start_at', startDate.toISOString())
        .lte('start_at', endDate.toISOString())
        .order('start_at')

      if (appointmentsError) throw appointmentsError

      setAppointments(appointmentsData || [])

      // Load providers for filter
      const { data: providersData, error: providersError } = await supabase
        .from('providers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')

      if (providersError) throw providersError

      setProviders(providersData || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
      toast.error('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  const handlePrevious = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(subDays(currentDate, 1))
        break
      case 'week':
      case 'timeline':
        setCurrentDate(subWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(subMonths(currentDate, 1))
        break
      case 'agenda':
        setCurrentDate(subDays(currentDate, 30))
        break
    }
  }

  const handleNext = () => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(addDays(currentDate, 1))
        break
      case 'week':
      case 'timeline':
        setCurrentDate(addWeeks(currentDate, 1))
        break
      case 'month':
        setCurrentDate(addMonths(currentDate, 1))
        break
      case 'agenda':
        setCurrentDate(addDays(currentDate, 30))
        break
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  const getDateRangeDisplay = () => {
    switch (viewMode) {
      case 'day':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
      case 'timeline':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return format(currentDate, 'MMMM yyyy')
      case 'agenda':
        return `Next 30 days from ${format(currentDate, 'MMM d, yyyy')}`
      default:
        return format(currentDate, 'MMMM yyyy')
    }
  }

  const filteredAppointments = appointments.filter(apt => {
    if (selectedProviders.length > 0 && !selectedProviders.includes(apt.provider_id)) {
      return false
    }
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return (
        apt.title?.toLowerCase().includes(search) ||
        apt.contact?.full_name?.toLowerCase().includes(search) ||
        apt.provider?.name?.toLowerCase().includes(search)
      )
    }
    return true
  })

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="border-b bg-white px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Calendar className="h-7 w-7 text-blue-600" />
                Calendar
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Schedule and manage appointments
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href="/settings/calendar">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </a>
              </Button>
              <Button
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                onClick={() => setCreateSlideOverOpen(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Appointment
              </Button>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handlePrevious}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={handleNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <div className="ml-4 text-lg font-semibold text-gray-900">
                {getDateRangeDisplay()}
              </div>
            </div>

            {/* View Switcher & Filters */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>

              {/* Provider Filter */}
              <Select
                value={selectedProviders[0] || 'all'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setSelectedProviders([])
                  } else {
                    setSelectedProviders([value])
                  }
                }}
              >
                <SelectTrigger className="w-48">
                  <Users className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="All Providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: provider.calendar_color }}
                        />
                        {provider.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* View Mode */}
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="day">
                    <CalendarDays className="h-4 w-4 mr-1" />
                    Day
                  </TabsTrigger>
                  <TabsTrigger value="week">
                    <Calendar className="h-4 w-4 mr-1" />
                    Week
                  </TabsTrigger>
                  <TabsTrigger value="month">
                    <LayoutGrid className="h-4 w-4 mr-1" />
                    Month
                  </TabsTrigger>
                  <TabsTrigger value="agenda">
                    <List className="h-4 w-4 mr-1" />
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="timeline">
                    <Clock className="h-4 w-4 mr-1" />
                    Timeline
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Calendar Views */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {viewMode === 'day' && (
                <CalendarDayView
                  date={currentDate}
                  appointments={filteredAppointments}
                  providers={providers}
                  onAppointmentClick={(id) => console.log('Clicked:', id)}
                  onSlotClick={(date) => setCreateSlideOverOpen(true)}
                />
              )}
              {viewMode === 'week' && (
                <CalendarWeekView
                  weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                  appointments={filteredAppointments}
                  providers={providers}
                  onAppointmentClick={(id) => console.log('Clicked:', id)}
                  onSlotClick={(date) => setCreateSlideOverOpen(true)}
                />
              )}
              {viewMode === 'month' && (
                <CalendarMonthView
                  month={currentDate}
                  appointments={filteredAppointments}
                  onAppointmentClick={(id) => console.log('Clicked:', id)}
                  onDayClick={(date) => {
                    setCurrentDate(date)
                    setViewMode('day')
                  }}
                />
              )}
              {viewMode === 'agenda' && (
                <CalendarAgendaView
                  startDate={currentDate}
                  appointments={filteredAppointments}
                  onAppointmentClick={(id) => console.log('Clicked:', id)}
                />
              )}
              {viewMode === 'timeline' && (
                <CalendarTimelineView
                  weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                  appointments={filteredAppointments}
                  providers={providers}
                  onAppointmentClick={(id) => console.log('Clicked:', id)}
                  onSlotClick={(providerId, date) => setCreateSlideOverOpen(true)}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Create Appointment Slide-Over */}
      <CreateAppointmentSlideOver
        open={createSlideOverOpen}
        onClose={() => setCreateSlideOverOpen(false)}
        onAppointmentCreated={() => {
          loadData()
        }}
        tenantId="550e8400-e29b-41d4-a716-446655440000"
      />
    </DashboardLayout>
  )
}

