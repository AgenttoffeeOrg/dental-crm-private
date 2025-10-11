'use client'

import React, { useState, useEffect } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
// import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
// Calendar components - will add fallback if missing
// import { Calendar } from '@/components/ui/calendar'
// import {
//   Popover,
//   PopoverContent,
//   PopoverTrigger,
// } from '@/components/ui/popover'
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar as CalendarIcon,
  Heart,
  Shield,
  Briefcase,
  Users,
  Plus,
  Trash2,
  Settings,
  Save
} from 'lucide-react'
import { toast } from 'sonner'
import type { Contact } from '@/types/database'

// Simple separator component fallback
const Separator = () => <hr className="border-gray-200 my-6" />

// Comprehensive contact schema
const contactProfileSchema = z.object({
  // Basic Information
  full_name: z.string().min(1, 'Name is required'),
  preferred_name: z.string().optional(),
  title: z.enum(['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', '']).optional(),
  
  // Contact Information
  primary_phone: z.string().optional(),
  secondary_phone: z.string().optional(),
  primary_email: z.string().email('Invalid email').optional().or(z.literal('')),
  secondary_email: z.string().email('Invalid email').optional().or(z.literal('')),
  
  // Address Information
  address: z.string().optional(),
  city: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  
  // Personal Information
  date_of_birth: z.date().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say', '']).optional(),
  marital_status: z.enum(['single', 'married', 'divorced', 'widowed', 'other', '']).optional(),
  occupation: z.string().optional(),
  employer: z.string().optional(),
  
  // Medical Information
  medical_conditions: z.string().optional(),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  emergency_contact_relationship: z.string().optional(),
  
  // Insurance Information
  insurance_provider: z.string().optional(),
  insurance_policy_number: z.string().optional(),
  insurance_group_number: z.string().optional(),
  
  // Preferences
  preferred_appointment_time: z.enum(['morning', 'afternoon', 'evening', 'flexible', '']).optional(),
  communication_preference: z.enum(['phone', 'email', 'sms', 'whatsapp', '']).optional(),
  language_preference: z.string().optional(),
  
  // Dental History
  previous_dentist: z.string().optional(),
  last_dental_visit: z.date().optional(),
  dental_anxiety_level: z.enum(['none', 'mild', 'moderate', 'high', '']).optional(),
  dental_concerns: z.string().optional(),
  
  // Marketing & Consent
  marketing_consent: z.boolean().default(false),
  sms_consent: z.boolean().default(false),
  email_consent: z.boolean().default(true),
  
  // Custom Fields (dynamic)
  custom_fields: z.record(z.string(), z.any()).optional(),
})

type ContactProfileData = z.infer<typeof contactProfileSchema>

// Custom field definition
interface CustomField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'date' | 'boolean' | 'number'
  options?: string[]
  required: boolean
  section: string
}

interface ContactProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact?: Contact | null // Make contact optional for new contact creation
  onContactUpdated: () => void
  tenantId?: string
  mode?: 'create' | 'edit' // Add mode to distinguish between create and edit
}

