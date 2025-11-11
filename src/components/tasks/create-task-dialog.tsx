'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { useTaskMutation } from '@/lib/hooks/use-task-mutation'
import { useAccessibleLocations } from '@/lib/hooks/use-locations'
import { LocationSelector } from '@/components/ui/location-selector'
import { ContactSelector } from '@/components/ui/contact-selector'
import { DealSelector } from '@/components/ui/deal-selector'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDateTimeForInput, addHoursToDate } from '@/lib/dates'
import type { Contact, Deal, AppUser } from '@/types/database'

const taskSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  task_type: z.enum(['call', 'email', 'todo', 'meeting', 'follow_up']).default('todo'),
  assignee_user_id: z.string().optional(),
  due_at: z.string().optional(),
  contact_id: z.string().optional(),
  deal_id: z.string().optional(),
  location_id: z.string().optional(),
  estimated_duration_minutes: z.number().optional(),
})

type TaskFormData = z.infer<typeof taskSchema>

interface CreateTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated: () => void
  tenantId?: string
  preselectedContactId?: string
  preselectedDealId?: string
}

export function CreateTaskDialog({ 
  open, 
  onOpenChange, 
  onTaskCreated,
  tenantId,
  preselectedContactId,
  preselectedDealId
}: CreateTaskDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const { locations, loading: locationsLoading } = useAccessibleLocations()
  const { createTask, isLoading: mutationLoading } = useTaskMutation({
    onSuccess: () => {
      onTaskCreated()
      onOpenChange(false)
      form.reset()
    },
  })

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      priority: 'normal',
      task_type: 'todo',
      assignee_user_id: '',
      due_at: '',
      contact_id: preselectedContactId || '',
      deal_id: preselectedDealId || '',
      location_id: '',
      estimated_duration_minutes: 30,
    },
  })

  const fetchData = async () => {
    try {
      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name')

      if (contactsError) throw contactsError

      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('title')

      if (dealsError) throw dealsError

      // Fetch users
      const { data: usersData, error: usersError } = await supabase
        .from('app_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name')

      if (usersError) throw usersError

      setContacts(contactsData || [])
      setDeals(dealsData || [])
      setUsers(usersData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load form data')
    }
  }

  useEffect(() => {
    if (open) {
      fetchData()
      // Reset form with preselected values
      form.reset({
        title: '',
        description: '',
        priority: 'normal',
        task_type: 'todo',
        estimated_duration_minutes: 30,
        assignee_user_id: '',
        due_at: '',
        contact_id: preselectedContactId || '',
        deal_id: preselectedDealId || '',
        location_id: '',
      })
    }
  }, [open, preselectedContactId, preselectedDealId])

  // Auto-resolve location when contact/deal changes
  useEffect(() => {
    const resolveLocation = async () => {
      const contactId = form.watch('contact_id')
      const dealId = form.watch('deal_id')
      if (!contactId && !dealId) return

      let resolvedLocationId: string | null = null

      if (contactId) {
        const { data: contact } = await supabase
          .from('contacts')
          .select('location_id')
          .eq('id', contactId)
          .single()
        if (contact?.location_id) {
          resolvedLocationId = contact.location_id
        }
      }

      if (!resolvedLocationId && dealId) {
        const { data: deal } = await supabase
          .from('deals')
          .select('location_id')
          .eq('id', dealId)
          .single()
        if (deal?.location_id) {
          resolvedLocationId = deal.location_id
        }
      }

      if (resolvedLocationId && form.getValues('location_id') !== resolvedLocationId) {
        form.setValue('location_id', resolvedLocationId)
      }
    }

    const subscription = form.watch((value, { name }) => {
      if (name === 'contact_id' || name === 'deal_id') {
        resolveLocation()
      }
    })

    return () => subscription.unsubscribe()
  }, [form, supabase])

  const onSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      const taskData = {
        title: data.title,
        description: data.description || undefined,
        priority: data.priority,
        task_type: data.task_type || 'todo',
        estimated_duration_minutes: data.estimated_duration_minutes || undefined,
        due_at: data.due_at || undefined,
        assignee_user_id: data.assignee_user_id || undefined,
        contact_id: data.contact_id || undefined,
        deal_id: data.deal_id || undefined,
        location_id: data.location_id || undefined,
      }

      await createTask(taskData)
    } catch (error) {
      console.error('Error creating task:', error)
      // Error already handled by useTaskMutation
    } finally {
      setLoading(false)
    }
  }

  const setQuickDueDate = (hours: number) => {
    const dueDate = addHoursToDate(new Date(), hours)
    form.setValue('due_at', formatDateTimeForInput(dueDate))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Call patient about appointment" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional details about the task..."
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="task_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Task Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="call">📞 Call</SelectItem>
                      <SelectItem value="email">📧 Email</SelectItem>
                      <SelectItem value="todo">✅ To-Do</SelectItem>
                      <SelectItem value="meeting">📅 Meeting</SelectItem>
                      <SelectItem value="follow_up">🔄 Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="assignee_user_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'unassigned' ? '' : value)} 
                      defaultValue={field.value || 'unassigned'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.full_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estimated_duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (min)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="due_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date & Time</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                    />
                  </FormControl>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickDueDate(4)}
                    >
                      4h
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickDueDate(24)}
                    >
                      1d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickDueDate(72)}
                    >
                      3d
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setQuickDueDate(168)}
                    >
                      1w
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="contact_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Contact</FormLabel>
                    <FormControl>
                      <ContactSelector
                        contacts={contacts}
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val || '')}
                        placeholder="None"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Deal</FormLabel>
                    <FormControl>
                      <DealSelector
                        deals={deals}
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val || '')}
                        placeholder="None"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {locations.length > 0 && (
              <FormField
                control={form.control}
                name="location_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <LocationSelector
                        locations={locations}
                        value={field.value || null}
                        onValueChange={(val) => field.onChange(val || '')}
                        placeholder="Auto-inherited from contact/deal"
                        disabled={locationsLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading || mutationLoading}>
                {loading || mutationLoading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
