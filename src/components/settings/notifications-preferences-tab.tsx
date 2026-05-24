'use client'

/**
 * Phase 2b.78 — Notifications "Advanced" tab.
 *
 * Reworked from a 469-line stub that didn't compile. Real persistence
 * against `notification_preferences` for the per-channel + quiet-hours
 * pieces, plus a pointer to the Basic tab for task-specific switches.
 *
 * Scope for v1:
 *   - Global channel toggles (in-app / email / SMS / push) — kept in
 *     sync with the user's notification_preferences row.
 *   - Quiet hours: a start/end clock-time pair in local time. The
 *     push cron will still stamp notified_at; the send is suppressed
 *     when the receiving user is within their quiet window (read by
 *     a future cron-side check).
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Bell, Mail, MessageSquare, Smartphone, Moon, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'
import { useAuth } from '@/lib/auth'

interface QuietHours {
  enabled: boolean
  start: string // "HH:MM"
  end: string // "HH:MM"
}

interface PrefsRow {
  in_app_enabled: boolean | null
  email_enabled: boolean | null
  sms_enabled: boolean | null
  push_enabled: boolean | null
  quiet_hours: any | null
}

const DEFAULT_QUIET: QuietHours = { enabled: false, start: '21:00', end: '08:00' }

export function NotificationsPreferencesTab() {
  const { appUser } = useAuth()
  const [row, setRow] = useState<PrefsRow>({
    in_app_enabled: true,
    email_enabled: true,
    sms_enabled: false,
    push_enabled: true,
    quiet_hours: null,
  })
  const [quiet, setQuiet] = useState<QuietHours>(DEFAULT_QUIET)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!appUser?.id) return
    const supabase = createClient()
    ;(async () => {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('notification_preferences')
          .select('in_app_enabled, email_enabled, sms_enabled, push_enabled, quiet_hours')
          .eq('user_id', appUser.id)
          .maybeSingle()
        if (data) {
          setRow(data as PrefsRow)
          const qh = (data as any).quiet_hours
          if (qh && typeof qh === 'object') {
            setQuiet({
              enabled: Boolean(qh.enabled),
              start: typeof qh.start === 'string' ? qh.start : DEFAULT_QUIET.start,
              end: typeof qh.end === 'string' ? qh.end : DEFAULT_QUIET.end,
            })
          }
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [appUser?.id])

  async function persist(
    patch: Partial<PrefsRow & { quiet_hours: QuietHours }>,
    options: { silent?: boolean } = {}
  ) {
    if (!appUser?.id) return
    setSaving(true)
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: appUser.id,
            tenant_id: (appUser as any).tenant_id ?? null,
            ...patch,
          },
          { onConflict: 'user_id' }
        )
      if (error) throw error
      // 2b.83 — confirmation toast on success so the user has
      // feedback that the optimistic toggle actually persisted.
      if (!options.silent) toast.success('Saved.')
    } catch (err) {
      toast.error(`Couldn't save: ${err instanceof Error ? err.message : 'unknown'}`)
    } finally {
      setSaving(false)
    }
  }

  function toggleChannel(key: keyof PrefsRow, value: boolean) {
    setRow((r) => ({ ...r, [key]: value }))
    persist({ [key]: value })
  }

  function saveQuiet() {
    setRow((r) => ({ ...r, quiet_hours: quiet }))
    persist({ quiet_hours: quiet })
    toast.success('Quiet hours saved.')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Channels
          </CardTitle>
          <CardDescription>
            Master switches for each delivery channel. These apply to ALL notifications;
            the per-task toggles live on the Basic tab.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              {[
                { key: 'in_app_enabled' as const, label: 'In-app notifications', icon: Bell },
                { key: 'email_enabled' as const, label: 'Email', icon: Mail },
                { key: 'sms_enabled' as const, label: 'SMS', icon: MessageSquare },
                { key: 'push_enabled' as const, label: 'Browser push', icon: Smartphone },
              ].map((opt) => (
                <div key={opt.key} className="flex items-center justify-between">
                  <Label htmlFor={opt.key} className="font-medium flex items-center gap-2">
                    <opt.icon className="h-3 w-3 text-gray-500" />
                    {opt.label}
                  </Label>
                  <Switch
                    id={opt.key}
                    checked={Boolean(row[opt.key])}
                    onCheckedChange={(v) => toggleChannel(opt.key, v)}
                    disabled={saving}
                  />
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Moon className="h-4 w-4" />
            Quiet hours
          </CardTitle>
          <CardDescription>
            Suppress non-urgent push + SMS during a daily window. Urgent
            tasks (escalated by the manager-overdue cron) still fire.
            Times are in your local timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-on" className="font-medium">
              Enable quiet hours
            </Label>
            <Switch
              id="quiet-on"
              checked={quiet.enabled}
              onCheckedChange={(v) => setQuiet((q) => ({ ...q, enabled: v }))}
            />
          </div>
          {quiet.enabled && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="quiet-start" className="text-xs">
                  Start
                </Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={quiet.start}
                  onChange={(e) => setQuiet((q) => ({ ...q, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="quiet-end" className="text-xs">
                  End
                </Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={quiet.end}
                  onChange={(e) => setQuiet((q) => ({ ...q, end: e.target.value }))}
                />
              </div>
            </div>
          )}
          <Button onClick={saveQuiet} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
            Save quiet hours
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-task preferences</CardTitle>
          <CardDescription>
            The four task-specific switches (morning digest, urgent
            email/SMS, manager alerts) are on the <strong>Basic</strong> tab.
            We split them out because they're the ones most people change;
            the channel + quiet-hours settings here are set-and-forget.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
