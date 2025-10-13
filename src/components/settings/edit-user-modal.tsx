'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    full_name: string
    email: string
    role: string
    status: string
  }
  onUserUpdated: () => void
}

export function EditUserModal({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    role: user.role,
    status: user.status
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: formData.full_name,
          role: formData.role,
          status: formData.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error

      toast.success('User updated successfully!')
      onUserUpdated()
      onOpenChange(false)
    } catch (error: any) {
      toast.error('Failed to update user', {
        description: error.message
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Full Name</Label>
            <Input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label>Role</Label>
            <Select value={formData.role} onValueChange={(role) => setFormData({ ...formData, role })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="owner">Owner</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Status</Label>
            <Select value={formData.status} onValueChange={(status) => setFormData({ ...formData, status })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

