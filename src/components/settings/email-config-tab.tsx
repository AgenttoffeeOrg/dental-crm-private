'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Mail, Save, TestTube } from 'lucide-react'
import { useTenant } from '@/lib/hooks/use-tenant'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function EmailConfigTab() {
  const { tenantId } = useTenant()
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [config, setConfig] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    default_from_name: '',
    default_from_address: '',
    default_reply_to: '',
    enable_tracking: true
  })

  useEffect(() => {
    if (tenantId) loadConfig()
  }, [tenantId])

  const loadConfig = async () => {
    const supabase = createClient()
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single()
    if (data) {
      setConfig({
        smtp_host: data.smtp_host || '',
        smtp_port: data.smtp_port || 587,
        smtp_username: data.smtp_username || '',
        smtp_password: data.smtp_password || '',
        smtp_encryption: data.smtp_encryption || 'tls',
        default_from_name: data.default_email_from_name || '',
        default_from_address: data.default_email_from_address || '',
        default_reply_to: data.default_email_reply_to || '',
        enable_tracking: true
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/email', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          smtp_host: config.smtp_host,
          smtp_port: config.smtp_port,
          smtp_username: config.smtp_username,
          smtp_password: config.smtp_password,
          smtp_encryption: config.smtp_encryption,
          default_from_name: config.default_from_name,
          default_from_address: config.default_from_address,
          default_reply_to: config.default_reply_to
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Email settings saved!')
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
            <Mail className="h-5 w-5" />
            SMTP Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>SMTP Host</Label>
              <Input value={config.smtp_host} onChange={(e) => setConfig({ ...config, smtp_host: e.target.value })} placeholder="smtp.gmail.com" />
            </div>
            <div>
              <Label>Port</Label>
              <Input type="number" value={config.smtp_port} onChange={(e) => setConfig({ ...config, smtp_port: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <Label>Username</Label>
            <Input value={config.smtp_username} onChange={(e) => setConfig({ ...config, smtp_username: e.target.value })} />
          </div>
          <div>
            <Label>Password</Label>
            <Input type="password" value={config.smtp_password} onChange={(e) => setConfig({ ...config, smtp_password: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Email Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>From Name</Label>
            <Input value={config.default_from_name} onChange={(e) => setConfig({ ...config, default_from_name: e.target.value })} placeholder="Elite Dental Clinic" />
          </div>
          <div>
            <Label>From Email</Label>
            <Input type="email" value={config.default_from_address} onChange={(e) => setConfig({ ...config, default_from_address: e.target.value })} placeholder="hello@elitedental.com" />
          </div>
          <div>
            <Label>Reply-To Email</Label>
            <Input type="email" value={config.default_reply_to} onChange={(e) => setConfig({ ...config, default_reply_to: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Email Settings'}
      </Button>
    </div>
  )
}

