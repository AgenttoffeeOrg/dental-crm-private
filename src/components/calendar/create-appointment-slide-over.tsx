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
import { Calendar, Clock, User, MapPin, Phone, Video, AlertCircle } from 'lucide-react'
import { format, addMinutes } from 'date-fns'

const appointmentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  contact_id: z.string().min(1, 'Patient is required'),
  appointment_type_id: z.string().optional(),
  provider_id: z.string().optional(),
  operatory_id: z.string().optional(),
  start_at: z.string().min(1, 'Start time is required'),
  duration_minutes: z.number().min(15).max(480),
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
  send_confirmation: z.boolean().default(true),
})

type AppointmentFormData = z.infer<typeof appointmentSchema>

interface CreateAppointmentSlideOverProps {
  open: boolean
  onClose: () => void
  onAppointmentCreated: () => void
  tenantId: string
  prefilledContactId?: string
  prefilledDate?: Date
}

export function CreateAppointmentSlideOver({
  open,
  onClose,
  onAppointmentCreated,
  tenantId,
  prefilledContactId,
  prefilledDate
}: CreateAppointmentSlideOverProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [contacts, setContacts] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [operatories, setOperatories] = useState<any[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<any[]>([])
  const [conflicts, setConflicts] = useState<string[]>([])

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: '',
      contact_id: prefilledContactId || '',
      appointment_type_id: '',
      provider_id: '',
      operatory_id: '',
      start_at: prefilledDate ? format(prefilledDate, "yyyy-MM-dd'T'HH:mm") : '',
      duration_minutes: 60,
      notes: '',
      internal_notes: '',
      send_confirmation: true,
    },
  })

  useEffect(() => {
    if (open) {
      loadData()
      if (prefilledContactId) {
        form.setValue('contact_id', prefilledContactId)
      }
      if (prefilledDate) {
        form.setValue('start_at', format(prefilledDate, "yyyy-MM-dd'T'HH:mm"))
      }
    }
  }, [open, prefilledContactId, prefilledDate])

  const loadData = async () => {
    try {
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
      console.error('Error loading appointment data:', error)
    }
  }

  const checkConflicts = async (data: AppointmentFormData) => {
    try {
      const start = new Date(data.start_at)
      const end = addMinutes(start, data.duration_minutes)

      const conflictsList: string[] = []

      // Check provider conflicts
      if (data.provider_id) {
        const { data: providerConflicts } = await supabase
          .from('appointments')
          .select('id, title, start_at, end_at')
          .eq('tenant_id', tenantId)
          .eq('provider_id', data.provider_id)
          .neq('status', 'cancelled')
          .or(`start_at.gte.${start.toISOString()},end_at.lte.${end.toISOString()}`)

        if (providerConflicts && providerConflicts.length > 0) {
          conflictsList.push(`Provider has ${providerConflicts.length} conflicting appointment(s)`)
        }
      }

      // Check operatory conflicts
      if (data.operatory_id) {
        const { data: operatoryConflicts } = await supabase
          .from('appointments')
          .select('id, title, start_at, end_at')
          .eq('tenant_id', tenantId)
          .eq('operatory_id', data.operatory_id)
          .neq('status', 'cancelled')
          .or(`start_at.gte.${start.toISOString()},end_at.lte.${end.toISOString()}`)

        if (operatoryConflicts && operatoryConflicts.length > 0) {
          conflictsList.push(`Operatory has ${operatoryConflicts.length} conflicting appointment(s)`)
        }
      }

      setConflicts(conflictsList)
      return conflictsList.length === 0
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return true // Allow booking if conflict check fails
    }
  }

  const onSubmit = async (data: AppointmentFormData) => {
    setLoading(true)
    try {
      const hasConflicts = await checkConflicts(data)

      if (!hasConflicts && conflicts.length > 0) {
        const confirm = window.confirm(
          `Warning: ${conflicts.join(', ')}. Do you want to book anyway?`
        )
        if (!confirm) {
          setLoading(false)
          return
        }
      }

      const start = new Date(data.start_at)
      const end = addMinutes(start, data.duration_minutes)

      // Get selected contact for title
      const selectedContact = contacts.find(c => c.id === data.contact_id)

      const appointmentData = {
        tenant_id: tenantId,
        title: data.title || `Appointment with ${selectedContact?.full_name || 'Patient'}`,
        contact_id: data.contact_id,
        appointment_type_id: data.appointment_type_id || null,
        provider_id: data.provider_id || null,
        operatory_id: data.operatory_id || null,
        start_at: start.toISOString(),
        end_at: end.toISOString(),
        duration_minutes: data.duration_minutes,
        status: 'confirmed',
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        source: 'manual',
      }

      const { error } = await supabase.from('appointments').insert([appointmentData])

      if (error) throw error

      toast.success('Appointment created successfully!')

      // TODO: Send confirmation email/SMS if data.send_confirmation is true

      onAppointmentCreated()
      onClose()
      form.reset()
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error('Failed to create appointment')
    } finally {
      setLoading(false)
    }
  }

  // Watch appointment type to auto-fill duration
  const selectedTypeId = form.watch('appointment_type_id')
  useEffect(() => {
    if (selectedTypeId) {
      const selectedType = appointmentTypes.find(t => t.id === selectedTypeId)
      if (selectedType) {
        form.setValue('duration_minutes', selectedType.duration_minutes || 60)
        if (selectedType.default_provider_id) {
          form.setValue('provider_id', selectedType.default_provider_id)
        }
      }
    }
  }, [selectedTypeId, appointmentTypes])

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col overflow-y-auto">
        <SheetHeader className="pb-6">
          <SheetTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="h-6 w-6 text-blue-600" />
            New Appointment
          </SheetTitle>
          <SheetDescription>
            Schedule a new appointment for a patient
          </SheetDescription>
        </SheetHeader>

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
                          {contact.primary_phone && (
                            <span className="text-gray-500 ml-2 text-xs">
                              {contact.primary_phone}
                            </span>
                          )}
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
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: type.color }}
                            />
                            {type.name}
                            <span className="text-gray-500 text-xs">
                              ({type.duration_minutes} min)
                            </span>
                          </div>
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
                    <Input placeholder="e.g., Routine Checkup" {...field} />
                  </FormControl>
                  <FormDescription>
                    Leave blank to auto-generate from patient name
                  </FormDescription>
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
                      <SelectItem value="180">3 hours</SelectItem>
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
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: provider.calendar_color }}
                            />
                            {provider.name}
                            {provider.specialty && (
                              <span className="text-gray-500 text-xs">
                                ({provider.specialty})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Operatory/Room */}
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
                          {op.equipment_type && (
                            <span className="text-gray-500 text-xs ml-2">
                              ({op.equipment_type})
                            </span>
                          )}
                        </SelectItem>
                      ))}
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
                  <FormLabel>Notes (visible to patient)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any special instructions or information..."
                      {...field}
                      rows={3}
                    />
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
                    <Textarea
                      placeholder="Staff notes not visible to patient..."
                      {...field}
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conflicts Warning */}
            {conflicts.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-yellow-900 mb-1">
                      Scheduling Conflicts Detected
                    </div>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {conflicts.map((conflict, i) => (
                        <li key={i}>• {conflict}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Appointment'}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  )
}

