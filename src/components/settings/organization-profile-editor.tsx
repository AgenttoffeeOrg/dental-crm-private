'use client'

import { useEffect, useState, useCallback } from 'react'
import { Save, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import type { Tenant } from '@/types/database'

// Import section components
import { CompanyInformationSection } from './organization-sections/company-information-section'
import { LegalDetailsSection } from './organization-sections/legal-details-section'
import { ContactInformationSection } from './organization-sections/contact-information-section'
import { BusinessSettingsSection } from './organization-sections/business-settings-section'
import { OrganizationLogoUpload } from './organization-sections/organization-logo-upload'

export function OrganizationProfileEditor() {
  const { appUser } = useAuth()
  const [organizationData, setOrganizationData] = useState<Partial<Tenant>>({})
  const [originalData, setOriginalData] = useState<Partial<Tenant>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // STRICT: Use only active_tenant_id for context (no fallback)
  const activeTenantId = appUser?.active_tenant_id

  // Load organization data
  const loadOrganizationData = useCallback(async () => {
    if (!activeTenantId) return

    setLoading(true)
    try {
      const response = await fetch('/api/org/profile')
      if (!response.ok) {
        throw new Error('Failed to load organization profile')
      }

      const data = await response.json()
      setOrganizationData(data)
      setOriginalData(data)
      setHasUnsavedChanges(false)
    } catch (error: any) {
      console.error('[OrganizationProfileEditor] Error loading data:', error)
      toast.error('Failed to load organization profile')
    } finally {
      setLoading(false)
    }
  }, [activeTenantId])

  // Load data on mount
  useEffect(() => {
    loadOrganizationData()
  }, [loadOrganizationData])

  // Check for unsaved changes
  useEffect(() => {
    const changed = JSON.stringify(organizationData) !== JSON.stringify(originalData)
    setHasUnsavedChanges(changed)
  }, [organizationData, originalData])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Handle field changes
  const handleFieldChange = (field: keyof Tenant, value: any) => {
    setOrganizationData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Validation
  const validateData = (): { valid: boolean; errors: string[] } => {
    const errors: string[] = []

    // Validate email formats
    if (organizationData.email_main && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizationData.email_main)) {
      errors.push('Main email address is invalid')
    }
    if (organizationData.email_support && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(organizationData.email_support)) {
      errors.push('Support email address is invalid')
    }

    // Validate website URL
    if (organizationData.website) {
      try {
        new URL(organizationData.website)
      } catch {
        errors.push('Website URL is invalid')
      }
    }

    // Validate phone numbers (basic check)
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    if (organizationData.phone_main && !phoneRegex.test(organizationData.phone_main)) {
      errors.push('Main phone number contains invalid characters')
    }
    if (organizationData.phone_support && !phoneRegex.test(organizationData.phone_support)) {
      errors.push('Support phone number contains invalid characters')
    }

    // Validate data retention days
    if (organizationData.data_retention_days && (organizationData.data_retention_days < 1 || organizationData.data_retention_days > 3650)) {
      errors.push('Data retention period must be between 1 and 3650 days')
    }

    return { valid: errors.length === 0, errors }
  }

  // Save changes
  const handleSave = async () => {
    const validation = validateData()
    if (!validation.valid) {
      toast.error(validation.errors[0])
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/org/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(organizationData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save')
      }

      const updatedData = await response.json()
      setOrganizationData(updatedData)
      setOriginalData(updatedData)
      setHasUnsavedChanges(false)
      setLastSaved(new Date())
      toast.success('Organization profile updated successfully')
    } catch (error: any) {
      console.error('[OrganizationProfileEditor] Error saving:', error)
      toast.error(error.message || 'Failed to save organization profile')
    } finally {
      setSaving(false)
    }
  }

  // Discard changes
  const handleDiscard = () => {
    setOrganizationData(originalData)
    setHasUnsavedChanges(false)
    toast.info('Changes discarded')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2 pb-4">
      {/* Sticky Save Bar - Ultra Compact */}
      {hasUnsavedChanges && (
        <div className="sticky top-0 z-10 bg-white border-b border-amber-300 shadow-sm">
          <div className="max-w-6xl mx-auto px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3 text-amber-600" />
              <span className="text-[11px] font-medium text-amber-700">Unsaved</span>
            </div>
            <div className="flex gap-1.5">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDiscard}
                disabled={saving}
                className="h-6 text-[11px] px-2"
              >
                Discard
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving}
                className="h-6 text-[11px] px-2 bg-amber-600 hover:bg-amber-700"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-3 w-3 mr-1" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Last Saved - Compact */}
      {lastSaved && !hasUnsavedChanges && (
        <div className="bg-green-50 border border-green-200 rounded px-2.5 py-1.5 flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3 text-green-600" />
          <span className="text-[11px] text-green-800">
            Saved {lastSaved.toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Organization Sections - Ultra Compact */}
      <div className="max-w-6xl mx-auto space-y-2">
        {/* Organization Logo */}
        {activeTenantId && (
          <OrganizationLogoUpload
            tenantId={activeTenantId}
            currentLogoUrl={organizationData.logo_url}
            onLogoUpdated={(newUrl) => handleFieldChange('logo_url', newUrl)}
            disabled={saving}
          />
        )}

        {/* Company Information */}
        <CompanyInformationSection
          data={organizationData}
          onChange={handleFieldChange}
          disabled={saving}
        />

        {/* Contact Information */}
        <ContactInformationSection
          data={organizationData}
          onChange={handleFieldChange}
          disabled={saving}
        />

        {/* Legal Details */}
        <LegalDetailsSection
          data={organizationData}
          onChange={handleFieldChange}
          disabled={saving}
        />

        {/* Business Settings */}
        <BusinessSettingsSection
          data={organizationData}
          onChange={handleFieldChange}
          disabled={saving}
        />
      </div>
    </div>
  )
}

