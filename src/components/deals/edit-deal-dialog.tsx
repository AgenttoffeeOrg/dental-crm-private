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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { TREATMENT_TAGS } from '@/types/database'
import type { DealWithRelations, AppUser } from '@/types/database'

const dealSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  value_estimate_cents: z.number().min(0).optional(),
  treatment_tags: z.array(z.string()),
  owner_user_id: z.string().optional(),
  source: z.string().optional(),
})

type DealFormData = z.infer<typeof dealSchema>

interface EditDealDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  deal: DealWithRelations
  onDealUpdated: () => void
  tenantId?: string
}

export function EditDealDialog({
  open,
  onOpenChange,
  deal,
  onDealUpdated,
  tenantId = process.env.DEFAULT_TENANT_ID
}: EditDealDialogProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<AppUser[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>(deal.treatment_tags || [])
  const supabase = createClient()

  const form = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      title: deal.title,
      value_estimate_cents: deal.value_estimate_cents || 0,
      treatment_tags: deal.treatment_tags || [],
      owner_user_id: deal.owner_user_id || '',
      source: deal.source || '',
    },
  })

  useEffect(() => {
    if (open) {
      fetchUsers()
      setSelectedTags(deal.treatment_tags || [])
      form.reset({
        title: deal.title,
        value_estimate_cents: deal.value_estimate_cents || 0,
        treatment_tags: deal.treatment_tags || [],
        owner_user_id: deal.owner_user_id || '',
        source: deal.source || '',
      })
    }
  }, [open, deal])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('full_name')

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const onSubmit = async (data: DealFormData) => {
    setLoading(true)
    try {
      const updateData = {
        ...data,
        treatment_tags: selectedTags,
        value_estimate_cents: data.value_estimate_cents || 0,
        owner_user_id: data.owner_user_id || null,
        source: data.source || null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('deals')
        .update(updateData)
        .eq('id', deal.id)

      if (error) throw error

      toast.success('Deal updated successfully')
      onDealUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating deal:', error)
      toast.error('Failed to update deal')
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
          <DialogTitle>Edit Deal</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deal Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Teeth Whitening Consultation" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="value_estimate_cents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estimated Value (£)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || '0') * 100))}
                      value={field.value ? (field.value / 100).toFixed(2) : ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Treatment Tags</FormLabel>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
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
                  <SelectValue placeholder="Add treatment tags" />
                </SelectTrigger>
                <SelectContent>
                  {TREATMENT_TAGS.filter(tag => !selectedTags.includes(tag)).map(tag => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <FormField
              control={form.control}
              name="owner_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select owner" />
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
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Source (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., website, referral, walk-in" {...field} />
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
                {loading ? 'Updating...' : 'Update Deal'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