export function ContactProfileDialog({ 
  open, 
  onOpenChange, 
  contact,
  onContactUpdated,
  tenantId = '550e8400-e29b-41d4-a716-446655440000',
  mode = 'edit'
}: ContactProfileDialogProps) {
  const [loading, setLoading] = useState(false)
  const [customFields, setCustomFields] = useState<CustomField[]>([])
  const [showCustomFieldBuilder, setShowCustomFieldBuilder] = useState(false)
  const supabase = createClient()

  const form = useForm<ContactProfileData>({
    resolver: zodResolver(contactProfileSchema),
    defaultValues: {
      full_name: '',
      marketing_consent: false,
      sms_consent: false,
      email_consent: true,
      custom_fields: {},
    },
  })

  // Load contact data and custom fields
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && contact) {
        loadContactData()
      } else if (mode === 'create') {
        // Reset form for new contact
        form.reset({
          full_name: '',
          marketing_consent: false,
          sms_consent: false,
          email_consent: true,
          custom_fields: {},
        })
      }
      loadCustomFields()
    }
  }, [open, contact, mode])

  const loadContactData = () => {
    if (!contact) return
    
    console.log('Loading contact data:', contact)
    
    // Get profile data from JSON field
    const profileData = (contact as any).profile_data || {}
    
    // Load comprehensive contact data from profile_data JSON field
    form.reset({
      // Basic fields
      full_name: contact.full_name || '',
      primary_phone: contact.primary_phone || '',
      primary_email: contact.primary_email || '',
      
      // Personal information from profile_data
      preferred_name: profileData.personal?.preferred_name || '',
      title: profileData.personal?.title || '',
      secondary_phone: profileData.personal?.secondary_phone || '',
      secondary_email: profileData.personal?.secondary_email || '',
      date_of_birth: profileData.personal?.date_of_birth ? new Date(profileData.personal.date_of_birth) : undefined,
      gender: profileData.personal?.gender || '',
      marital_status: profileData.personal?.marital_status || '',
      occupation: profileData.personal?.occupation || '',
      employer: profileData.personal?.employer || '',
      
      // Address information
      address: profileData.address?.address || '',
      city: profileData.address?.city || '',
      postal_code: profileData.address?.postal_code || '',
      country: profileData.address?.country || '',
      
      // Medical information
      medical_conditions: profileData.medical?.medical_conditions || '',
      allergies: profileData.medical?.allergies || '',
      medications: profileData.medical?.medications || '',
      emergency_contact_name: profileData.medical?.emergency_contact_name || '',
      emergency_contact_phone: profileData.medical?.emergency_contact_phone || '',
      emergency_contact_relationship: profileData.medical?.emergency_contact_relationship || '',
      
      // Insurance information
      insurance_provider: profileData.insurance?.insurance_provider || '',
      insurance_policy_number: profileData.insurance?.insurance_policy_number || '',
      insurance_group_number: profileData.insurance?.insurance_group_number || '',
      
      // Preferences
      preferred_appointment_time: profileData.preferences?.preferred_appointment_time || '',
      communication_preference: profileData.preferences?.communication_preference || '',
      language_preference: profileData.preferences?.language_preference || '',
      
      // Dental history
      previous_dentist: profileData.dental?.previous_dentist || '',
      last_dental_visit: profileData.dental?.last_dental_visit ? new Date(profileData.dental.last_dental_visit) : undefined,
      dental_anxiety_level: profileData.dental?.dental_anxiety_level || '',
      dental_concerns: profileData.dental?.dental_concerns || '',
      
      // Consent
      marketing_consent: profileData.consent?.marketing_consent || false,
      sms_consent: profileData.consent?.sms_consent || false,
      email_consent: profileData.consent?.email_consent !== false, // Default to true
      
      // Custom fields
      custom_fields: profileData.custom_fields || {},
    })
  }

  const loadCustomFields = async () => {
    try {
      // Load custom field definitions (you might store these in a separate table)
      const { data, error } = await supabase
        .from('custom_contact_fields')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('active', true)

      if (error) {
        // Table doesn't exist yet - this is expected for new setups
        console.log('Custom fields table not found - using default fields only')
        setCustomFields([])
      } else {
        setCustomFields(data || [])
      }
    } catch (error) {
      console.log('Custom fields not available yet - using default fields only')
      setCustomFields([])
    }
  }

  const onSubmit = async (data: ContactProfileData) => {
    console.log('Submitting comprehensive profile data:', data)
    setLoading(true)
    
    try {
      // Check if profile_data column exists by trying a simple query first
      let hasProfileDataColumn = false
      try {
        const { error: checkError } = await supabase
          .from('contacts')
          .select('profile_data')
          .limit(1)
        
        // If no error, column exists
        hasProfileDataColumn = !checkError
      } catch (e) {
        console.log('profile_data column not found, using basic fields only')
        hasProfileDataColumn = false
      }

      // Prepare contact data for database
      const contactData: any = {
        // Core fields that exist in database
        full_name: data.full_name,
        primary_phone: data.primary_phone || null,
        primary_email: data.primary_email || null,
        source: data.communication_preference || 'comprehensive_form',
        tags: [
          ...(data.title ? [data.title] : []),
          ...(data.occupation ? [data.occupation] : []),
          ...(data.dental_anxiety_level ? [`anxiety_${data.dental_anxiety_level}`] : []),
          ...(data.preferred_appointment_time ? [`prefers_${data.preferred_appointment_time}`] : []),
          'comprehensive_profile'
        ].filter(Boolean),
        
        updated_at: new Date().toISOString(),
      }

      // Only add profile_data if the column exists
      if (hasProfileDataColumn) {
        contactData.profile_data = {
          personal: {
            preferred_name: data.preferred_name,
            title: data.title,
            secondary_phone: data.secondary_phone,
            secondary_email: data.secondary_email,
            date_of_birth: data.date_of_birth?.toISOString(),
            gender: data.gender,
            marital_status: data.marital_status,
            occupation: data.occupation,
            employer: data.employer,
          },
          address: {
            address: data.address,
            city: data.city,
            postal_code: data.postal_code,
            country: data.country,
          },
          medical: {
            medical_conditions: data.medical_conditions,
            allergies: data.allergies,
            medications: data.medications,
            emergency_contact_name: data.emergency_contact_name,
            emergency_contact_phone: data.emergency_contact_phone,
            emergency_contact_relationship: data.emergency_contact_relationship,
          },
          insurance: {
            insurance_provider: data.insurance_provider,
            insurance_policy_number: data.insurance_policy_number,
            insurance_group_number: data.insurance_group_number,
          },
          preferences: {
            preferred_appointment_time: data.preferred_appointment_time,
            communication_preference: data.communication_preference,
            language_preference: data.language_preference,
          },
          dental: {
            previous_dentist: data.previous_dentist,
            last_dental_visit: data.last_dental_visit?.toISOString(),
            dental_anxiety_level: data.dental_anxiety_level,
            dental_concerns: data.dental_concerns,
          },
          consent: {
            marketing_consent: data.marketing_consent,
            sms_consent: data.sms_consent,
            email_consent: data.email_consent,
          },
          custom_fields: data.custom_fields || {},
        }
      } else {
        // Store some key data in tags for now
        contactData.tags = [
          ...contactData.tags,
          ...(data.address ? [`address:${data.address.substring(0, 20)}`] : []),
          ...(data.medical_conditions ? [`medical:${data.medical_conditions.substring(0, 20)}`] : []),
        ].filter(Boolean)
      }

      if (mode === 'create') {
        // Create new contact
        const newContactData = {
          ...contactData,
          tenant_id: tenantId,
          tags: [],
          created_at: new Date().toISOString(),
        }

        console.log('Creating new contact with comprehensive data:', newContactData)

        const { error } = await supabase
          .from('contacts')
          .insert(newContactData)

        if (error) {
          console.error('Supabase error creating contact:', error)
          throw error
        }

        toast.success('Contact created successfully')
      } else {
        // Update existing contact
        if (!contact?.id) {
          toast.error('Contact ID is missing')
          return
        }

        console.log('Updating contact with comprehensive data:', contactData)

        const { error } = await supabase
          .from('contacts')
          .update(contactData)
          .eq('id', contact.id)

        if (error) {
          console.error('Supabase error updating contact:', error)
          throw error
        }

        toast.success('Contact profile updated successfully')
      }

      onContactUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving contact profile:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      const action = mode === 'create' ? 'create' : 'update'
      toast.error(`Failed to ${action} contact profile: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }

  // Don't render if in edit mode but no contact provided
  if (mode === 'edit' && !contact) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {mode === 'create' ? 'Create New Contact Profile' : 'Edit Contact Profile'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Select onValueChange={(value) => form.setValue('title', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr">Mr</SelectItem>
                    <SelectItem value="Mrs">Mrs</SelectItem>
                    <SelectItem value="Ms">Ms</SelectItem>
                    <SelectItem value="Dr">Dr</SelectItem>
                    <SelectItem value="Prof">Prof</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  {...form.register('full_name')}
                  placeholder="John Smith"
                />
                {form.formState.errors.full_name && (
                  <p className="text-sm text-red-600 mt-1">
                    {form.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="preferred_name">Preferred Name</Label>
                <Input
                  id="preferred_name"
                  {...form.register('preferred_name')}
                  placeholder="Johnny"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Contact Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Contact Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="primary_phone">Primary Phone</Label>
                <Input
                  id="primary_phone"
                  {...form.register('primary_phone')}
                  placeholder="+44 7700 900123"
                />
              </div>
              
              <div>
                <Label htmlFor="secondary_phone">Secondary Phone</Label>
                <Input
                  id="secondary_phone"
                  {...form.register('secondary_phone')}
                  placeholder="+44 7700 900124"
                />
              </div>
              
              <div>
                <Label htmlFor="primary_email">Primary Email</Label>
                <Input
                  id="primary_email"
                  type="email"
                  {...form.register('primary_email')}
                  placeholder="john.smith@example.com"
                />
              </div>
              
              <div>
                <Label htmlFor="secondary_email">Secondary Email</Label>
                <Input
                  id="secondary_email"
                  type="email"
                  {...form.register('secondary_email')}
                  placeholder="john.work@company.com"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Address Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Address Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="address">Street Address</Label>
                <Input
                  id="address"
                  {...form.register('address')}
                  placeholder="123 Main Street, Apartment 4B"
                />
              </div>
              
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  {...form.register('city')}
                  placeholder="London"
                />
              </div>
              
              <div>
                <Label htmlFor="postal_code">Postal Code</Label>
                <Input
                  id="postal_code"
                  {...form.register('postal_code')}
                  placeholder="SW1A 1AA"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  {...form.register('country')}
                  placeholder="United Kingdom"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Personal Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Personal Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date_of_birth">Date of Birth</Label>
                <Input
                  id="date_of_birth"
                  type="date"
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    form.setValue('date_of_birth', date)
                  }}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select onValueChange={(value) => form.setValue('gender', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="marital_status">Marital Status</Label>
                <Select onValueChange={(value) => form.setValue('marital_status', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="divorced">Divorced</SelectItem>
                    <SelectItem value="widowed">Widowed</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  {...form.register('occupation')}
                  placeholder="Software Engineer"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="employer">Employer</Label>
                <Input
                  id="employer"
                  {...form.register('employer')}
                  placeholder="Tech Company Ltd"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Medical Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Medical Information</h3>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  {...form.register('medical_conditions')}
                  placeholder="List any relevant medical conditions..."
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="allergies">Allergies</Label>
                <Textarea
                  id="allergies"
                  {...form.register('allergies')}
                  placeholder="List any allergies (medications, foods, materials)..."
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  {...form.register('medications')}
                  placeholder="List current medications and dosages..."
                  rows={2}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                <Input
                  id="emergency_contact_name"
                  {...form.register('emergency_contact_name')}
                  placeholder="Jane Smith"
                />
              </div>
              
              <div>
                <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                <Input
                  id="emergency_contact_phone"
                  {...form.register('emergency_contact_phone')}
                  placeholder="+44 7700 900125"
                />
              </div>
              
              <div>
                <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                <Input
                  id="emergency_contact_relationship"
                  {...form.register('emergency_contact_relationship')}
                  placeholder="Spouse, Parent, etc."
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Insurance Information Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Insurance Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  {...form.register('insurance_provider')}
                  placeholder="Bupa, AXA, NHS, etc."
                />
              </div>
              
              <div>
                <Label htmlFor="insurance_policy_number">Policy Number</Label>
                <Input
                  id="insurance_policy_number"
                  {...form.register('insurance_policy_number')}
                  placeholder="Policy number"
                />
              </div>
              
              <div>
                <Label htmlFor="insurance_group_number">Group Number</Label>
                <Input
                  id="insurance_group_number"
                  {...form.register('insurance_group_number')}
                  placeholder="Group number"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Preferences Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Preferences</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="preferred_appointment_time">Preferred Appointment Time</Label>
                <Select onValueChange={(value) => form.setValue('preferred_appointment_time', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">Morning (9-12)</SelectItem>
                    <SelectItem value="afternoon">Afternoon (12-17)</SelectItem>
                    <SelectItem value="evening">Evening (17-20)</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="communication_preference">Communication Preference</Label>
                <Select onValueChange={(value) => form.setValue('communication_preference', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="language_preference">Language Preference</Label>
                <Input
                  id="language_preference"
                  {...form.register('language_preference')}
                  placeholder="English, Spanish, etc."
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="marketing_consent"
                  checked={form.watch('marketing_consent')}
                  onCheckedChange={(checked) => form.setValue('marketing_consent', checked)}
                />
                <Label htmlFor="marketing_consent">I consent to receiving marketing communications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="sms_consent"
                  checked={form.watch('sms_consent')}
                  onCheckedChange={(checked) => form.setValue('sms_consent', checked)}
                />
                <Label htmlFor="sms_consent">I consent to receiving SMS notifications</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="email_consent"
                  checked={form.watch('email_consent')}
                  onCheckedChange={(checked) => form.setValue('email_consent', checked)}
                />
                <Label htmlFor="email_consent">I consent to receiving email communications</Label>
              </div>
            </div>
          </div>

          <Separator />

          {/* Dental History Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4" />
              <h3 className="text-lg font-semibold">Dental History</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="previous_dentist">Previous Dentist</Label>
                <Input
                  id="previous_dentist"
                  {...form.register('previous_dentist')}
                  placeholder="Dr. Smith Dental Practice"
                />
              </div>
              
              <div>
                <Label htmlFor="last_dental_visit">Last Dental Visit</Label>
                <Input
                  id="last_dental_visit"
                  type="date"
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : undefined
                    form.setValue('last_dental_visit', date)
                  }}
                  placeholder="YYYY-MM-DD"
                />
              </div>
              
              <div>
                <Label htmlFor="dental_anxiety_level">Dental Anxiety Level</Label>
                <Select onValueChange={(value) => form.setValue('dental_anxiety_level', value as any)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select anxiety level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-2">
                <Label htmlFor="dental_concerns">Dental Concerns & Goals</Label>
                <Textarea
                  id="dental_concerns"
                  {...form.register('dental_concerns')}
                  placeholder="What are your main dental concerns or goals?"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Custom Fields Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <h3 className="text-lg font-semibold">Custom Fields</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomFieldBuilder(!showCustomFieldBuilder)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Custom Field
              </Button>
            </div>
            
            {/* Render existing custom fields */}
            {customFields.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields.map((field) => (
                  <div key={field.id}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    {field.type === 'text' && (
                      <Input
                        id={field.name}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        onChange={(e) => {
                          const customFields = form.getValues('custom_fields') || {}
                          customFields[field.name] = e.target.value
                          form.setValue('custom_fields', customFields)
                        }}
                      />
                    )}
                    {field.type === 'textarea' && (
                      <Textarea
                        id={field.name}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                        onChange={(e) => {
                          const customFields = form.getValues('custom_fields') || {}
                          customFields[field.name] = e.target.value
                          form.setValue('custom_fields', customFields)
                        }}
                      />
                    )}
                    {field.type === 'select' && field.options && (
                      <Select onValueChange={(value) => {
                        const customFields = form.getValues('custom_fields') || {}
                        customFields[field.name] = value
                        form.setValue('custom_fields', customFields)
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {field.type === 'boolean' && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Switch
                          id={field.name}
                          onCheckedChange={(checked) => {
                            const customFields = form.getValues('custom_fields') || {}
                            customFields[field.name] = checked
                            form.setValue('custom_fields', customFields)
                          }}
                        />
                        <Label htmlFor={field.name}>{field.label}</Label>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {customFields.length === 0 && (
              <p className="text-sm text-gray-500">No custom fields defined. Click "Add Custom Field" to create one.</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading 
                ? (mode === 'create' ? 'Creating Profile...' : 'Saving Profile...') 
                : (mode === 'create' ? 'Create Contact Profile' : 'Save Profile Changes')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
