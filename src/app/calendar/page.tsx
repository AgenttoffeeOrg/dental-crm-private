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
  Search,
  ChevronLeft,
  ChevronRight,
  Settings,
  Download,
  CalendarDays,
  List,
  LayoutGrid,
  ExternalLink,
  Filter,
  Clock,
  TrendingUp,
  Users,
  PhoneCall,
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { format as formatDate, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns'
import { format } from '@/lib/formatting'
import { CalendarDayView } from '@/components/calendar/calendar-day-view'
import { CalendarWeekView } from '@/components/calendar/calendar-week-view'
import { CalendarMonthView } from '@/components/calendar/calendar-month-view'
import { CalendarAgendaView } from '@/components/calendar/calendar-agenda-view'
import { activityAggregator, CalendarActivity } from '@/lib/calendar/activity-aggregator'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'

type ViewMode = 'day' | 'week' | 'month' | 'agenda'

export default function CalendarPage() {
  const supabase = createClient()
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  
  // All hooks must be called before any conditional returns
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [activities, setActivities] = useState<CalendarActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all')
  const [bookingUrl, setBookingUrl] = useState<string>('')

  useEffect(() => {
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id
    if (tenantId && !authLoading) {
      loadData()
      loadBookingUrl()
    }
  }, [currentDate, viewMode, appUser?.active_tenant_id, appUser?.tenant_id, authLoading])

  // Show empty state if user has no tenant (after all hooks)
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Calendar" />
      </DashboardLayout>
    )
  }

  const loadData = async () => {
    const tenantId = appUser?.active_tenant_id || appUser?.tenant_id
    if (!tenantId) return
    
    setLoading(true)
    try {
      const orgId = tenantId

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
        default:
          startDate = currentDate
          endDate = currentDate
      }

      // Load unified activities (tasks, calls, emails, meetings, deals)
      const activitiesData = await activityAggregator.getActivities(
        orgId, // ✅ SECURITY: Use authenticated user's org
        startDate,
        endDate
      )

      setActivities(activitiesData)
    } catch (error) {
      console.error('Error loading calendar data:', error)
      toast.error('Failed to load calendar')
    } finally {
      setLoading(false)
    }
  }

  const loadBookingUrl = () => {
    // Load primary booking URL from settings
    const saved = localStorage.getItem('scheduling_apps_settings')
    if (saved) {
      const settings = JSON.parse(saved)
      const enabledApp = Object.entries(settings).find(([_, s]: any) => s?.enabled && s?.booking_url)
      if (enabledApp) {
        setBookingUrl((enabledApp[1] as any).booking_url)
      }
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
        return formatDate(currentDate, 'EEEE, MMMM d, yyyy')
      case 'week':
      case 'timeline':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 })
        return `${formatDate(weekStart, 'MMM d')} - ${formatDate(weekEnd, 'MMM d, yyyy')}`
      case 'month':
        return formatDate(currentDate, 'MMMM yyyy')
      case 'agenda':
        return `Next 30 days from ${formatDate(currentDate, 'MMM d, yyyy')}`
      default:
        return formatDate(currentDate, 'MMMM yyyy')
    }
  }

  const filteredActivities = activities.filter(activity => {
    // Filter by type
    if (activityTypeFilter !== 'all' && activity.type !== activityTypeFilter) {
      return false
    }
    
    // Filter by search query
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      return (
        activity.title?.toLowerCase().includes(search) ||
        activity.contact_name?.toLowerCase().includes(search) ||
        activity.description?.toLowerCase().includes(search)
      )
    }
    
    return true
  })

  return (
    <DashboardLayout>
      <div className="flex h-full flex-col bg-gray-50">
        {/* Sticky Header */}
        <div className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur">
          <div className="px-6 py-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Operations Workspace
                </p>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-7 w-7 text-blue-600" />
                    Calendar
                  </h1>
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {getDateRangeDisplay()}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Schedule, monitor, and optimise patient engagements across channels.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" className="hover:border-blue-300 hover:text-blue-700">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button variant="outline" size="sm" asChild className="hover:border-blue-300 hover:text-blue-700">
                  <a href="/settings/integrations">
                    <Settings className="h-4 w-4 mr-2" />
                    Calendar Settings
                  </a>
                </Button>
                {bookingUrl && (
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-sm"
                    asChild
                  >
                    <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                      <Calendar className="h-4 w-4 mr-2" />
                      Book Appointment
                      <ExternalLink className="h-3 w-3 ml-2" />
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
              {/* Navigation */}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrevious}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <div className="ml-3 text-lg font-semibold text-gray-900">
                  {getDateRangeDisplay()}
                </div>
              </div>

              {/* View Switcher & Filters */}
              <div className="flex flex-wrap items-center gap-3">
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

                {/* Activity Type Filter */}
                <Select
                  value={activityTypeFilter}
                  onValueChange={setActivityTypeFilter}
                >
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="All Activities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Activities</SelectItem>
                    <SelectItem value="task">Tasks</SelectItem>
                    <SelectItem value="call">Calls</SelectItem>
                    <SelectItem value="email">Emails</SelectItem>
                    <SelectItem value="meeting">Meetings</SelectItem>
                    <SelectItem value="deal">Deals</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                  <TabsList className="grid grid-cols-4 rounded-xl bg-gray-50">
                    <TabsTrigger value="day" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                      <CalendarDays className="h-4 w-4 mr-1" />
                      Day
                    </TabsTrigger>
                    <TabsTrigger value="week" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                      <Calendar className="h-4 w-4 mr-1" />
                      Week
                    </TabsTrigger>
                    <TabsTrigger value="month" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                      <LayoutGrid className="h-4 w-4 mr-1" />
                      Month
                    </TabsTrigger>
                    <TabsTrigger value="agenda" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow">
                      <List className="h-4 w-4 mr-1" />
                      Agenda
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 pb-12">
          {/* Intelligence Snapshot */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 py-6">
            <Card className="rounded-2xl border border-blue-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Upcoming
                    </p>
                    <p className="mt-2 text-xl font-semibold text-gray-900">
                      {filteredActivities.filter((a) => a.status !== 'completed').length} activities
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Scheduled in the current view</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-emerald-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                      Confirmations
                    </p>
                    <p className="mt-2 text-xl font-semibold text-gray-900">
                      {filteredActivities.filter((a) => a.type === 'meeting').length} meetings
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Based on current filters</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-50 flex items-center justify-center">
                    <Users className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-purple-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                      Follow-ups
                    </p>
                    <p className="mt-2 text-xl font-semibold text-gray-900">
                      {filteredActivities.filter((a) => a.type === 'call').length} calls
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Queued for the selected range</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                    <PhoneCall className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border border-orange-100 shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify_between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                      Momentum
                    </p>
                    <p className="mt-2 text-xl font-semibold text-gray-900">
                      {Math.round((filteredActivities.length / Math.max(activities.length, 1)) * 100)}% active
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Filtered vs. total scheduled activity</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-orange-50 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border border-gray-200 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center h-[520px]">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <div className="p-6">
                  {viewMode === 'day' && (
                    <CalendarDayView
                      date={currentDate}
                      activities={filteredActivities}
                      onActivityClick={(id, type) => console.log('Clicked:', id, type)}
                    />
                  )}
                  {viewMode === 'week' && (
                    <CalendarWeekView
                      weekStart={startOfWeek(currentDate, { weekStartsOn: 1 })}
                      activities={filteredActivities}
                      onActivityClick={(id, type) => console.log('Clicked:', id, type)}
                    />
                  )}
                  {viewMode === 'month' && (
                    <CalendarMonthView
                      month={currentDate}
                      activities={filteredActivities}
                      onActivityClick={(id, type) => console.log('Clicked:', id, type)}
                      onDayClick={(date) => {
                        setCurrentDate(date)
                        setViewMode('day')
                      }}
                    />
                  )}
                  {viewMode === 'agenda' && (
                    <CalendarAgendaView
                      startDate={currentDate}
                      activities={filteredActivities}
                      onActivityClick={(id, type) => console.log('Clicked:', id, type)}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

