'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { User, Mail, Save, Camera } from 'lucide-react'

interface UserProfileProps {
  userId: string
  tenantId: string
}

export function UserProfileEditor({ userId, tenantId }: UserProfileProps) {
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadUser()
  }, [userId])

  const loadUser = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error loading user:', JSON.stringify(error, null, 2))
        
        // User doesn't exist - create a placeholder
        setUser({
          id: userId,
          tenant_id: tenantId,
          full_name: 'Current User',
          email: '',
          created_at: new Date().toISOString()
        })
        setFullName('Current User')
        setEmail('')
        toast.info('User profile will be created on first save')
      } else {
        setUser(data)
        setFullName(data.full_name)
        setEmail(data.email || '')
      }
    } catch (error) {
      console.error('Error loading user:', error)
      // Create placeholder
      setUser({
        id: userId,
        tenant_id: tenantId,
        full_name: 'Current User',
        email: '',
        created_at: new Date().toISOString()
      })
      setFullName('Current User')
      setEmail('')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast.error('Name cannot be empty')
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('app_users')
        .update({
          full_name: fullName.trim(),
          email: email.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)

      if (error) throw error

      toast.success('Profile updated successfully')
      loadUser()
    } catch (error) {
      console.error('Error updating profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">Loading profile...</div>
        </CardContent>
      </Card>
    )
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">User not found</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </CardTitle>
          <CardDescription>
            Update your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Photo */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="text-3xl bg-purple-100 text-purple-700 font-bold">
                {fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <Button variant="outline" size="sm" className="mb-2">
                <Camera className="h-4 w-4 mr-2" />
                Upload Photo
              </Button>
              <p className="text-xs text-gray-600">
                JPG, PNG or GIF. Max size 2MB
              </p>
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@practice.com"
            />
          </div>

          {/* Role (Read-only) */}
          <div className="space-y-2">
            <Label>Role</Label>
            <div className="flex items-center gap-2">
              <Badge className="bg-purple-100 text-purple-800">
                {user.role}
              </Badge>
              <span className="text-sm text-gray-600">
                Contact practice owner to change your role
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">User ID</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.id}</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tenant ID</span>
            <code className="text-xs bg-gray-100 px-2 py-1 rounded">{user.tenant_id}</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Member Since</span>
            <span className="text-gray-900">
              {new Date(user.created_at).toLocaleDateString()}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

