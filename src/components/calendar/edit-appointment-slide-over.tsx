'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, User, MapPin, AlertCircle, Trash2, CheckCircle } from 'lucide-react'
import { format, addMinutes } from 'date-fns'

const appointmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contact_id: z.string().min(1, 'Patient is required'),
  appointment_type_id: z.string().optional(),
  provider_id: z.string().optional(),
  operatory_id: z.string().optional(),
  start_at: z.string().min(1, 'Start time is required'),
  duration_minutes: z.number().min(15).max(480),
  status: z.string(),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface EditAppointmentSlideOverProps {
  open: boolean
  onClose: () => void
  onAppointmentUpdated: () => void
  appointmentId: string
  tenantId: string
}

export function EditAppointmentSlideOver({
  open,
  onClose,
  onAppointmentUpdated,
  appointmentId,
  tenantId
}: EditAppointmentSlideOverProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [appointment, setAppointment] = useState<any>(null)
  const [contacts, setContacts] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [operatories, setOperatories] = useState<any[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<string[]>([])

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
  })

  useEffect(() => {
    if (open && appointmentId) {
      loadData()
    }
  }, [open, appointmentId])

  const loadData = async () => {
    try {
      // Load appointment
      const { data: aptData, error: aptError } = await supabase
        .from('appointments')
        .select(`
          *,
          contact:contacts(id, full_name, primary_phone),
          provider:providers(id, name),
          operatory:operatories(id, name),
          appointment_type:appointment_types(id, name, duration_minutes)
        `)
        .eq('id', appointmentId)
        .single()

      if (aptError) throw aptError
      setAppointment(aptData)

      // Populate form
      form.reset({
        title: aptData.title,
        contact_id: aptData.contact_id,
        appointment_type_id: aptData.appointment_type_id || '',
        provider_id: aptData.provider_id || '',
        operatory_id: aptData.operatory_id || '',
        start_at: format(new Date(aptData.start_at), "yyyy-MM-dd'T'HH:mm"),
        duration_minutes: aptData.duration_minutes,
        status: aptData.status,
        notes: aptData.notes || '',
        internal_notes: aptData.internal_notes || '',
      })

      // Load dropdown data
      const [contactsRes, providersRes, operatoriesRes, typesRes] = await Promise.all([
        supabase.from('contacts').select('id, full_name, primary_phone').eq('tenant_id', tenantId).order('full_name'),
        supabase.from('providers').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
        supabase.from('operatories').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
        supabase.from('appointment_types').select('*').eq('tenant_id', tenantId).eq('is_active', true).order('name'),
      ])

      setContacts(contactsRes.data || [])
      setProviders(providersRes.data || [])
      setOperatories(operatoriesRes.data || [])
      setAppointmentTypes(typesRes.data || [])
    } catch (error) {
      console.error('Error loading appointment:', error)
      toast.error('Failed to load appointment')
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true)
    try {
      const start = new Date(data.start_at)
      const end = addMinutes(start, data.duration_minutes)

      const updateData = {
        title: data.title,
        contact_id: data.contact_id,
        appointment_type_id: data.appointment_type_id || null,
        provider_id: data.provider_id || null,
        operatory_id: data.operatory_id || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        duration_minutes: data.duration_minutes,
        status: data.status,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Appointment updated successfully!')
      onAppointmentUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Failed to update appointment')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this appointment? This action cannot be undone.')) {
      return
    }

    setDeleting(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Appointment deleted')
      onAppointmentUpdated()
      onClose()
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Failed to delete appointment')
    } finally {
      setDeleting(false)
    }
  }

  const handleMarkStatus = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus }

      if (newStatus === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString()
      } else if (newStatus === 'arrived') {
        updateData.arrived_at = new Date().toISOString()
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)

      if (error) throw error

      toast.success(`Marked as ${newStatus}`)
      loadData()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700'
      case 'arrived': return 'bg-blue-100 text-blue-700'
      case 'in_progress': return 'bg-purple-100 text-purple-700'
      case 'completed': return 'bg-gray-100 text-gray-700'
      case 'cancelled': return 'bg-red-100 text-red-700'
      case 'no_show': return 'bg-orange-100 text-orange-700'
      default: return 'bg-yellow-100 text-yellow-700'
    }
  }

  if (!appointment) {
    return null
  }

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col overflow-y-auto">
        <SheetHeader className="pb-6">
          <div className="flex items-start justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2 text-2xl">
                <Calendar className="h-6 w-6 text-blue-600" />
                Edit Appointment
              </SheetTitle>
              <SheetDescription>
                Update appointment details or change status
              </SheetDescription>
            </div>
            <Badge className={getStatusColor(appointment.status)}>
              {appointment.status.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </SheetHeader>

        {/* Quick Actions */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm font-medium text-gray-700 mb-2">Quick Actions</div>
          <div className="flex flex-wrap gap-2">
            {appointment.status !== 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkStatus('confirmed')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Confirm
              </Button>
            )}
            {appointment.status === 'confirmed' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkStatus('arrived')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Mark Arrived
              </Button>
            )}
            {appointment.status === 'arrived' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkStatus('in_progress')}
              >
                <Clock className="h-3 w-3 mr-1" />
                Start
              </Button>
            )}
            {appointment.status === 'in_progress' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkStatus('completed')}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
            )}
            {!['cancelled', 'completed', 'no_show'].includes(appointment.status) && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkStatus('cancelled')}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMarkStatus('no_show')}
                >
                  No Show
                </Button>
              </>
            )}
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex-1">
            {/* Contact/Patient */}
            <FormField
              control={form.control}
              name="contact_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Patient *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select patient..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contacts.map((contact) => (
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

            {/* Appointment Type */}
            <FormField
              control={form.control}
              name="appointment_type_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Appointment Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {appointmentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date & Time */}
            <FormField
              control={form.control}
              name="start_at"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date & Time *</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duration */}
            <FormField
              control={form.control}
              name="duration_minutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration (minutes) *</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(parseInt(value))}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="45">45 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="90">1.5 hours</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Provider */}
            <FormField
              control={form.control}
              name="provider_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Provider</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <User className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select provider..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Operatory */}
            <FormField
              control={form.control}
              name="operatory_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Operatory/Room</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <MapPin className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Select room..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {operatories.map((op) => (
                        <SelectItem key={op.id} value={op.id}>
                          {op.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="requested">Requested</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="arrived">Arrived</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="no_show">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Internal Notes */}
            <FormField
              control={form.control}
              name="internal_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes (staff only)</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={2} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete'}
              </Button>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

