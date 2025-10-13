'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Shield, Save } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

export function SecuritySettingsTab() {
  const [settings, setSettings] = useState({
    require_2fa: false,
    session_timeout_minutes: 60,
    password_min_length: 8,
    password_require_special: true,
    ip_whitelist_enabled: false
  })

  const handleSave = () => {
    toast.success('Security settings saved!')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication & Security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Two-Factor Authentication</Label>
              <p className="text-sm text-gray-500">All users must enable 2FA</p>
            </div>
            <Switch checked={settings.require_2fa} onCheckedChange={(checked) => setSettings({ ...settings, require_2fa: checked })} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>IP Whitelist</Label>
              <p className="text-sm text-gray-500">Only allow access from specific IPs</p>
            </div>
            <Switch checked={settings.ip_whitelist_enabled} onCheckedChange={(checked) => setSettings({ ...settings, ip_whitelist_enabled: checked })} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave}>
        <Save className="h-4 w-4 mr-2" />
        Save Security Settings
      </Button>
    </div>
  )
}

