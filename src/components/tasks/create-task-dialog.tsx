'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
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
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  preselectedContactId,
  preselectedDealId
}: CreateTaskDialogProps) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

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
      })
    }
  }, [open, preselectedContactId, preselectedDealId])

  const onSubmit = async (data: TaskFormData) => {
    setLoading(true)
    try {
      const taskData = {
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        task_type: data.task_type || 'todo',
        estimated_duration_minutes: data.estimated_duration_minutes || null,
        tenant_id: tenantId,
        status: 'open' as const,
        auto_created: false,
        due_at: data.due_at || null,
        assignee_user_id: data.assignee_user_id || null,
        contact_id: data.contact_id || null,
        deal_id: data.deal_id || null,
      }

      const { error } = await supabase
        .from('tasks')
        .insert([taskData])

      if (error) throw error

      toast.success('Task created successfully')
      onTaskCreated()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error creating task:', error)
      toast.error('Failed to create task')
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {contacts.map(contact => (
                          <SelectItem key={contact.id} value={contact.id}>
                            {contact.full_name}
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
                name="deal_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Related Deal</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {deals.map(deal => (
                          <SelectItem key={deal.id} value={deal.id}>
                            {deal.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Task'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
