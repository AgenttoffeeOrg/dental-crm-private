'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, Plus, X } from 'lucide-react'
import { toast } from 'sonner'

interface ReminderRule {
  id: string
  type: 'before' | 'at' | 'recurring'
  value: number
  unit: 'minutes' | 'hours' | 'days'
  enabled: boolean
}

export function TaskRemindersConfig({ taskId }: { taskId?: string }) {
  const [reminders, setReminders] = useState<ReminderRule[]>([
    { id: '1', type: 'before', value: 15, unit: 'minutes', enabled: true },
    { id: '2', type: 'before', value: 1, unit: 'hours', enabled: false },
    { id: '3', type: 'before', value: 1, unit: 'days', enabled: false }
  ])

  const [emailEnabled, setEmailEnabled] = useState(true)
  const [pushEnabled, setPushEnabled] = useState(true)
  const [slackEnabled, setSlackEnabled] = useState(false)

  const addReminder = () => {
    const newReminder: ReminderRule = {
      id: Date.now().toString(),
      type: 'before',
      value: 30,
      unit: 'minutes',
      enabled: true
    }
    setReminders([...reminders, newReminder])
    toast.success('Reminder added')
  }

  const removeReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id))
    toast.success('Reminder removed')
  }

  const toggleReminder = (id: string) => {
    setReminders(reminders.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    ))
  }

  const updateReminder = (id: string, updates: Partial<ReminderRule>) => {
    setReminders(reminders.map(r =>
      r.id === id ? { ...r, ...updates } : r
    ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Task Reminders</h3>
        <p className="text-sm text-gray-500 mt-1">
          Get notified before tasks are due
        </p>
      </div>

      {/* Notification Channels */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Choose how you want to be reminded</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Email Notifications</p>
              <p className="text-xs text-gray-500">Send reminders to your email</p>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Browser Push Notifications</p>
              <p className="text-xs text-gray-500">Desktop notifications when app is open</p>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Slack Notifications</p>
              <p className="text-xs text-gray-500">Send to your Slack workspace</p>
            </div>
            <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Reminder Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reminder Rules</CardTitle>
              <CardDescription>Set when to be reminded about tasks</CardDescription>
            </div>
            <Button size="sm" onClick={addReminder}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Reminder
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {reminders.map((reminder) => (
            <div
              key={reminder.id}
              className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg"
            >
              <Switch
                checked={reminder.enabled}
                onCheckedChange={() => toggleReminder(reminder.id)}
              />

              <div className="flex-1 flex items-center gap-2">
                <Select
                  value={reminder.type}
                  onValueChange={(val: 'before' | 'at' | 'recurring') => updateReminder(reminder.id, { type: val })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="before">Before</SelectItem>
                    <SelectItem value="at">At due time</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>

                {reminder.type === 'before' && (
                  <>
                    <input
                      type="number"
                      value={reminder.value}
                      onChange={(e) => updateReminder(reminder.id, { value: parseInt(e.target.value) })}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-md text-sm"
                      min="1"
                    />

                    <Select
                      value={reminder.unit}
                      onValueChange={(val: 'minutes' | 'hours' | 'days') => updateReminder(reminder.id, { unit: val })}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>

                    <span className="text-sm text-gray-600">before due</span>
                  </>
                )}

                {reminder.type === 'at' && (
                  <span className="text-sm text-gray-600">Remind at due time</span>
                )}

                {reminder.type === 'recurring' && (
                  <span className="text-sm text-gray-600">Daily reminder until complete</span>
                )}
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => removeReminder(reminder.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {reminders.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">
              No reminders set
            </p>
          )}
        </CardContent>
      </Card>

      {/* Smart Reminders */}
      <Card>
        <CardHeader>
          <CardTitle>Smart Reminders</CardTitle>
          <CardDescription>AI-powered intelligent reminders</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Remind for high-value deals</p>
              <p className="text-xs text-gray-500">Extra reminders for deals &gt;£5,000</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Remind for overdue tasks</p>
              <p className="text-xs text-gray-500">Daily reminders for overdue tasks</p>
            </div>
            <Switch defaultChecked />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Remind for tasks without activity</p>
              <p className="text-xs text-gray-500">Nudge if no activity on deal for 3+ days</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Preview
        </h4>
        <div className="space-y-2 text-xs text-gray-600">
          {reminders.filter(r => r.enabled).map(r => (
            <div key={r.id}>
              • You'll be reminded <strong>{r.value} {r.unit}</strong> before task is due
            </div>
          ))}
          {emailEnabled && <div>• Reminders sent to your email</div>}
          {pushEnabled && <div>• Browser notifications enabled</div>}
          {slackEnabled && <div>• Slack notifications enabled</div>}
        </div>
      </div>
    </div>
  )
}

