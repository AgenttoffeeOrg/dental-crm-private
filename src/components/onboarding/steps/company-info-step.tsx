'use client'

import React, { useEffect, useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { WizardSubTabs } from '../wizard-sub-tabs'
import { ContactInfoStep } from './contact-info-step'
import { LegalDetailsStep } from './legal-details-step'
import { BusinessSettingsStep } from './business-settings-step'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Loader2, Building2, Users, Phone, Mail, Globe, FileText, DollarSign, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

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
  const [hasTenant, setHasTenant] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load existing organization data
  // ✅ FIX: Wait for currentStepId to be set, and re-run when step changes
  useEffect(() => {
    // Only run if currentStepId is available (step is loaded)
    if (currentStepId === 'organization_setup') {
      loadExistingData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepId]) // We intentionally don't include formData or loadExistingData to avoid infinite loops

  const loadExistingData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id, active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser) return

      const tenantId = appUser.active_tenant_id || appUser.tenant_id
      setHasTenant(!!tenantId)

      if (tenantId) {
        // Load existing tenant/organization data (load all relevant fields)
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name, description, specialty, website_url, logo_url, industry, company_size, founded_date')
          .eq('id', tenantId)
          .single()

        if (tenant) {
          // ✅ FIX: Always pre-fill from DB data (DB is source of truth)
          // Only skip if formData already has a non-empty value (user edited it)
          const existingStepData = formData['organization_setup'] || {}
          
          // Force pre-fill from DB (DB data takes precedence over saved empty values)
          if (tenant.name && (!existingStepData.name || existingStepData.name === '')) {
            updateFieldValue('name', tenant.name)
          }
          if (tenant.description && (!existingStepData.description || existingStepData.description === '')) {
            updateFieldValue('description', tenant.description)
          }
          if (tenant.specialty && (!existingStepData.specialty || existingStepData.specialty === '')) {
            updateFieldValue('specialty', tenant.specialty)
          }
          if (tenant.logo_url && (!existingStepData.logo_url || existingStepData.logo_url === '') && !logoUrl) {
            setLogoUrl(tenant.logo_url)
            updateFieldValue('logo_url', tenant.logo_url)
          }
        }
      }
    } catch (error) {
      console.error('Error loading organization data:', error)
    } finally {
      setLoading(false)
    }
  }

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

      // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
      const { data: appUser } = await supabase
        .from('app_users')
        .select('tenant_id, active_tenant_id')
        .eq('id', user.id)
        .single()

      if (!appUser) throw new Error('User profile not found')

      const tenantId = appUser.active_tenant_id || appUser.tenant_id
      
      if (!tenantId) {
        toast.error('Please create an organization first before uploading a logo')
        return
      }

      const fileName = `${tenantId}/${Date.now()}-${file.name}`
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Show message if user doesn't have an organization yet
  if (!hasTenant) {
    return (
      <div className="space-y-6">
        <Alert className="border-amber-200 bg-amber-50">
          <Building2 className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <div className="font-medium mb-1">No Organization Found</div>
            <div className="text-sm">
              You don't have an organization yet. You can skip this step and create an organization later from the Settings page, 
              or create one now by clicking "Create Organization" in the dashboard.
            </div>
          </AlertDescription>
        </Alert>
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Organization setup is optional for solo users. You can complete your profile and create an organization later.
          </p>
        </div>
      </div>
    )
  }

  // Company Info Tab Content
  const companyInfoContent = (
    <div className="space-y-4">
      {/* Company Logo */}
      <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
        <Avatar className="h-16 w-16 rounded-lg">
          <AvatarImage src={logoUrl} alt="Company logo" />
          <AvatarFallback className="text-lg bg-blue-600 text-white rounded-lg">
            {stepData.name?.slice(0, 2).toUpperCase() || <Building2 className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-900 mb-0.5">Company Logo</h3>
          <p className="text-xs text-gray-500 mb-2">
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

      {/* Organization Name */}
      <WizardFieldWrapper
        fieldName="name"
        label="Organization Name"
        isRequired={false}
        helpText="The official name of your organization"
      >
        <Input
          id="name"
          value={stepData.name || ''}
          onChange={(e) => updateFieldValue('name', e.target.value)}
          placeholder="e.g., Bright Smile Dental Practice"
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Specialty */}
      <WizardFieldWrapper
        fieldName="specialty"
        label="Practice Specialty"
        isRequired={false}
        helpText="Your primary dental specialty"
      >
        <Select
          value={stepData.specialty || ''}
          onValueChange={(value) => updateFieldValue('specialty', value)}
        >
          <SelectTrigger className="text-base">
            <SelectValue placeholder="Select specialty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="general">General Dentistry</SelectItem>
            <SelectItem value="cosmetic">Cosmetic Dentistry</SelectItem>
            <SelectItem value="orthodontics">Orthodontics</SelectItem>
            <SelectItem value="pediatric">Pediatric Dentistry</SelectItem>
            <SelectItem value="endodontics">Endodontics</SelectItem>
            <SelectItem value="periodontics">Periodontics</SelectItem>
            <SelectItem value="oral_surgery">Oral Surgery</SelectItem>
            <SelectItem value="prosthodontics">Prosthodontics</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </WizardFieldWrapper>

      {/* Description */}
      <WizardFieldWrapper
        fieldName="description"
        label="Description"
        isRequired={false}
        helpText="A brief description of your organization (max 500 characters)"
      >
        <Textarea
          id="description"
          value={stepData.description || ''}
          onChange={(e) => updateFieldValue('description', e.target.value)}
          placeholder="Tell us about your practice, services, and what makes you unique..."
          rows={4}
          maxLength={500}
          className="text-base resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(stepData.description || '').length}/500 characters
        </div>
      </WizardFieldWrapper>
    </div>
  )

  // Sub-tabs for Organization Setup
  const orgTabs = [
    {
      id: 'company',
      label: 'Company Info',
      icon: <Building2 className="h-4 w-4" />,
      content: companyInfoContent,
      isRequired: true,
    },
    {
      id: 'contact',
      label: 'Contact',
      icon: <Phone className="h-4 w-4" />,
      content: <ContactInfoStep />,
      isRequired: false,
    },
    {
      id: 'legal',
      label: 'Legal',
      icon: <FileText className="h-4 w-4" />,
      content: <LegalDetailsStep />,
      isRequired: false,
    },
    {
      id: 'business',
      label: 'Business',
      icon: <DollarSign className="h-4 w-4" />,
      content: <BusinessSettingsStep />,
      isRequired: false,
    },
  ]

  return (
    <WizardSubTabs
      tabs={orgTabs}
      defaultTab="company"
    />
  )
}

