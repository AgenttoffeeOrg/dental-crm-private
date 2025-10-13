'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import {
  Users, UserPlus, MoreVertical, Mail, Shield, Clock,
  CheckCircle2, XCircle, Search, Filter, Loader2, Ban, Trash2
} from 'lucide-react'
import { InviteUserDialog } from './invite-user-dialog'

interface User {
  id: string
  full_name: string
  email: string
  role: string
  status: string
  created_at: string
  last_seen_at?: string
  avatar_url?: string
}

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by_user_id?: string
}

export function UserManagementDashboard() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)

  useEffect(() => {
    if (appUser) {
      fetchData()
    }
  }, [appUser])

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    try {
      // Fetch users
      const { data: usersData } = await supabase
        .from('app_users')
        .select('*')
        .eq('tenant_id', appUser?.tenant_id)
        .order('created_at', { ascending: false })

      if (usersData) setUsers(usersData)

      // Fetch invitations
      const { data: invitationsData } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('tenant_id', appUser?.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (invitationsData) setInvitations(invitationsData)
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const handleResendInvitation = async (invitationId: string, email: string) => {
    try {
      // In a real app, you'd call an API to resend the email
      toast.success(`Invitation resent to ${email}`)
    } catch (error) {
      toast.error('Failed to resend invitation')
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('user_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId)

      if (error) throw error

      toast.success('Invitation cancelled')
      fetchData()
    } catch (error) {
      toast.error('Failed to cancel invitation')
    }
  }

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ status: 'inactive' })
        .eq('id', userId)

      if (error) throw error

      toast.success('User deactivated')
      fetchData()
    } catch (error) {
      toast.error('Failed to deactivate user')
    }
  }

  const handleActivateUser = async (userId: string) => {
    const supabase = createClient()

    try {
      const { error} = await supabase
        .from('app_users')
        .update({ status: 'active' })
        .eq('id', userId)

      if (error) throw error

      toast.success('User activated')
      fetchData()
    } catch (error) {
      toast.error('Failed to activate user')
    }
  }

  const handleChangeRole = async (userId: string, newRole: string) => {
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('app_users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      toast.success('Role updated successfully')
      fetchData()
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole = filterRole === 'all' || user.role === filterRole
    return matchesSearch && matchesRole
  })

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'staff': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
          <p className="text-gray-600 mt-1">
            Manage users and their access to your practice
          </p>
        </div>
        <Button onClick={() => setShowInviteDialog(true)}>
          <UserPlus className="w-4 h-4 mr-2" />
          Invite User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Pending Invites</p>
              <p className="text-2xl font-bold text-gray-900">{invitations.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Admins</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => ['owner', 'manager'].includes(u.role)).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search & Filter */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            className="h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
            <option value="staff">Staff</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </Card>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Mail className="w-5 h-5 mr-2 text-yellow-600" />
            Pending Invitations ({invitations.length})
          </h3>
          <div className="space-y-3">
            {invitations.map(inv => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Mail className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{inv.email}</p>
                    <p className="text-sm text-gray-600">
                      Invited {new Date(inv.created_at).toLocaleDateString()} • 
                      Expires {new Date(inv.expires_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge className={getRoleBadgeColor(inv.role)}>
                    {inv.role}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleResendInvitation(inv.id, inv.email)}
                  >
                    Resend
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelInvitation(inv.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Users List */}
      <Card className="p-6">
        <div className="space-y-4">
          {filteredUsers.map(user => (
            <div key={user.id} className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{user.full_name}</p>
                    {user.id === appUser?.id && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{user.email}</p>
                  {user.last_seen_at && (
                    <p className="text-xs text-gray-500">
                      Last seen {new Date(user.last_seen_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Badge className={getRoleBadgeColor(user.role)}>
                  {user.role}
                </Badge>
                <Badge className={getStatusBadgeColor(user.status)}>
                  {user.status}
                </Badge>

                {user.id !== appUser?.id && appUser?.role === 'owner' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem onClick={() => {
                        setSelectedUser(user)
                        setShowEditDialog(true)
                      }}>
                        <Shield className="w-4 h-4 mr-2" />
                        Change Role
                      </DropdownMenuItem>
                      
                      {user.status === 'active' ? (
                        <DropdownMenuItem onClick={() => handleDeactivateUser(user.id)}>
                          <Ban className="w-4 h-4 mr-2" />
                          Deactivate
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => handleActivateUser(user.id)}>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Activate
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        tenantId={appUser?.tenant_id || ''}
        onInvited={fetchData}
      />

      {/* Edit Role Dialog */}
      {selectedUser && (
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Role</DialogTitle>
              <DialogDescription>
                Update the role for {selectedUser.full_name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {['owner', 'manager', 'staff', 'viewer'].map(role => (
                <div
                  key={role}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedUser.role === role ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => {
                    handleChangeRole(selectedUser.id, role)
                    setShowEditDialog(false)
                  }}
                >
                  <p className="font-medium capitalize">{role}</p>
                  <p className="text-sm text-gray-600 mt-1">
                    {role === 'owner' && 'Full access to everything'}
                    {role === 'manager' && 'Manage team and view all data'}
                    {role === 'staff' && 'Access assigned deals and contacts'}
                    {role === 'viewer' && 'View-only access'}
                  </p>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

