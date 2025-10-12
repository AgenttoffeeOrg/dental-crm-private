'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Plus, 
  Search, 
  Play, 
  MoreVertical,
  Phone,
  Mail,
  CheckSquare,
  Calendar,
  Repeat
  HelpCircle
} from 'lucide-react'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { TaskQueuePanel } from '@/components/tasks/task-queue-panel'
import { BulkActionsMenu } from '@/components/tasks/bulk-actions-menu'
import { TaskCalendarView } from '@/components/tasks/task-calendar-view'
import { TaskAnalyticsDashboard } from '@/components/analytics/task-analytics-dashboard'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { formatDistanceToNow, isToday, isTomorrow, isPast, isThisWeek, addDays } from 'date-fns'
import { cn } from '@/lib/utils'

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
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [focusedTaskIndex, setFocusedTaskIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'analytics'>('list')
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    loadTasks()
  }, [])

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
          setFocusedTaskIndex(prev => Math.min(prev + 1, filteredTasks.length - 1))
          break
        case 'k': // Previous task
          e.preventDefault()
          setFocusedTaskIndex(prev => Math.max(prev - 1, 0))
          break
        case 'x': // Complete focused task
          e.preventDefault()
          if (filteredTasks[focusedTaskIndex]) {
            handleCompleteTask(filteredTasks[focusedTaskIndex].id)
          }
          break
        case 'enter': // Open focused task
          e.preventDefault()
          if (filteredTasks[focusedTaskIndex]) {
            setSelectedTaskId(filteredTasks[focusedTaskIndex].id)
          }
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
  }, [filteredTasks, focusedTaskIndex])

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
      setTasks(data || [])
    } catch (error) {
      console.error('Error loading tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error
      toast.success('Task completed!')
      await loadTasks()
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
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

  const filteredTasks = searchQuery
    ? filterTasks(tasks, activeFilter).filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : filterTasks(tasks, activeFilter)

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
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 px-8 py-6 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 mt-1">{tasks.length} open tasks</p>
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
              {counts.all}
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
                {counts.overdue}
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
              <Badge>{selectedTasks.length} selected</Badge>
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
        ) : (
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500 mb-4">No tasks in this view</p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
          </div>
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
              <div className="col-span-4">Task</div>
              <div className="col-span-2">Type & Priority</div>
              <div className="col-span-2">Due Date</div>
              <div className="col-span-2">Associated With</div>
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
                    <div className="col-span-4 min-w-0">
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
                    <div className="col-span-2 flex items-center gap-2">
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
                    <div className="col-span-2 flex items-center">
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
        ))}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
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
  )
}
