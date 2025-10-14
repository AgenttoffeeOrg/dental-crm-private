'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Bell, Save } from 'lucide-react'
import { toast } from 'sonner'

export function NotificationsTab() {
  const [settings, setSettings] = useState({
    email_new_deal: true,
    email_deal_won: true,
    email_deal_lost: false,
    email_task_assigned: true,
    email_task_due: true,
    email_new_contact: false,
    email_campaign_sent: true,
    in_app_all: true,
    slack_enabled: false
  })

  const handleSave = () => {
    toast.success('Notification preferences saved!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries({
            email_new_deal: 'New deal created',
            email_deal_won: 'Deal won',
            email_deal_lost: 'Deal lost',
            email_task_assigned: 'Task assigned to me',
            email_task_due: 'Task due soon',
            email_new_contact: 'New contact added',
            email_campaign_sent: 'Campaign sent'
          }).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between">
              <Label>{label}</Label>
              <Switch checked={settings[key as keyof typeof settings] as boolean} onCheckedChange={(checked) => setSettings({ ...settings, [key]: checked })} />
            </div>
          ))}
        </CardContent>
      </Card>
      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Save Preferences
      </Button>
    </div>
  )
}


