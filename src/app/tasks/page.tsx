'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter } from 'lucide-react'
import { TaskCardEnterprise } from '@/components/tasks/task-card-enterprise'
import { TaskDetailModal } from '@/components/tasks/task-detail-modal'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('my_tasks')
  const [typeFilter, setTypeFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  useEffect(() => {
    loadTasks()
  }, [filter, typeFilter, priorityFilter])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      let query = supabase
        .from('tasks_with_associations')
        .select('*')
        .order('due_at', { ascending: true, nullsFirst: false })

      // Apply filters
      if (filter === 'my_tasks' && user) {
        query = query.eq('assignee_user_id', user.id)
      } else if (filter === 'overdue') {
        query = query.lt('due_at', new Date().toISOString()).neq('status', 'done')
      } else if (filter === 'today') {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        query = query.gte('due_at', today.toISOString()).lt('due_at', tomorrow.toISOString())
      } else if (filter === 'this_week') {
        const today = new Date()
        const weekEnd = new Date(today)
        weekEnd.setDate(weekEnd.getDate() + 7)
        query = query.gte('due_at', today.toISOString()).lt('due_at', weekEnd.toISOString())
      }

      if (typeFilter !== 'all') {
        query = query.eq('task_type', typeFilter)
      }

      if (priorityFilter !== 'all') {
        query = query.eq('priority', priorityFilter)
      }

      const { data, error } = await query

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

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const taskCounts = {
    my_tasks: tasks.filter(t => t.assignee_user_id).length,
    overdue: tasks.filter(t => t.due_at && new Date(t.due_at) < new Date() && t.status !== 'done').length,
    today: tasks.filter(t => {
      if (!t.due_at) return false
      const today = new Date().toDateString()
      return new Date(t.due_at).toDateString() === today
    }).length,
    this_week: tasks.filter(t => {
      if (!t.due_at) return false
      const today = new Date()
      const weekEnd = new Date(today)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const dueDate = new Date(t.due_at)
      return dueDate >= today && dueDate <= weekEnd
    }).length
  }

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 mt-1">{filteredTasks.length} tasks</p>
          </div>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* View Filter */}
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="my_tasks">My Tasks ({taskCounts.my_tasks})</SelectItem>
                <SelectItem value="overdue">Overdue ({taskCounts.overdue})</SelectItem>
                <SelectItem value="today">Today ({taskCounts.today})</SelectItem>
                <SelectItem value="this_week">This Week ({taskCounts.this_week})</SelectItem>
                <SelectItem value="all">All Tasks</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="call">Calls</SelectItem>
                <SelectItem value="email">Emails</SelectItem>
                <SelectItem value="meeting">Meetings</SelectItem>
                <SelectItem value="todo">To-Dos</SelectItem>
                <SelectItem value="follow_up">Follow-ups</SelectItem>
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tasks Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((task) => (
              <div key={task.id} onClick={() => setSelectedTaskId(task.id)} className="cursor-pointer">
                <TaskCardEnterprise
                  task={task}
                  onComplete={handleCompleteTask}
                  onClick={(id) => setSelectedTaskId(id)}
                />
              </div>
            ))}
          </div>
        )}

        {!loading && filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">No tasks found</p>
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdate={loadTasks}
      />
    </div>
  )
}
