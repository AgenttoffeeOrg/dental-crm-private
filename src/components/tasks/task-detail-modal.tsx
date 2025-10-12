'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { 
  Phone, 
  Mail, 
  CheckSquare, 
  Calendar,
  Repeat,
  Clock,
  Link2,
  Paperclip,
  MessageSquare,
  X,
  Plus,
  User
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface TaskDetailModalProps {
  taskId: string | null
  open: boolean
  onClose: () => void
  onUpdate?: () => void
  onComplete?: (taskId: string) => void
  queueMode?: boolean
  onNext?: () => void
}

export function TaskDetailModal({ taskId, open, onClose, onUpdate, onComplete, queueMode, onNext }: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [subtasks, setSubtasks] = useState<any[]>([])
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')

  useEffect(() => {
    if (open && taskId) {
      loadTaskDetails()
    }
  }, [open, taskId])

  const loadTaskDetails = async () => {
    if (!taskId) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Load main task
      const { data: taskData, error: taskError } = await supabase
        .from('tasks_with_associations')
        .select('*')
        .eq('id', taskId)
        .single()

      if (taskError) throw taskError
      setTask(taskData)

      // Load subtasks
      const { data: subtasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('parent_task_id', taskId)
        .order('position')

      setSubtasks(subtasksData || [])

      // Load comments
      const { data: commentsData } = await supabase
        .from('task_comments')
        .select('*, user:app_users(full_name)')
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      setComments(commentsData || [])
    } catch (error) {
      console.error('Error loading task:', error)
      toast.error('Failed to load task details')
    } finally {
      setLoading(false)
    }
  }

  const updateTask = async (updates: any) => {
    if (!taskId) return
    
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId)

      if (error) throw error
      
      toast.success('Task updated')
      await loadTaskDetails()
      onUpdate?.()
    } catch (error) {
      console.error('Error updating task:', error)
      toast.error('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const addComment = async () => {
    if (!taskId || !newComment.trim()) return
    
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          user_id: user?.id,
          content: newComment,
          tenant_id: task?.tenant_id
        })

      if (error) throw error
      
      setNewComment('')
      await loadTaskDetails()
      toast.success('Comment added')
    } catch (error) {
      console.error('Error adding comment:', error)
      toast.error('Failed to add comment')
    }
  }

  if (!task) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh]">
          <DialogTitle className="sr-only">Loading Task</DialogTitle>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <ScrollArea className="max-h-[90vh]">
          <div className="p-6">
            <DialogHeader className="mb-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <DialogTitle className="sr-only">Task Details</DialogTitle>
                  <Input
                    value={task.title}
                    onChange={(e) => updateTask({ title: e.target.value })}
                    className="text-lg font-semibold border-0 px-0 focus-visible:ring-0"
                    placeholder="Task title"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>

            <div className="grid grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="col-span-2 space-y-6">
                {/* Description */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Description</Label>
                  <Textarea
                    value={task.description || ''}
                    onChange={(e) => updateTask({ description: e.target.value })}
                    placeholder="Add description..."
                    rows={4}
                  />
                </div>

                {/* Subtasks */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-xs text-gray-500 uppercase">Subtasks ({subtasks.length})</Label>
                    <Button size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-1" />
                      Add Subtask
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-50">
                        <input type="checkbox" checked={subtask.status === 'done'} className="rounded" />
                        <span className="text-sm flex-1">{subtask.title}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Comments */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-3 block">
                    Comments ({comments.length})
                  </Label>
                  
                  <div className="space-y-3 mb-4">
                    {comments.map((comment) => (
                      <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="text-sm font-medium">{comment.user?.full_name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(comment.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                    />
                    <Button onClick={addComment} disabled={!newComment.trim()}>
                      <MessageSquare className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Queue Mode Actions */}
                {queueMode && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-blue-900">Task Queue Mode</p>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={() => {
                          if (taskId) {
                            onComplete?.(taskId)
                            onClose()
                          }
                        }}
                        className="w-full"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Complete & Next
                      </Button>
                      <Button variant="outline" onClick={onNext} className="w-full">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Skip to Next
                      </Button>
                    </div>
                  </div>
                )}

                {/* Status */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Status</Label>
                  <Select value={task.status} onValueChange={(val) => updateTask({ status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Priority</Label>
                  <Select value={task.priority} onValueChange={(val) => updateTask({ priority: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Task Type */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Type</Label>
                  <Select value={task.task_type} onValueChange={(val) => updateTask({ task_type: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="todo">To-Do</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="follow_up">Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div>
                  <Label className="text-xs text-gray-500 uppercase mb-2 block">Due Date</Label>
                  <Input
                    type="datetime-local"
                    value={task.due_at ? new Date(task.due_at).toISOString().slice(0, 16) : ''}
                    onChange={(e) => updateTask({ due_at: e.target.value })}
                  />
                </div>

                <Separator />

                {/* Associations */}
                {task.deal_title && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase mb-2 block">Deal</Label>
                    <Badge variant="secondary" className="w-full justify-start">
                      <Link2 className="h-3 w-3 mr-1" />
                      {task.deal_title}
                    </Badge>
                  </div>
                )}

                {task.contact_name && (
                  <div>
                    <Label className="text-xs text-gray-500 uppercase mb-2 block">Contact</Label>
                    <Badge variant="outline" className="w-full justify-start">
                      👤 {task.contact_name}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

