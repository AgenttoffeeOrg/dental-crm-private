'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useAuth } from '@/lib/auth'
import { NoOrgEmptyState } from '@/components/guards'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus, 
  Search, 
  Play, 
  MoreVertical,
  Phone,
  Mail,
  CheckSquare,
  Calendar,
  Repeat,
  HelpCircle,
  MapPin
} from 'lucide-react'
import { CreateTaskSlideOver } from '@/components/tasks/create-task-slide-over'
import { TaskQueuePanel } from '@/components/tasks/task-queue-panel'
import { BulkActionsMenu } from '@/components/tasks/bulk-actions-menu'
import { TaskCalendarView } from '@/components/tasks/task-calendar-view'
import { TaskAnalyticsDashboard } from '@/components/analytics/task-analytics-dashboard'
import { useTaskMutation } from '@/lib/hooks/use-task-mutation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { formatDistanceToNow, isToday, isTomorrow, isPast, isThisWeek, addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { format } from '@/lib/formatting'
import { LoadingState } from '@/components/ui/loading-state'
import { EmptyState } from '@/components/ui/empty-state'

type FilterTab = 'all' | 'overdue' | 'today' | 'tomorrow' | 'this_week' | 'no_due_date'

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low: 'bg-gray-100 text-gray-700 border-gray-200'
}

const TASK_TYPE_ICONS = {
  call: Phone,
  email: Mail,
  todo: CheckSquare,
  meeting: Calendar,
  follow_up: Repeat
}

