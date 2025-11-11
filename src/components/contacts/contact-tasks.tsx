'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { useTaskMutation } from '@/lib/hooks/use-task-mutation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Plus, 
  CheckSquare, 
  Calendar,
  User,
  AlertCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { 
  formatDate, 
  isOverdue, 
  isDueToday, 
  getPriorityColor, 
  getDueDateColor 
} from '@/lib/dates'
import type { TaskWithRelations } from '@/types/database'

interface ContactTasksProps {
  contactId: string
  onTasksChanged?: () => void
  tenantId?: string
}

export function ContactTasks({ 
  contactId, 
  onTasksChanged,
  tenantId = process.env.DEFAULT_TENANT_ID 
}: ContactTasksProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const supabase = createClient()
  
  const { updateTask } = useTaskMutation({
    onSuccess: () => {
      fetchTasks()
      onTasksChanged?.()
    },
  })

  useEffect(() => {
    fetchTasks()
  }, [contactId])

  const fetchTasks = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          assignee:app_users(*),
          deal:deals(title)
        `)
        .eq('contact_id', contactId)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })

      if (error) throw error

      setTasks(data as TaskWithRelations[] || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    const result = await updateTask(taskId, { status: completed ? 'done' : 'open' })
    if (result.error) {
      // Error already handled by useTaskMutation
      return
    }
    // Success handled by onSuccess callback
  }

  const handleTaskCreated = () => {
    fetchTasks()
    onTasksChanged?.()
    setCreateDialogOpen(false)
  }

  const getPriorityBadge = (priority: string, dueDate?: string) => {
    return (
      <Badge variant={getPriorityColor(priority as 'low' | 'normal' | 'high' | 'urgent', dueDate)}>
        {priority}
      </Badge>
    )
  }

  const getDueDateBadge = (dueDate: string) => {
    return (
      <Badge variant={getDueDateColor(dueDate)}>
        {formatDate(dueDate, 'MMM d')}
      </Badge>
    )
  }

  const getTaskIcon = (task: TaskWithRelations) => {
    if (task.status === 'done') {
      return <CheckSquare className="h-4 w-4 text-green-600" />
    }
    if (task.due_at && isOverdue(task.due_at)) {
      return <AlertCircle className="h-4 w-4 text-red-600" />
    }
    if (task.due_at && isDueToday(task.due_at)) {
      return <Clock className="h-4 w-4 text-orange-600" />
    }
    return <CheckSquare className="h-4 w-4 text-gray-400" />
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-gray-500">Loading tasks...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Tasks</h3>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium mb-2">No tasks yet</h3>
            <p className="text-gray-600 mb-4">
              Create tasks to track follow-ups and action items for this contact
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Task
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map(task => (
            <Card key={task.id} className={`transition-all ${task.status === 'done' ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Checkbox */}
                  <Checkbox
                    checked={task.status === 'done'}
                    onCheckedChange={(checked) => 
                      handleTaskComplete(task.id, checked as boolean)
                    }
                    className="mt-1"
                  />

                  {/* Task Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getTaskIcon(task)}
                  </div>

                  {/* Task Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className={`font-medium ${task.status === 'done' ? 'line-through text-gray-500' : ''}`}>
                          {task.title}
                        </h4>
                        {task.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {task.description}
                          </p>
                        )}
                        {task.deal && (
                          <p className="text-sm text-blue-600 mt-1">
                            Related to: {task.deal.title}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(task.priority, task.due_at)}
                        {task.auto_created && (
                          <Badge variant="outline" className="text-xs">
                            AI Generated
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Task Meta */}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {task.assignee && (
                        <div className="flex items-center gap-1">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-xs">
                              {task.assignee.full_name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          {task.assignee.full_name}
                        </div>
                      )}
                      {task.due_at && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {getDueDateBadge(task.due_at)}
                        </div>
                      )}
                      <div className="text-xs">
                        Created {formatDate(task.created_at, 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Tasks Summary */}
      {tasks.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">{tasks.length}</div>
                <div className="text-xs text-gray-600">Total</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {tasks.filter(t => t.status === 'done').length}
                </div>
                <div className="text-xs text-gray-600">Completed</div>
              </div>
              <div>
                <div className="text-lg font-bold text-orange-600">
                  {tasks.filter(t => t.due_at && isDueToday(t.due_at) && t.status !== 'done').length}
                </div>
                <div className="text-xs text-gray-600">Due Today</div>
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">
                  {tasks.filter(t => t.due_at && isOverdue(t.due_at) && t.status !== 'done').length}
                </div>
                <div className="text-xs text-gray-600">Overdue</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Task Dialog */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={handleTaskCreated}
        preselectedContactId={contactId}
      />
    </div>
  )
}
