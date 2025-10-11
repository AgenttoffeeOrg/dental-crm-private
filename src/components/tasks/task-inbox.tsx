'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Plus, Search, Filter, CheckSquare } from 'lucide-react'
import { toast } from 'sonner'
import { CreateTaskDialog } from './create-task-dialog'
import { TaskFilters as TaskFiltersType, TaskWithRelations } from '@/types/database'
import { 
  formatDate, 
  isOverdue, 
  isDueToday, 
  getPriorityColor, 
  getDueDateColor 
} from '@/lib/dates'

interface TaskInboxProps {
  tenantId?: string
}

export function TaskInbox({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: TaskInboxProps) {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTasks, setSelectedTasks] = useState<string[]>([])
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()

  const fetchTasks = async () => {
    try {
      setLoading(true)

      let query = supabase
        .from('tasks')
        .select(`
          *,
          contact:contacts(*),
          deal:deals(*),
          assignee:app_users(*)
        `)
        .eq('tenant_id', tenantId)

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status)
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority)
      }
      if (filters.assignee_user_id) {
        query = query.eq('assignee_user_id', filters.assignee_user_id)
      }

      // Apply search
      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      let filteredTasks = data as TaskWithRelations[] || []

      // Apply date filters
      if (filters.overdue) {
        filteredTasks = filteredTasks.filter(task => 
          task.due_at && isOverdue(task.due_at)
        )
      }
      if (filters.due_today) {
        filteredTasks = filteredTasks.filter(task => 
          task.due_at && isDueToday(task.due_at)
        )
      }

      setTasks(filteredTasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      toast.error('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [filters, searchQuery])

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: completed ? 'done' : 'open',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)

      if (error) throw error

      toast.success(completed ? 'Task completed' : 'Task reopened')
      fetchTasks()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    }
  }

  const handleBulkComplete = async () => {
    if (selectedTasks.length === 0) return

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          updated_at: new Date().toISOString()
        })
        .in('id', selectedTasks)

      if (error) throw error

      toast.success(`${selectedTasks.length} tasks completed`)
      setSelectedTasks([])
      fetchTasks()
    } catch (error) {
      console.error('Error completing tasks:', error)
      toast.error('Failed to complete tasks')
    }
  }

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    )
  }

  const toggleAllTasks = () => {
    setSelectedTasks(
      selectedTasks.length === tasks.length 
        ? [] 
        : tasks.map(task => task.id)
    )
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      open: 'default',
      in_progress: 'secondary',
      done: 'outline',
      cancelled: 'destructive',
    }
    return <Badge variant={variants[status] || 'default'}>{status.replace('_', ' ')}</Badge>
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tasks...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Task Inbox</h2>
          <Badge variant="outline">
            {tasks.length} tasks
          </Badge>
          {selectedTasks.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedTasks.length} selected
              </Badge>
              <Button size="sm" onClick={handleBulkComplete}>
                Complete Selected
              </Button>
            </div>
          )}
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  status: value === 'all' ? undefined : value as 'open' | 'in_progress' | 'done' | 'cancelled'
                }))
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filters.priority || 'all'}
              onValueChange={(value) => 
                setFilters(prev => ({ 
                  ...prev, 
                  priority: value === 'all' ? undefined : value as 'low' | 'normal' | 'high' | 'urgent'
                }))
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button
                variant={filters.overdue ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  overdue: !prev.overdue,
                  due_today: false 
                }))}
              >
                Overdue
              </Button>
              <Button
                variant={filters.due_today ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  due_today: !prev.due_today,
                  overdue: false 
                }))}
              >
                Due Today
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={selectedTasks.length === tasks.length && tasks.length > 0}
                  onCheckedChange={toggleAllTasks}
                />
              </TableHead>
              <TableHead>Task</TableHead>
              <TableHead>Contact/Deal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assignee</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map(task => (
              <TableRow key={task.id}>
                <TableCell>
                  <Checkbox
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleTaskSelection(task.id)}
                  />
                </TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-500 truncate max-w-[300px]">
                        {task.description}
                      </div>
                    )}
                    {task.auto_created && (
                      <Badge variant="outline" className="text-xs mt-1">
                        Auto-created
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">
                    {task.contact && (
                      <div>{task.contact.full_name}</div>
                    )}
                    {task.deal && (
                      <div className="text-gray-500">{task.deal.title}</div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleTaskComplete(task.id, task.status !== 'done')}
                    className="hover:opacity-80"
                  >
                    {getStatusBadge(task.status)}
                  </button>
                </TableCell>
                <TableCell>
                  {getPriorityBadge(task.priority, task.due_at)}
                </TableCell>
                <TableCell>
                  {task.due_at && getDueDateBadge(task.due_at)}
                </TableCell>
                <TableCell>
                  {task.assignee && (
                    <div className="text-sm">{task.assignee.full_name}</div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {tasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <CheckSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No tasks found</p>
            <p className="text-sm">Try adjusting your filters or create a new task</p>
          </div>
        )}
      </Card>

      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={fetchTasks}
      />
    </div>
  )
}
