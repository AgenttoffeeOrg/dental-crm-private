'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { CheckCircle2, UserPlus, Calendar, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface BulkActionsMenuProps {
  selectedTaskIds: string[]
  onClearSelection: () => void
  onRefresh: () => void
}

export function BulkActionsMenu({ selectedTaskIds, onClearSelection, onRefresh }: BulkActionsMenuProps) {
  const [reassignOpen, setReassignOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('app_users')
        .select('*')
        .order('full_name')
      
      setUsers(data || [])
    } catch (error) {
      console.error('Error loading users:', error)
    }
  }

  const handleBulkComplete = async () => {
    if (!confirm(`Complete ${selectedTaskIds.length} tasks?`)) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ 
          status: 'done',
          completed_at: new Date().toISOString()
        })
        .in('id', selectedTaskIds)

      if (error) throw error
      toast.success(`${selectedTaskIds.length} tasks completed!`)
      onClearSelection()
      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to complete tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReassign = async () => {
    if (!selectedUserId) {
      toast.error('Please select a user')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ assignee_user_id: selectedUserId === 'unassigned' ? null : selectedUserId })
        .in('id', selectedTaskIds)

      if (error) throw error
      toast.success(`${selectedTaskIds.length} tasks reassigned!`)
      setReassignOpen(false)
      onClearSelection()
      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to reassign tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkReschedule = async () => {
    if (!newDueDate) {
      toast.error('Please select a date')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .update({ due_at: newDueDate })
        .in('id', selectedTaskIds)

      if (error) throw error
      toast.success(`${selectedTaskIds.length} tasks rescheduled!`)
      setRescheduleOpen(false)
      onClearSelection()
      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to reschedule tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTaskIds.length} tasks? This cannot be undone.`)) return
    
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', selectedTaskIds)

      if (error) throw error
      toast.success(`${selectedTaskIds.length} tasks deleted`)
      onClearSelection()
      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to delete tasks')
    } finally {
      setLoading(false)
    }
  }

  if (selectedTaskIds.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleBulkComplete} disabled={loading}>
        <CheckCircle2 className="h-4 w-4 mr-1.5" />
        Complete All
      </Button>
      
      <Button size="sm" variant="outline" onClick={() => {
        loadUsers()
        setReassignOpen(true)
      }}>
        <UserPlus className="h-4 w-4 mr-1.5" />
        Reassign
      </Button>
      
      <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(true)}>
        <Calendar className="h-4 w-4 mr-1.5" />
        Reschedule
      </Button>
      
      <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={loading}>
        <Trash2 className="h-4 w-4 mr-1.5" />
        Delete
      </Button>

      {/* Reassign Dialog */}
      <Dialog open={reassignOpen} onOpenChange={setReassignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reassign {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Assign To</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users.map(user => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReassignOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkReassign} disabled={loading}>Reassign</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Due Date</Label>
              <Input
                type="datetime-local"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRescheduleOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkReschedule} disabled={loading}>Reschedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

