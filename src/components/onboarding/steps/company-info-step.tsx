'use client'

import React, { useEffect, useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Loader2, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

/**
 * CompanyInfoStep
 * 
 * Step 6: Company Information
 * Fields:
 * - Company Name (required)
 * - Company Size (optional)
 * - Industry (optional)
 * - Founded Date (optional)
 * - Company Description (optional)
 * - Company Logo (optional)
 */

export function CompanyInfoStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}
  
  const [uploading, setUploading] = useState(false)
  const [logoUrl, setLogoUrl] = useState(stepData.logo_url || '')

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB')
      return
    }

    try {
      setUploading(true)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get tenant_id
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser) throw new Error('User profile not found')

      const fileName = `${appUser.tenant_id}/${Date.now()}-${file.name}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('organization-logos')
        .upload(fileName, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('organization-logos')
        .getPublicUrl(fileName)

      const publicUrl = urlData.publicUrl
      setLogoUrl(publicUrl)
      updateFieldValue('logo_url', publicUrl)
      
      toast.success('Logo uploaded successfully!')
    } catch (error: any) {
      console.error('Error uploading logo:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Company Logo */}
      <div className="flex items-center gap-6 pb-6 border-b border-gray-200">
        <Avatar className="h-24 w-24 rounded-lg">
          <AvatarImage src={logoUrl} alt="Company logo" />
          <AvatarFallback className="text-2xl bg-blue-600 text-white rounded-lg">
            {stepData.name?.slice(0, 2).toUpperCase() || <Building2 className="h-10 w-10" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-1">Company Logo</h3>
          <p className="text-xs text-gray-500 mb-3">
            Upload your organization's logo. JPG, PNG or SVG. Max size 5MB.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </>
              )}
            </Button>
            {logoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLogoUrl('')
                  updateFieldValue('logo_url', '')
                }}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleLogoUpload}
            className="hidden"
          />
        </div>
      </div>

      {/* Company Name */}
      <WizardFieldWrapper
        fieldName="name"
        label="Company Name"
        isRequired={true}
        helpText="The official name of your organization"
      >
        <Input
          id="name"
          value={stepData.name || ''}
          onChange={(e) => updateFieldValue('name', e.target.value)}
          placeholder="e.g., DentalCare Practice"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Company Size & Industry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <WizardFieldWrapper
          fieldName="company_size"
          label="Company Size"
          isRequired={false}
          helpText="Number of employees"
        >
          <Select
            value={stepData.company_size || ''}
            onValueChange={(value) => updateFieldValue('company_size', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1-10">1-10 employees</SelectItem>
              <SelectItem value="11-50">11-50 employees</SelectItem>
              <SelectItem value="51-200">51-200 employees</SelectItem>
              <SelectItem value="201-500">201-500 employees</SelectItem>
              <SelectItem value="501-1000">501-1000 employees</SelectItem>
              <SelectItem value="1000+">1000+ employees</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="industry"
          label="Industry"
          isRequired={false}
          helpText="Your primary industry"
        >
          <Input
            id="industry"
            value={stepData.industry || 'Dental'}
            onChange={(e) => updateFieldValue('industry', e.target.value)}
            placeholder="e.g., Dental, Healthcare"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Founded Date */}
      <WizardFieldWrapper
        fieldName="founded_date"
        label="Founded Date"
        isRequired={false}
        helpText="When was your organization established?"
      >
        <Input
          id="founded_date"
          type="date"
          value={stepData.founded_date || ''}
          onChange={(e) => updateFieldValue('founded_date', e.target.value)}
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Company Description */}
      <WizardFieldWrapper
        fieldName="company_description"
        label="Company Description"
        isRequired={false}
        helpText="A brief description of your organization (max 1000 characters)"
      >
        <Textarea
          id="company_description"
          value={stepData.company_description || ''}
          onChange={(e) => updateFieldValue('company_description', e.target.value)}
          placeholder="Tell us about your organization, services, mission, and values..."
          rows={5}
          maxLength={1000}
          className="text-base resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(stepData.company_description || '').length}/1000 characters
        </div>
      </WizardFieldWrapper>
    </div>
  )
}

