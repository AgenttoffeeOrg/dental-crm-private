'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Search, Play, ArrowRight, CheckCircle2 } from 'lucide-react'
import { CreateTaskDialog } from '@/components/tasks/create-task-dialog'
import { TaskDetailModal } from '@/components/tasks/task-detail-modal'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, isToday, isPast, startOfDay } from 'date-fns'

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [queueMode, setQueueMode] = useState(false)
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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
      
      // If in queue mode, move to next task
      if (queueMode) {
        const remainingTasks = tasks.filter(t => t.id !== taskId && t.status !== 'done')
        if (remainingTasks.length > 0) {
          setCurrentQueueIndex(0)
          loadNextTaskInQueue(remainingTasks[0])
        } else {
          setQueueMode(false)
          toast.success('All tasks completed! 🎉')
        }
      }
      
      await loadTasks()
    } catch (error) {
      console.error('Error completing task:', error)
      toast.error('Failed to complete task')
    }
  }

  const startTaskQueue = () => {
    const incompleteTasks = tasks.filter(t => t.status !== 'done')
    if (incompleteTasks.length === 0) {
      toast.info('No tasks to start')
      return
    }
    
    setQueueMode(true)
    setCurrentQueueIndex(0)
    loadNextTaskInQueue(incompleteTasks[0])
  }

  const loadNextTaskInQueue = (task: any) => {
    // Open task detail
    setSelectedTaskId(task.id)
    
    // If task has a deal, navigate to it
    if (task.deal_id) {
      toast.info(`Opening deal: ${task.deal_title || 'Untitled'}`)
      // We'll open the deal in the background
      window.open(`/pipeline?deal=${task.deal_id}`, '_blank')
    }
  }

  const skipToNextTask = () => {
    const incompleteTasks = tasks.filter(t => t.status !== 'done')
    const nextIndex = currentQueueIndex + 1
    
    if (nextIndex < incompleteTasks.length) {
      setCurrentQueueIndex(nextIndex)
      loadNextTaskInQueue(incompleteTasks[nextIndex])
    } else {
      setQueueMode(false)
      setSelectedTaskId(null)
      toast.success('Queue complete!')
    }
  }

  const stopQueue = () => {
    setQueueMode(false)
    setSelectedTaskId(null)
    setCurrentQueueIndex(0)
  }

  const filteredTasks = tasks.filter(task => {
    if (!searchQuery) return true
    return task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           task.description?.toLowerCase().includes(searchQuery.toLowerCase())
  })

  // Group tasks
  const todayTasks = filteredTasks.filter(t => t.due_at && isToday(new Date(t.due_at)))
  const overdueTasks = filteredTasks.filter(t => t.due_at && isPast(new Date(t.due_at)) && !isToday(new Date(t.due_at)))
  const upcomingTasks = filteredTasks.filter(t => !t.due_at || (!isToday(new Date(t.due_at)) && !isPast(new Date(t.due_at))))

  const TaskRow = ({ task }: { task: any }) => (
    <div
      className="group flex items-center gap-4 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => setSelectedTaskId(task.id)}
    >
      <Checkbox
        checked={task.status === 'done'}
        onClick={(e) => {
          e.stopPropagation()
          handleCompleteTask(task.id)
        }}
        className="flex-shrink-0"
      />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm text-gray-900 truncate">{task.title}</h4>
          {task.task_type && (
            <Badge variant="outline" className="text-xs">
              {task.task_type}
            </Badge>
          )}
          {task.priority === 'urgent' && (
            <Badge variant="destructive" className="text-xs">Urgent</Badge>
          )}
        </div>
        
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {task.deal_title && (
            <span>🔗 {task.deal_title}</span>
          )}
          {task.contact_name && (
            <span>👤 {task.contact_name}</span>
          )}
          {task.assignee_name && (
            <span>Assigned to {task.assignee_name}</span>
          )}
        </div>
      </div>

      {task.due_at && (
        <div className="text-xs text-gray-600">
          {formatDistanceToNow(new Date(task.due_at), { addSuffix: true })}
        </div>
      )}
    </div>
  )

  return (
    <div className="flex-1 overflow-auto p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-500 mt-1">
              {filteredTasks.length} open tasks
            </p>
          </div>
          <div className="flex gap-2">
            {!queueMode ? (
              <>
                <Button variant="outline" onClick={startTaskQueue}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Task Queue
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Task
                </Button>
              </>
            ) : (
              <>
                <Badge variant="secondary" className="py-2 px-4">
                  Queue Mode: {currentQueueIndex + 1} of {tasks.filter(t => t.status !== 'done').length}
                </Badge>
                <Button variant="outline" onClick={skipToNextTask}>
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Skip
                </Button>
                <Button variant="destructive" onClick={stopQueue}>
                  Stop Queue
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Task Lists */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Overdue */}
            {overdueTasks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-red-50 border-b border-red-100">
                  <h2 className="font-semibold text-sm text-red-900 flex items-center gap-2">
                    Overdue
                    <Badge variant="destructive">{overdueTasks.length}</Badge>
                  </h2>
                </div>
                <div>
                  {overdueTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Today */}
            {todayTasks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-orange-50 border-b border-orange-100">
                  <h2 className="font-semibold text-sm text-orange-900 flex items-center gap-2">
                    Today
                    <Badge variant="secondary">{todayTasks.length}</Badge>
                  </h2>
                </div>
                <div>
                  {todayTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming & No Due Date */}
            {upcomingTasks.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <h2 className="font-semibold text-sm text-gray-900 flex items-center gap-2">
                    Upcoming & No Due Date
                    <Badge variant="outline">{upcomingTasks.length}</Badge>
                  </h2>
                </div>
                <div>
                  {upcomingTasks.map(task => (
                    <TaskRow key={task.id} task={task} />
                  ))}
                </div>
              </div>
            )}

            {filteredTasks.length === 0 && (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p className="text-gray-500 mb-4">No open tasks</p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Task
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTaskCreated={loadTasks}
      />

      <TaskDetailModal
        taskId={selectedTaskId}
        open={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null)
          if (!queueMode) {
            loadTasks()
          }
        }}
        onUpdate={loadTasks}
        onComplete={handleCompleteTask}
        queueMode={queueMode}
        onNext={skipToNextTask}
      />
    </div>
  )
}
