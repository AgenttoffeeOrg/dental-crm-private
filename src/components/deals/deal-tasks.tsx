'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Calendar,
  MoreHorizontal,
  Play,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateTaskPanel } from '@/components/tasks/create-task-panel'
import { TaskQueuePanel } from '@/components/tasks/task-queue-panel'
import { formatDateTime, getActivityAge } from '@/lib/dates'
import { formatDistanceToNow, isPast, isToday } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Task } from '@/types/database'
import Link from 'next/link'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface DealTasksProps {
  dealId: string
  contactId: string
  onTaskUpdate?: () => void
}

export function DealTasks({ 
  dealId, 
  contactId, 
  onTaskUpdate
}: DealTasksProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [queueOpen, setQueueOpen] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const supabase = createClient()

  const fetchTasks = async () => {
    try {
      setLoading(true)

      const { data, error} = await supabase
        .from('tasks_with_associations')
        .select('*')
        .eq('deal_id', dealId)
        .neq('status', 'done')
        .order('due_at', { ascending: true, nullsFirst: false })

      if (error) {
        console.error('Error fetching tasks:', error)
        throw error
      }

      setTasks(data || [])
    } catch (error) {
      console.error('Error fetching deal tasks:', error)
      toast.error('Failed to load tasks')
      setTasks([])
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'done' }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to complete task')
      }

      toast.success('Task completed!')
      fetchTasks()
      onTaskUpdate?.()
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  const handleStartQueue = () => {
    if (tasks.length > 0) {
      setQueueOpen(true)
    } else {
      toast.info('No tasks to queue')
    }
  }

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'normal': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getTaskTypeIcon = (taskType: string) => {
    switch (taskType) {
      case 'call': return '📞'
      case 'email': return '📧'
      case 'meeting': return '🗓️'
      case 'follow_up': return '🔄'
      default: return '✓'
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [dealId])

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      // Update local state
      setTasks(prev => 
        prev.map(task => 
          task.id === taskId 
            ? { ...task, status: newStatus }
            : task
        )
      )

      toast.success('Task status updated')
      onTaskUpdate?.()
    } catch (error) {
      console.error('Error updating task status:', error)
      toast.error('Failed to update task status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="h-4 w-4 text-green-600" />
      case 'in_progress': return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending': return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default: return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600'
      case 'medium': return 'text-yellow-600'
      case 'low': return 'text-green-600'
      default: return 'text-gray-600'
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Deal Tasks</h3>
          <Button size="sm" disabled>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tasks...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Deal Tasks</h3>
          {tasks.length > 0 && (
            <Badge variant="secondary" className="h-6">
              {tasks.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Link href="/tasks">
            <Button size="sm" variant="outline">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View All Tasks
            </Button>
          </Link>
          {tasks.length > 0 && (
            <Button 
              size="sm" 
              variant="default"
              onClick={handleStartQueue}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Start Queue
            </Button>
          )}
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">
              Create tasks to track what needs to be done for this deal.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {/* HubSpot-Style Task List */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {tasks.map((task, index) => {
              const isOverdue = task.due_at && isPast(new Date(task.due_at)) && !isToday(new Date(task.due_at))
              const isDueToday = task.due_at && isToday(new Date(task.due_at))
              
              return (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-center gap-4 p-3 hover:bg-gray-50 transition-colors cursor-pointer group",
                    index !== tasks.length - 1 && "border-b border-gray-100"
                  )}
                  onClick={() => {
                    setSelectedTaskId(task.id)
                    setQueueOpen(true)
                  }}
                >
                  {/* Checkbox */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox 
                      checked={false}
                      onCheckedChange={() => handleCompleteTask(task.id)}
                      className="h-5 w-5"
                    />
                  </div>

                  {/* Task Type Icon */}
                  <div className="flex-shrink-0 text-lg">
                    {getTaskTypeIcon(task.task_type)}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                          {task.title}
                        </h4>
                        {task.notes && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {task.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Priority Badge */}
                  <Badge 
                    variant="outline" 
                    className={cn("text-xs font-normal", getPriorityBadgeColor(task.priority))}
                  >
                    {task.priority}
                  </Badge>

                  {/* Due Date */}
                  {task.due_at && (
                    <div className={cn(
                      "flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md",
                      isOverdue && "bg-red-50 text-red-700",
                      isDueToday && "bg-orange-50 text-orange-700",
                      !isOverdue && !isDueToday && "text-gray-600"
                    )}>
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="font-medium">
                        {isOverdue && 'Overdue'}
                        {isDueToday && 'Today'}
                        {!isOverdue && !isDueToday && formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
                      </span>
                    </div>
                  )}

                  {/* Assignee */}
                  {task.assignee_name && (
                    <div className="flex items-center gap-1.5">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                          {task.assignee_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  )}

                  {/* Click Indicator */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Create Task Panel */}
      <CreateTaskPanel
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onTaskCreated={fetchTasks}
        prefilledDealId={dealId}
        prefilledContactId={contactId}
      />

      {/* Task Queue Panel */}
      <TaskQueuePanel
        open={queueOpen}
        onClose={() => {
          setQueueOpen(false)
          setSelectedTaskId(null)
        }}
        tasks={tasks}
        initialTaskId={selectedTaskId || undefined}
        onTasksChange={() => {
          fetchTasks()
          onTaskUpdate?.()
        }}
      />
    </div>
  )
}