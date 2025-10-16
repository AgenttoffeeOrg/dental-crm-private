'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Bell, Mail, MessageSquare, Phone } from 'lucide-react'
import { toast } from 'sonner'

interface ReminderSettingsProps {
  tenantId: string
}

export function ReminderSettings({ tenantId }: ReminderSettingsProps) {
  const [settings, setSettings] = useState({
    email_enabled: true,
    email_48h: true,
    email_24h: true,
    email_2h: false,
    sms_enabled: true,
    sms_24h: true,
    sms_2h: true,
    whatsapp_enabled: false,
    whatsapp_24h: false,
    whatsapp_2h: false,
    email_template_48h: `Hi {{patient_name}},

This is a reminder that you have an appointment scheduled for {{appointment_date}} at {{appointment_time}} with {{provider_name}}.

Location: {{location_name}}
{{location_address}}

If you need to reschedule or cancel, please call us at {{practice_phone}}.

See you soon!`,
    email_template_24h: `Hi {{patient_name}},

Your appointment is tomorrow at {{appointment_time}} with {{provider_name}}.

Please arrive 10 minutes early to complete any necessary paperwork.

{{location_name}}
{{location_address}}

Call us at {{practice_phone}} if you need to make changes.`,
    sms_template_24h: `Reminder: Appointment tomorrow at {{appointment_time}} with {{provider_name}} at {{location_name}}. Call {{practice_phone}} to reschedule.`,
    sms_template_2h: `Your appointment with {{provider_name}} is in 2 hours at {{appointment_time}}. See you soon!`,
  })

  const handleSave = () => {
    // TODO: Save to database
    toast.success('Reminder settings saved!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Reminder Settings
          </CardTitle>
          <CardDescription>
            Configure automated appointment reminders sent to patients
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Reminders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold">Email Reminders</h3>
              </div>
              <Switch
                checked={settings.email_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, email_enabled: checked })
                }
              />
            </div>
            {settings.email_enabled && (
              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <Label>48 hours before</Label>
                  <Switch
                    checked={settings.email_48h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_48h: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>24 hours before</Label>
                  <Switch
                    checked={settings.email_24h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_24h: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>2 hours before</Label>
                  <Switch
                    checked={settings.email_2h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, email_2h: checked })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* SMS Reminders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <h3 className="font-semibold">SMS Reminders</h3>
              </div>
              <Switch
                checked={settings.sms_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, sms_enabled: checked })
                }
              />
            </div>
            {settings.sms_enabled && (
              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <Label>24 hours before</Label>
                  <Switch
                    checked={settings.sms_24h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sms_24h: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>2 hours before</Label>
                  <Switch
                    checked={settings.sms_2h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, sms_2h: checked })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          {/* WhatsApp Reminders */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-green-500" />
                <h3 className="font-semibold">WhatsApp Reminders</h3>
                <Badge variant="secondary">Beta</Badge>
              </div>
              <Switch
                checked={settings.whatsapp_enabled}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, whatsapp_enabled: checked })
                }
              />
            </div>
            {settings.whatsapp_enabled && (
              <div className="space-y-4 pl-7">
                <div className="flex items-center justify-between">
                  <Label>24 hours before</Label>
                  <Switch
                    checked={settings.whatsapp_24h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, whatsapp_24h: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>2 hours before</Label>
                  <Switch
                    checked={settings.whatsapp_2h}
                    onCheckedChange={(checked) =>
                      setSettings({ ...settings, whatsapp_2h: checked })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Email Templates</CardTitle>
          <CardDescription>
            Available merge tags: {'{{patient_name}}'}, {'{{appointment_date}}'}, {'{{appointment_time}}'}, {'{{provider_name}}'}, {'{{location_name}}'}, {'{{practice_phone}}'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>48 Hours Before Template</Label>
            <Textarea
              value={settings.email_template_48h}
              onChange={(e) =>
                setSettings({ ...settings, email_template_48h: e.target.value })
              }
              rows={8}
              className="font-mono text-sm"
            />
          </div>
          <div>
            <Label>24 Hours Before Template</Label>
            <Textarea
              value={settings.email_template_24h}
              onChange={(e) =>
                setSettings({ ...settings, email_template_24h: e.target.value })
              }
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {/* SMS Templates */}
      <Card>
        <CardHeader>
          <CardTitle>SMS Templates</CardTitle>
          <CardDescription>
            Keep SMS messages under 160 characters for best delivery
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>24 Hours Before Template</Label>
            <Textarea
              value={settings.sms_template_24h}
              onChange={(e) =>
                setSettings({ ...settings, sms_template_24h: e.target.value })
              }
              rows={3}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {settings.sms_template_24h.length} characters
            </p>
          </div>
          <div>
            <Label>2 Hours Before Template</Label>
            <Textarea
              value={settings.sms_template_2h}
              onChange={(e) =>
                setSettings({ ...settings, sms_template_2h: e.target.value })
              }
              rows={2}
              className="font-mono text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              {settings.sms_template_2h.length} characters
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} size="lg">
          Save Reminder Settings
        </Button>
      </div>
    </div>
  )
}

