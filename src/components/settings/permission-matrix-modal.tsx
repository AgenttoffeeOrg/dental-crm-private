'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { toast } from 'sonner'
import { Shield, Save, Search, Check, X, ChevronRight } from 'lucide-react'
import type { CustomRole, PermissionDefinition } from '@/types/database'

interface PermissionMatrixModalProps {
  roleId: string
  tenantId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PermissionMatrixModal({ roleId, tenantId, open, onOpenChange }: PermissionMatrixModalProps) {
  const [role, setRole] = useState<CustomRole | null>(null)
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([])
  const [rolePermissions, setRolePermissions] = useState<Map<string, boolean>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [hasChanges, setHasChanges] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (open && roleId) {
      loadData()
    }
  }, [open, roleId])

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
      console.error('Error loading permission data:', JSON.stringify(error, null, 2))
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
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving permissions:', JSON.stringify(error, null, 2))
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
    p.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const groupedPermissions = categories.map(category => ({
    category,
    permissions: filteredPermissions.filter(p => p.category === category)
  })).filter(g => g.permissions.length > 0)

  const grantedCount = Array.from(rolePermissions.values()).filter(v => v).length

  // Category icons and colors
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      'deals': '💼',
      'contacts': '👥',
      'pipelines': '🔄',
      'tasks': '✅',
      'activities': '📞',
      'users': '👤',
      'roles': '🛡️',
      'settings': '⚙️',
      'analytics': '📊',
      'audit': '🔒'
    }
    return icons[category] || '📋'
  }

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'deals': 'bg-blue-50 border-blue-200',
      'contacts': 'bg-green-50 border-green-200',
      'pipelines': 'bg-purple-50 border-purple-200',
      'tasks': 'bg-orange-50 border-orange-200',
      'activities': 'bg-pink-50 border-pink-200',
      'users': 'bg-indigo-50 border-indigo-200',
      'roles': 'bg-violet-50 border-violet-200',
      'settings': 'bg-gray-50 border-gray-200',
      'analytics': 'bg-cyan-50 border-cyan-200',
      'audit': 'bg-red-50 border-red-200'
    }
    return colors[category] || 'bg-gray-50 border-gray-200'
  }

  if (!role) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="h-6 w-6" style={{ color: role.color }} />
            {role.name} Permissions
          </DialogTitle>
          <DialogDescription className="flex items-center justify-between">
            <span>
              {grantedCount} of {permissions.length} permissions granted
              {role.is_system_role && ' • System role (cannot edit)'}
            </span>
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search permissions by name, category, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Scrollable Permission Categories */}
        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <Shield className="h-8 w-8 mx-auto mb-2 animate-pulse text-gray-300" />
              <p>Loading permissions...</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-2">
              {groupedPermissions.map(group => {
                const categoryGranted = group.permissions.filter(p => rolePermissions.get(p.key)).length
                const categoryTotal = group.permissions.length
                const icon = getCategoryIcon(group.category)
                const colorClass = getCategoryColor(group.category)

                return (
                  <AccordionItem 
                    key={group.category} 
                    value={group.category}
                    className={`border rounded-lg ${colorClass}`}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{icon}</span>
                          <div className="text-left">
                            <div className="font-semibold capitalize text-base">
                              {group.category}
                            </div>
                            <div className="text-xs text-gray-600">
                              {categoryGranted} of {categoryTotal} permissions
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              selectAll(group.category)
                            }}
                            disabled={role.is_system_role}
                            className="h-7 px-2 text-xs"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            All
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              deselectAll(group.category)
                            }}
                            disabled={role.is_system_role}
                            className="h-7 px-2 text-xs"
                          >
                            <X className="h-3 w-3 mr-1" />
                            None
                          </Button>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-3">
                      <div className="space-y-2">
                        {group.permissions.map(perm => {
                          const isGranted = rolePermissions.get(perm.key) || false

                          return (
                            <div
                              key={perm.key}
                              className="flex items-center justify-between p-2 rounded hover:bg-white/50 transition-colors"
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
                                  <p className="text-xs text-gray-600 mt-0.5">
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
                    </AccordionContent>
                  </AccordionItem>
                )
              })}
            </Accordion>
          )}
        </ScrollArea>

        {/* Footer with Save Button */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-gray-600">
            {hasChanges && (
              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                Unsaved Changes
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

