'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MessageCircle, Save } from 'lucide-react'
import { useTenant } from '@/lib/hooks/use-tenant'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function WhatsAppConfigTab() {
  const { tenantId } = useTenant()
  const [saving, setSaving] = useState(false)
  const [config, setConfig] = useState({
    whatsapp_phone_number: '',
    whatsapp_api_key: '',
    whatsapp_api_secret: ''
  })

  useEffect(() => {
    if (tenantId) loadConfig()
  }, [tenantId])

  const loadConfig = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) {
      setConfig({
        whatsapp_phone_number: data.whatsapp_phone_number || '',
        whatsapp_api_key: data.whatsapp_api_key || '',
        whatsapp_api_secret: data.whatsapp_api_secret || ''
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/whatsapp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          whatsapp_phone_number: config.whatsapp_phone_number,
          whatsapp_api_key: config.whatsapp_api_key,
          whatsapp_api_secret: config.whatsapp_api_secret
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('WhatsApp settings saved!')
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
            <MessageCircle className="h-5 w-5" />
            WhatsApp Business API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Phone Number (with country code)</Label>
            <Input value={config.whatsapp_phone_number} onChange={(e) => setConfig({ ...config, whatsapp_phone_number: e.target.value })} placeholder="+15551234567" />
          </div>
          <div>
            <Label>API Key</Label>
            <Input type="password" value={config.whatsapp_api_key} onChange={(e) => setConfig({ ...config, whatsapp_api_key: e.target.value })} />
          </div>
          <div>
            <Label>API Secret</Label>
            <Input type="password" value={config.whatsapp_api_secret} onChange={(e) => setConfig({ ...config, whatsapp_api_secret: e.target.value })} />
          </div>
        </CardContent>
      </Card>
      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        Save WhatsApp Settings
      </Button>
    </div>
  )
}

