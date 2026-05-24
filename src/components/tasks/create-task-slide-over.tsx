'use client'

/**
 * Create Task Slide-Over Panel
 * Enterprise-style right-side slide-over for creating tasks
 */

import { useState, useEffect } from 'react'
import { X, CheckSquare, User, Calendar, Flag, FileText, Save, MapPin, Phone, Mail, Repeat, Link2 } from 'lucide-react'
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
import { useTaskMutation } from '@/lib/hooks/use-task-mutation'
import { useAccessibleLocations } from '@/lib/hooks/use-locations'
import { LocationSelector } from '@/components/ui/location-selector'
import { ContactSelector } from '@/components/ui/contact-selector'
import { DealSelector } from '@/components/ui/deal-selector'
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
  const { locations, loading: locationsLoading } = useAccessibleLocations()
  const { createTask, isLoading: mutationLoading } = useTaskMutation({
    onSuccess: () => {
      onTaskCreated()
      onClose()
    },
  })
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [dataLoading, setDataLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    task_type: 'todo',
    priority: 'normal',
    due_date: '',
    contact_id: preselectedContactId || '',
    deal_id: preselectedDealId || '',
    location_id: '',
    assignee_user_id: '',
  })
  // 2b.81 — recurring rule state. Off by default; if 'on', creates a
  // task_recurring_rules row on submit and stamps tasks.recurring_rule_id.
  const [recurring, setRecurring] = useState<{
    enabled: boolean
    frequency: 'daily' | 'weekly' | 'monthly'
    interval_count: number
    weekly_days: number[]
    monthly_day: number | null
    ends_at: string
  }>({
    enabled: false,
    frequency: 'weekly',
    interval_count: 1,
    weekly_days: [],
    monthly_day: null,
    ends_at: '',
  })

  // Load contacts, deals, and users when component opens
  useEffect(() => {
    if (open && appUser?.tenant_id) {
      loadData()
    }
  }, [open, appUser?.tenant_id])

  // Reset form when preselected values change
  useEffect(() => {
    if (open) {
      setFormData(prev => ({
        ...prev,
        contact_id: preselectedContactId || prev.contact_id,
        deal_id: preselectedDealId || prev.deal_id,
      }))
    }
  }, [open, preselectedContactId, preselectedDealId])

  // Auto-resolve location when contact/deal changes
  useEffect(() => {
    const resolveLocation = async () => {
      if (!formData.contact_id && !formData.deal_id) return

      const supabase = createClient()
      let resolvedLocationId: string | null = null

      if (formData.contact_id) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('location_id')
          .eq('id', formData.contact_id)
          .single()
        if (contact?.location_id) {
          resolvedLocationId = contact.location_id
        }
      }

      if (!resolvedLocationId && formData.deal_id) {
        const { data: deal } = await supabase
          .from('deals')
          .select('location_id')
          .eq('id', formData.deal_id)
          .single()
        if (deal?.location_id) {
          resolvedLocationId = deal.location_id
        }
      }

      if (resolvedLocationId && resolvedLocationId !== formData.location_id) {
        setFormData(prev => ({ ...prev, location_id: resolvedLocationId || '' }))
      }
    }

    if (formData.contact_id || formData.deal_id) {
      resolveLocation()
    }
  }, [formData.contact_id, formData.deal_id])

  const loadData = async () => {
    if (!appUser?.tenant_id) return
    
    setDataLoading(true)
    try {
      const supabase = createClient()
      
      // 2b.85 — route through the same /api/users?in_tenant=1 endpoint
      // as TeamMembersTab / EditUserModal so membership filtering is
      // consistent. Direct supabase reads here would leak inactive /
      // cross-tenant users if RLS ever loosened.
      const [contactsRes, dealsRes, usersRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name').eq('tenant_id', appUser.tenant_id).order('full_name').limit(100),
        supabase.from('deals').select('id, title').eq('tenant_id', appUser.tenant_id).order('title').limit(100),
        fetch('/api/users?in_tenant=1', { credentials: 'include' })
          .then(async (r) => {
            if (!r.ok) {
              console.warn('[create-task-slide-over] users fetch failed', r.status)
              return { users: [] as Array<{ id: string; full_name: string | null }> }
            }
            return r.json() as Promise<{ users: Array<{ id: string; full_name: string | null }> }>
          })
          .catch((err) => {
            console.warn('[create-task-slide-over] users fetch threw', err)
            return { users: [] as Array<{ id: string; full_name: string | null }> }
          }),
      ])

      setContacts(contactsRes.data || [])
      setDeals(dealsRes.data || [])
      setUsers(usersRes.users || [])
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Failed to load form data')
    } finally {
      setDataLoading(false)
    }
  }

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
      // 2b.81 — if recurring is on, create the rule first so we can
      // stamp the task with recurring_rule_id. If the rule create fails
      // we abort the task create entirely (better to surface the error
      // than create an orphan task that won't repeat).
      let recurringRuleId: string | null = null
      if (recurring.enabled) {
        if (!formData.due_date) {
          toast.error('Recurring tasks need a due date.')
          setLoading(false)
          return
        }
        try {
          const res = await fetch('/api/task-recurring-rules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              frequency: recurring.frequency,
              interval_count: recurring.interval_count,
              weekly_days:
                recurring.frequency === 'weekly' && recurring.weekly_days.length > 0
                  ? recurring.weekly_days
                  : undefined,
              monthly_day:
                recurring.frequency === 'monthly' ? recurring.monthly_day : undefined,
              ends_at: recurring.ends_at
                ? new Date(recurring.ends_at).toISOString()
                : undefined,
            }),
          })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            throw new Error(body.error ?? `http_${res.status}`)
          }
          const body = await res.json()
          recurringRuleId = body.id
        } catch (err) {
          toast.error(
            `Couldn't save recurrence: ${err instanceof Error ? err.message : 'unknown'}`
          )
          setLoading(false)
          return
        }
      }

      const taskData: Record<string, unknown> = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        task_type: formData.task_type,
        priority: formData.priority,
        due_at: formData.due_date || undefined,
        contact_id: formData.contact_id || undefined,
        deal_id: formData.deal_id || undefined,
        location_id: formData.location_id || undefined,
        assignee_user_id: formData.assignee_user_id || appUser?.id || undefined,
      }
      if (recurringRuleId) {
        taskData.recurring_rule_id = recurringRuleId
        taskData.is_recurring = true
      }

      await createTask(taskData as any)
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        task_type: 'todo',
        priority: 'normal',
        due_date: '',
        contact_id: preselectedContactId || '',
        deal_id: preselectedDealId || '',
        location_id: '',
        assignee_user_id: '',
      })

    } catch (error: any) {
      console.error('[CREATE_TASK] Failed:', error)
      // Error already handled by useTaskMutation
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      title: '',
      description: '',
      task_type: 'todo',
      priority: 'normal',
      due_date: '',
      contact_id: preselectedContactId || '',
      deal_id: preselectedDealId || '',
      location_id: '',
      assignee_user_id: '',
    })
    onClose()
  }

  const TASK_TYPE_ICONS = {
    call: Phone,
    email: Mail,
    todo: CheckSquare,
    meeting: Calendar,
    follow_up: Repeat,
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

              {/* Task Type & Priority - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="task_type" className="text-sm font-medium">
                    Task Type
                  </Label>
                  <Select value={formData.task_type} onValueChange={(value) => setFormData({ ...formData, task_type: value })}>
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="call">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          <span>Call</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="email">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="meeting">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Meeting</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="todo">
                        <div className="flex items-center gap-2">
                          <CheckSquare className="h-4 w-4" />
                          <span>Todo</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="follow_up">
                        <div className="flex items-center gap-2">
                          <Repeat className="h-4 w-4" />
                          <span>Follow-up</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
              </div>

              {/* Contact & Deal - 2 Columns */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contact_id" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Contact
                  </Label>
                  <ContactSelector
                    contacts={contacts}
                    value={formData.contact_id || null}
                    onValueChange={(value) => setFormData({ ...formData, contact_id: value || '' })}
                    placeholder="Select contact..."
                    disabled={dataLoading}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deal_id" className="text-sm font-medium flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    Deal
                  </Label>
                  <DealSelector
                    deals={deals}
                    value={formData.deal_id || null}
                    onValueChange={(value) => setFormData({ ...formData, deal_id: value || '' })}
                    placeholder="Select deal..."
                    disabled={dataLoading}
                    className="h-11"
                  />
                </div>
              </div>

              {/* Assignee */}
              <div className="space-y-2">
                <Label htmlFor="assignee_user_id" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Assign To
                </Label>
                <Select
                  value={formData.assignee_user_id || 'me'}
                  onValueChange={(value) => setFormData({ ...formData, assignee_user_id: value === 'me' ? '' : value })}
                  disabled={dataLoading}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="me">Me ({appUser?.full_name || 'Current user'})</SelectItem>
                    {users.map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.full_name}
                      </SelectItem>
                    ))}
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

              {/* 2b.81 — Recurring */}
              <div className="space-y-3 border rounded-md p-4 bg-gray-50">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={recurring.enabled}
                    onChange={(e) =>
                      setRecurring((r) => ({ ...r, enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm font-medium flex items-center gap-2">
                    <Repeat className="h-4 w-4" />
                    Repeat this task
                  </span>
                </label>
                {recurring.enabled && (
                  <div className="space-y-3 pl-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs">Frequency</Label>
                        <Select
                          value={recurring.frequency}
                          onValueChange={(v) =>
                            setRecurring((r) => ({
                              ...r,
                              frequency: v as 'daily' | 'weekly' | 'monthly',
                            }))
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="daily">Daily</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Every</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={recurring.interval_count}
                          onChange={(e) =>
                            setRecurring((r) => ({
                              ...r,
                              interval_count: parseInt(e.target.value, 10) || 1,
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                    </div>
                    {recurring.frequency === 'weekly' && (
                      <div>
                        <Label className="text-xs">On days</Label>
                        <div className="flex gap-1 mt-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => {
                            const active = recurring.weekly_days.includes(idx)
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() =>
                                  setRecurring((r) => ({
                                    ...r,
                                    weekly_days: active
                                      ? r.weekly_days.filter((d) => d !== idx)
                                      : [...r.weekly_days, idx].sort(),
                                  }))
                                }
                                className={`text-xs px-2 py-1 rounded border ${
                                  active
                                    ? 'bg-orange-600 text-white border-orange-600'
                                    : 'bg-white text-gray-700 border-gray-300'
                                }`}
                              >
                                {label}
                              </button>
                            )
                          })}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Leave empty to repeat on the same weekday as the original.
                        </p>
                      </div>
                    )}
                    {recurring.frequency === 'monthly' && (
                      <div>
                        <Label className="text-xs">Day of month</Label>
                        <Input
                          type="number"
                          min={1}
                          max={31}
                          placeholder="Same day as the original"
                          value={recurring.monthly_day ?? ''}
                          onChange={(e) =>
                            setRecurring((r) => ({
                              ...r,
                              monthly_day: e.target.value
                                ? parseInt(e.target.value, 10)
                                : null,
                            }))
                          }
                          className="h-9"
                        />
                      </div>
                    )}
                    <div>
                      <Label className="text-xs">Stop on (optional)</Label>
                      <Input
                        type="date"
                        value={recurring.ends_at}
                        onChange={(e) =>
                          setRecurring((r) => ({ ...r, ends_at: e.target.value }))
                        }
                        className="h-9"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      When you mark this task done or cancelled, the next instance
                      gets created automatically the next day.
                    </p>
                  </div>
                )}
              </div>

              {/* Location */}
              {locations.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="location_id" className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Location
                    {(formData.contact_id || formData.deal_id) && formData.location_id && (
                      <span className="text-xs text-gray-500 ml-auto">(Auto-inherited)</span>
                    )}
                  </Label>
                  <LocationSelector
                    locations={locations}
                    value={formData.location_id || null}
                    onValueChange={(val) => setFormData({ ...formData, location_id: val || '' })}
                    placeholder="Auto-inherited from contact/deal"
                    disabled={locationsLoading}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer - Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || mutationLoading || !formData.title.trim()}
              className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700"
            >
              {loading || mutationLoading ? (
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

