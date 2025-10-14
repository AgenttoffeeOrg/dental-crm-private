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
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SegmentBuilder } from './segment-builder'
import type { SegmentDefinition } from '@/types/marketing'

const audienceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
})

type AudienceFormData = z.infer<typeof audienceSchema>

interface CreateAudienceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAudienceCreated?: () => void
  tenantId?: string
}

export function CreateAudienceDialog({ 
  open, 
  onOpenChange, 
  onAudienceCreated,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: CreateAudienceDialogProps) {
  const [loading, setLoading] = useState(false)
  const [segmentDefinition, setSegmentDefinition] = useState<SegmentDefinition>({
    conditions: [],
    operator: 'AND'
  })
  const supabase = createClient()

  const form = useForm<AudienceFormData>({
    resolver: zodResolver(audienceSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  })

  const onSubmit = async (data: AudienceFormData) => {
    try {
      setLoading(true)

      // Create audience
      const { data: audience, error: audienceError } = await supabase
        .from('marketing_audiences')
        .insert({
          tenant_id: tenantId,
          name: data.name,
          description: data.description,
          is_active: true,
          contact_count: 0,
        })
        .select()
        .single()

      if (audienceError) throw audienceError

      // Create default segment if conditions exist
      if (segmentDefinition.conditions.length > 0) {
        const { error: segmentError } = await supabase
          .from('marketing_segments')
          .insert({
            tenant_id: tenantId,
            audience_id: audience.id,
            name: 'All Contacts',
            definition_json: segmentDefinition,
            is_saved: true,
            is_dynamic: true,
          })

        if (segmentError) throw segmentError
      }

      toast.success('Audience created successfully!')
      form.reset()
      setSegmentDefinition({ conditions: [], operator: 'AND' })
      onOpenChange(false)
      if (onAudienceCreated) onAudienceCreated()

    } catch (error) {
      console.error('[AUDIENCE] Error creating:', error)
      toast.error('Failed to create audience')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Audience</DialogTitle>
          <DialogDescription>
            Organize your contacts into a targetable audience for campaigns
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Audience Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., New Patients 2024" {...field} />
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
                      placeholder="Describe who this audience is for..." 
                      {...field} 
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Segment Builder */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-3 block">
                Define Segment (Optional)
              </label>
              <SegmentBuilder
                definition={segmentDefinition}
                onChange={setSegmentDefinition}
              />
              <p className="text-xs text-gray-500 mt-2">
                You can add segments later or leave this empty to include all contacts
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Creating...' : 'Create Audience'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}




