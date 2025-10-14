'use client'

/**
 * Create Task Slide-Over Panel
 * Enterprise-style right-side slide-over for creating tasks
 */

import { useState } from 'react'
import { X, CheckSquare, User, Calendar, Flag, FileText, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'

interface CreateTaskSlideOverProps {
  open: boolean
  onClose: () => void
  onTaskCreated: () => void
  preselectedContactId?: string
  preselectedDealId?: string
}

export function CreateTaskSlideOver({ 
  open, 
  onClose, 
  onTaskCreated,
  preselectedContactId,
  preselectedDealId 
}: CreateTaskSlideOverProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal',
    due_date: '',
    contact_id: preselectedContactId || '',
    deal_id: preselectedDealId || '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Task title is required')
      return
    }

    if (!appUser?.tenant_id) {
      toast.error('User session error. Please refresh the page.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const taskData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        due_date: formData.due_date || null,
        contact_id: formData.contact_id || null,
        deal_id: formData.deal_id || null,
        tenant_id: appUser.tenant_id,
        assigned_to: appUser.id, // Assign to current user by default
      }

      console.log('[CREATE_TASK] Creating task:', taskData)

      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select()
        .single()

      if (error) {
        console.error('[CREATE_TASK] Error:', error)
        throw error
      }

      console.log('[CREATE_TASK] Success:', data)
      toast.success('Task created successfully!')
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'normal',
        due_date: '',
        contact_id: preselectedContactId || '',
        deal_id: preselectedDealId || '',
      })

      // Notify parent and close
      onTaskCreated()
      onClose()

    } catch (error: any) {
      console.error('[CREATE_TASK] Failed:', error)
      toast.error('Failed to create task', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'normal',
      due_date: '',
      contact_id: preselectedContactId || '',
      deal_id: preselectedDealId || '',
    })
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={handleCancel}
      />

      {/* Slide-over Panel from RIGHT */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center">
                  <CheckSquare className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create New Task</h2>
                  <p className="text-sm text-gray-600">Add a task and stay organized</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content - Scrollable Form */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Title - Required */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Task Title *
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Follow up with patient..."
                  required
                  className="h-11"
                  autoFocus
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Additional details about this task..."
                  rows={4}
                  className="resize-none"
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-2">
                  <Flag className="h-4 w-4" />
                  Priority
                </Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                  <SelectTrigger className="h-11">
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

              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="due_date" className="text-sm font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Due Date
                </Label>
                <Input
                  id="due_date"
                  type="datetime-local"
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.title.trim()}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

