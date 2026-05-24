'use client'

/**
 * Phase 2b.77 — Default-assignee policy editor.
 *
 * Mounted inside Practice Groups tab (Settings → Team → Practice
 * Groups). Lets an admin pick where auto-created tasks land when
 * the originating contact has no assigned owner.
 *
 *   contact_owner   — default. Use the contact's assigned_to_user_id.
 *                      Falls through to fallback if no owner.
 *   group           — always assign to a specific practice group.
 *   everyone        — shared inbox; every team member sees it.
 *   fallback_user   — always assign to one specific user.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

type Mode = 'contact_owner' | 'group' | 'everyone' | 'fallback_user'

interface Policy {
  mode: Mode
  group_id?: string | null
  fallback_user_id?: string | null
}

interface Group {
  id: string
  name: string
}
interface AppUser {
  id: string
  full_name: string | null
  email: string | null
}

const DEFAULT: Policy = { mode: 'contact_owner' }

export function DefaultAssigneePolicySection({
  groups,
  users,
}: {
  groups: Group[]
  users: AppUser[]
}) {
  const [policy, setPolicy] = useState<Policy>(DEFAULT)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/tenant-routing-settings/default-assignee-policy', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null
        const body = await r.json()
        return body?.default_assignee_policy as Policy | null
      })
      .then((loadedPolicy) => {
        if (cancelled) return
        if (loadedPolicy) setPolicy(loadedPolicy)
        setLoaded(true)
      })
      .catch((err) => {
        console.warn('[default-assignee-policy] load failed', err)
        if (!cancelled) {
          setLoaded(true)
          toast.error("Couldn't load current policy — showing defaults until you save.")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  async function save() {
    setSaving(true)
    try {
      const payload: Policy = { mode: policy.mode }
      if (policy.mode === 'group') payload.group_id = policy.group_id ?? null
      if (policy.mode === 'fallback_user') payload.fallback_user_id = policy.fallback_user_id ?? null

      const res = await fetch('/api/tenant-routing-settings/default-assignee-policy', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ default_assignee_policy: payload }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
      toast.success('Default-assignee policy saved.')
    } catch (err) {
      toast.error(`Couldn't save: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Default assignee</CardTitle>
        <CardDescription>
          When a task is auto-created (from an AI suggestion or a playbook),
          who should it land with? "Contact owner" is the smart default — the
          system uses the contact's owner when there is one and falls back
          to the picked option below otherwise.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <div className="text-sm text-gray-500 flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label className="font-medium">Mode</Label>
              <div className="space-y-2">
                {(
                  [
                    {
                      key: 'contact_owner',
                      label: 'The contact\'s owner (recommended)',
                      hint: 'Whoever owns the contact picks it up.',
                    },
                    {
                      key: 'group',
                      label: 'A specific practice group',
                      hint: 'Lands in the shared queue for that group.',
                    },
                    {
                      key: 'everyone',
                      label: 'Everyone (shared inbox)',
                      hint: 'Anyone on the team can pick it up.',
                    },
                    {
                      key: 'fallback_user',
                      label: 'A specific person',
                      hint: 'Always lands with one person.',
                    },
                  ] as const
                ).map((opt) => (
                  <label key={opt.key} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="default-assignee-mode"
                      value={opt.key}
                      checked={policy.mode === opt.key}
                      onChange={() => setPolicy({ mode: opt.key })}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs text-gray-500">{opt.hint}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {policy.mode === 'group' && (
              <div>
                <Label htmlFor="dap-group" className="text-xs">
                  Practice group
                </Label>
                <select
                  id="dap-group"
                  value={policy.group_id ?? ''}
                  onChange={(e) => setPolicy((p) => ({ ...p, group_id: e.target.value || null }))}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="">— pick a group —</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                {groups.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    No practice groups yet — create one above first.
                  </p>
                )}
              </div>
            )}

            {policy.mode === 'fallback_user' && (
              <div>
                <Label htmlFor="dap-user" className="text-xs">
                  Person
                </Label>
                <select
                  id="dap-user"
                  value={policy.fallback_user_id ?? ''}
                  onChange={(e) => setPolicy((p) => ({ ...p, fallback_user_id: e.target.value || null }))}
                  className="w-full text-sm border rounded px-2 py-1"
                >
                  <option value="">— pick a teammate —</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name ?? u.email}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <Button
              onClick={save}
              disabled={
                saving ||
                (policy.mode === 'group' && !policy.group_id) ||
                (policy.mode === 'fallback_user' && !policy.fallback_user_id)
              }
            >
              {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
              Save
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
