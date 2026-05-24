'use client'

/**
 * Phase 2b.78 — Notifications "Policies" tab.
 *
 * Admin-only. Reworked from a 320-line stub that didn't compile.
 * Holds tenant-wide notification governance:
 *
 *   - Notification retention (days before auto-archive of read
 *     in-app notifications).
 *   - Manager-overdue threshold (hours).
 *   - Rate limit per user per hour (anti-spam).
 *
 * Persisted to `notification_policies` (existing table). Visibility
 * gated to admin / owner via membership lookup since AppUser doesn't
 * carry a role field.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Shield, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'

interface PolicyRow {
  retention_days: number | null
  manager_overdue_hours: number | null
  rate_limit_per_hour: number | null
  rate_limit_enabled: boolean | null
}

const DEFAULTS: PolicyRow = {
  retention_days: 30,
  manager_overdue_hours: 24,
  rate_limit_per_hour: 20,
  rate_limit_enabled: false,
}

export function NotificationsPoliciesTab() {
  const { appUser } = useAuth()
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [policy, setPolicy] = useState<PolicyRow>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (!appUser?.id) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      try {
        const tId = (appUser as any).active_tenant_id ?? (appUser as any).tenant_id ?? null
        setTenantId(tId)
        if (!tId) {
          setIsAdmin(false)
          return
        }

        const { data: membership } = await supabase
          .from('user_tenant_memberships')
          .select('role')
          .eq('user_id', appUser.id)
          .eq('tenant_id', tId)
          .maybeSingle()
        const role = (membership as { role?: string } | null)?.role ?? null
        const admin = role === 'admin' || role === 'owner'
        setIsAdmin(admin)
        if (!admin) return

        const { data } = await supabase
          .from('notification_policies')
          .select('retention_days, manager_overdue_hours, rate_limit_per_hour, rate_limit_enabled')
          .eq('tenant_id', tId)
          .maybeSingle()
        if (data) {
          setPolicy({
            retention_days: (data as any).retention_days ?? DEFAULTS.retention_days,
            manager_overdue_hours:
              (data as any).manager_overdue_hours ?? DEFAULTS.manager_overdue_hours,
            rate_limit_per_hour:
              (data as any).rate_limit_per_hour ?? DEFAULTS.rate_limit_per_hour,
            rate_limit_enabled:
              (data as any).rate_limit_enabled ?? DEFAULTS.rate_limit_enabled,
          })
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [appUser?.id])

  async function save() {
    if (!tenantId) return
    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('notification_policies')
        .upsert({ tenant_id: tenantId, ...policy }, { onConflict: 'tenant_id' })
      if (error) throw error
      toast.success('Policies saved.')
    } catch (err) {
      toast.error(`Couldn't save: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" /> Loading…
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-gray-500 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Admin or owner role required to view tenant-wide notification policies.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Retention
          </CardTitle>
          <CardDescription>
            How long read in-app notifications are kept before auto-archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="retention" className="text-xs">
              Retention (days)
            </Label>
            <Input
              id="retention"
              type="number"
              min={1}
              max={365}
              value={policy.retention_days ?? 30}
              onChange={(e) =>
                setPolicy((p) => ({ ...p, retention_days: parseInt(e.target.value, 10) || 30 }))
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manager-overdue threshold</CardTitle>
          <CardDescription>
            How long an urgent task must be overdue before escalating to the
            assignee's manager (via the push notifications cron).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="mgr-hours" className="text-xs">
              Threshold (hours)
            </Label>
            <Input
              id="mgr-hours"
              type="number"
              min={1}
              max={168}
              value={policy.manager_overdue_hours ?? 24}
              onChange={(e) =>
                setPolicy((p) => ({
                  ...p,
                  manager_overdue_hours: parseInt(e.target.value, 10) || 24,
                }))
              }
            />
            <p className="text-xs text-gray-500 mt-1">
              Currently the cron uses a hard-coded 24h — this setting is wired
              for a future cron refactor that respects per-tenant overrides.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rate limit</CardTitle>
          <CardDescription>
            Cap notifications per user per hour to prevent spam during runaway
            automations or webhook storms.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="rl-on" className="font-medium">
              Enable rate limit
            </Label>
            <Switch
              id="rl-on"
              checked={Boolean(policy.rate_limit_enabled)}
              onCheckedChange={(v) => setPolicy((p) => ({ ...p, rate_limit_enabled: v }))}
            />
          </div>
          {policy.rate_limit_enabled && (
            <div>
              <Label htmlFor="rl-num" className="text-xs">
                Max per user per hour
              </Label>
              <Input
                id="rl-num"
                type="number"
                min={1}
                max={500}
                value={policy.rate_limit_per_hour ?? 20}
                onChange={(e) =>
                  setPolicy((p) => ({
                    ...p,
                    rate_limit_per_hour: parseInt(e.target.value, 10) || 20,
                  }))
                }
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Button onClick={save} disabled={saving}>
        {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
        Save policies
      </Button>
    </div>
  )
}
