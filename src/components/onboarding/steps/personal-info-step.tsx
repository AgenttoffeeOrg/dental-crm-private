'use client'

import React, { useEffect, useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { WizardSubTabs } from '../wizard-sub-tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Upload, Loader2, User, Briefcase, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

/**
 * PersonalInfoStep
 * 
 * Step 2: Personal Information
 * Fields:
 * - Full Name (required)
 * - Professional Title (optional)
 * - Mobile Phone (optional)
 * - Office Phone (optional)
 * - Bio (optional)
 * - Profile Photo (optional)
 */

export function PersonalInfoStep() {
  const { updateFieldValue, formData, currentStepId, currentStepData } = useWizard()
  const stepData = formData[currentStepId] || {}
  
  const [uploading, setUploading] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(stepData.profile_photo_url || '')

  // Load existing data from app_users (pre-filled from signup) and API
  useEffect(() => {
    loadExistingProfile()
  }, [])

  const loadExistingProfile = async () => {
    try {
      const supabase = createClient()
      
      // First, get user's app_user record (name from signup)
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: appUser } = await supabase
          .from('app_users')
          .select('full_name, professional_title, phone_mobile, phone_office, bio, profile_photo_url')
          .eq('id', user.id)
          .single()

        if (appUser) {
          // Pre-fill with data from signup (name) and existing profile data
          if (appUser.full_name && !stepData.full_name) {
            updateFieldValue('full_name', appUser.full_name)
          }
          if (appUser.professional_title && !stepData.professional_title) {
            updateFieldValue('professional_title', appUser.professional_title)
          }
          if (appUser.phone_mobile && !stepData.phone_mobile) {
            updateFieldValue('phone_mobile', appUser.phone_mobile)
          }
          if (appUser.phone_office && !stepData.phone_office) {
            updateFieldValue('phone_office', appUser.phone_office)
          }
          if (appUser.bio && !stepData.bio) {
            updateFieldValue('bio', appUser.bio)
          }
          if (appUser.profile_photo_url && !photoUrl) {
            updateFieldValue('profile_photo_url', appUser.profile_photo_url)
            setPhotoUrl(appUser.profile_photo_url)
          }
        }
      }

      // Also try loading from /api/user/profile if it exists (for additional data)
      try {
        const response = await fetch('/api/user/profile')
        if (response.ok) {
          const data = await response.json()
          if (data.profile) {
            // Only update fields that aren't already set
            if (!stepData.full_name && data.profile.full_name) {
              updateFieldValue('full_name', data.profile.full_name)
            }
            if (!stepData.professional_title && data.profile.professional_title) {
              updateFieldValue('professional_title', data.profile.professional_title)
            }
            if (!stepData.phone_mobile && data.profile.phone_mobile) {
              updateFieldValue('phone_mobile', data.profile.phone_mobile)
            }
            if (!stepData.phone_office && data.profile.phone_office) {
              updateFieldValue('phone_office', data.profile.phone_office)
            }
            if (!stepData.bio && data.profile.bio) {
              updateFieldValue('bio', data.profile.bio)
            }
            if (!photoUrl && data.profile.profile_photo_url) {
              updateFieldValue('profile_photo_url', data.profile.profile_photo_url)
              setPhotoUrl(data.profile.profile_photo_url)
            }
          }
        }
      } catch (apiError) {
        // API endpoint might not exist - that's okay
        console.log('Profile API not available, using app_users data only')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      const supabase = createClient()

      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Upload to Supabase storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl
      setPhotoUrl(publicUrl)
      updateFieldValue('profile_photo_url', publicUrl)
      
      toast.success('Photo uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading photo:', error)
      toast.error(error.message || 'Failed to upload photo')
    } finally {
      setUploading(false)
    }
  }

  const getFieldError = (fieldName: string) => {
    // This would be populated from validation context
    return undefined
  }

  const getInitials = () => {
    const name = stepData.full_name || ''
    const parts = name.trim().split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  // Personal Information Tab Content
  const personalInfoContent = (
    <div className="space-y-4">
      {/* Profile Photo Upload */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <Avatar className="h-16 w-16">
          <AvatarImage src={photoUrl} alt="Profile photo" />
          <AvatarFallback className="text-lg bg-blue-600 text-white">
            {getInitials() || <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-0.5">Profile Photo</h3>
          <p className="text-xs text-gray-500 mb-2">
            Upload a professional photo. JPG, PNG or GIF. Max size 5MB.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById('photo-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Photo
                </>
              )}
            </Button>
            {photoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPhotoUrl('')
                  updateFieldValue('profile_photo_url', '')
                }}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            id="photo-upload"
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Full Name */}
      <WizardFieldWrapper
        fieldName="full_name"
        label="Full Name"
        isRequired={true}
        helpText="Your full name as you'd like it to appear in the system"
        error={getFieldError('full_name')}
      >
        <Input
          id="full_name"
          value={stepData.full_name || ''}
          onChange={(e) => updateFieldValue('full_name', e.target.value)}
          placeholder="e.g., Dr. Sarah Johnson"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Professional Title */}
      <WizardFieldWrapper
        fieldName="professional_title"
        label="Professional Title"
        isRequired={false}
        helpText="Your role or title (e.g., General Dentist, Practice Manager)"
        error={getFieldError('professional_title')}
      >
        <Input
          id="professional_title"
          value={stepData.professional_title || ''}
          onChange={(e) => updateFieldValue('professional_title', e.target.value)}
          placeholder="e.g., General Dentist"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Phone Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardFieldWrapper
          fieldName="phone_mobile"
          label="Mobile Phone"
          isRequired={false}
          helpText="Your personal mobile number"
          error={getFieldError('phone_mobile')}
        >
          <Input
            id="phone_mobile"
            type="tel"
            value={stepData.phone_mobile || ''}
            onChange={(e) => updateFieldValue('phone_mobile', e.target.value)}
            placeholder="+44 7700 900000"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="phone_office"
          label="Office Phone"
          isRequired={false}
          helpText="Your office or desk phone number"
          error={getFieldError('phone_office')}
        >
          <Input
            id="phone_office"
            type="tel"
            value={stepData.phone_office || ''}
            onChange={(e) => updateFieldValue('phone_office', e.target.value)}
            placeholder="+44 20 7946 0958"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Bio */}
      <WizardFieldWrapper
        fieldName="bio"
        label="Bio"
        isRequired={false}
        helpText="A brief description about yourself (max 500 characters)"
        error={getFieldError('bio')}
      >
        <Textarea
          id="bio"
          value={stepData.bio || ''}
          onChange={(e) => updateFieldValue('bio', e.target.value)}
          placeholder="Tell us a bit about yourself, your specialties, and experience..."
          rows={4}
          maxLength={500}
          className="text-base resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(stepData.bio || '').length}/500 characters
        </div>
      </WizardFieldWrapper>
    </div>
  )

  // Work Preferences Tab Content
  const workPreferencesContent = (
    <div className="space-y-4">
      {/* Timezone */}
      <WizardFieldWrapper
        fieldName="timezone"
        label="Timezone"
        isRequired={false}
        helpText="Your local timezone for scheduling and notifications"
        error={getFieldError('timezone')}
      >
        <Select
          value={stepData.timezone || 'Europe/London'}
          onValueChange={(value) => updateFieldValue('timezone', value)}
        >
          <SelectTrigger className="text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Europe/London">UK Time (GMT/BST)</SelectItem>
            <SelectItem value="America/New_York">Eastern Time (ET)</SelectItem>
            <SelectItem value="America/Chicago">Central Time (CT)</SelectItem>
            <SelectItem value="America/Denver">Mountain Time (MT)</SelectItem>
            <SelectItem value="America/Los_Angeles">Pacific Time (PT)</SelectItem>
            <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
            <SelectItem value="Asia/Kolkata">Mumbai (IST)</SelectItem>
            <SelectItem value="Australia/Sydney">Sydney (AEDT)</SelectItem>
          </SelectContent>
        </Select>
      </WizardFieldWrapper>

      {/* Language */}
      <WizardFieldWrapper
        fieldName="language"
        label="Language"
        isRequired={false}
        helpText="Your preferred language for the interface"
        error={getFieldError('language')}
      >
        <Select
          value={stepData.language || 'en'}
          onValueChange={(value) => updateFieldValue('language', value)}
        >
          <SelectTrigger className="text-base">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="es">Spanish</SelectItem>
            <SelectItem value="fr">French</SelectItem>
            <SelectItem value="de">German</SelectItem>
            <SelectItem value="zh">Chinese</SelectItem>
          </SelectContent>
        </Select>
      </WizardFieldWrapper>

      {/* Date & Time Formats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardFieldWrapper
          fieldName="date_format"
          label="Date Format"
          isRequired={false}
          helpText="How dates should be displayed"
          error={getFieldError('date_format')}
        >
          <Select
            value={stepData.date_format || 'DD/MM/YYYY'}
            onValueChange={(value) => updateFieldValue('date_format', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY (25/10/2025)</SelectItem>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY (10/25/2025)</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-10-25)</SelectItem>
              <SelectItem value="DD MMM YYYY">DD MMM YYYY (25 Oct 2025)</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="time_format"
          label="Time Format"
          isRequired={false}
          helpText="12-hour (AM/PM) or 24-hour format"
          error={getFieldError('time_format')}
        >
          <Select
            value={stepData.time_format || '24h'}
            onValueChange={(value) => updateFieldValue('time_format', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="12h">12-hour (3:30 PM)</SelectItem>
              <SelectItem value="24h">24-hour (15:30)</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>
      </div>

      <div className="pt-3 border-t border-gray-200 text-sm text-gray-600">
        <p className="flex items-start gap-2">
          <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
          You can configure your working hours and availability later from your profile settings.
        </p>
      </div>
    </div>
  )

  // Sub-tabs for Profile Setup
  const profileTabs = [
    {
      id: 'personal',
      label: 'Personal Info',
      icon: <User className="h-4 w-4" />,
      content: personalInfoContent,
      isRequired: true,
    },
    {
      id: 'work',
      label: 'Work Preferences',
      icon: <Briefcase className="h-4 w-4" />,
      content: workPreferencesContent,
      isRequired: false,
    },
  ]

  return (
    <WizardSubTabs
      tabs={profileTabs}
      defaultTab="personal"
    />
  )
}

