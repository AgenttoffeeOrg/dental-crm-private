'use client'

/**
 * Create/Edit Contact Slide-Over Panel
 * Enterprise-style right-side slide-over for creating and editing contacts
 * Maintains consistency with CreateDealSlideOver and CreateTaskSlideOver
 * 
 * Features:
 * - Comprehensive contact fields (identity, contact info, address, preferences)
 * - Real-time validation
 * - Duplicate detection
 * - Phone number formatting
 * - Email validation
 * - Tag management
 * - Create mode + Edit mode support
 */

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, MapPin, Tag as TagIcon, Save, Building, Calendar, AlertCircle } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import type { Contact } from '@/types/database'

interface CreateContactSlideOverProps {
  open: boolean
  onClose: () => void
  onContactCreated?: () => void
  contact?: Contact | null // For edit mode
  mode?: 'create' | 'edit'
}

const SOURCE_OPTIONS = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'google_ads', label: 'Google Ads' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'walk_in', label: 'Walk-in' },
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'other', label: 'Other' },
]

const CONTACT_TYPE_OPTIONS = [
  { value: 'patient', label: 'Patient' },
  { value: 'lead', label: 'Lead' },
  { value: 'referrer', label: 'Referrer' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'insurer', label: 'Insurer' },
]

const TAG_SUGGESTIONS = [
  'VIP',
  'High Value',
  'Urgent',
  'Follow Up',
  'Hot Lead',
  'Cold Lead',
  'Inactive',
  'Returning Patient',
  'New Patient',
  'Implant Interest',
  'Cosmetic Interest',
  'Orthodontics Interest',
]

