'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MessageSquare, Save } from 'lucide-react'
import { useTenant } from '@/lib/hooks/use-tenant'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function SMSConfigTab() {
  const { tenantId } = useTenant()
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    sms_provider: 'twilio',
    sms_api_key: '',
    sms_api_secret: '',
    sms_from_number: ''
  })

  useEffect(() => {
    if (tenantId) loadConfig()
  }, [tenantId])

  const loadConfig = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) {
      setConfig({
        sms_provider: data.sms_provider || 'twilio',
        sms_api_key: data.sms_api_key || '',
        sms_api_secret: data.sms_api_secret || '',
        sms_from_number: data.sms_from_number || ''
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/sms', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          sms_provider: config.sms_provider,
          sms_api_key: config.sms_api_key,
          sms_api_secret: config.sms_api_secret,
          sms_from_number: config.sms_from_number
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('SMS settings saved!')
      await loadConfig()
    } catch (error) {
      toast.error('Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            SMS Provider
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select value={config.sms_provider} onValueChange={(value) => setConfig({ ...config, sms_provider: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="twilio">Twilio</SelectItem>
                <SelectItem value="messagebird">MessageBird</SelectItem>
                <SelectItem value="vonage">Vonage</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>API Key</Label>
            <Input type="password" value={config.sms_api_key} onChange={(e) => setConfig({ ...config, sms_api_key: e.target.value })} />
          </div>
          <div>
            <Label>API Secret</Label>
            <Input type="password" value={config.sms_api_secret} onChange={(e) => setConfig({ ...config, sms_api_secret: e.target.value })} />
          </div>
          <div>
            <Label>From Phone Number</Label>
            <Input value={config.sms_from_number} onChange={(e) => setConfig({ ...config, sms_from_number: e.target.value })} placeholder="+15551234567" />
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        Save SMS Settings
      </Button>
    </div>
  )
}

