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
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
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
  tenantId
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
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Form Content */}
      <ScrollArea className="h-[calc(100vh-140px)]">
        <div className="p-5 space-y-4">
          {/* Task Type Selection - Compact */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-2 block">Type</Label>
            <div className="flex gap-2">
              {TASK_TYPES.map((type) => {
                const Icon = type.icon
                const isSelected = formData.task_type === type.value
                
                return (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, task_type: type.value })}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-1.5 p-2.5 rounded-lg border transition-all",
                      isSelected
                        ? "border-blue-500 bg-blue-50 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isSelected ? "text-blue-600" : "text-gray-600")} />
                    <span className="text-xs font-medium text-gray-700">{type.label.split(' ')[0]}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Title *</Label>
            <Input
              placeholder="What needs to be done?"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="h-10"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Notes</Label>
            <Textarea
              placeholder="Additional details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="text-sm resize-none"
            />
          </div>

          {/* Due Date - Compact */}
          <div>
            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Due Date</Label>
            <Input
              type="datetime-local"
              value={formData.due_at}
              onChange={(e) => setFormData({ ...formData, due_at: e.target.value })}
              className="h-9 mb-2"
            />
            <div className="flex gap-1.5">
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate(4)} className="flex-1 h-7 text-xs">
                4h
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate(24)} className="flex-1 h-7 text-xs">
                1d
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate(72)} className="flex-1 h-7 text-xs">
                3d
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => handleQuickDate(168)} className="flex-1 h-7 text-xs">
                1w
              </Button>
            </div>
          </div>

          {/* Priority, Duration, Assignee - 3 Columns */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Priority</Label>
              <Select value={formData.priority} onValueChange={(val) => setFormData({ ...formData, priority: val })}>
                <SelectTrigger className="h-9">
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

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Duration</Label>
              <Input
                type="number"
                value={formData.estimated_duration_minutes}
                onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) || 0 })}
                className="h-9"
                placeholder="30"
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Assign To</Label>
              <Select
                value={formData.assignee_user_id || 'me'}
                onValueChange={(val) => setFormData({ ...formData, assignee_user_id: val === 'me' ? '' : val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="me">Me</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Associations - 2 Columns */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Deal</Label>
              <Select
                value={formData.deal_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, deal_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {deals.slice(0, 20).map(deal => (
                    <SelectItem key={deal.id} value={deal.id}>{deal.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Contact</Label>
              <Select
                value={formData.contact_id || 'none'}
                onValueChange={(val) => setFormData({ ...formData, contact_id: val === 'none' ? '' : val })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {contacts.slice(0, 20).map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>{contact.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1 h-10"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim()}
            className="flex-1 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}

