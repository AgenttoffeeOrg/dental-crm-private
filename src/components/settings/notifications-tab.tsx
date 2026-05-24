'use client'

/**
 * Phase 2b.70 — Notifications "Basic" tab.
 *
 * Reworked from the toast stub. Real persistence against
 * app_users notification-preferences columns + browser-push
 * enable/disable.
 *
 * Sections:
 *
 *   1. Browser notifications (Web Push)
 *      - Grant permission button + subscribe / unsubscribe.
 *      - Status badge: Off / Granted / Blocked / Unsupported.
 *
 *   2. Email
 *      - Morning digest of today's tasks (default ON).
 *      - Urgent task email pings (default OFF — adds to push, not
 *        replaces).
 *
 *   3. SMS
 *      - Urgent task SMS pings (default OFF — costs ~£0.04 per
 *        send).
 *
 *   4. Manager view
 *      - Overdue task alerts for direct reports (default ON).
 *
 * All toggles persist to /api/me/notification-preferences.
 */

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, BellOff, AlertCircle, Mail, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  isPushSupported,
  pushPermissionStatus,
  requestPushPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/notifications/push-client'

interface Prefs {
  task_morning_digest_enabled: boolean
  urgent_task_email_enabled: boolean
  urgent_task_sms_enabled: boolean
  manager_overdue_alerts_enabled: boolean
}

const DEFAULT_PREFS: Prefs = {
  task_morning_digest_enabled: true,
  urgent_task_email_enabled: false,
  urgent_task_sms_enabled: false,
  manager_overdue_alerts_enabled: true,
}

type PushUiState =
  | { kind: 'loading' }
  | { kind: 'unsupported' }
  | { kind: 'default'; subscribed: boolean }
  | { kind: 'granted'; subscribed: boolean }
  | { kind: 'denied' }

