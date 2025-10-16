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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { Contact } from '@/types/database'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

const contactSchema = z.object({
  full_name: z.string().min(1, 'Name is required'),
  primary_phone: z.string().optional(),
  primary_email: z.string().email('Invalid email').optional().or(z.literal('')),
})

type ContactFormData = z.infer<typeof contactSchema>

interface EditContactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact
  onContactUpdated: () => void
  tenantId?: string
}

export function EditContactDialog({ 
  open, 
  onOpenChange, 
  contact,
  onContactUpdated,
  tenantId
}: EditContactDialogProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      full_name: '',
      primary_phone: '',
      primary_email: '',
    },
  })

  useEffect(() => {
    if (open && contact) {
      console.log('Setting form values for contact:', contact)
      form.setValue('full_name', contact.full_name || '')
      form.setValue('primary_phone', contact.primary_phone || '')
      form.setValue('primary_email', contact.primary_email || '')
    }
  }, [open, contact, form])

  const onSubmit = async (data: ContactFormData) => {
    if (!contact?.id) {
      toast.error('Contact ID is missing')
      return
    }

    console.log('Submitting form data:', data)
    setLoading(true)
    
    try {
      const contactData = {
        full_name: data.full_name,
        primary_phone: data.primary_phone || null,
        primary_email: data.primary_email || null,
        updated_at: new Date().toISOString(),
      }

      console.log('Updating contact with data:', contactData)

      const { error } = await supabase
        .from('contacts')
        .update(contactData)
        .eq('id', contact.id)

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }

      toast.success('Contact updated successfully')
      onContactUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating contact:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      toast.error(`Failed to update contact: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if contact is null
  if (!contact) {
    console.log('Contact is null, not rendering dialog')
    return null
  }

  console.log('Rendering EditContactDialog for contact:', contact)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Contact</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="full_name">Full Name</Label>
            <Input
              id="full_name"
              {...form.register('full_name')}
              placeholder="e.g., John Smith"
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.full_name.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="primary_phone">Phone Number</Label>
            <Input
              id="primary_phone"
              {...form.register('primary_phone')}
              placeholder="+44 7700 900123"
            />
            {form.formState.errors.primary_phone && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.primary_phone.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="primary_email">Email</Label>
            <Input
              id="primary_email"
              type="email"
              {...form.register('primary_email')}
              placeholder="john.smith@example.com"
            />
            {form.formState.errors.primary_email && (
              <p className="text-sm text-red-600 mt-1">
                {form.formState.errors.primary_email.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
