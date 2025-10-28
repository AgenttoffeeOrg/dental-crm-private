'use client'

import React, { useEffect, useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Loader2, User } from 'lucide-react'
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

  // Load existing data from API
  useEffect(() => {
    loadExistingProfile()
  }, [])

  const loadExistingProfile = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        if (data.profile) {
          // Pre-fill form with existing data
          updateFieldValue('full_name', data.profile.full_name || '')
          updateFieldValue('professional_title', data.profile.professional_title || '')
          updateFieldValue('phone_mobile', data.profile.phone_mobile || '')
          updateFieldValue('phone_office', data.profile.phone_office || '')
          updateFieldValue('bio', data.profile.bio || '')
          updateFieldValue('profile_photo_url', data.profile.profile_photo_url || '')
          setPhotoUrl(data.profile.profile_photo_url || '')
        }
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

  return (
    <div className="space-y-6">
      {/* Profile Photo Upload */}
      <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
        <Avatar className="h-24 w-24">
          <AvatarImage src={photoUrl} alt="Profile photo" />
          <AvatarFallback className="text-2xl bg-blue-600 text-white">
            {getInitials() || <User className="h-10 w-10" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Profile Photo</h3>
          <p className="text-xs text-gray-500 mb-3">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
}

