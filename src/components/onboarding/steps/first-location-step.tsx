'use client'

import React, { useEffect } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MapPin, Building, Phone, Mail, Globe } from 'lucide-react'

/**
 * FirstLocationStep
 * 
 * Step 10: First Location Setup
 * Fields:
 * - Location Name (required)
 * - Location Display Name (optional)
 * - Location Type (required)
 * - Address (required - 6 fields)
 * - Phone (optional)
 * - Email (optional)
 * - Website (optional)
 */

export function FirstLocationStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  useEffect(() => {
    if (!stepData.location_type) updateFieldValue('location_type', 'clinic')
    if (!stepData.location_country) updateFieldValue('location_country', 'UK')
  }, [])

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <MapPin className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="text-sm">
            Set up your first practice location. You can add more locations later from your settings.
            This will be your primary location.
          </div>
        </AlertDescription>
      </Alert>

      {/* Basic Information */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Building className="h-4 w-4 text-gray-600" />
          Location Information
        </div>

        <WizardFieldWrapper
          fieldName="location_name"
          label="Location Name"
          isRequired={true}
          helpText="Internal name for this location (e.g., 'Main Clinic', 'Downtown Branch')"
        >
          <Input
            id="location_name"
            value={stepData.location_name || ''}
            onChange={(e) => updateFieldValue('location_name', e.target.value)}
            placeholder="e.g., Main Clinic"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="location_display_name"
          label="Display Name (Optional)"
          isRequired={false}
          helpText="Public-facing name shown to patients"
        >
          <Input
            id="location_display_name"
            value={stepData.location_display_name || ''}
            onChange={(e) => updateFieldValue('location_display_name', e.target.value)}
            placeholder="e.g., DentalCare - Central London"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="location_type"
          label="Location Type"
          isRequired={true}
          helpText="The type of this location"
        >
          <Select
            value={stepData.location_type || 'clinic'}
            onValueChange={(value) => updateFieldValue('location_type', value)}
          >
            <SelectTrigger className="text-base">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="headquarters">Headquarters</SelectItem>
              <SelectItem value="branch">Branch Office</SelectItem>
              <SelectItem value="clinic">Clinic</SelectItem>
              <SelectItem value="mobile">Mobile Unit</SelectItem>
            </SelectContent>
          </Select>
        </WizardFieldWrapper>
      </div>

      {/* Physical Address */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <MapPin className="h-4 w-4 text-gray-600" />
          Physical Address
        </div>

        <WizardFieldWrapper
          fieldName="location_address_line1"
          label="Address Line 1"
          isRequired={true}
          helpText="Street address, P.O. box"
        >
          <Input
            id="location_address_line1"
            value={stepData.location_address_line1 || ''}
            onChange={(e) => updateFieldValue('location_address_line1', e.target.value)}
            placeholder="e.g., 123 High Street"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="location_address_line2"
          label="Address Line 2 (Optional)"
          isRequired={false}
          helpText="Apartment, suite, unit, building, floor"
        >
          <Input
            id="location_address_line2"
            value={stepData.location_address_line2 || ''}
            onChange={(e) => updateFieldValue('location_address_line2', e.target.value)}
            placeholder="e.g., Suite 200"
            className="text-base"
          />
        </WizardFieldWrapper>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WizardFieldWrapper
            fieldName="location_city"
            label="City"
            isRequired={true}
          >
            <Input
              id="location_city"
              value={stepData.location_city || ''}
              onChange={(e) => updateFieldValue('location_city', e.target.value)}
              placeholder="e.g., London"
              className="text-base"
            />
          </WizardFieldWrapper>

          <WizardFieldWrapper
            fieldName="location_state"
            label="State / County (Optional)"
            isRequired={false}
          >
            <Input
              id="location_state"
              value={stepData.location_state || ''}
              onChange={(e) => updateFieldValue('location_state', e.target.value)}
              placeholder="e.g., Greater London"
              className="text-base"
            />
          </WizardFieldWrapper>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WizardFieldWrapper
            fieldName="location_postal_code"
            label="Postal Code"
            isRequired={true}
          >
            <Input
              id="location_postal_code"
              value={stepData.location_postal_code || ''}
              onChange={(e) => updateFieldValue('location_postal_code', e.target.value)}
              placeholder="e.g., SW1A 1AA"
              className="text-base"
            />
          </WizardFieldWrapper>

          <WizardFieldWrapper
            fieldName="location_country"
            label="Country"
            isRequired={true}
          >
            <Select
              value={stepData.location_country || 'UK'}
              onValueChange={(value) => updateFieldValue('location_country', value)}
            >
              <SelectTrigger className="text-base">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UK">United Kingdom</SelectItem>
                <SelectItem value="US">United States</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="AU">Australia</SelectItem>
                <SelectItem value="NZ">New Zealand</SelectItem>
                <SelectItem value="IE">Ireland</SelectItem>
                <SelectItem value="IN">India</SelectItem>
                <SelectItem value="SG">Singapore</SelectItem>
                <SelectItem value="AE">United Arab Emirates</SelectItem>
              </SelectContent>
            </Select>
          </WizardFieldWrapper>
        </div>
      </div>

      {/* Contact Details */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Phone className="h-4 w-4 text-gray-600" />
          Contact Details (Optional)
        </div>

        <WizardFieldWrapper
          fieldName="location_phone"
          label="Phone Number"
          isRequired={false}
          helpText="Location's direct phone number"
        >
          <Input
            id="location_phone"
            type="tel"
            value={stepData.location_phone || ''}
            onChange={(e) => updateFieldValue('location_phone', e.target.value)}
            placeholder="+44 20 7946 0958"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="location_email"
          label="Email Address"
          isRequired={false}
          helpText="Location's direct email"
        >
          <Input
            id="location_email"
            type="email"
            value={stepData.location_email || ''}
            onChange={(e) => updateFieldValue('location_email', e.target.value)}
            placeholder="clinic@dentalcare.com"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="location_website_url"
          label="Website URL"
          isRequired={false}
          helpText="Location-specific website or page"
        >
          <Input
            id="location_website_url"
            type="url"
            value={stepData.location_website_url || ''}
            onChange={(e) => updateFieldValue('location_website_url', e.target.value)}
            placeholder="https://www.dentalcare.com/locations/main"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Preview Card */}
      {stepData.location_name && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 mt-6">
          <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-blue-600" />
            Location Preview
          </h4>
          
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div>
              <h5 className="font-semibold text-gray-900 text-lg">{stepData.location_name}</h5>
              {stepData.location_display_name && (
                <p className="text-sm text-gray-600">{stepData.location_display_name}</p>
              )}
              <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                {stepData.location_type || 'clinic'}
              </span>
            </div>
            
            {(stepData.location_address_line1 || stepData.location_city) && (
              <div className="text-sm text-gray-600">
                {stepData.location_address_line1 && <div>{stepData.location_address_line1}</div>}
                {stepData.location_address_line2 && <div>{stepData.location_address_line2}</div>}
                {stepData.location_city && (
                  <div>
                    {stepData.location_city}
                    {stepData.location_state && `, ${stepData.location_state}`}
                    {stepData.location_postal_code && ` ${stepData.location_postal_code}`}
                  </div>
                )}
                {stepData.location_country && <div>{stepData.location_country}</div>}
              </div>
            )}

            {(stepData.location_phone || stepData.location_email || stepData.location_website_url) && (
              <div className="pt-2 border-t border-gray-200 space-y-1 text-sm">
                {stepData.location_phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    {stepData.location_phone}
                  </div>
                )}
                {stepData.location_email && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    {stepData.location_email}
                  </div>
                )}
                {stepData.location_website_url && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Globe className="h-4 w-4" />
                    <a href={stepData.location_website_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Visit Website
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

