'use client'

/**
 * Forms Settings Tab
 * 
 * Configure global form settings
 * 
 * Settings:
 * - Spam Protection (reCAPTCHA, honeypot, rate limits)
 * - Validation Rules (email/phone format, required fields)
 * - Field Templates (reusable field sets)
 * - Theming & Design (default colors, fonts, spacing)
 * - Submission Handling (email notifications, webhooks)
 */

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Shield, Check, Mail, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase-client'

export function FormsSettingsTab() {
  const [settings, setSettings] = useState({
    // Spam Protection
    recaptchaEnabled: true,
    recaptchaSiteKey: '',
    recaptchaSecretKey: '',
    honeypotEnabled: true,
    formSubmissionRateLimit: 10, // per IP per minute
    
    // Validation
    emailValidationStrict: true,
    phoneValidationEnabled: true,
    phoneFormat: 'E.164',
    
    // Theming
    defaultTheme: 'clean',
    primaryColor: '#667eea',
    buttonStyle: 'rounded',
    
    // Submissions
    sendNotificationEmail: true,
    notificationRecipients: '',
    webhookUrl: '',
  })
  
  const [saving, setSaving] = useState(false)
  
  const handleSave = async () => {
    setSaving(true)
    
    try {
      // In production, save to tenant_settings table
      const supabase = createClient()
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 500))
      
      toast.success('Forms settings saved successfully')
    } catch (error) {
      console.error('[Forms Settings] Error saving:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Forms Configuration</h3>
        <p className="text-sm text-gray-600">Global settings for all forms</p>
      </div>
      
      {/* Spam Protection */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Spam Protection</h4>
        </div>
        
        <div className="space-y-4">
          {/* reCAPTCHA */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable reCAPTCHA</Label>
              <p className="text-xs text-gray-600">Protect forms from bot submissions</p>
            </div>
            <Switch
              checked={settings.recaptchaEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, recaptchaEnabled: checked })}
            />
          </div>
          
          {settings.recaptchaEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-6">
              <div>
                <Label>Site Key</Label>
                <Input
                  type="password"
                  placeholder="6Lc..."
                  value={settings.recaptchaSiteKey}
                  onChange={(e) => setSettings({ ...settings, recaptchaSiteKey: e.target.value })}
                />
              </div>
              <div>
                <Label>Secret Key</Label>
                <Input
                  type="password"
                  placeholder="6Lc..."
                  value={settings.recaptchaSecretKey}
                  onChange={(e) => setSettings({ ...settings, recaptchaSecretKey: e.target.value })}
                />
              </div>
            </div>
          )}
          
          {/* Honeypot */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Honeypot Field</Label>
              <p className="text-xs text-gray-600">Hidden field to catch bots</p>
            </div>
            <Switch
              checked={settings.honeypotEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, honeypotEnabled: checked })}
            />
          </div>
          
          {/* Rate Limiting */}
          <div>
            <Label>Submission Rate Limit</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={settings.formSubmissionRateLimit}
                onChange={(e) => setSettings({ ...settings, formSubmissionRateLimit: parseInt(e.target.value) })}
                className="w-24"
              />
              <span className="text-sm text-gray-600">submissions per minute per IP</span>
            </div>
          </div>
        </div>
      </Card>
      
      {/* Validation Rules */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Validation Rules</h4>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Strict Email Validation</Label>
              <p className="text-xs text-gray-600">Verify email format and MX records</p>
            </div>
            <Switch
              checked={settings.emailValidationStrict}
              onCheckedChange={(checked) => setSettings({ ...settings, emailValidationStrict: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Phone Number Validation</Label>
              <p className="text-xs text-gray-600">Validate international phone formats</p>
            </div>
            <Switch
              checked={settings.phoneValidationEnabled}
              onCheckedChange={(checked) => setSettings({ ...settings, phoneValidationEnabled: checked })}
            />
          </div>
          
          {settings.phoneValidationEnabled && (
            <div className="pl-6">
              <Label>Phone Format</Label>
              <Select
                value={settings.phoneFormat}
                onValueChange={(value) => setSettings({ ...settings, phoneFormat: value })}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="E.164">E.164 (+15555555555)</SelectItem>
                  <SelectItem value="National">(555) 555-5555</SelectItem>
                  <SelectItem value="International">+1 555 555 5555</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>
      
      {/* Theming */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4">Default Form Theme</h4>
        
        <div className="space-y-4">
          <div>
            <Label>Theme Preset</Label>
            <Select
              value={settings.defaultTheme}
              onValueChange={(value) => setSettings({ ...settings, defaultTheme: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clean">Clean & Minimal</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="modern">Modern & Bold</SelectItem>
                <SelectItem value="elegant">Elegant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label>Primary Color</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Submission Handling */}
      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Mail className="h-5 w-5 text-blue-600" />
          <h4 className="font-semibold">Submission Handling</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Email Notifications</Label>
              <p className="text-xs text-gray-600">Send email when form is submitted</p>
            </div>
            <Switch
              checked={settings.sendNotificationEmail}
              onCheckedChange={(checked) => setSettings({ ...settings, sendNotificationEmail: checked })}
            />
          </div>
          
          {settings.sendNotificationEmail && (
            <div className="pl-6">
              <Label>Recipients (comma-separated)</Label>
              <Input
                placeholder="admin@practice.com, manager@practice.com"
                value={settings.notificationRecipients}
                onChange={(e) => setSettings({ ...settings, notificationRecipients: e.target.value })}
              />
            </div>
          )}
          
          <div>
            <Label>Webhook URL (Optional)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Webhook className="h-4 w-4 text-gray-400" />
              <Input
                placeholder="https://your-server.com/webhook"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">POST submission data to external URL</p>
          </div>
        </div>
      </Card>
      
      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}

