'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Shield, Save, Search, Check, X, Lock } from 'lucide-react'
import type { CustomRole, PermissionDefinition, RolePermission } from '@/types/database'

interface PermissionMatrixEditorProps {
  roleId: string
  tenantId: string
}

export function PermissionMatrixEditor({ roleId, tenantId }: PermissionMatrixEditorProps) {
  const [role, setRole] = useState<CustomRole | null>(null)
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([])
  const [rolePermissions, setRolePermissions] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [roleId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load role details
      const { data: roleData, error: roleError } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('id', roleId)
        .single()

      if (roleError) throw roleError
      setRole(roleData)

      // Load all permission definitions
      const { data: permData, error: permError } = await supabase
        .from('permission_definitions')
        .select('*')
        .order('category')
        .order('display_order')

      if (permError) throw permError
      setPermissions(permData || [])

      // Load current role permissions
      const { data: rolePermData, error: rolePermError } = await supabase
        .from('role_permissions')
        .select('permission_key, granted')
        .eq('role_id', roleId)

      if (rolePermError) throw rolePermError

      const permMap = new Map<string, boolean>()
      rolePermData?.forEach(rp => {
        permMap.set(rp.permission_key, rp.granted)
      })
      setRolePermissions(permMap)

    } catch (error) {
      console.error('Error loading permission data:', error)
      toast.error('Failed to load permissions')
    } finally {
      setLoading(false)
    }
  }

  const togglePermission = (permissionKey: string) => {
    if (role?.is_system_role) {
      toast.error('Cannot modify system role permissions')
      return
    }

    const newMap = new Map(rolePermissions)
    const current = newMap.get(permissionKey)
    newMap.set(permissionKey, !current)
    setRolePermissions(newMap)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!role) return

    try {
      setSaving(true)

      // Delete all existing permissions for this role
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', roleId)

      // Insert all granted permissions
      const permissionsToInsert = Array.from(rolePermissions.entries())
        .filter(([_, granted]) => granted)
        .map(([key, _]) => ({
          role_id: roleId,
          permission_key: key,
          granted: true
        }))

      if (permissionsToInsert.length > 0) {
        const { error } = await supabase
          .from('role_permissions')
          .insert(permissionsToInsert)

        if (error) throw error
      }

      toast.success('Permissions saved successfully')
      setHasChanges(false)
    } catch (error) {
      console.error('Error saving permissions:', error)
      toast.error('Failed to save permissions')
    } finally {
      setSaving(false)
    }
  }

  const selectAll = (category: string) => {
    const newMap = new Map(rolePermissions)
    permissions
      .filter(p => p.category === category)
      .forEach(p => newMap.set(p.key, true))
    setRolePermissions(newMap)
    setHasChanges(true)
  }

  const deselectAll = (category: string) => {
    const newMap = new Map(rolePermissions)
    permissions
      .filter(p => p.category === category)
      .forEach(p => newMap.set(p.key, false))
    setRolePermissions(newMap)
    setHasChanges(true)
  }

  // Group permissions by category
  const categories = Array.from(new Set(permissions.map(p => p.category)))
  const filteredPermissions = permissions.filter(p =>
    searchTerm === '' ||
    p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedPermissions = categories.map(category => ({
    category,
    permissions: filteredPermissions.filter(p => p.category === category)
  })).filter(g => g.permissions.length > 0)

  const grantedCount = Array.from(rolePermissions.values()).filter(v => v).length

  if (!role) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" style={{ color: role.color }} />
            {role.name} Permissions
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {grantedCount} of {permissions.length} permissions granted
            {role.is_system_role && ' • System role (cannot edit)'}
          </p>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search permissions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Permission Categories */}
      <div className="space-y-4">
        {groupedPermissions.map(group => {
          const categoryGranted = group.permissions.filter(p => rolePermissions.get(p.key)).length
          const categoryTotal = group.permissions.length

          return (
            <Card key={group.category}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base capitalize">{group.category}</CardTitle>
                    <CardDescription>
                      {categoryGranted} of {categoryTotal} permissions granted
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selectAll(group.category)}
                      disabled={role.is_system_role}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deselectAll(group.category)}
                      disabled={role.is_system_role}
                    >
                      <X className="h-3 w-3 mr-1" />
                      None
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {group.permissions.map(perm => {
                    const isGranted = rolePermissions.get(perm.key) || false

                    return (
                      <div
                        key={perm.key}
                        className="flex items-start justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex-1 min-w-0 mr-4">
                          <div className="flex items-center gap-2">
                            <Label
                              htmlFor={perm.key}
                              className="font-medium text-sm cursor-pointer"
                            >
                              {perm.label}
                            </Label>
                            {perm.requires_ownership && (
                              <Badge variant="outline" className="text-xs">
                                Own only
                              </Badge>
                            )}
                          </div>
                          {perm.description && (
                            <p className="text-xs text-gray-600 mt-1">
                              {perm.description}
                            </p>
                          )}
                        </div>
                        <Switch
                          id={perm.key}
                          checked={isGranted}
                          onCheckedChange={() => togglePermission(perm.key)}
                          disabled={role.is_system_role}
                        />
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3">
          <Badge variant="secondary" className="bg-white/20 text-white">
            Unsaved Changes
          </Badge>
          <span className="text-sm">You have unsaved permission changes</span>
          <Button variant="secondary" size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-3 w-3 mr-2" />
            Save Now
          </Button>
        </div>
      )}
    </div>
  )
}

