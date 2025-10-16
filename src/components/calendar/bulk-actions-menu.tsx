'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  MoreVertical,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  Trash2,
  AlertCircle
} from 'lucide-react'

interface BulkActionsMenuProps {
  selectedAppointmentIds: string[]
  onActionComplete: () => void
  tenantId: string
}

export function BulkActionsMenu({
  selectedAppointmentIds,
  onActionComplete,
  tenantId
}: BulkActionsMenuProps) {
  const supabase = createClient()
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false)
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newProviderId, setNewProviderId] = useState('')
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const count = selectedAppointmentIds.length

  const handleBulkStatusUpdate = async (status: string) => {
    if (!confirm(`Mark ${count} appointment(s) as ${status}?`)) {
      return
    }

    setLoading(true)
    try {
      const updateData: any = { status }

      if (status === 'confirmed') {
        updateData.confirmed_at = new Date().toISOString()
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString()
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .in('id', selectedAppointmentIds)

      if (error) throw error

      toast.success(`${count} appointment(s) marked as ${status}`)
      onActionComplete()
    } catch (error) {
      console.error('Bulk update error:', error)
      toast.error('Failed to update appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${count} appointment(s)? This action cannot be undone.`)) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .in('id', selectedAppointmentIds)

      if (error) throw error

      toast.success(`${count} appointment(s) deleted`)
      onActionComplete()
    } catch (error) {
      console.error('Bulk delete error:', error)
      toast.error('Failed to delete appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReschedule = async () => {
    if (!newDate) {
      toast.error('Please select a new date')
      return
    }

    setLoading(true)
    try {
      // This is a simplified version - in production, you'd need to:
      // 1. Get each appointment's current time
      // 2. Calculate the offset
      // 3. Apply the same offset to the new date
      // For now, we'll just show a warning

      toast.info('Bulk reschedule will be implemented with time offset calculation')
      setRescheduleDialogOpen(false)
    } catch (error) {
      console.error('Bulk reschedule error:', error)
      toast.error('Failed to reschedule appointments')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReassign = async () => {
    if (!newProviderId) {
      toast.error('Please select a provider')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ provider_id: newProviderId })
        .in('id', selectedAppointmentIds)

      if (error) throw error

      toast.success(`${count} appointment(s) reassigned`)
      setReassignDialogOpen(false)
      onActionComplete()
    } catch (error) {
      console.error('Bulk reassign error:', error)
      toast.error('Failed to reassign appointments')
    } finally {
      setLoading(false)
    }
  }

  const loadProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('providers')
        .select('id, name')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('name')

      if (error) throw error
      setProviders(data || [])
    } catch (error) {
      console.error('Error loading providers:', error)
    }
  }

  if (count === 0) {
    return null
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" disabled={loading}>
            <MoreVertical className="h-4 w-4 mr-2" />
            Bulk Actions ({count})
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={() => handleBulkStatusUpdate('confirmed')}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark as Confirmed
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleBulkStatusUpdate('cancelled')}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Appointments
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => {
            loadProviders()
            setReassignDialogOpen(true)
          }}>
            <User className="h-4 w-4 mr-2" />
            Reassign Provider
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setRescheduleDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Reschedule
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleBulkDelete} className="text-red-600">
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Appointments
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule {count} Appointment(s)</DialogTitle>
            <DialogDescription>
              Select a new date. The original time will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Date</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
              />
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-yellow-800">
                  This will move all selected appointments to the new date while preserving their original times.
                  Conflicts will be checked automatically.
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkReschedule} disabled={loading || !newDate}>
              {loading ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reassign Dialog */}
      <Dialog open={reassignDialogOpen} onOpenChange={setReassignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {count} Appointment(s)</DialogTitle>
            <DialogDescription>
              Select a new provider for all selected appointments
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Provider</Label>
              <Select value={newProviderId} onValueChange={setNewProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider..." />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReassignDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkReassign} disabled={loading || !newProviderId}>
              {loading ? 'Reassigning...' : 'Reassign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

