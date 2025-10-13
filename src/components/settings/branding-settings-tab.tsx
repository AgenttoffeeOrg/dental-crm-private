'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Palette, Upload, Save, Eye } from 'lucide-react'
import { useTenant } from '@/lib/hooks/use-tenant'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

export function BrandingSettingsTab() {
  const { tenantId } = useTenant()
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    logo_url: '',
    favicon_url: '',
    primary_color: '#667eea',
    secondary_color: '#764ba2',
    accent_color: '#43e97b',
    success_color: '#10b981',
    warning_color: '#f59e0b',
    error_color: '#ef4444'
  })

  useEffect(() => {
    if (tenantId) loadSettings()
  }, [tenantId])

  const loadSettings = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('tenants')
      .select('logo_url, favicon_url, primary_color, secondary_color')
      .eq('id', tenantId)
      .single()

    if (data) {
      setSettings({
        logo_url: data.logo_url || '',
        favicon_url: data.favicon_url || '',
        primary_color: data.primary_color || '#667eea',
        secondary_color: data.secondary_color || '#764ba2',
        accent_color: '#43e97b',
        success_color: '#10b981',
        warning_color: '#f59e0b',
        error_color: '#ef4444'
      })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          logo_url: settings.logo_url,
          favicon_url: settings.favicon_url,
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color
        })
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Branding settings saved!')
      await loadSettings()
    } catch (error) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Brand Colors
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Primary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={settings.primary_color}
                  onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                  placeholder="#667eea"
                />
              </div>
            </div>
            <div>
              <Label>Secondary Color</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  value={settings.secondary_color}
                  onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                  placeholder="#764ba2"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo & Assets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Logo URL</Label>
            <Input
              value={settings.logo_url}
              onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })}
              placeholder="https://example.com/logo.png"
            />
          </div>
          <div>
            <Label>Favicon URL</Label>
            <Input
              value={settings.favicon_url}
              onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })}
              placeholder="https://example.com/favicon.ico"
            />
          </div>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving}>
        <Save className="h-4 w-4 mr-2" />
        {saving ? 'Saving...' : 'Save Branding'}
      </Button>
    </div>
  )
}

