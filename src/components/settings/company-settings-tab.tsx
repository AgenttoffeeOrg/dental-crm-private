'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2, Save, Upload, Globe } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenant } from '@/lib/hooks/use-tenant'
import { toast } from 'sonner'

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)' },
]

const CURRENCIES = [
  { value: 'USD', label: '$ USD - US Dollar', symbol: '$' },
  { value: 'GBP', label: '£ GBP - British Pound', symbol: '£' },
  { value: 'EUR', label: '€ EUR - Euro', symbol: '€' },
  { value: 'CAD', label: '$ CAD - Canadian Dollar', symbol: '$' },
  { value: 'AUD', label: '$ AUD - Australian Dollar', symbol: '$' },
]

export function CompanySettingsTab() {
  const { tenantId } = useTenant()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    practice_name: '',
    legal_name: '',
    website: '',
    phone: '',
    email: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    timezone: 'America/New_York',
    currency: 'USD',
    date_format: 'MM/DD/YYYY',
    time_format: '12h',
    week_start: 'monday',
    fiscal_year_start: 'january',
    tax_id: '',
    business_hours_start: '09:00',
    business_hours_end: '17:00',
    business_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  })

  useEffect(() => {
    if (tenantId) {
      loadSettings()
    }
  }, [tenantId])

  const loadSettings = async () => {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (data) {
        setSettings({
          practice_name: data.name || '',
          legal_name: data.legal_name || '',
          website: data.website || '',
          phone: data.phone || '',
          email: data.email || '',
          address_line1: data.address_line1 || '',
          address_line2: data.address_line2 || '',
          city: data.city || '',
          state: data.state || '',
          zip: data.zip || '',
          country: data.country || 'United States',
          timezone: data.timezone || 'America/New_York',
          currency: data.currency || 'USD',
          date_format: data.date_format || 'MM/DD/YYYY',
          time_format: data.time_format || '12h',
          week_start: data.week_start || 'monday',
          fiscal_year_start: data.fiscal_year_start || 'january',
          tax_id: data.tax_id || '',
          business_hours_start: data.business_hours_start || '09:00',
          business_hours_end: data.business_hours_end || '17:00',
          business_days: data.business_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        })
      }
    } catch (error) {
      console.error('[COMPANY SETTINGS] Error loading:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('tenants')
        .update({
          name: settings.practice_name,
          legal_name: settings.legal_name,
          website: settings.website,
          phone: settings.phone,
          email: settings.email,
          address_line1: settings.address_line1,
          address_line2: settings.address_line2,
          city: settings.city,
          state: settings.state,
          zip: settings.zip,
          country: settings.country,
          timezone: settings.timezone,
          currency: settings.currency,
          date_format: settings.date_format,
          time_format: settings.time_format,
          week_start: settings.week_start,
          fiscal_year_start: settings.fiscal_year_start,
          tax_id: settings.tax_id,
          business_hours_start: settings.business_hours_start,
          business_hours_end: settings.business_hours_end,
          business_days: settings.business_days,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)

      if (error) throw error

      toast.success('Practice settings saved successfully!')
    } catch (error) {
      console.error('[COMPANY SETTINGS] Save error:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="animate-pulse p-6">Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Practice Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            Practice Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="practice_name">Practice Name *</Label>
              <Input
                id="practice_name"
                value={settings.practice_name}
                onChange={(e) => setSettings({ ...settings, practice_name: e.target.value })}
                placeholder="Elite Dental Clinic"
              />
            </div>
            <div>
              <Label htmlFor="legal_name">Legal Business Name</Label>
              <Input
                id="legal_name"
                value={settings.legal_name}
                onChange={(e) => setSettings({ ...settings, legal_name: e.target.value })}
                placeholder="Elite Dental Clinic LLC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Practice Email</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                placeholder="contact@elitedental.com"
              />
            </div>
            <div>
              <Label htmlFor="phone">Practice Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="website">Website URL</Label>
            <Input
              id="website"
              type="url"
              value={settings.website}
              onChange={(e) => setSettings({ ...settings, website: e.target.value })}
              placeholder="https://elitedental.com"
              icon={Globe}
            />
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Practice Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="address_line1">Address Line 1</Label>
            <Input
              id="address_line1"
              value={settings.address_line1}
              onChange={(e) => setSettings({ ...settings, address_line1: e.target.value })}
              placeholder="123 Main Street"
            />
          </div>
          <div>
            <Label htmlFor="address_line2">Address Line 2</Label>
            <Input
              id="address_line2"
              value={settings.address_line2}
              onChange={(e) => setSettings({ ...settings, address_line2: e.target.value })}
              placeholder="Suite 100"
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                placeholder="New York"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={settings.state}
                onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                placeholder="NY"
              />
            </div>
            <div>
              <Label htmlFor="zip">ZIP Code</Label>
              <Input
                id="zip"
                value={settings.zip}
                onChange={(e) => setSettings({ ...settings, zip: e.target.value })}
                placeholder="10001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Regional & Format Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timezone">Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => setSettings({ ...settings, timezone: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select value={settings.currency} onValueChange={(value) => setSettings({ ...settings, currency: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((curr) => (
                    <SelectItem key={curr.value} value={curr.value}>
                      {curr.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date_format">Date Format</Label>
              <Select value={settings.date_format} onValueChange={(value) => setSettings({ ...settings, date_format: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (US)</SelectItem>
                  <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (UK)</SelectItem>
                  <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (ISO)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="time_format">Time Format</Label>
              <Select value={settings.time_format} onValueChange={(value) => setSettings({ ...settings, time_format: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="12h">12-hour (2:30 PM)</SelectItem>
                  <SelectItem value="24h">24-hour (14:30)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="week_start">Week Starts On</Label>
              <Select value={settings.week_start} onValueChange={(value) => setSettings({ ...settings, week_start: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hours_start">Opening Time</Label>
              <Input
                id="hours_start"
                type="time"
                value={settings.business_hours_start}
                onChange={(e) => setSettings({ ...settings, business_hours_start: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="hours_end">Closing Time</Label>
              <Input
                id="hours_end"
                type="time"
                value={settings.business_hours_end}
                onChange={(e) => setSettings({ ...settings, business_hours_end: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label>Business Days</Label>
            <div className="grid grid-cols-7 gap-2 mt-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                <Button
                  key={day}
                  variant={settings.business_days.includes(day) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    const newDays = settings.business_days.includes(day)
                      ? settings.business_days.filter(d => d !== day)
                      : [...settings.business_days, day]
                    setSettings({ ...settings, business_days: newDays })
                  }}
                  className="capitalize"
                >
                  {day.slice(0, 3)}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : 'Save Practice Settings'}
        </Button>
      </div>
    </div>
  )
}


