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
import { CheckCircle2, UserPlus, Calendar, Trash2, Link2, User, MapPin, Tag, Flag, Download } from 'lucide-react'
import { useTaskMutation } from '@/lib/hooks/use-task-mutation'
import { useAccessibleLocations } from '@/lib/hooks/use-locations'
import { LocationSelector } from '@/components/ui/location-selector'
import { ContactSelector } from '@/components/ui/contact-selector'
import { DealSelector } from '@/components/ui/deal-selector'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'
import { toast } from 'sonner'

interface BulkActionsMenuProps {
  selectedTaskIds: string[]
  onClearSelection: () => void
  onRefresh: () => void
}

export function BulkActionsMenu({ selectedTaskIds, onClearSelection, onRefresh }: BulkActionsMenuProps) {
  const { appUser } = useAuth()
  const { updateTask, bulkComplete, bulkReassign, bulkReschedule, bulkDelete, isLoading: mutationLoading } = useTaskMutation({
    onSuccess: () => {
      onRefresh()
      onClearSelection()
    },
  })
  const { locations } = useAccessibleLocations()
  const [reassignOpen, setReassignOpen] = useState(false)
  const [rescheduleOpen, setRescheduleOpen] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)
  const [dealOpen, setDealOpen] = useState(false)
  const [locationOpen, setLocationOpen] = useState(false)
  const [taskTypeOpen, setTaskTypeOpen] = useState(false)
  const [priorityOpen, setPriorityOpen] = useState(false)
  const [users, setUsers] = useState<any[]>([])
  const [contacts, setContacts] = useState<any[]>([])
  const [deals, setDeals] = useState<any[]>([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedContactId, setSelectedContactId] = useState('')
  const [selectedDealId, setSelectedDealId] = useState('')
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null)
  const [selectedTaskType, setSelectedTaskType] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    if (!appUser?.tenant_id) return
    try {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to load users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      // Fallback to Supabase if API fails
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .eq('tenant_id', appUser.tenant_id)
          .order('full_name')
        setUsers(data || [])
      } catch (fallbackError) {
        console.error('Fallback user load failed:', fallbackError)
      }
    }
  }

  const loadContacts = async () => {
    if (!appUser?.tenant_id) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('contacts')
        .select('id, full_name')
        .eq('tenant_id', appUser.tenant_id)
        .order('full_name')
        .limit(100)
      setContacts(data || [])
    } catch (error) {
      console.error('Error loading contacts:', error)
    }
  }

  const loadDeals = async () => {
    if (!appUser?.tenant_id) return
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('deals')
        .select('id, title')
        .eq('tenant_id', appUser.tenant_id)
        .order('title')
        .limit(100)
      setDeals(data || [])
    } catch (error) {
      console.error('Error loading deals:', error)
    }
  }

  const handleBulkComplete = async () => {
    if (!confirm(`Complete ${selectedTaskIds.length} tasks?`)) return
    
    setLoading(true)
    try {
      await bulkComplete(selectedTaskIds)
    } catch (error) {
      console.error('Error:', error)
      // Error already handled by useTaskMutation
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
      await bulkReassign(selectedTaskIds, selectedUserId === 'unassigned' ? null : selectedUserId)
      setReassignOpen(false)
    } catch (error) {
      console.error('Error:', error)
      // Error already handled by useTaskMutation
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
      await bulkReschedule(selectedTaskIds, newDueDate)
      setRescheduleOpen(false)
    } catch (error) {
      console.error('Error:', error)
      // Error already handled by useTaskMutation
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedTaskIds.length} tasks? This cannot be undone.`)) return
    
    setLoading(true)
    try {
      await bulkDelete(selectedTaskIds)
    } catch (error) {
      console.error('Error:', error)
      // Error already handled by useTaskMutation
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdateContact = async () => {
    setLoading(true)
    try {
      const promises = selectedTaskIds.map(id => 
        updateTask(id, { contact_id: selectedContactId === 'none' ? null : selectedContactId })
      )
      await Promise.all(promises)
      toast.success(`${selectedTaskIds.length} task(s) updated`)
      setContactOpen(false)
      onRefresh()
      onClearSelection()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdateDeal = async () => {
    setLoading(true)
    try {
      const promises = selectedTaskIds.map(id => 
        updateTask(id, { deal_id: selectedDealId === 'none' ? null : selectedDealId })
      )
      await Promise.all(promises)
      toast.success(`${selectedTaskIds.length} task(s) updated`)
      setDealOpen(false)
      onRefresh()
      onClearSelection()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdateLocation = async () => {
    setLoading(true)
    try {
      const promises = selectedTaskIds.map(id => 
        updateTask(id, { location_id: selectedLocationId || null })
      )
      await Promise.all(promises)
      toast.success(`${selectedTaskIds.length} task(s) updated`)
      setLocationOpen(false)
      onRefresh()
      onClearSelection()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdateTaskType = async () => {
    setLoading(true)
    try {
      const promises = selectedTaskIds.map(id => 
        updateTask(id, { task_type: selectedTaskType as 'call' | 'email' | 'meeting' | 'todo' | 'follow_up' })
      )
      await Promise.all(promises)
      toast.success(`${selectedTaskIds.length} task(s) updated`)
      setTaskTypeOpen(false)
      onRefresh()
      onClearSelection()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkUpdatePriority = async () => {
    if (!selectedPriority) return
    setLoading(true)
    try {
      const priority = selectedPriority as 'low' | 'normal' | 'high' | 'urgent'
      const promises = selectedTaskIds.map(id => 
        updateTask(id, { priority })
      )
      await Promise.all(promises)
      toast.success(`${selectedTaskIds.length} task(s) updated`)
      setPriorityOpen(false)
      onRefresh()
      onClearSelection()
    } catch (error) {
      console.error('Error:', error)
      toast.error('Failed to update tasks')
    } finally {
      setLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const supabase = createClient()
      const { data: tasks } = await supabase
        .from('tasks_with_associations')
        .select('*')
        .in('id', selectedTaskIds)

      if (!tasks || tasks.length === 0) {
        toast.error('No tasks to export')
        return
      }

      // Convert to CSV
      const headers = ['Title', 'Description', 'Type', 'Priority', 'Status', 'Due Date', 'Contact', 'Deal', 'Location', 'Assignee', 'Created At']
      const rows = tasks.map(task => [
        task.title || '',
        task.description || '',
        task.task_type || '',
        task.priority || '',
        task.status || '',
        task.due_at ? new Date(task.due_at).toLocaleString() : '',
        task.contact_name || '',
        task.deal_title || '',
        task.location_name || '',
        task.assignee_name || '',
        task.created_at ? new Date(task.created_at).toLocaleString() : '',
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `tasks_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast.success(`Exported ${tasks.length} task(s)`)
    } catch (error) {
      console.error('Error exporting tasks:', error)
      toast.error('Failed to export tasks')
    }
  }

  if (selectedTaskIds.length === 0) return null

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" onClick={handleBulkComplete} disabled={loading || mutationLoading}>
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
      
      <Button size="sm" variant="outline" onClick={() => {
        loadContacts()
        setContactOpen(true)
      }}>
        <User className="h-4 w-4 mr-1.5" />
        Change Contact
      </Button>

      <Button size="sm" variant="outline" onClick={() => {
        loadDeals()
        setDealOpen(true)
      }}>
        <Link2 className="h-4 w-4 mr-1.5" />
        Change Deal
      </Button>

      {locations.length > 0 && (
        <Button size="sm" variant="outline" onClick={() => setLocationOpen(true)}>
          <MapPin className="h-4 w-4 mr-1.5" />
          Change Location
        </Button>
      )}

      <Button size="sm" variant="outline" onClick={() => setTaskTypeOpen(true)}>
        <Tag className="h-4 w-4 mr-1.5" />
        Change Type
      </Button>

      <Button size="sm" variant="outline" onClick={() => setPriorityOpen(true)}>
        <Flag className="h-4 w-4 mr-1.5" />
        Change Priority
      </Button>

      <Button size="sm" variant="outline" onClick={handleExport}>
        <Download className="h-4 w-4 mr-1.5" />
        Export
      </Button>
      
      <Button size="sm" variant="outline" onClick={handleBulkDelete} disabled={loading || mutationLoading}>
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
              <Button onClick={handleBulkReassign} disabled={loading || mutationLoading}>Reassign</Button>
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
              <Button onClick={handleBulkReschedule} disabled={loading || mutationLoading}>Reschedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Contact for {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Contact</Label>
              <ContactSelector
                contacts={contacts}
                value={selectedContactId || null}
                onValueChange={(val) => setSelectedContactId(val || 'none')}
                placeholder="Select contact"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdateContact} disabled={loading || mutationLoading}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Deal Dialog */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Deal for {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Deal</Label>
              <DealSelector
                deals={deals}
                value={selectedDealId || null}
                onValueChange={(val) => setSelectedDealId(val || 'none')}
                placeholder="Select deal"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDealOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdateDeal} disabled={loading || mutationLoading}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Location Dialog */}
      <Dialog open={locationOpen} onOpenChange={setLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Location for {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Location</Label>
              <LocationSelector
                locations={locations}
                value={selectedLocationId}
                onValueChange={setSelectedLocationId}
                placeholder="Select location..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLocationOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdateLocation} disabled={loading || mutationLoading}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Task Type Dialog */}
      <Dialog open={taskTypeOpen} onOpenChange={setTaskTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Task Type for {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Task Type</Label>
              <Select value={selectedTaskType} onValueChange={setSelectedTaskType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setTaskTypeOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdateTaskType} disabled={loading || mutationLoading || !selectedTaskType}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Change Priority Dialog */}
      <Dialog open={priorityOpen} onOpenChange={setPriorityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Priority for {selectedTaskIds.length} Tasks</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Priority</Label>
              <Select value={selectedPriority} onValueChange={setSelectedPriority}>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPriorityOpen(false)}>Cancel</Button>
              <Button onClick={handleBulkUpdatePriority} disabled={loading || mutationLoading || !selectedPriority}>Update</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