export function NotificationsTab() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [prefsLoaded, setPrefsLoaded] = useState(false)
  const [savingKey, setSavingKey] = useState<keyof Prefs | null>(null)
  const [push, setPush] = useState<PushUiState>({ kind: 'loading' })
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/me/notification-preferences', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) return null
        const body = await r.json()
        return body?.prefs as Prefs | null
      })
      .then((loaded) => {
        if (cancelled) return
        if (loaded) setPrefs({ ...DEFAULT_PREFS, ...loaded })
        setPrefsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setPrefsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      if (!isPushSupported()) {
        if (!cancelled) setPush({ kind: 'unsupported' })
        return
      }
      const status = pushPermissionStatus()
      if (status === 'denied') {
        if (!cancelled) setPush({ kind: 'denied' })
        return
      }

      let subscribed = false
      try {
        const res = await fetch('/api/push-subscriptions', { credentials: 'include' })
        if (res.ok) {
          const body = await res.json()
          subscribed = Array.isArray(body.subscriptions) && body.subscriptions.length > 0
        }
      } catch {
        /* swallow */
      }

      if (cancelled) return
      if (status === 'granted') setPush({ kind: 'granted', subscribed })
      else setPush({ kind: 'default', subscribed: false })
    }
    init()
    return () => {
      cancelled = true
    }
  }, [])

  async function saveOne(key: keyof Prefs, value: boolean) {
    setSavingKey(key)
    setPrefs((prev) => ({ ...prev, [key]: value }))
    try {
      const res = await fetch('/api/me/notification-preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
        credentials: 'include',
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? `http_${res.status}`)
      }
    } catch (err) {
      setPrefs((prev) => ({ ...prev, [key]: !value }))
      toast.error(`Couldn't save preference: ${err instanceof Error ? err.message : 'unknown error'}`)
    } finally {
      setSavingKey(null)
    }
  }

  async function handleEnablePush() {
    setPushBusy(true)
    try {
      const status = await requestPushPermission()
      if (status === 'unsupported') {
        setPush({ kind: 'unsupported' })
        return
      }
      if (status === 'denied') {
        setPush({ kind: 'denied' })
        toast.error("Browser notifications are blocked. Enable them in your browser's site settings.")
        return
      }
      if (status !== 'granted') {
        setPush({ kind: 'default', subscribed: false })
        return
      }

      const sub = await subscribeToPush()
      if (sub.success) {
        setPush({ kind: 'granted', subscribed: true })
        toast.success("Browser notifications enabled — you'll get task pings on this device.")
      } else {
        toast.error(`Couldn't enable browser notifications: ${sub.error}`)
        setPush({ kind: 'granted', subscribed: false })
      }
    } finally {
      setPushBusy(false)
    }
  }

  async function handleDisablePush() {
    setPushBusy(true)
    try {
      const result = await unsubscribeFromPush()
      if (result.success) {
        setPush({ kind: 'granted', subscribed: false })
        toast.success('Browser notifications turned off on this device.')
      } else {
        toast.error(`Couldn't turn off browser notifications: ${result.error}`)
      }
    } finally {
      setPushBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Browser notifications
          </CardTitle>
          <CardDescription>
            Get a notification on this device the moment a task is due or goes overdue.
            Each device needs to be enabled separately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {push.kind === 'loading' && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Checking…
            </div>
          )}
          {push.kind === 'unsupported' && (
            <div className="text-sm text-gray-500 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              This browser doesn't support push notifications.
              Try a Chromium-based browser on desktop or Safari 16+ on iPad.
            </div>
          )}
          {push.kind === 'denied' && (
            <div className="text-sm text-amber-700 flex items-start gap-2">
              <BellOff className="h-4 w-4 mt-0.5" />
              <div>
                Browser notifications are blocked for this site. To turn them on,
                click the padlock in your address bar → Notifications → Allow,
                then come back and refresh this page.
              </div>
            </div>
          )}
          {push.kind === 'default' && (
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600">
                Not enabled. Click to allow notifications.
              </div>
              <Button onClick={handleEnablePush} disabled={pushBusy} size="sm">
                {pushBusy && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                Enable on this device
              </Button>
            </div>
          )}
          {push.kind === 'granted' && (
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm flex items-center gap-2">
                {push.subscribed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Enabled on this device.</span>
                  </>
                ) : (
                  <>
                    <BellOff className="h-4 w-4 text-gray-500" />
                    <span>Permission granted — but not subscribed yet on this device.</span>
                  </>
                )}
              </div>
              {push.subscribed ? (
                <Button onClick={handleDisablePush} disabled={pushBusy} size="sm" variant="outline">
                  {pushBusy && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Turn off on this device
                </Button>
              ) : (
                <Button onClick={handleEnablePush} disabled={pushBusy} size="sm">
                  {pushBusy && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                  Subscribe this device
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="morning-digest" className="font-medium">
                Morning task digest
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Sent at 8am with a one-glance summary of today's tasks.
              </p>
            </div>
            <Switch
              id="morning-digest"
              checked={prefs.task_morning_digest_enabled}
              disabled={!prefsLoaded || savingKey === 'task_morning_digest_enabled'}
              onCheckedChange={(checked) =>
                saveOne('task_morning_digest_enabled', checked)
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="urgent-email" className="font-medium">
                Urgent task email
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Also email me when a high or urgent priority task is created.
              </p>
            </div>
            <Switch
              id="urgent-email"
              checked={prefs.urgent_task_email_enabled}
              disabled={!prefsLoaded || savingKey === 'urgent_task_email_enabled'}
              onCheckedChange={(checked) =>
                saveOne('urgent_task_email_enabled', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            SMS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="urgent-sms" className="font-medium">
                Urgent task SMS
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Text me when an urgent task is created. Each SMS costs the practice
                ~£0.04 — only enable if you really need a hard ping.
              </p>
            </div>
            <Switch
              id="urgent-sms"
              checked={prefs.urgent_task_sms_enabled}
              disabled={!prefsLoaded || savingKey === 'urgent_task_sms_enabled'}
              onCheckedChange={(checked) =>
                saveOne('urgent_task_sms_enabled', checked)
              }
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Manager alerts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="manager-overdue" className="font-medium">
                Overdue task alerts for my reports
              </Label>
              <p className="text-xs text-gray-500 mt-0.5">
                Notify me when an urgent task assigned to a direct report stays
                overdue for 24+ hours. Only relevant if you manage a team.
              </p>
            </div>
            <Switch
              id="manager-overdue"
              checked={prefs.manager_overdue_alerts_enabled}
              disabled={!prefsLoaded || savingKey === 'manager_overdue_alerts_enabled'}
              onCheckedChange={(checked) =>
                saveOne('manager_overdue_alerts_enabled', checked)
              }
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
