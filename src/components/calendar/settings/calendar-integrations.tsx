'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Calendar, Link2, CheckCircle, XCircle, RefreshCw, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CalendarIntegrationsProps {
  tenantId: string
}

export function CalendarIntegrations({ tenantId }: CalendarIntegrationsProps) {
  const [integrations, setIntegrations] = useState([
    {
      id: 'google',
      name: 'Google Calendar',
      icon: '🔵',
      connected: false,
      lastSync: null,
      twoWaySync: true,
      status: 'disconnected',
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      icon: '🔷',
      connected: false,
      lastSync: null,
      twoWaySync: true,
      status: 'disconnected',
    },
    {
      id: 'zoom',
      name: 'Zoom',
      icon: '🎥',
      connected: false,
      lastSync: null,
      twoWaySync: false,
      status: 'disconnected',
      description: 'Auto-generate meeting links for appointments',
    },
    {
      id: 'teams',
      name: 'Microsoft Teams',
      icon: '💬',
      connected: false,
      lastSync: null,
      twoWaySync: false,
      status: 'disconnected',
      description: 'Auto-generate Teams meeting links',
    },
  ])

  const handleConnect = (integrationId: string) => {
    // TODO: Implement OAuth flow
    toast.success(`Connecting to ${integrations.find(i => i.id === integrationId)?.name}...`)
  }

  const handleDisconnect = (integrationId: string) => {
    if (confirm('Disconnect this integration? Sync will stop but existing appointments remain.')) {
      setIntegrations(integrations.map(i =>
        i.id === integrationId ? { ...i, connected: false, status: 'disconnected' } : i
      ))
      toast.success('Integration disconnected')
    }
  }

  const handleSync = (integrationId: string) => {
    toast.success('Syncing calendar...')
    // TODO: Trigger sync
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
      case 'syncing':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            Disconnected
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Calendar Integrations
          </CardTitle>
          <CardDescription>
            Connect external calendars and meeting tools
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {integrations.map((integration) => (
            <Card key={integration.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{integration.icon}</div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{integration.name}</h3>
                        {getStatusBadge(integration.status)}
                        {integration.twoWaySync && integration.connected && (
                          <Badge variant="outline" className="text-xs">
                            Two-way sync
                          </Badge>
                        )}
                      </div>
                      {integration.description && (
                        <p className="text-sm text-gray-600">{integration.description}</p>
                      )}
                      {integration.lastSync && (
                        <p className="text-xs text-gray-500 mt-1">
                          Last synced: {new Date(integration.lastSync).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {integration.connected ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(integration.id)}
                        >
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Sync Now
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration.id)}
                        >
                          Disconnect
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleConnect(integration.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Connect
                      </Button>
                    )}
                  </div>
                </div>

                {integration.connected && integration.twoWaySync && (
                  <div className="mt-4 pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Push to {integration.name}</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Pull from {integration.name}</Label>
                      <Switch defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Sync past events</Label>
                      <Switch />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
          <CardDescription>
            Configure how appointments sync with external calendars
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Conflict Resolution</Label>
              <p className="text-sm text-gray-600">What happens when there's a conflict?</p>
            </div>
            <select className="border rounded px-3 py-2">
              <option>CRM takes priority</option>
              <option>External calendar takes priority</option>
              <option>Most recent change wins</option>
              <option>Ask me every time</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Sync Frequency</Label>
              <p className="text-sm text-gray-600">How often to check for updates</p>
            </div>
            <select className="border rounded px-3 py-2">
              <option>Real-time (webhooks)</option>
              <option>Every 5 minutes</option>
              <option>Every 15 minutes</option>
              <option>Every hour</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Include in External Calendar</Label>
              <p className="text-sm text-gray-600">What information to sync</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <span className="text-sm">Patient name</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch defaultChecked />
                <span className="text-sm">Appointment type</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch />
                <span className="text-sm">Patient notes</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-yellow-900 mb-1">Privacy Notice</p>
              <p className="text-sm text-yellow-800">
                Patient information synced to external calendars may be subject to those services' privacy policies.
                Ensure compliance with HIPAA and local regulations before enabling external sync.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

