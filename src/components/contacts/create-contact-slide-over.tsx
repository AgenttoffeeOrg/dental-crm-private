'use client'

/**
 * Create Contact Slide-Over Panel
 * Enterprise-style right-side slide-over for creating contacts
 * Matches the style of ProfileSetupPanel
 */

import { useState } from 'react'
import { X, User, Mail, Phone, Building2, MapPin, Save } from 'lucide-react'
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
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'

interface CreateContactSlideOverProps {
  open: boolean
  onClose: () => void
  onContactCreated: () => void
}

const CONTACT_SOURCES = [
  'website',
  'referral',
  'google_ads',
  'facebook',
  'instagram',
  'walk_in',
  'phone_call',
  'other'
]

export function CreateContactSlideOver({ open, onClose, onContactCreated }: CreateContactSlideOverProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    full_name: '',
    primary_email: '',
    primary_phone: '',
    company: '',
    address: '',
    city: '',
    source: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.full_name.trim()) {
      toast.error('Full name is required')
      return
    }

    if (!appUser?.tenant_id) {
      toast.error('User session error. Please refresh the page.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const contactData = {
        full_name: formData.full_name.trim(),
        primary_email: formData.primary_email.trim() || null,
        primary_phone: formData.primary_phone.trim() || null,
        company: formData.company.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        source: formData.source || null,
        notes: formData.notes.trim() || null,
        tenant_id: appUser.tenant_id,
        tags: [],
      }

      console.log('[CREATE_CONTACT] Creating contact:', contactData)

      const { data, error } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single()

      if (error) {
        console.error('[CREATE_CONTACT] Error:', error)
        throw error
      }

      console.log('[CREATE_CONTACT] Success:', data)
      toast.success('Contact created successfully!')
      
      // Reset form
      setFormData({
        full_name: '',
        primary_email: '',
        primary_phone: '',
        company: '',
        address: '',
        city: '',
        source: '',
        notes: '',
      })

      // Notify parent and close
      onContactCreated()
      onClose()

    } catch (error: any) {
      console.error('[CREATE_CONTACT] Failed:', error)
      toast.error('Failed to create contact', {
        description: error.message || 'Please try again'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form
    setFormData({
      full_name: '',
      primary_email: '',
      primary_phone: '',
      company: '',
      address: '',
      city: '',
      source: '',
      notes: '',
    })
    onClose()
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 animate-in fade-in duration-200"
        onClick={handleCancel}
      />

      {/* Slide-over Panel from RIGHT */}
      <div className="fixed inset-y-0 right-0 w-full sm:max-w-2xl bg-white shadow-2xl z-50 animate-in slide-in-from-right duration-300">
        <form onSubmit={handleSubmit} className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Create New Contact</h2>
                  <p className="text-sm text-gray-600">Add a new patient or lead</p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleCancel}>
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content - Scrollable Form */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="space-y-6">
              {/* Full Name - Required */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Full Name *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="h-11"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="primary_email" className="text-sm font-medium flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                  placeholder="john@example.com"
                  className="h-11"
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="primary_phone" className="text-sm font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input
                  id="primary_phone"
                  type="tel"
                  value={formData.primary_phone}
                  onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="h-11"
                />
              </div>

              {/* Company */}
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Company
                </Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  placeholder="Acme Dental"
                  className="h-11"
                />
              </div>

              {/* Address */}
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                  className="h-11"
                />
              </div>

              {/* City */}
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium">
                  City
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="New York"
                  className="h-11"
                />
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-medium">
                  Lead Source
                </Label>
                <Select value={formData.source} onValueChange={(value) => setFormData({ ...formData, source: value })}>
                  <SelectTrigger className="h-11">
                    <SelectValue placeholder="Select source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_SOURCES.map(source => (
                      <SelectItem key={source} value={source}>
                        {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional information..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          {/* Footer - Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.full_name.trim()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Create Contact
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  )
}

