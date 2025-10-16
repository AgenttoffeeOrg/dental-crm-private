'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Calendar,
  CheckSquare,
  Phone,
  Mail,
  Users,
  DollarSign,
  ExternalLink,
  ArrowUpRight,
  Clock,
  AlertCircle
} from 'lucide-react'
import { format, isToday, isTomorrow, isPast, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CalendarDrawerProps {
  open: boolean
  onClose: () => void
}

export function CalendarDrawer({ open, onClose }: CalendarDrawerProps) {
  const supabase = createClient()
  const [view, setView] = useState<'today' | 'week' | 'month'>('today')
  const [tasks, setTasks] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [bookingUrl, setBookingUrl] = useState<string>('')

  useEffect(() => {
    if (open) {
      loadData()
      loadBookingUrl()
    }
  }, [open, view])

  const loadData = async () => {
    setLoading(true)
    try {
      const tenantId
      const now = new Date()
      
      let startDate: Date, endDate: Date

      if (view === 'today') {
        startDate = new Date(now.setHours(0, 0, 0, 0))
        endDate = new Date(now.setHours(23, 59, 59, 999))
      } else if (view === 'week') {
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        endDate = endOfWeek(now, { weekStartsOn: 1 })
      } else {
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
      }

      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, contact:contacts(full_name), deal:deals(title)')
        .eq('tenant_id', tenantId)
        .gte('due_at', startDate.toISOString())
        .lte('due_at', endDate.toISOString())
        .order('due_at')

      // Load activities (calls, emails, meetings)
      const { data: activitiesData } = await supabase
        .from('activities')
        .select('*, contact:contacts(full_name)')
        .eq('tenant_id', tenantId)
        .in('type', ['call', 'email', 'meeting'])
        .gte('occurred_at', startDate.toISOString())
        .lte('occurred_at', endDate.toISOString())
        .order('occurred_at')

      // Load deals closing soon
      const { data: dealsData } = await supabase
        .from('deals')
        .select('*, contact:contacts(full_name), stage:pipeline_stages(name)')
        .eq('tenant_id', tenantId)
        .not('expected_close_date', 'is', null)
        .gte('expected_close_date', startDate.toISOString().split('T')[0])
        .lte('expected_close_date', endDate.toISOString().split('T')[0])
        .order('expected_close_date')

      setTasks(tasksData || [])
      setActivities(activitiesData || [])
      setDeals(dealsData || [])
    } catch (error) {
      console.error('Error loading calendar data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadBookingUrl = async () => {
    // TODO: Load from settings table
    // For now, hardcode placeholder
    setBookingUrl('https://calendly.com/your-practice')
  }

  const overdueTasks = tasks.filter(t => t.due_at && isPast(new Date(t.due_at)) && t.status !== 'completed')
  const todayTasks = tasks.filter(t => t.due_at && isToday(new Date(t.due_at)))
  const upcomingTasks = tasks.filter(t => t.due_at && !isToday(new Date(t.due_at)) && !isPast(new Date(t.due_at)))

  const todayCalls = activities.filter(a => a.type === 'call' && isToday(new Date(a.occurred_at)))
  const todayEmails = activities.filter(a => a.type === 'email' && isToday(new Date(a.occurred_at)))
  const todayMeetings = activities.filter(a => a.type === 'meeting' && isToday(new Date(a.occurred_at)))

  const getTaskPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-4 border-red-500 bg-red-50'
      case 'high': return 'border-l-4 border-orange-500 bg-orange-50'
      case 'normal': return 'border-l-4 border-blue-500 bg-blue-50'
      default: return 'border-l-4 border-gray-300 bg-gray-50'
    }
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-xl">
                <Calendar className="h-5 w-5 text-blue-600" />
                Calendar
              </SheetTitle>
              <SheetDescription>
                {view === 'today' && "Today's agenda"}
                {view === 'week' && "This week's schedule"}
                {view === 'month' && "This month's overview"}
              </SheetDescription>
            </div>
          </div>

          {/* View Tabs */}
          <Tabs value={view} onValueChange={(v) => setView(v as any)} className="mt-4">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              {/* Overdue Tasks */}
              {overdueTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <h3 className="font-semibold text-red-900">OVERDUE ({overdueTasks.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {overdueTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks`}
                        onClick={onClose}
                        className={cn(
                          "block p-3 rounded-lg hover:shadow-md transition-all cursor-pointer",
                          getTaskPriorityColor(task.priority)
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {task.title}
                            </div>
                            {task.contact && (
                              <div className="text-xs text-gray-600 mt-1">
                                {task.contact.full_name}
                              </div>
                            )}
                          </div>
                          <Badge variant="secondary" className="text-xs bg-red-100 text-red-700">
                            {format(new Date(task.due_at), 'MMM d')}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Tasks */}
              {todayTasks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare className="h-4 w-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-900">TODAY ({todayTasks.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {todayTasks.map((task) => (
                      <Link
                        key={task.id}
                        href={`/tasks`}
                        onClick={onClose}
                        className={cn(
                          "block p-3 rounded-lg hover:shadow-md transition-all cursor-pointer",
                          getTaskPriorityColor(task.priority)
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {task.title}
                            </div>
                            {task.contact && (
                              <div className="text-xs text-gray-600 mt-1">
                                {task.contact.full_name}
                              </div>
                            )}
                          </div>
                          {task.due_at && (
                            <div className="text-xs text-gray-500">
                              {format(new Date(task.due_at), 'h:mm a')}
                            </div>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Calls */}
              {todayCalls.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-gray-900">CALLS ({todayCalls.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {todayCalls.map((call) => (
                      <Link
                        key={call.id}
                        href={`/contacts/${call.contact_id}`}
                        onClick={onClose}
                        className="block p-3 rounded-lg border-l-4 border-green-500 bg-green-50 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {call.subject || 'Phone call'}
                            </div>
                            {call.contact && (
                              <div className="text-xs text-gray-600 mt-1">
                                {call.contact.full_name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(call.occurred_at), 'h:mm a')}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Today's Meetings */}
              {todayMeetings.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-4 w-4 text-orange-600" />
                    <h3 className="font-semibold text-gray-900">MEETINGS ({todayMeetings.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {todayMeetings.map((meeting) => (
                      <div
                        key={meeting.id}
                        className="p-3 rounded-lg border-l-4 border-orange-500 bg-orange-50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {meeting.subject || 'Meeting'}
                            </div>
                            {meeting.contact && (
                              <div className="text-xs text-gray-600 mt-1">
                                {meeting.contact.full_name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(meeting.occurred_at), 'h:mm a')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deals Closing Soon */}
              {deals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-purple-600" />
                    <h3 className="font-semibold text-gray-900">DEALS CLOSING ({deals.length})</h3>
                  </div>
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/deals/${deal.id}`}
                        onClick={onClose}
                        className="block p-3 rounded-lg border-l-4 border-purple-500 bg-purple-50 hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 text-sm truncate">
                              {deal.title}
                            </div>
                            {deal.contact && (
                              <div className="text-xs text-gray-600 mt-1">
                                {deal.contact.full_name}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {format(new Date(deal.expected_close_date), 'MMM d')}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {overdueTasks.length === 0 && todayTasks.length === 0 && todayCalls.length === 0 && todayMeetings.length === 0 && deals.length === 0 && (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-gray-600 mb-1">No activities scheduled</p>
                  <p className="text-sm text-gray-500">
                    {view === 'today' && "Enjoy your free time!"}
                    {view === 'week' && "Nothing scheduled this week"}
                    {view === 'month' && "Nothing scheduled this month"}
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 space-y-2 bg-gray-50">
          {/* Book Appointment Button - Redirects to Calendly/etc */}
          {bookingUrl && (
            <Button
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              asChild
            >
              <a href={bookingUrl} target="_blank" rel="noopener noreferrer">
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
                <ExternalLink className="h-3 w-3 ml-2" />
              </a>
            </Button>
          )}

          {/* View Full Calendar */}
          <Button
            variant="outline"
            className="w-full"
            asChild
          >
            <Link href="/calendar" onClick={onClose}>
              <ArrowUpRight className="h-4 w-4 mr-2" />
              View Full Calendar
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