export default function TasksPage() {
  const { appUser, loading: authLoading } = useAuth()
  const hasTenant = Boolean(appUser?.active_tenant_id || appUser?.tenant_id)
  // 2b.54 — when the dashboard's "Today's Priorities" lane sends us
  // here with ?mode=queue, auto-open the TaskQueuePanel after the
  // initial task load. Also flips the filter tab to 'today' so the
  // queue contains today's tasks (not the previous filter the user
  // had selected last visit).
  const router = useRouter()
  const searchParams = useSearchParams()
  const queueModeFromUrl = searchParams?.get('mode') === 'queue'
  
  // Show empty state if user has no tenant
  if (!hasTenant && !authLoading) {
    return (
      <DashboardLayout>
        <NoOrgEmptyState title="Tasks" />
      </DashboardLayout>
    )
  }

  const [tasks, setTasks] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([]) // NEW: Locations for filtering
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>(() => {
    // 2b.66 — URL persistence: ?tab= overrides the default Today tab.
    const tab = searchParams?.get('tab') as FilterTab | null
    return tab && ['all', 'overdue', 'today', 'tomorrow', 'this_week', 'no_due_date'].includes(tab)
      ? tab
      : 'today'
  })
  const [searchQuery, setSearchQuery] = useState('')
  // 2b.66 — Channel-batch filter chips (Calls / Messages / All).
  // The queue inherits this on Start Queue per the 2026-05-24
  // product discussion. Initial value comes from ?channel= URL
  // param so the dashboard's "Today's Calls" lane can deep-link
  // directly into a calls-only queue.
  const channelFromUrl = searchParams?.get('channel')
  const [channelFilter, setChannelFilter] = useState<'all' | 'calls' | 'messages'>(() => {
    if (channelFromUrl === 'calls' || channelFromUrl === 'messages') return channelFromUrl
    return 'all'
  })
  const [locationFilter, setLocationFilter] = useState<string>('all')
  const [contactFilter, setContactFilter] = useState<string>('all')
  const [dealFilter, setDealFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [focusedTaskIndex, setFocusedTaskIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analytics'>('list')
  const [showHelp, setShowHelp] = useState(false)

  const { completeTask } = useTaskMutation({
    onSuccess: () => {
      loadTasks()
    },
  })

  // 2b.54 — auto-open the queue panel when arriving via
  // /tasks?mode=queue (the dashboard's Today's Priorities lane).
  // Also flip the filter to 'today' so the queue contains today's
  // tasks. Strip the mode param after consuming so a back navigation
  // doesn't re-open the queue. Other query params (tab/channel) are
  // preserved so the channel-chip choice survives the rewrite.
  useEffect(() => {
    if (!queueModeFromUrl) return
    setActiveFilter('today')
    setQueueOpen(true)
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    sp.delete('mode')
    router.replace(`/tasks${sp.toString() ? `?${sp.toString()}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueModeFromUrl])

  // 2b.66 — Push tab + channel state to the URL so a refresh / back
  // button preserves the operator's view. Pattern matches the 2b.45
  // chat filter row.
  useEffect(() => {
    const sp = new URLSearchParams(searchParams?.toString() ?? '')
    if (activeFilter === 'today') {
      sp.delete('tab')
    } else {
      sp.set('tab', activeFilter)
    }
    if (channelFilter === 'all') {
      sp.delete('channel')
    } else {
      sp.set('channel', channelFilter)
    }
    const next = sp.toString()
    const target = `/tasks${next ? `?${next}` : ''}`
    // Don't rewrite when nothing changed (prevents an infinite loop
    // from the router replace re-triggering this effect).
    if (typeof window !== 'undefined' && window.location.pathname + window.location.search !== target) {
      router.replace(target)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, channelFilter])

  useEffect(() => {
    loadTasks()
    loadLocations()
    loadFilterData()
  }, [])

  const loadFilterData = async () => {
    if (!appUser?.tenant_id) return
    
    try {
      const supabase = createClient()
      const [contactsRes, dealsRes, usersRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name').eq('tenant_id', appUser.tenant_id).order('full_name').limit(100),
        supabase.from('deals').select('id, title').eq('tenant_id', appUser.tenant_id).order('title').limit(100),
        supabase.from('app_users').select('id, full_name').eq('tenant_id', appUser.tenant_id).order('full_name')
      ])
      
      setContacts(contactsRes.data || [])
      setDeals(dealsRes.data || [])
      setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Error loading filter data:', error)
    }
  }

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return
      }

      switch (e.key.toLowerCase()) {
        case 'j': // Next task
          e.preventDefault()
          setFocusedTaskIndex(prev => Math.min(prev + 1, tasks.length - 1))
          break
        case 'k': // Previous task
          e.preventDefault()
          setFocusedTaskIndex(prev => Math.max(prev - 1, 0))
          break
        case 'n': // New task
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setCreateDialogOpen(true)
          }
          break
        case 'q': // Start queue
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            setQueueOpen(true)
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [tasks, focusedTaskIndex])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const supabase = createClient()

      const { data, error } = await supabase
        .from('tasks_with_associations')
        .select('*')
        .neq('status', 'done')
        .order('due_at', { ascending: true, nullsFirst: false })

      if (error) throw error
      // 2b.73 — snooze filter. Hide tasks where snoozed_until > now().
      // Filter client-side so the queue stays in sync without a view
      // change. Reschedule + complete both clear/skip snoozed_until.
      const nowMs = Date.now()
      const visible = (data || []).filter((t: any) => {
        if (!t.snoozed_until) return true
        try {
          return new Date(t.snoozed_until).getTime() <= nowMs
        } catch {
          return true
        }
      })
      setTasks(visible)
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  // NEW: Load accessible locations for filtering
  const loadLocations = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get user's app_user record for tenant_id
      const { data: appUser } = await supabase
        .from('app_users')
        .select('active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser?.active_tenant_id) return

      const { data, error } = await supabase.rpc('get_user_accessible_locations', {
        p_user_id: user.id,
        p_tenant_id: appUser.active_tenant_id,
      })

      if (error) {
        console.error('Error loading locations:', error)
        return
      }
      setLocations(data || [])
    } catch (error) {
      console.error('Error loading locations:', error)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    const result = await completeTask(taskId)
    if (result.error) {
      // Error already handled by useTaskMutation
      return
    }
    // Success handled by onSuccess callback
  }

  const filterTasks = (tasks: any[], filter: FilterTab) => {
    const now = new Date()
    
    switch (filter) {
      case 'all':
        return tasks
      case 'overdue':
        return tasks.filter(t => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))
      case 'today':
        return tasks.filter(t => t.due_at && isToday(new Date(t.due_at)))
      case 'tomorrow':
        return tasks.filter(t => t.due_at && isTomorrow(new Date(t.due_at)))
      case 'this_week':
        return tasks.filter(t => t.due_at && isThisWeek(new Date(t.due_at), { weekStartsOn: 1 }))
      case 'no_due_date':
        return tasks.filter(t => !t.due_at)
      default:
        return tasks
    }
  }

  // 2b.66 — Channel chip filter intersects with date-tab + search.
  // Calls = task_type 'call'. Messages = sms / whatsapp / email /
  // note (the bucket the inline composer can handle). All = no
  // further filter.
  const matchesChannel = (t: any): boolean => {
    if (channelFilter === 'all') return true
    if (channelFilter === 'calls') return t.task_type === 'call'
    if (channelFilter === 'messages') {
      return ['sms', 'whatsapp', 'email', 'note'].includes(t.task_type)
    }
    return true
  }

  // Enhanced search that includes all relevant fields
  const filteredTasks = (searchQuery
    ? filterTasks(tasks, activeFilter).filter(t => {
        const query = searchQuery.toLowerCase()
        return (
          t.title?.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.contact_name?.toLowerCase().includes(query) ||
          t.deal_title?.toLowerCase().includes(query) ||
          t.assignee_name?.toLowerCase().includes(query) ||
          t.location_name?.toLowerCase().includes(query) ||
          t.task_type?.toLowerCase().includes(query) ||
          t.priority?.toLowerCase().includes(query)
        )
      })
    : filterTasks(tasks, activeFilter)
  ).filter(matchesChannel)

  // Apply all filters
  const applyFilters = (tasks: any[]) => {
    let result = tasks

    if (locationFilter !== 'all') {
      result = result.filter(t => t.location_id === locationFilter)
    }
    if (contactFilter !== 'all') {
      result = result.filter(t => t.contact_id === contactFilter)
    }
    if (dealFilter !== 'all') {
      result = result.filter(t => t.deal_id === dealFilter)
    }
    if (assigneeFilter !== 'all') {
      if (assigneeFilter === 'unassigned') {
        result = result.filter(t => !t.assignee_user_id)
      } else {
        result = result.filter(t => t.assignee_user_id === assigneeFilter)
      }
    }
    if (taskTypeFilter !== 'all') {
      result = result.filter(t => t.task_type === taskTypeFilter)
    }
    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter)
    }

    return result
  }

  const locationFilteredTasks = applyFilters(filteredTasks)

  const clearAllFilters = () => {
    setLocationFilter('all')
    setContactFilter('all')
    setDealFilter('all')
    setAssigneeFilter('all')
    setTaskTypeFilter('all')
    setPriorityFilter('all')
  }

  const hasActiveFilters = locationFilter !== 'all' || contactFilter !== 'all' || dealFilter !== 'all' || assigneeFilter !== 'all' || taskTypeFilter !== 'all' || priorityFilter !== 'all'

  const getTaskCounts = () => {
    return {
      all: tasks.length,
      overdue: tasks.filter(t => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at))).length,
      today: tasks.filter(t => t.due_at && isToday(new Date(t.due_at))).length,
      tomorrow: tasks.filter(t => t.due_at && isTomorrow(new Date(t.due_at))).length,
      this_week: tasks.filter(t => t.due_at && isThisWeek(new Date(t.due_at), { weekStartsOn: 1 })).length,
      no_due_date: tasks.filter(t => !t.due_at).length
    }
  }

  const counts = getTaskCounts()

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    )
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <DashboardLayout>
      <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 mt-1">{format.pluralize(tasks.length, 'open task')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setQueueOpen(true)} disabled={filteredTasks.length === 0}>
              <Play className="h-4 w-4 mr-2" />
              Start Queue ({filteredTasks.length})
            </Button>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>

        {/* 2b.66 — Channel-batch chips per the 2026-05-24 product
            discussion. Active chip determines the queue's mode on
            Start Queue:
              All       → mixed (both call + message tasks)
              Calls     → call tasks only (full-takeover call queue)
              Messages  → sms / whatsapp / email / note tasks only
            URL-persistent (?channel=) so dashboard's "Today's Calls"
            lane can deep-link with calls pre-selected. */}
        <div className="flex items-center gap-1.5 mb-3 bg-gray-100 p-1 rounded-lg w-fit">
          {(['all', 'calls', 'messages'] as const).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => setChannelFilter(chip)}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors capitalize',
                channelFilter === chip
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-700 hover:bg-gray-200'
              )}
            >
              {chip === 'all' ? 'All channels' : chip}
            </button>
          ))}
        </div>

        {/* HubSpot-Style Filter Tabs */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setActiveFilter('all')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'all'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            All Tasks
            <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
              {format.number(counts.all)}
            </Badge>
          </button>

          <button
            onClick={() => setActiveFilter('overdue')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'overdue'
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Overdue
            {counts.overdue > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                {format.number(counts.overdue)}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('today')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'today'
                ? "bg-orange-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Today
            {counts.today > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                {counts.today}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('tomorrow')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'tomorrow'
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            Tomorrow
            {counts.tomorrow > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                {counts.tomorrow}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('this_week')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'this_week'
                ? "bg-purple-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            This Week
            {counts.this_week > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                {counts.this_week}
              </Badge>
            )}
          </button>

          <button
            onClick={() => setActiveFilter('no_due_date')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              activeFilter === 'no_due_date'
                ? "bg-gray-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            )}
          >
            No Due Date
            {counts.no_due_date > 0 && (
              <Badge variant="secondary" className="ml-2 bg-white/20 text-white border-0">
                {counts.no_due_date}
              </Badge>
            )}
          </button>
        </div>

        {/* Keyboard Shortcuts Help */}
        {showHelp && viewMode === 'list' && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-3">Keyboard Shortcuts</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-blue-800">
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">j</kbd> Next task</div>
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">k</kbd> Previous task</div>
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">x</kbd> Complete task</div>
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">Enter</kbd> Open task</div>
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">Cmd+N</kbd> New task</div>
              <div><kbd className="px-2 py-1 bg-white rounded border border-blue-300">Cmd+Q</kbd> Start queue</div>
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-xs font-medium text-gray-700 mr-2">Filters:</span>
          
          {/* Location Filter */}
          {locations.length > 0 && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {locations.map(loc => (
                  <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Contact Filter */}
          {contacts.length > 0 && (
            <Select value={contactFilter} onValueChange={setContactFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Contact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Contacts</SelectItem>
                {contacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id}>{contact.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Deal Filter */}
          {deals.length > 0 && (
            <Select value={dealFilter} onValueChange={setDealFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Deal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Deals</SelectItem>
                {deals.map(deal => (
                  <SelectItem key={deal.id} value={deal.id}>{deal.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Assignee Filter */}
          {users.length > 0 && (
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assignees</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Task Type Filter */}
          <Select value={taskTypeFilter} onValueChange={setTaskTypeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Task Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="meeting">Meeting</SelectItem>
              <SelectItem value="todo">Todo</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Filter */}
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Search & Bulk Actions */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {selectedTasks.length > 0 && (
            <>
              <Badge>{format.pluralize(selectedTasks.length, 'task')} selected</Badge>
              <BulkActionsMenu
                selectedTaskIds={selectedTasks}
                onClearSelection={() => setSelectedTasks([])}
                onRefresh={loadTasks}
              />
            </>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {viewMode === 'calendar' ? (
          <TaskCalendarView
            tasks={tasks}
            onTaskClick={(id) => setSelectedTaskId(id)}
            onDateClick={(date) => {
              // TODO: Open create dialog with pre-filled date
              setCreateDialogOpen(true)
            }}
          />
        ) : viewMode === 'analytics' ? (
          <TaskAnalyticsDashboard />
        ) : loading ? (
          <LoadingState message="Loading your tasks..." size="md" />
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="No tasks in this view"
            description="Get started by creating a new task or adjust your filters."
            action={{
              label: "Create Task",
              onClick: () => setCreateDialogOpen(true)
            }}
          />
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700 uppercase tracking-wide">
              <div className="col-span-1 flex items-center">
                <Checkbox
                  checked={selectedTasks.length === filteredTasks.length && filteredTasks.length > 0}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTasks(filteredTasks.map(t => t.id))
                    } else {
                      setSelectedTasks([])
                    }
                  }}
                />
              </div>
              <div className="col-span-3">Task</div>
              <div className="col-span-1">Type & Priority</div>
              <div className="col-span-1">Due Date</div>
              <div className="col-span-2">Associated With</div>
              <div className="col-span-2">Location</div>
              <div className="col-span-1">Assignee</div>
            </div>

            {/* Task Rows */}
            <div className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const TypeIcon = TASK_TYPE_ICONS[task.task_type as keyof typeof TASK_TYPE_ICONS] || CheckSquare
                const isOverdue = task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))

                return (
                  <div
                    key={task.id}
                    className="grid grid-cols-12 gap-4 px-4 py-3 hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    {/* Checkbox */}
                    <div className="col-span-1 flex items-center">
                      <Checkbox
                        checked={selectedTasks.includes(task.id)}
                        onCheckedChange={() => toggleTaskSelection(task.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Task Title */}
                    <div className="col-span-3 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-gray-900 truncate">
                          {task.title}
                        </h4>
                        {task.is_recurring && (
                          <Repeat className="h-3 w-3 text-gray-400 flex-shrink-0" />
                        )}
                      </div>
                      {task.description && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                      {(task.subtask_count > 0 || task.comment_count > 0) && (
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          {task.subtask_count > 0 && (
                            <span>✓ {task.subtask_count} subtasks</span>
                          )}
                          {task.comment_count > 0 && (
                            <span>💬 {task.comment_count}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Type & Priority */}
                    <div className="col-span-1 flex items-center gap-2">
                      <div className="p-1.5 bg-gray-100 rounded">
                        <TypeIcon className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <Badge 
                        variant="outline" 
                        className={cn("text-xs", PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS])}
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {/* Due Date */}
                    <div className="col-span-1 flex items-center">
                      {task.due_at ? (
                        <div className={cn(
                          "text-sm",
                          isOverdue ? "text-red-600 font-medium" : "text-gray-700"
                        )}>
                          {isToday(new Date(task.due_at)) && "Today "}
                          {isTomorrow(new Date(task.due_at)) && "Tomorrow "}
                          {formatDistanceToNow(new Date(task.due_at), { addSuffix: !isToday(new Date(task.due_at)) && !isTomorrow(new Date(task.due_at)) })}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No due date</span>
                      )}
                    </div>

                    {/* Associated With */}
                    <div className="col-span-2 min-w-0">
                      {task.deal_title && (
                        <div className="text-sm text-gray-700 truncate">
                          🔗 {task.deal_title}
                        </div>
                      )}
                      {task.contact_name && (
                        <div className="text-xs text-gray-500 truncate">
                          👤 {task.contact_name}
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div className="col-span-2 flex items-center">
                      {task.location_name ? (
                        <Badge variant="secondary" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {task.location_name}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-400">No location</span>
                      )}
                    </div>

                    {/* Assignee */}
                    <div className="col-span-1 flex items-center justify-between">
                      {task.assignee_name ? (
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                            {getInitials(task.assignee_name)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <span className="text-xs text-gray-400">Unassigned</span>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Open menu
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Create Task Slide-Over */}
      <CreateTaskSlideOver
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onTaskCreated={loadTasks}
      />

      <TaskQueuePanel
        open={queueOpen}
        onClose={() => setQueueOpen(false)}
        tasks={filteredTasks}
        onTaskComplete={handleCompleteTask}
        onTasksChange={loadTasks}
      />
      </div>
    </DashboardLayout>
  )
}
