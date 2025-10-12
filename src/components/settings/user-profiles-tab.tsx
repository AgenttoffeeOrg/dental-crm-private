'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Users, Plus, Edit, Trash2, Copy, Check } from 'lucide-react'
import type { UserProfile, CustomRole } from '@/types/database'

export function UserProfilesTab({ tenantId = '550e8400-e29b-41d4-a716-446655440000' }: { tenantId?: string }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<UserProfile | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [roleId, setRoleId] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [tenantId])

  const loadData = async () => {
    try {
      setLoading(true)

      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at')

      if (profilesError && profilesError.code !== 'PGRST116') throw profilesError

      // Load roles for selection
      const { data: rolesData, error: rolesError } = await supabase
        .from('custom_roles')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)
        .order('display_order')

      if (rolesError && rolesError.code !== 'PGRST116') throw rolesError

      setProfiles(profilesData || [])
      setRoles(rolesData || [])
    } catch (error) {
      console.error('Error loading profiles:', JSON.stringify(error, null, 2))
      // Gracefully handle - show empty state
      setProfiles([])
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Profile name is required')
      return
    }

    try {
      if (editingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            name: name.trim(),
            description: description.trim() || null,
            role_id: roleId || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProfile.id)

        if (error) throw error
        toast.success('Profile updated')
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            tenant_id: tenantId,
            name: name.trim(),
            description: description.trim() || null,
            role_id: roleId || null,
            settings: {},
            active: true
          })

        if (error) throw error
        toast.success('Profile created')
      }

      setDialogOpen(false)
      resetForm()
      loadData()
    } catch (error: any) {
      console.error('Error saving profile:', error)
      toast.error(error.message || 'Failed to save profile')
    }
  }

  const resetForm = () => {
    setName('')
    setDescription('')
    setRoleId('')
    setEditingProfile(null)
  }

  const handleDelete = async (profileId: string, profileName: string) => {
    if (!confirm(`Delete profile "${profileName}"?`)) return

    try {
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', profileId)

      if (error) throw error
      toast.success('Profile deleted')
      loadData()
    } catch (error) {
      console.error('Error deleting profile:', error)
      toast.error('Failed to delete profile')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Profiles
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Create reusable profiles to quickly onboard new team members
          </p>
        </div>
        <Button onClick={() => {
          resetForm()
          setDialogOpen(true)
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Create Profile
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">What are User Profiles?</h4>
              <p className="text-sm text-blue-700 mt-1">
                Profiles are templates that bundle together:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li><strong>Role assignment</strong> - Default permissions</li>
                <li><strong>Preset preferences</strong> - View settings, filters, dashboard layout</li>
                <li><strong>Quick onboarding</strong> - New hires get everything pre-configured</li>
              </ul>
              <p className="text-sm text-blue-700 mt-3">
                <strong>Example:</strong> Create a "Receptionist" profile with front-desk role + list view preference
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profiles List */}
      <div className="grid gap-4 md:grid-cols-2">
        {profiles.map(profile => {
          const assignedRole = roles.find(r => r.id === profile.role_id)
          
          return (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {profile.description || 'No description'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignedRole && (
                  <div>
                    <Label className="text-xs text-gray-600">Default Role</Label>
                    <Badge 
                      className="mt-1"
                      style={{ backgroundColor: assignedRole.color + '20', color: assignedRole.color }}
                    >
                      {assignedRole.icon} {assignedRole.name}
                    </Badge>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingProfile(profile)
                      setName(profile.name)
                      setDescription(profile.description || '')
                      setRoleId(profile.role_id || '')
                      setDialogOpen(true)
                    }}
                  >
                    <Edit className="h-3 w-3 mr-2" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => handleDelete(profile.id, profile.name)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {profiles.length === 0 && !loading && (
          <Card className="col-span-2">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500 mb-2">No user profiles yet</p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Profile
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open)
        if (!open) resetForm()
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Edit Profile' : 'Create User Profile'}
            </DialogTitle>
            <DialogDescription>
              Define a reusable template for team member onboarding
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Profile Name *</Label>
              <Input
                id="profile-name"
                placeholder="e.g., Receptionist, Treatment Coordinator"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-description">Description</Label>
              <Textarea
                id="profile-description"
                placeholder="What is this profile for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profile-role">Default Role</Label>
              <Select value={roleId} onValueChange={setRoleId}>
                <SelectTrigger id="profile-role">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <span>{role.icon}</span>
                        <span>{role.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                {editingProfile ? 'Update' : 'Create'} Profile
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

