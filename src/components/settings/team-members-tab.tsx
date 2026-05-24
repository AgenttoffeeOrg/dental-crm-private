'use client'

/**
 * Phase 2b.81 — Team Members tab.
 *
 * Replaced the placeholder "Coming Soon" stub with a real roster
 * loaded from /api/users?in_tenant=1 (introduced 2b.80) plus the
 * EditUserModal which now writes manager_user_id alongside role and
 * status (so the manager-overdue cron has something to look up).
 */

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { UserPlus, Mail, Shield, MoreVertical, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { InviteUserDialog } from './invite-user-dialog'
import { EditUserModal } from './edit-user-modal'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface TeamUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
  status: string
  manager_user_id: string | null
}

export function TeamMembersTab() {
  const { orgId } = useTenantContext()
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null)
  const [users, setUsers] = useState<TeamUser[]>([])
  const [loading, setLoading] = useState(true)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users?in_tenant=1', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn('[team-members-tab] roster fetch failed', res.status, body)
        toast.error("Couldn't load team roster.")
        return
      }
      const body = await res.json()
      const list = (body.users ?? []) as Array<{ id: string; full_name: string | null; email: string | null }>

      // The roster endpoint returns id / full_name / email only.
      // Enrich with role + status + manager_user_id from app_users via
      // a direct supabase read.
      if (list.length === 0) {
        setUsers([])
        return
      }
      const supabase = createClient()
      const { data: enriched, error } = await supabase
        .from('app_users')
        .select('id, full_name, email, role, status, manager_user_id')
        .in('id', list.map((u) => u.id))
      if (error) {
        // 2b.85 — fail loud instead of falling back to defaults. Showing
        // every user as "staff/active/no manager" is worse than showing
        // nothing — the operator might unknowingly grant the wrong role.
        console.warn('[team-members-tab] app_users enrich failed', error.message)
        toast.error(`Couldn't load team roles: ${error.message}`)
        setUsers([])
        return
      }
      const enrichedMap = new Map(
        ((enriched ?? []) as TeamUser[]).map((u) => [u.id, u])
      )
      setUsers(
        list.map((u) => {
          const e = enrichedMap.get(u.id)
          return {
            id: u.id,
            full_name: e?.full_name ?? u.full_name,
            email: e?.email ?? u.email,
            role: e?.role ?? 'staff',
            status: e?.status ?? 'active',
            manager_user_id: e?.manager_user_id ?? null,
          }
        })
      )
    } catch (err) {
      console.warn('[team-members-tab] roster fetch threw', err)
      toast.error("Couldn't load team roster.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const getRoleBadgeColor = (role: string) => {
    switch ((role ?? '').toLowerCase()) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'manager':
        return 'bg-blue-100 text-blue-800'
      case 'staff':
        return 'bg-green-100 text-green-800'
      case 'viewer':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const managerNameLookup = (managerId: string | null) => {
    if (!managerId) return null
    const found = users.find((u) => u.id === managerId)
    return found?.full_name ?? found?.email ?? null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-gray-600 mt-1">
            Manage your practice's team members, roles, and who reports to whom.
          </p>
        </div>
        <Button onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Team Member
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current Team Members</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading…'
              : `${users.length} member${users.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : users.length === 0 ? (
            <div className="text-sm text-gray-500">
              No team members yet. Invite someone above.
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => {
                const name = user.full_name ?? user.email ?? user.id
                const managerName = managerNameLookup(user.manager_user_id)
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="text-base bg-purple-100 text-purple-700 font-semibold">
                          {name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold">{name}</h4>
                          <Badge className={getRoleBadgeColor(user.role)}>{user.role}</Badge>
                          {user.status === 'active' && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 text-green-700 border-green-200"
                            >
                              Active
                            </Badge>
                          )}
                          {user.status === 'inactive' && (
                            <Badge
                              variant="outline"
                              className="text-xs bg-gray-50 text-gray-600 border-gray-200"
                            >
                              Inactive
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span>{user.email ?? '—'}</span>
                        </div>
                        {managerName && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reports to {managerName}
                          </div>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser(user)}
                      className="ml-2"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Role Permissions
          </CardTitle>
          <CardDescription>What each role can do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <Badge className="bg-purple-100 text-purple-800 mt-0.5">Owner</Badge>
              <p className="text-gray-600">
                Full control — billing, team, policies, and all data.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-blue-100 text-blue-800 mt-0.5">Manager</Badge>
              <p className="text-gray-600">
                Manages a team — sees direct reports' tasks, gets overdue alerts,
                and can edit pipelines/automations.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-green-100 text-green-800 mt-0.5">Staff</Badge>
              <p className="text-gray-600">
                Day-to-day work — owns contacts, runs the task queue, sends messages.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Badge className="bg-gray-100 text-gray-800 mt-0.5">Viewer</Badge>
              <p className="text-gray-600">
                Read-only — useful for accountants or auditors.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        tenantId={orgId ?? ''}
        onInvited={() => {
          toast.success('Team member invited successfully!')
          loadUsers()
        }}
      />

      {editingUser && (
        <EditUserModal
          open={Boolean(editingUser)}
          onOpenChange={(open) => {
            if (!open) setEditingUser(null)
          }}
          user={{
            id: editingUser.id,
            full_name: editingUser.full_name ?? '',
            email: editingUser.email ?? '',
            role: editingUser.role,
            status: editingUser.status,
            manager_user_id: editingUser.manager_user_id,
          }}
          onUserUpdated={() => {
            loadUsers()
          }}
        />
      )}
    </div>
  )
}
