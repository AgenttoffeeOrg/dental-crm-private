'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Shield, Plus, Edit, Trash2, Lock, Check, X } from 'lucide-react'
import type { CustomRole } from '@/types/database'

interface CreateRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tenantId: string
  onCreated: () => void
  editingRole?: CustomRole | null
}

function CreateRoleDialog({ open, onOpenChange, tenantId, onCreated, editingRole }: CreateRoleDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [color, setColor] = useState('#6366f1')
  const [icon, setIcon] = useState('👤')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (editingRole) {
      setName(editingRole.name)
      setDescription(editingRole.description || '')
      setIsAdmin(editingRole.is_admin)
      setColor(editingRole.color)
      setIcon(editingRole.icon || '👤')
    } else {
      setName('')
      setDescription('')
      setIsAdmin(false)
      setColor('#6366f1')
      setIcon('👤')
    }
  }, [editingRole, open])

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Role name is required')
      return
    }

    setLoading(true)

    try {
      if (editingRole) {
        // Update existing role
        const { error } = await supabase
          .from('custom_roles')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            is_admin: isAdmin,
            color,
            icon,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingRole.id)

        if (error) throw error
        toast.success('Role updated successfully')
      } else {
        // Create new role
        const { data: roles } = await supabase
          .from('custom_roles')
          .select('display_order')
          .eq('tenant_id', tenantId)
          .order('display_order', { ascending: false })
          .limit(1)

        const maxOrder = roles && roles[0] ? roles[0].display_order : 0

        const { error } = await supabase
          .from('custom_roles')
          .insert({
            tenant_id: tenantId,
            name: name.trim(),
            description: description.trim() || null,
            is_admin: isAdmin,
            is_system_role: false,
            color,
            icon,
            display_order: maxOrder + 1,
            active: true
          })

        if (error) throw error
        toast.success('Role created successfully')
      }

      onCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving role:', error)
      toast.error('Failed to save role')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editingRole ? 'Edit Role' : 'Create Custom Role'}</DialogTitle>
          <DialogDescription>
            {editingRole ? 'Update role details and permissions' : 'Define a new custom role for your practice'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Role Name *</Label>
            <Input
              id="role-name"
              placeholder="e.g., Treatment Coordinator, Receptionist, Senior Dentist"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              placeholder="What does this role do?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="role-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="role-color"
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-icon">Icon (Emoji)</Label>
              <Input
                id="role-icon"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="👤"
                maxLength={2}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-yellow-700" />
              <div>
                <Label htmlFor="is-admin" className="cursor-pointer font-medium text-yellow-900">
                  Administrator Role
                </Label>
                <p className="text-xs text-yellow-700 mt-1">
                  Can view audit logs, manage roles & permissions
                </p>
              </div>
            </div>
            <Switch
              id="is-admin"
              checked={isAdmin}
              onCheckedChange={setIsAdmin}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? 'Saving...' : editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function CustomRolesTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadRoles()
  }, [tenantId])

  const loadRoles = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('display_order')

      if (error) {
        console.error('Error loading roles:', JSON.stringify(error, null, 2))
        // Gracefully handle - show empty state
        setRoles([])
      } else {
        setRoles(data || [])
      }
    } catch (error) {
      console.error('Error loading roles:', error)
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (roleId: string, roleName: string) => {
    const role = roles.find(r => r.id === roleId)
    if (role?.is_system_role) {
      toast.error('Cannot delete system role')
      return
    }

    if (!confirm(`Delete role "${roleName}"? Users with this role will need to be reassigned.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('custom_roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      toast.success('Role deleted successfully')
      loadRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete role. Users may still be assigned to it.')
    }
  }

  const handleEditPermissions = (roleId: string) => {
    // Navigate to permission matrix editor
    window.location.href = `/settings?tab=permissions&role=${roleId}`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Custom Roles
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage custom roles with specific permissions
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Role
        </Button>
      </div>

      {/* Roles List */}
      <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
          <Card className="col-span-2">
            <CardContent className="py-12 text-center text-gray-500">
              Loading roles...
            </CardContent>
          </Card>
        ) : roles.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No custom roles yet</p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Role
              </Button>
            </CardContent>
          </Card>
        ) : (
          roles.map(role => (
            <Card key={role.id} className="relative overflow-hidden">
              {/* Color Bar */}
              <div 
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: role.color }}
              />

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center text-2xl"
                      style={{ backgroundColor: `${role.color}20` }}
                    >
                      {role.icon || '👤'}
                    </div>
                    <div>
                      <CardTitle className="text-base">{role.name}</CardTitle>
                      <CardDescription className="mt-1">
                        {role.description || 'No description'}
                      </CardDescription>
                    </div>
                  </div>
                  {role.is_system_role && (
                    <Lock className="h-4 w-4 text-gray-400" title="System role" />
                  )}
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {role.is_admin && (
                    <Badge className="bg-yellow-100 text-yellow-800">
                      <Shield className="h-3 w-3 mr-1" />
                      Administrator
                    </Badge>
                  )}
                  {role.is_system_role && (
                    <Badge variant="outline">
                      <Lock className="h-3 w-3 mr-1" />
                      System Role
                    </Badge>
                  )}
                  {role.active ? (
                    <Badge className="bg-green-100 text-green-800">Active</Badge>
                  ) : (
                    <Badge variant="outline">Inactive</Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEditPermissions(role.id)}
                  >
                    <Check className="h-3 w-3 mr-2" />
                    Permissions
                  </Button>
                  {!role.is_system_role && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRole(role)
                          setCreateDialogOpen(true)
                        }}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(role.id, role.name)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Example Roles Suggestion */}
      {roles.length === 1 && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-base text-blue-900">💡 Suggested Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-blue-700 mb-3">
              Common roles for dental practices:
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Treatment Coordinator', icon: '🩺' },
                { name: 'Receptionist', icon: '📞' },
                { name: 'Dentist', icon: '🦷' },
                { name: 'Hygienist', icon: '✨' },
                { name: 'Practice Manager', icon: '📊' },
                { name: 'Billing Specialist', icon: '💰' },
              ].map(suggestion => (
                <Badge
                  key={suggestion.name}
                  variant="outline"
                  className="cursor-pointer hover:bg-blue-100"
                  onClick={() => {
                    setName(suggestion.name)
                    setIcon(suggestion.icon)
                    setCreateDialogOpen(true)
                  }}
                >
                  {suggestion.icon} {suggestion.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <CreateRoleDialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open)
          if (!open) setEditingRole(null)
        }}
        tenantId={tenantId}
        onCreated={loadRoles}
        editingRole={editingRole}
      />
    </div>
  )
}

export { CustomRolesTab }

