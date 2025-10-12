'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { X, Phone, Mail, CheckSquare, Calendar, Repeat, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { addHours, addDays } from 'date-fns'

interface CreateTaskPanelProps {
  open: boolean
  onClose: () => void
  onTaskCreated: () => void
  prefilledDealId?: string
  prefilledContactId?: string
  tenantId?: string
}

const TASK_TYPES = [
  { value: 'call', label: 'Phone Call', icon: Phone, color: 'text-green-600 bg-green-50' },
  { value: 'email', label: 'Send Email', icon: Mail, color: 'text-blue-600 bg-blue-50' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'text-purple-600 bg-purple-50' },
  { value: 'todo', label: 'To-Do', icon: CheckSquare, color: 'text-gray-600 bg-gray-50' },
  { value: 'follow_up', label: 'Follow-up', icon: Repeat, color: 'text-orange-600 bg-orange-50' },
]

export function CreateTaskPanel({
  open,
  onClose,
  onTaskCreated,
  prefilledDealId,
  prefilledContactId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: CreateTaskPanelProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'call',
    priority: 'normal',
    due_at: '',
    assignee_user_id: '',
    contact_id: prefilledContactId || '',
    deal_id: prefilledDealId || '',
    estimated_duration_minutes: 30
  })

  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadData()
      // Reset form
      setFormData({
        title: '',
        description: '',
        task_type: 'call',
        priority: 'normal',
        due_at: '',
        assignee_user_id: '',
        contact_id: prefilledContactId || '',
        deal_id: prefilledDealId || '',
        estimated_duration_minutes: 30
      })
    }
  }, [open, prefilledContactId, prefilledDealId])

  const loadData = async () => {
    try {
      const supabase = createClient()
      
      const [contactsRes, dealsRes, usersRes] = await Promise.all([
        supabase.from('contacts').select('*').eq('tenant_id', tenantId).order('full_name'),
        supabase.from('deals').select('*').eq('tenant_id', tenantId).order('title'),
        supabase.from('app_users').select('*').eq('tenant_id', tenantId).order('full_name')
      ])

      setContacts(contactsRes.data || [])
      setDeals(dealsRes.data || [])
      setUsers(usersRes.data || [])
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const handleQuickDate = (hours: number) => {
    const date = addHours(new Date(), hours)
    setFormData({ ...formData, due_at: date.toISOString().slice(0, 16) })
  }

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast.error('Task title is required')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const taskData = {
        title: formData.title,
        description: formData.description || null,
        task_type: formData.task_type,
        priority: formData.priority,
        estimated_duration_minutes: formData.estimated_duration_minutes,
        due_at: formData.due_at || null,
        assignee_user_id: formData.assignee_user_id || user?.id || null,
        contact_id: formData.contact_id || null,
        deal_id: formData.deal_id || null,
        tenant_id: tenantId,
        status: 'open',
        auto_created: false
      }

      const { error } = await supabase
        .from('tasks')
        .insert([taskData])

      if (error) throw error

      toast.success('Task created!')
      onTaskCreated()
      onClose()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const selectedType = TASK_TYPES.find(t => t.value === formData.task_type) || TASK_TYPES[0]
  const TypeIcon = selectedType.icon

  return (
    <div className={cn(
      "fixed right-0 top-0 h-full w-[600px] bg-white border-l border-gray-200 shadow-2xl z-50 transform transition-transform duration-300",
      open ? "translate-x-0" : "translate-x-full"
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Create New Task</h2>
          <p className="text-sm text-gray-600 mt-0.5">Add a task to your queue</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form Content */}
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="p-6 space-y-6">
          {/* Task Type Selection */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">Task Type</Label>
            <div className="grid grid-cols-2 gap-3">
              {TASK_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = formData.task_type === type.value
                
                return (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, task_type: type.value })}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-lg border-2 transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", type.color)}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-sm font-medium text-gray-900">{type.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <Separator />

          {/* Title */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Task Title *</Label>
            <Input
              placeholder="e.g., Call Sarah about treatment plan"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="text-base h-11"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Description</Label>
            <Textarea
              placeholder="Add any additional details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Due Date */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Due Date</Label>
            <Input
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
              className="mb-3"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(4)}
              >
                4 hours
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(24)}
              >
                Tomorrow
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(72)}
              >
                3 days
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickDate(168)}
              >
                1 week
              </Button>
            </div>
          </div>

          <Separator />

          {/* Priority & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">🔴 Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Duration (min)</Label>
              <Input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                className="text-base"
              />
            </div>
          </div>

          <Separator />

          {/* Assignee */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Assign To</Label>
            <Select
              value={formData.assignee_user_id || 'unassigned'}
              onValueChange={(val) => setFormData({ ...formData, assignee_user_id: val === 'unassigned' ? '' : val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Associations */}
          <div className="space-y-4">
            <Label className="text-sm font-medium text-gray-700 block">Associate With</Label>
            
            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Deal (Optional)</Label>
              <Select
                value={formData.deal_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, deal_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select deal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No deal</SelectItem>
                  {deals.map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>
                      {deal.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs text-gray-500 mb-1.5 block">Contact (Optional)</Label>
              <Select
                value={formData.contact_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, contact_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No contact</SelectItem>
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* AI Suggestions (Future) */}
          <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">AI Suggestions</span>
            </div>
            <p className="text-xs text-purple-700">
              Based on this {formData.deal_id ? 'deal' : 'task'}, we recommend scheduling a follow-up call in 2 days.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200 bg-white">
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim()}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}

