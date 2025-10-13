'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Calendar, Plus } from 'lucide-react'
import { useState } from 'react'

export function CalendarIntegrationTab() {
  const [calendars, setCalendars] = useState([
    { id: 1, name: 'Google Calendar', email: 'practice@gmail.com', connected: true },
    { id: 2, name: 'Outlook Calendar', email: 'practice@outlook.com', connected: false }
  ])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Connected Calendars
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {calendars.map((cal) => (
            <div key={cal.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-semibold">{cal.name}</p>
                <p className="text-sm text-gray-600">{cal.email}</p>
              </div>
              <Switch checked={cal.connected} />
            </div>
          ))}
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Connect New Calendar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sync Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Two-way sync</Label>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <Label>Sync past events</Label>
            <Switch />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

