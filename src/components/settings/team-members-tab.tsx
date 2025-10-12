'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserPlus, Mail, Shield, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { InviteUserDialog } from './invite-user-dialog'

// Placeholder data - will be replaced with real data from Supabase
const PLACEHOLDER_USERS = [
  {
    id: '1',
    full_name: 'You (Owner)',
    email: 'your.email@practice.com',
    role: 'Owner',
    status: 'active',
    dealsOwned: 37,
    tasksCompleted: 142
  }
]

export function TeamMembersTab() {
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const tenantId = '550e8400-e29b-41d4-a716-446655440000' // TODO: Get from auth context

  const handleInviteUser = () => {
    setInviteDialogOpen(true)
  }

  const handleInvited = () => {
    // Refresh user list
    toast.success('Team member invited successfully!')
  }

  const handleEditUser = (userId: string) => {
    toast.info('User editing coming soon!', {
      description: 'This will allow you to change roles and permissions'
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'owner': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      case 'staff': return 'bg-green-100 text-green-800'
      case 'viewer': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Invite Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your practice's team members, roles, and permissions
          </p>
        </div>
        <Button onClick={handleInviteUser}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      {/* Coming Soon Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-900">Multi-User Features Coming Soon!</h4>
              <p className="text-sm text-blue-700 mt-1">
                We're building comprehensive team management features including:
              </p>
              <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
                <li>Invite team members by email</li>
                <li>Role-based permissions (Owner, Manager, Staff, Viewer)</li>
                <li>Deal assignment and ownership</li>
                <li>Individual performance tracking</li>
                <li>Team collaboration tools</li>
              </ul>
              <p className="text-sm text-blue-700 mt-3 font-medium">
                For now, you can use the system as a single user with full access.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current User */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Team Members</CardTitle>
          <CardDescription>
            {PLACEHOLDER_USERS.length} member{PLACEHOLDER_USERS.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PLACEHOLDER_USERS.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="text-base bg-purple-100 text-purple-700 font-semibold">
                      {user.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{user.full_name}</h4>
                      <Badge className={getRoleBadgeColor(user.role)}>
                        {user.role}
                      </Badge>
                      {user.status === 'active' && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span>{user.email}</span>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>{user.dealsOwned} deals owned</span>
                      <span className="text-gray-300">•</span>
                      <span>{user.tasksCompleted} tasks completed</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditUser(user.id)}
                  className="ml-2"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Roles Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Role Permissions</CardTitle>
          <CardDescription>
            Understanding different team member roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-100 text-purple-800 mt-0.5">Owner</Badge>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Full access to everything. Can manage team, pipelines, settings, and billing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 mt-0.5">Manager</Badge>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Can view all deals, manage pipelines, assign deals, and view reports.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800 mt-0.5">Staff</Badge>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Can view and edit their own deals, create contacts, and complete tasks.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Badge className="bg-gray-100 text-gray-800 mt-0.5">Viewer</Badge>
              <div className="flex-1">
                <p className="text-sm text-gray-700">
                  Read-only access. Can view deals and reports but cannot make changes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invite Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        tenantId={tenantId}
        onInvited={handleInvited}
      />
    </div>
  )
}

