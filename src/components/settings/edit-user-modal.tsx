'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: {
    id: string
    full_name: string
    email: string
    role: string
    status: string
    manager_user_id?: string | null
  }
  onUserUpdated: () => void
}

interface ManagerCandidate {
  id: string
  full_name: string | null
  email: string | null
}

export function EditUserModal({ open, onOpenChange, user, onUserUpdated }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    full_name: user.full_name,
    role: user.role,
    status: user.status,
    manager_user_id: user.manager_user_id ?? null,
  })
  const [saving, setSaving] = useState(false)
  const [managerCandidates, setManagerCandidates] = useState<ManagerCandidate[]>([])
  const [loadingManagers, setLoadingManagers] = useState(false)

  // 2b.81 — load potential managers (active tenant members other than
  // this user) for the dropdown. Uses the GET /api/users?in_tenant=1
  // endpoint introduced in 2b.80.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoadingManagers(true)
    fetch('/api/users?in_tenant=1', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          console.warn('[edit-user-modal] manager-candidates fetch failed', r.status)
          return null
        }
        const body = await r.json()
        return body.users as ManagerCandidate[]
      })
      .then((users) => {
        if (cancelled) return
        if (users) setManagerCandidates(users.filter((u) => u.id !== user.id))
      })
      .catch((err) => {
        console.warn('[edit-user-modal] manager-candidates fetch threw', err)
      })
      .finally(() => {
        if (!cancelled) setLoadingManagers(false)
      })
    return () => {
      cancelled = true
    }
  }, [open, user.id])

  const handleSave = async () => {
    setSaving(true)
    try {
      // 2b.85 — route through PATCH /api/users/[id] so the update goes
      // through audit-first + service-role + tenant scoping.
      // Previously this was a direct client-side update on app_users,
      // which skipped audit (CLAUDE.md operational principle).
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: formData.full_name,
          role: formData.role,
          status: formData.status,
          manager_user_id: formData.manager_user_id,
        }),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? body.message ?? `http_${res.status}`)
      }

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

          <div>
            <Label>Manager</Label>
            <Select
              value={formData.manager_user_id ?? '__none'}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  manager_user_id: value === '__none' ? null : value,
                })
              }
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={loadingManagers ? 'Loading…' : '— no manager —'}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— no manager —</SelectItem>
                {managerCandidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name ?? c.email ?? c.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Sets who gets pinged when this person's urgent tasks go overdue 24h+.
              Manager must also have the "Overdue task alerts for my reports" toggle ON.
            </p>
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