export function CreateContactSlideOver({
  open,
  onClose,
  onContactCreated,
  contact,
  mode = 'create',
}: CreateContactSlideOverProps) {
  const { appUser } = useAuth()
  const [loading, setLoading] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    primary_phone: '',
    secondary_phone: '',
    primary_email: '',
    secondary_email: '',
    source: '',
    contact_type: 'patient',
    address: '',
    city: '',
    postal_code: '',
    country: 'United Kingdom',
    date_of_birth: '',
    occupation: '',
    notes: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load contact data for edit mode
  useEffect(() => {
    if (open && contact && mode === 'edit') {
      const contactData = contact as any
      
      setFormData({
        full_name: contact.full_name || '',
        primary_phone: contact.primary_phone || '',
        secondary_phone: contactData.secondary_phone || '',
        primary_email: contact.primary_email || '',
        secondary_email: contactData.secondary_email || '',
        source: contact.source || '',
        contact_type: contactData.contact_type || 'patient',
        address: contactData.address || '',
        city: contactData.city || '',
        postal_code: contactData.postal_code || '',
        country: contactData.country || 'United Kingdom',
        date_of_birth: contactData.date_of_birth || '',
        occupation: contactData.occupation || '',
        notes: '',
      })
      
      setSelectedTags(contact.tags || [])
    } else if (open && mode === 'create') {
      // Reset form for create mode
      setFormData({
        full_name: '',
        primary_phone: '',
        secondary_phone: '',
        primary_email: '',
        secondary_email: '',
        source: '',
        contact_type: 'patient',
        address: '',
        city: '',
        postal_code: '',
        country: 'United Kingdom',
        date_of_birth: '',
        occupation: '',
        notes: '',
      })
      setSelectedTags([])
      setErrors({})
      setDuplicateWarning(null)
    }
  }, [open, contact, mode])

  // Check for duplicates when email or phone changes
  useEffect(() => {
    if (mode === 'create' && (formData.primary_email || formData.primary_phone)) {
      checkDuplicates()
    }
  }, [formData.primary_email, formData.primary_phone, mode])

  const checkDuplicates = async () => {
    if (!appUser?.tenant_id) return

    const supabase = createClient()
    
    try {
      let query = supabase
        .from('contacts')
        .select('id, full_name, primary_email, primary_phone')
        .eq('tenant_id', appUser.tenant_id)

      const conditions = []
      if (formData.primary_email) {
        conditions.push(`primary_email.eq.${formData.primary_email}`)
      }
      if (formData.primary_phone) {
        conditions.push(`primary_phone.eq.${formData.primary_phone}`)
      }

      if (conditions.length > 0) {
        query = query.or(conditions.join(','))
        
        const { data } = await query
        
        if (data && data.length > 0) {
          setDuplicateWarning(
            `Potential duplicate: ${data[0].full_name} has the same ${
              data[0].primary_email === formData.primary_email ? 'email' : 'phone'
            }`
          )
        } else {
          setDuplicateWarning(null)
        }
      }
    } catch (error) {
      console.error('Error checking duplicates:', error)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.full_name.trim()) {
      newErrors.full_name = 'Name is required'
    }

    if (formData.primary_email && !isValidEmail(formData.primary_email)) {
      newErrors.primary_email = 'Invalid email address'
    }

    if (formData.secondary_email && !isValidEmail(formData.secondary_email)) {
      newErrors.secondary_email = 'Invalid email address'
    }

    if (!formData.primary_phone && !formData.primary_email) {
      newErrors.primary_phone = 'Either phone or email is required'
      newErrors.primary_email = 'Either phone or email is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const formatPhoneNumber = (phone: string): string => {
    // Basic UK phone formatting
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
    }
    return phone
  }

  const handlePhoneChange = (field: 'primary_phone' | 'secondary_phone', value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: formatPhoneNumber(value)
    }))
  }

  const addTag = (tag: string) => {
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag])
    }
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag))
  }

  const handleAddCustomTag = () => {
    if (customTag.trim()) {
      addTag(customTag.trim())
      setCustomTag('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Please fix the errors before submitting')
      return
    }

    if (!appUser?.tenant_id) {
      toast.error('No tenant ID found')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Prepare contact data using ONLY basic columns that exist in all databases
      const contactData = {
        tenant_id: appUser.tenant_id,
        full_name: formData.full_name.trim(),
        primary_phone: formData.primary_phone.trim() || null,
        primary_email: formData.primary_email.trim().toLowerCase() || null,
        source: formData.source || null,
        tags: selectedTags,
        updated_at: new Date().toISOString(),
      }

      if (mode === 'edit' && contact) {
        // Update existing contact
        console.log('Updating contact with data:', contactData)
        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id)

        if (error) {
          console.error('Update error:', error)
          throw error
        }

        toast.success('Contact updated successfully')
      } else {
        // Create new contact
        const insertData = {
          ...contactData,
          created_at: new Date().toISOString(),
        }
        console.log('🔵 Creating contact with data:', insertData)
        console.log('🔵 Tenant ID:', appUser.tenant_id)
        console.log('🔵 Full insertData:', JSON.stringify(insertData, null, 2))
        
        const response = await supabase
          .from('contacts')
          .insert(insertData)
          .select()
        
        console.log('🔵 Full Supabase response:', response)
        console.log('🔵 Response data:', response.data)
        console.log('🔵 Response error:', response.error)
        console.log('🔵 Response status:', response.status)
        console.log('🔵 Response statusText:', response.statusText)

        if (response.error) {
          console.error('❌ Insert error object:', response.error)
          console.error('❌ Insert error type:', typeof response.error)
          console.error('❌ Insert error keys:', Object.keys(response.error))
          console.error('❌ Insert error JSON:', JSON.stringify(response.error, null, 2))
          throw response.error
        }

        console.log('✅ Contact created successfully:', response.data)
        toast.success('Contact created successfully')
      }

      onContactCreated?.()
      onClose()
    } catch (error: any) {
      console.error('Error saving contact:', error)
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
      toast.error(error?.message || error?.code || 'Failed to save contact')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[600px] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <User className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {mode === 'edit' ? 'Edit Contact' : 'New Contact'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'edit' ? 'Update contact information' : 'Add a new contact to your CRM'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="rounded-full h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Duplicate Warning */}
            {duplicateWarning && (
              <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-yellow-800">Possible Duplicate</p>
                  <p className="text-sm text-yellow-700">{duplicateWarning}</p>
                </div>
              </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>

              {/* Full Name */}
              <div>
                <Label htmlFor="full_name">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="John Smith"
                  className={errors.full_name ? 'border-red-500' : ''}
                />
                {errors.full_name && (
                  <p className="text-xs text-red-500 mt-1">{errors.full_name}</p>
                )}
              </div>

              {/* Contact Type */}
              <div>
                <Label htmlFor="contact_type">Contact Type</Label>
                <Select
                  value={formData.contact_type}
                  onValueChange={(value) => setFormData({ ...formData, contact_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTACT_TYPE_OPTIONS.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Contact Information
              </h3>

              {/* Primary Phone */}
              <div>
                <Label htmlFor="primary_phone">Primary Phone</Label>
                <Input
                  id="primary_phone"
                  value={formData.primary_phone}
                  onChange={(e) => handlePhoneChange('primary_phone', e.target.value)}
                  placeholder="0123 456 7890"
                  className={errors.primary_phone ? 'border-red-500' : ''}
                />
                {errors.primary_phone && (
                  <p className="text-xs text-red-500 mt-1">{errors.primary_phone}</p>
                )}
              </div>

              {/* Secondary Phone */}
              <div>
                <Label htmlFor="secondary_phone">Secondary Phone</Label>
                <Input
                  id="secondary_phone"
                  value={formData.secondary_phone}
                  onChange={(e) => handlePhoneChange('secondary_phone', e.target.value)}
                  placeholder="0123 456 7890"
                />
              </div>

              {/* Primary Email */}
              <div>
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  value={formData.primary_email}
                  onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
                  placeholder="john@example.com"
                  className={errors.primary_email ? 'border-red-500' : ''}
                />
                {errors.primary_email && (
                  <p className="text-xs text-red-500 mt-1">{errors.primary_email}</p>
                )}
              </div>

              {/* Secondary Email */}
              <div>
                <Label htmlFor="secondary_email">Secondary Email</Label>
                <Input
                  id="secondary_email"
                  type="email"
                  value={formData.secondary_email}
                  onChange={(e) => setFormData({ ...formData, secondary_email: e.target.value })}
                  placeholder="john.work@example.com"
                  className={errors.secondary_email ? 'border-red-500' : ''}
                />
                {errors.secondary_email && (
                  <p className="text-xs text-red-500 mt-1">{errors.secondary_email}</p>
                )}
              </div>
            </div>

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </h3>

              <div>
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Main Street"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="London"
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="SW1A 1AA"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="United Kingdom"
                />
              </div>
            </div>

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Building className="h-4 w-4" />
                Additional Information
              </h3>

              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                  placeholder="Software Engineer"
                />
              </div>

              <div>
                <Label htmlFor="source">Source</Label>
                <Select
                  value={formData.source}
                  onValueChange={(value) => setFormData({ ...formData, source: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How did they find you?" />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <TagIcon className="h-4 w-4" />
                Tags
              </h3>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 cursor-pointer"
                      onClick={() => removeTag(tag)}
                    >
                      {tag}
                      <X className="h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              )}

              {/* Tag Suggestions */}
              <div className="flex flex-wrap gap-2">
                {TAG_SUGGESTIONS.filter(t => !selectedTags.includes(t)).slice(0, 6).map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="cursor-pointer hover:bg-blue-50"
                    onClick={() => addTag(tag)}
                  >
                    + {tag}
                  </Badge>
                ))}
              </div>

              {/* Custom Tag Input */}
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom tag..."
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomTag()
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddCustomTag}
                  disabled={!customTag.trim()}
                >
                  Add
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any internal notes about this contact..."
                rows={3}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="min-w-[120px]"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4" />
                {mode === 'edit' ? 'Update Contact' : 'Create Contact'}
              </div>
            )}
          </Button>
        </div>
      </div>
    </>
  )
}
