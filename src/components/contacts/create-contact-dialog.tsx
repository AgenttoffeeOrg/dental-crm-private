'use client'

import { useState } from 'react'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { toast } from 'sonner'

const contactSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  primary_phone: z.string().optional(),
  primary_email: z.string().email('Invalid email').optional().or(z.literal('')),
  source: z.string().optional(),
})

type ContactFormData = z.infer<typeof contactSchema>

const CONTACT_SOURCES = [
  'website',
  'referral',
  'google_ads',
  'facebook_ads',
  'walk_in',
  'phone_call',
  'email',
  'other'
]

const CONTACT_TAGS = [
  'new_patient',
  'existing_patient',
  'vip',
  'emergency',
  'consultation',
  'treatment_plan',
  'follow_up',
  'cancelled',
  'no_show'
]

interface CreateContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onContactCreated: () => void
}

export function CreateContactDialog({ 
  open, 
  onOpenChange, 
  onContactCreated
}: CreateContactDialogProps) {
  const { orgId, isLoading: tenantLoading } = useTenantContext()
  const [loading, setLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const supabase = createClient()

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: '',
      primary_phone: '',
      primary_email: '',
      source: '',
    },
  })

  const onSubmit = async (data: ContactFormData) => {
    setLoading(true)
    try {
      const contactData = {
        ...data,
        tenant_id: orgId,
        tags: selectedTags,
        primary_email: data.primary_email || null,
        primary_phone: data.primary_phone || null,
        source: data.source || null,
      }

      const { error } = await supabase
        .from('contacts')
        .insert([contactData])

      if (error) throw error

      toast.success('Contact created successfully')
      onContactCreated()
      onOpenChange(false)
      form.reset()
      setSelectedTags([])
    } catch (error) {
      console.error('Error creating contact:', error)
      toast.error('Failed to create contact')
    } finally {
      setLoading(false)
    }
  }

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Contact</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="primary_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+44 7700 900123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="primary_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="How did they find you?" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CONTACT_SOURCES.map(source => (
                        <SelectItem key={source} value={source}>
                          {source.replace('_', ' ')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Tags</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag.replace('_', ' ')}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-500"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <Select onValueChange={addTag}>
                <SelectTrigger>
                  <SelectValue placeholder="Add tags" />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                {loading ? 'Creating...' : 'Create Contact'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
