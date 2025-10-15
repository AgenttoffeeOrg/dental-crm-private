'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { MessageSquare } from 'lucide-react'

export function SMSSettingsPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>SMS & WhatsApp Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Twilio Account SID</Label>
          <Input placeholder="AC..." type="password" />
        </div>
        <div>
          <Label>Twilio Auth Token</Label>
          <Input placeholder="..." type="password" />
        </div>
        <div>
          <Label>Twilio Phone Number</Label>
          <Input placeholder="+44..." />
        </div>
        <Button>Save Settings</Button>
      </CardContent>
    </Card>
  )
}

