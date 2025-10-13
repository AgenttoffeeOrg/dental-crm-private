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
import { Phone, Mail, MessageSquare, FileText, Calendar, Upload } from 'lucide-react'

const activitySchema = z.object({
  type: z.enum(['call', 'email', 'whatsapp', 'note', 'sms', 'meeting']),
  direction: z.enum(['inbound', 'outbound']).optional(),
  subject: z.string().optional(),
  snippet: z.string().min(1, 'Content is required'),
  outcome: z.string().optional(),
  duration_seconds: z.number().optional(),
  occurred_at: z.string(),
})

type ActivityFormData = z.infer<typeof activitySchema>

interface CreateActivityDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onActivityCreated: () => void
  contactId: string
  dealId?: string
  tenantId?: string
}

export function CreateActivityDialog({ 
  open, 
  onOpenChange, 
  onActivityCreated,
  contactId,
  dealId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: CreateActivityDialogProps) {
  const [loading, setLoading] = useState(false)
  const [selectedType, setSelectedType] = useState<string>('note')
  const supabase = createClient()

  const form = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: {
      type: 'note',
      direction: 'outbound',
      subject: '',
      snippet: '',
      outcome: '',
      duration_seconds: 0,
      occurred_at: new Date().toISOString().slice(0, 16),
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        type: 'note',
        direction: 'outbound',
        subject: '',
        snippet: '',
        outcome: '',
        duration_seconds: 0,
        occurred_at: new Date().toISOString().slice(0, 16),
      })
      setSelectedType('note')
    }
  }, [open])

  const onSubmit = async (data: ActivityFormData) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const activityData = {
        type: data.type,
        direction: ['call', 'email', 'sms', 'whatsapp'].includes(data.type) ? data.direction : null,
        subject: data.subject || null,
        snippet: data.snippet,
        outcome: data.outcome || null,
        duration_seconds: data.duration_seconds || null,
        occurred_at: data.occurred_at,
        contact_id: contactId,
        deal_id: dealId || null,
        agent_user_id: user?.id || null,
        tenant_id: tenantId,
        raw: {}
      }

      const { error } = await supabase
        .from('activities')
        .insert([activityData])

      if (error) throw error

      toast.success('Activity logged successfully')
      onActivityCreated()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error creating activity:', error)
      toast.error('Failed to log activity')
    } finally {
      setLoading(false)
    }
  }

  const activityTypes = [
    { value: 'call', label: 'Phone Call', icon: Phone },
    { value: 'email', label: 'Email', icon: Mail },
    { value: 'meeting', label: 'Meeting', icon: Calendar },
    { value: 'whatsapp', label: 'WhatsApp', icon: MessageSquare },
    { value: 'sms', label: 'SMS', icon: MessageSquare },
    { value: 'note', label: 'Note', icon: FileText },
  ]

  const showDirection = ['call', 'email', 'sms', 'whatsapp'].includes(selectedType)
  const showOutcome = selectedType === 'call'
  const showDuration = ['call', 'meeting'].includes(selectedType)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Log Activity</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity Type</FormLabel>
                  <Select 
                    onValueChange={(val) => {
                      field.onChange(val)
                      setSelectedType(val)
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activityTypes.map(type => {
                        const Icon = type.icon
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {type.label}
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {showDirection && (
                <FormField
                  control={form.control}
                  name="direction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Direction</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="inbound">↓ Inbound</SelectItem>
                          <SelectItem value="outbound">↑ Outbound</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showOutcome && (
                <FormField
                  control={form.control}
                  name="outcome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Outcome</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select outcome" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="connected">✅ Connected</SelectItem>
                          <SelectItem value="voicemail">📞 Voicemail</SelectItem>
                          <SelectItem value="no_answer">❌ No Answer</SelectItem>
                          <SelectItem value="busy">🔄 Busy</SelectItem>
                          <SelectItem value="wrong_number">⚠️ Wrong Number</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showDuration && (
                <FormField
                  control={form.control}
                  name="duration_seconds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration (minutes)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="15"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) * 60)}
                          value={field.value ? Math.floor(field.value / 60) : 0}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="occurred_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date & Time</FormLabel>
                    <FormControl>
                      <Input
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {(selectedType === 'email' || selectedType === 'meeting') && (
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder={selectedType === 'email' ? 'Email subject' : 'Meeting title'}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="snippet"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {selectedType === 'note' ? 'Note' : 
                     selectedType === 'email' ? 'Email Content' : 
                     'Description'}
                  </FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter details..."
                      rows={6}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                {loading ? 'Logging...' : 'Log Activity'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}


