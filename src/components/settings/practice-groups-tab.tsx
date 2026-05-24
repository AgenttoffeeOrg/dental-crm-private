'use client'

/**
 * Phase 2b.76 — Practice groups admin tab.
 *
 * Lives under Settings → Team. Lets an admin:
 *   - Create / rename / delete a group (Front Desk, Treatment
 *     Coordinators, etc.).
 *   - Add / remove team members per group.
 *
 * Tasks can be assigned to a group via the existing TaskActionsMenu
 * "Reassign" affordance (Phase 2b.63). Tenant default-assignee policy
 * (Phase 2b.77) can use a group as the default landing place.
 *
 * Groups are orthogonal to user_tenant_memberships.role — role is
 * about permissions; group is about job function.
 */

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Users, X, Loader2, Pencil, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { DefaultAssigneePolicySection } from './default-assignee-policy-section'

interface Group {
  id: string
  name: string
  description: string | null
  member_count: number
  created_at?: string
}

interface Member {
  id: string
  full_name: string | null
  email: string | null
  joined_at?: string | null
}

interface AppUser {
  id: string
  full_name: string | null
  email: string | null
}

export function PracticeGroupsTab() {
  const [groups, setGroups] = useState<Group[]>([])
  const [allUsers, setAllUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [groupMembers, setGroupMembers] = useState<Record<string, Member[]>>({})
  const [memberAddUserId, setMemberAddUserId] = useState<string>('')

  const loadGroups = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/practice-groups', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      const body = await res.json()
      setGroups(body.groups ?? [])
    } catch (err) {
      toast.error(`Couldn't load practice groups: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadAllUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users?in_tenant=1', { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn('[practice-groups-tab] /api/users?in_tenant=1 failed', res.status, body)
        toast.error("Couldn't load team list — Add Member dropdown will be empty.")
        return
      }
      const body = await res.json()
      setAllUsers(body.users ?? [])
    } catch (err) {
      console.warn('[practice-groups-tab] users fetch threw', err)
      toast.error("Couldn't load team list — Add Member dropdown will be empty.")
    }
  }, [])

  useEffect(() => {
    loadGroups()
    loadAllUsers()
  }, [loadGroups, loadAllUsers])

  async function loadMembersFor(groupId: string) {
    try {
      const res = await fetch(`/api/practice-groups/${groupId}/members`, { credentials: 'include' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        console.warn('[practice-groups-tab] members lookup failed', groupId, res.status, body)
        toast.error("Couldn't load group members.")
        return
      }
      const body = await res.json()
      setGroupMembers((m) => ({ ...m, [groupId]: body.members ?? [] }))
    } catch (err) {
      console.warn('[practice-groups-tab] members fetch threw', groupId, err)
      toast.error("Couldn't load group members.")
    }
  }

  async function handleCreate() {
    if (!newName.trim()) {
      toast.error('Name is required.')
      return
    }
    setCreating(true)
    try {
      const res = await fetch('/api/practice-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() || null }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      setNewName('')
      setNewDescription('')
      toast.success('Group created.')
      await loadGroups()
    } catch (err) {
      toast.error(`Couldn't create: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setCreating(false)
    }
  }

  async function handleSaveEdit(groupId: string) {
    setBusyId(groupId)
    try {
      const res = await fetch(`/api/practice-groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      toast.success('Saved.')
      setEditingId(null)
      await loadGroups()
    } catch (err) {
      toast.error(`Couldn't save: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(groupId: string, name: string) {
    if (!window.confirm(`Delete "${name}"? Every member of this group will be removed too. Tasks assigned to this group will keep their reference but won't show up under any group.`)) {
      return
    }
    setBusyId(groupId)
    try {
      const res = await fetch(`/api/practice-groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      toast.success('Group deleted.')
      await loadGroups()
    } catch (err) {
      toast.error(`Couldn't delete: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleAddMember(groupId: string) {
    if (!memberAddUserId) return
    setBusyId(groupId)
    try {
      const res = await fetch(`/api/practice-groups/${groupId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: memberAddUserId }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      toast.success('Added.')
      setMemberAddUserId('')
      await Promise.all([loadGroups(), loadMembersFor(groupId)])
    } catch (err) {
      toast.error(`Couldn't add: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleRemoveMember(groupId: string, userId: string) {
    setBusyId(groupId)
    try {
      const res = await fetch(`/api/practice-groups/${groupId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      toast.success('Removed.')
      await Promise.all([loadGroups(), loadMembersFor(groupId)])
    } catch (err) {
      toast.error(`Couldn't remove: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4" />
            Practice groups
          </CardTitle>
          <CardDescription>
            Group your team by job function so you can hand a task to "Front Desk"
            instead of a specific person. Groups are different from roles —
            roles control permissions; groups control who picks up the work.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-[1fr_2fr_auto] items-end">
            <div>
              <Label htmlFor="new-group-name">Name</Label>
              <Input
                id="new-group-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Front Desk"
              />
            </div>
            <div>
              <Label htmlFor="new-group-desc">Description (optional)</Label>
              <Input
                id="new-group-desc"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Greets patients, answers phones, handles bookings"
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Plus className="h-3 w-3 mr-2" />}
              Add group
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading groups…
        </div>
      )}

      {!loading && groups.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-gray-500">
            No groups yet. Create one above (e.g. "Front Desk").
          </CardContent>
        </Card>
      )}

      <DefaultAssigneePolicySection
        groups={groups.map((g) => ({ id: g.id, name: g.name }))}
        users={allUsers}
      />

      {!loading &&
        groups.map((g) => (
          <Card key={g.id}>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {editingId === g.id ? (
                    <div className="space-y-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Group name"
                      />
                      <Input
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveEdit(g.id)} disabled={busyId === g.id}>
                          Save
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <CardTitle className="text-base flex items-center gap-2">
                        {g.name}
                        <Badge variant="secondary" className="text-xs">
                          {g.member_count} {g.member_count === 1 ? 'member' : 'members'}
                        </Badge>
                      </CardTitle>
                      {g.description && (
                        <CardDescription className="mt-1">{g.description}</CardDescription>
                      )}
                    </>
                  )}
                </div>
                {editingId !== g.id && (
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(g.id)
                        setEditName(g.name)
                        setEditDescription(g.description ?? '')
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(g.id, g.name)}
                      disabled={busyId === g.id}
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (expandedId === g.id) {
                    setExpandedId(null)
                  } else {
                    setExpandedId(g.id)
                    if (!groupMembers[g.id]) loadMembersFor(g.id)
                  }
                }}
              >
                {expandedId === g.id ? 'Hide members' : 'Manage members'}
              </Button>

              {expandedId === g.id && (
                <div className="mt-4 space-y-3">
                  {(groupMembers[g.id] ?? []).length === 0 && (
                    <div className="text-xs text-gray-500">No members yet.</div>
                  )}
                  {(groupMembers[g.id] ?? []).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between text-sm border-b py-1 last:border-b-0"
                    >
                      <div>
                        <div className="font-medium">{m.full_name ?? '—'}</div>
                        <div className="text-xs text-gray-500">{m.email}</div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRemoveMember(g.id, m.id)}
                        disabled={busyId === g.id}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex items-end gap-2 pt-2">
                    <div className="flex-1">
                      <Label htmlFor={`add-member-${g.id}`} className="text-xs">
                        Add member
                      </Label>
                      <select
                        id={`add-member-${g.id}`}
                        value={memberAddUserId}
                        onChange={(e) => setMemberAddUserId(e.target.value)}
                        className="w-full text-sm border rounded px-2 py-1"
                      >
                        <option value="">— pick a teammate —</option>
                        {allUsers
                          .filter((u) => !(groupMembers[g.id] ?? []).some((m) => m.id === u.id))
                          .map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.full_name ?? u.email}
                            </option>
                          ))}
                      </select>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleAddMember(g.id)}
                      disabled={!memberAddUserId || busyId === g.id}
                    >
                      <UserPlus className="h-3 w-3 mr-1" />
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
