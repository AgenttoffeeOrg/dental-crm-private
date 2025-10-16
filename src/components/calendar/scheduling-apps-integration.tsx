'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Calendar,
  ExternalLink,
  Link2,
  CheckCircle,
  AlertCircle,
  Sparkles
} from 'lucide-react'

interface SchedulingAppsIntegrationProps {
  tenantId: string
}

const SCHEDULING_APPS = [
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Most popular scheduling tool with team features',
    icon: '📅',
    setupUrl: 'https://calendly.com',
    webhookSupport: true,
    features: ['Team scheduling', 'Payment collection', 'Email reminders', 'Integrations'],
  },
  {
    id: 'cal_com',
    name: 'Cal.com',
    description: 'Open-source Calendly alternative with white-labeling',
    icon: '🗓️',
    setupUrl: 'https://cal.com',
    webhookSupport: true,
    features: ['Self-hosted', 'White-label', 'Team scheduling', 'Video integrations'],
  },
  {
    id: 'acuity',
    name: 'Acuity Scheduling',
    description: 'Advanced scheduling with package bookings and intake forms',
    icon: '📆',
    setupUrl: 'https://acuityscheduling.com',
    webhookSupport: true,
    features: ['Package bookings', 'Intake forms', 'Payment processing', 'Staff management'],
  },
  {
    id: 'squarespace',
    name: 'Squarespace Scheduling',
    description: 'Integrated with Squarespace websites',
    icon: '⬛',
    setupUrl: 'https://www.squarespace.com/scheduling',
    webhookSupport: true,
    features: ['Website integration', 'Payment processing', 'Email reminders'],
  },
  {
    id: 'setmore',
    name: 'Setmore',
    description: 'Free scheduling tool with booking page',
    icon: '🔷',
    setupUrl: 'https://www.setmore.com',
    webhookSupport: false,
    features: ['Free plan', 'Booking page', 'SMS reminders', 'Staff scheduling'],
  },
]

export function SchedulingAppsIntegration({ tenantId }: SchedulingAppsIntegrationProps) {
  const supabase = createClient()
  const [settings, setSettings] = useState<any>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    // TODO: Load from database
    // For now, use localStorage
    const saved = localStorage.getItem('scheduling_apps_settings')
    if (saved) {
      setSettings(JSON.parse(saved))
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      // TODO: Save to database
      localStorage.setItem('scheduling_apps_settings', JSON.stringify(settings))
      toast.success('Scheduling app settings saved!')
    } catch (error) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateAppSetting = (appId: string, field: string, value: any) => {
    setSettings({
      ...settings,
      [appId]: {
        ...settings[appId],
        [field]: value
      }
    })
  }

  const isAppConfigured = (appId: string) => {
    return settings[appId]?.enabled && settings[appId]?.booking_url
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Scheduling App Integrations
          </CardTitle>
          <CardDescription>
            Connect external scheduling tools for patient appointment booking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">How It Works</p>
                <p className="text-sm text-blue-800">
                  When patients click "Book Appointment" in your CRM, they'll be redirected to your scheduling app.
                  You can configure webhooks to automatically create contacts and deals when appointments are booked.
                </p>
              </div>
            </div>
          </div>

          {SCHEDULING_APPS.map((app) => {
            const isConfigured = isAppConfigured(app.id)
            const appSettings = settings[app.id] || {}

            return (
              <Card key={app.id} className={isConfigured ? 'border-green-200' : ''}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-3xl">{app.icon}</div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-lg">{app.name}</h3>
                            {isConfigured ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Connected
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not configured</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{app.description}</p>
                          <div className="flex flex-wrap gap-1">
                            {app.features.map((feature, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                      <Switch
                        checked={appSettings.enabled || false}
                        onCheckedChange={(checked) => updateAppSetting(app.id, 'enabled', checked)}
                      />
                    </div>

                    {/* Configuration */}
                    {appSettings.enabled && (
                      <div className="space-y-3 pt-3 border-t">
                        <div>
                          <Label className="text-sm">Booking Page URL *</Label>
                          <div className="flex gap-2 mt-1">
                            <Input
                              placeholder={`https://${app.id}.com/your-username`}
                              value={appSettings.booking_url || ''}
                              onChange={(e) => updateAppSetting(app.id, 'booking_url', e.target.value)}
                            />
                            {appSettings.booking_url && (
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <a href={appSettings.booking_url} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Patients will be redirected here when they click "Book Appointment"
                          </p>
                        </div>

                        {app.webhookSupport && (
                          <div>
                            <Label className="text-sm">Webhook URL (Optional)</Label>
                            <div className="flex gap-2 mt-1">
                              <Input
                                value={`${window.location.origin}/api/webhooks/${app.id}`}
                                readOnly
                                className="bg-gray-50"
                              />
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/${app.id}`)
                                  toast.success('Webhook URL copied!')
                                }}
                              >
                                Copy
                              </Button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Configure this webhook in {app.name} to auto-create contacts/deals when appointments are booked
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={appSettings.auto_create_contact || false}
                            onCheckedChange={(checked) => updateAppSetting(app.id, 'auto_create_contact', checked)}
                          />
                          <Label className="text-sm">Auto-create contact from bookings</Label>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={appSettings.auto_create_deal || false}
                            onCheckedChange={(checked) => updateAppSetting(app.id, 'auto_create_deal', checked)}
                          />
                          <Label className="text-sm">Auto-create deal from bookings</Label>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          asChild
                        >
                          <a href={app.setupUrl} target="_blank" rel="noopener noreferrer">
                            Setup Guide
                            <ExternalLink className="h-3 w-3 ml-2" />
                          </a>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}

          {/* Save Button */}
          <div className="flex justify-end pt-4">
            <Button onClick={saveSettings} disabled={saving} size="lg">
              {saving ? 'Saving...' : 'Save Scheduling Settings'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Booking Link Display */}
      {Object.entries(settings).some(([_, s]: any) => s?.enabled && s?.booking_url) && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-semibold text-green-900 mb-2">Active Booking Links</p>
                {Object.entries(settings)
                  .filter(([_, s]: any) => s?.enabled && s?.booking_url)
                  .map(([appId, s]: any) => {
                    const app = SCHEDULING_APPS.find(a => a.id === appId)
                    return (
                      <div key={appId} className="flex items-center justify-between py-2">
                        <span className="text-sm text-green-800">
                          {app?.icon} {app?.name}
                        </span>
                        <Button variant="link" size="sm" asChild>
                          <a href={s.booking_url} target="_blank" rel="noopener noreferrer" className="text-green-700">
                            {s.booking_url}
                            <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </Button>
                      </div>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

