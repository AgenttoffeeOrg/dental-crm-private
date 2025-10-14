'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { 
  Building2, Save, Loader2, MapPin, Phone, Globe, Mail,
  Clock, DollarSign, Users, Settings
} from 'lucide-react'

export function PracticeSettingsTab() {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tenant, setTenant] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    email: '',
    website: '',
    address: '',
    city: '',
    postcode: '',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    currency: 'GBP',
    specialty: 'general',
    team_size: '1-5',
    business_hours: {
      monday: { open: '09:00', close: '17:00', closed: false },
      tuesday: { open: '09:00', close: '17:00', closed: false },
      wednesday: { open: '09:00', close: '17:00', closed: false },
      thursday: { open: '09:00', close: '17:00', closed: false },
      friday: { open: '09:00', close: '17:00', closed: false },
      saturday: { open: '09:00', close: '13:00', closed: false },
      sunday: { open: '09:00', close: '17:00', closed: true }
    }
  })

  useEffect(() => {
    if (appUser) {
      fetchTenant()
    }
  }, [appUser])

  const fetchTenant = async () => {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', appUser?.tenant_id)
        .single()

      if (error) throw error

      if (data) {
        setTenant(data)
        setFormData({
          name: data.name || '',
          description: data.metadata?.description || '',
          phone: data.metadata?.phone || '',
          email: data.metadata?.email || '',
          website: data.metadata?.website || '',
          address: data.metadata?.address || '',
          city: data.metadata?.city || '',
          postcode: data.metadata?.postcode || '',
          country: data.metadata?.country || 'United Kingdom',
          timezone: data.timezone || 'Europe/London',
          currency: data.metadata?.currency || 'GBP',
          specialty: data.metadata?.specialty || 'general',
          team_size: data.metadata?.team_size || '1-5',
          business_hours: data.metadata?.business_hours || formData.business_hours
        })
      }
    } catch (error) {
      console.error('Error fetching tenant:', error)
      toast.error('Failed to load practice settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Practice name is required')
      return
    }

    setSaving(true)
    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('tenants')
        .update({
          name: formData.name,
          timezone: formData.timezone,
          metadata: {
            description: formData.description,
            phone: formData.phone,
            email: formData.email,
            website: formData.website,
            address: formData.address,
            city: formData.city,
            postcode: formData.postcode,
            country: formData.country,
            currency: formData.currency,
            specialty: formData.specialty,
            team_size: formData.team_size,
            business_hours: formData.business_hours
          }
        })
        .eq('id', appUser?.tenant_id)

      if (error) throw error

      toast.success('Practice settings saved successfully!')
      fetchTenant()
    } catch (error: any) {
      console.error('Error saving settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Practice Settings</h2>
        <p className="text-gray-600 mt-1">
          Manage your practice information and preferences
        </p>
      </div>

      {/* Basic Information */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Basic Information</h3>
            <p className="text-sm text-gray-600">Your practice details and description</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="name">Practice Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              disabled={saving}
              rows={3}
              placeholder="Brief description of your practice..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialty">Primary Specialty</Label>
            <select
              id="specialty"
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              disabled={saving}
            >
              <option value="general">General Dentistry</option>
              <option value="cosmetic">Cosmetic Dentistry</option>
              <option value="orthodontics">Orthodontics</option>
              <option value="periodontics">Periodontics</option>
              <option value="endodontics">Endodontics</option>
              <option value="oral_surgery">Oral Surgery</option>
              <option value="pediatric">Pediatric Dentistry</option>
              <option value="prosthodontics">Prosthodontics</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="team-size">Team Size</Label>
            <select
              id="team-size"
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              value={formData.team_size}
              onChange={(e) => setFormData({ ...formData, team_size: e.target.value })}
              disabled={saving}
            >
              <option value="1">Just me</option>
              <option value="2-5">2-5 people</option>
              <option value="6-10">6-10 people</option>
              <option value="11-20">11-20 people</option>
              <option value="21+">21+ people</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Contact Information</h3>
            <p className="text-sm text-gray-600">How patients can reach you</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                placeholder="+44 20 1234 5678"
                className="pl-10"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                placeholder="info@yourpractice.com"
                className="pl-10"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                id="website"
                type="url"
                placeholder="www.yourpractice.com"
                className="pl-10"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                disabled={saving}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Location</h3>
            <p className="text-sm text-gray-600">Your practice address</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="address">Street Address</Label>
            <Input
              id="address"
              placeholder="123 Main Street"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              placeholder="London"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              placeholder="SW1A 1AA"
              value={formData.postcode}
              onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <select
              id="country"
              className="w-full h-10 px-3 rounded-md border border-gray-300 bg-white text-sm"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              disabled={saving}
            >
              <option value="United Kingdom">United Kingdom</option>
              <option value="United States">United States</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Ireland">Ireland</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Regional Settings */}
      <Card className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
            <Settings className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Regional Settings</h3>
            <p className="text-sm text-gray-600">Timezone and currency preferences</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                id="timezone"
                className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-300 bg-white text-sm"
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                disabled={saving}
              >
                <option value="Europe/London">London (GMT)</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="America/Los_Angeles">Los Angeles (PST)</option>
                <option value="America/Chicago">Chicago (CST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                id="currency"
                className="w-full h-10 pl-10 pr-3 rounded-md border border-gray-300 bg-white text-sm"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                disabled={saving}
              >
                <option value="GBP">GBP (£)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="CAD">CAD (C$)</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end space-x-4">
        <Button
          variant="outline"
          onClick={fetchTenant}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}



