'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FileText } from 'lucide-react'

/**
 * LegalDetailsStep
 * 
 * Step 7: Legal Details
 * Fields:
 * - Legal Name (optional)
 * - Tax ID (optional)
 * - Registration Number (optional)
 * - Legal Address (optional - 6 fields)
 */

export function LegalDetailsStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  return (
    <div className="space-y-4">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <FileText className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="text-sm">
            Legal information is optional but helpful for contracts, invoicing, and compliance.
            All data is stored securely and kept confidential.
          </div>
        </AlertDescription>
      </Alert>

      {/* Legal Name */}
      <WizardFieldWrapper
        fieldName="legal_name"
        label="Legal Name"
        isRequired={false}
        helpText="The official registered name of your organization"
      >
        <Input
          id="legal_name"
          value={stepData.legal_name || ''}
          onChange={(e) => updateFieldValue('legal_name', e.target.value)}
          placeholder="e.g., DentalCare Practice Ltd."
          className="text-base"
        />
      </WizardFieldWrapper>

      {/* Tax ID & Registration Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <WizardFieldWrapper
          fieldName="tax_id"
          label="Tax ID / VAT Number"
          isRequired={false}
          helpText="Your tax identification number"
        >
          <Input
            id="tax_id"
            value={stepData.tax_id || ''}
            onChange={(e) => updateFieldValue('tax_id', e.target.value)}
            placeholder="e.g., GB123456789"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="registration_number"
          label="Company Registration Number"
          isRequired={false}
          helpText="Your company's registration number"
        >
          <Input
            id="registration_number"
            value={stepData.registration_number || ''}
            onChange={(e) => updateFieldValue('registration_number', e.target.value)}
            placeholder="e.g., 12345678"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Legal Address Section */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wide">Legal Address</h3>
        
        {/* Address Line 1 */}
        <WizardFieldWrapper
          fieldName="legal_address_line1"
          label="Address Line 1"
          isRequired={false}
          helpText="Street address, P.O. box, company name, c/o"
        >
          <Input
            id="legal_address_line1"
            value={stepData.legal_address_line1 || ''}
            onChange={(e) => updateFieldValue('legal_address_line1', e.target.value)}
            placeholder="e.g., 123 High Street"
            className="text-base"
          />
        </WizardFieldWrapper>

        {/* Address Line 2 */}
        <WizardFieldWrapper
          fieldName="legal_address_line2"
          label="Address Line 2"
          isRequired={false}
          helpText="Apartment, suite, unit, building, floor, etc."
        >
          <Input
            id="legal_address_line2"
            value={stepData.legal_address_line2 || ''}
            onChange={(e) => updateFieldValue('legal_address_line2', e.target.value)}
            placeholder="e.g., Suite 200"
            className="text-base"
          />
        </WizardFieldWrapper>

        {/* City & State */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WizardFieldWrapper
            fieldName="legal_city"
            label="City"
            isRequired={false}
          >
            <Input
              id="legal_city"
              value={stepData.legal_city || ''}
              onChange={(e) => updateFieldValue('legal_city', e.target.value)}
              placeholder="e.g., London"
              className="text-base"
            />
          </WizardFieldWrapper>

          <WizardFieldWrapper
            fieldName="legal_state"
            label="State / County"
            isRequired={false}
          >
            <Input
              id="legal_state"
              value={stepData.legal_state || ''}
              onChange={(e) => updateFieldValue('legal_state', e.target.value)}
              placeholder="e.g., Greater London"
              className="text-base"
            />
          </WizardFieldWrapper>
        </div>

        {/* Postal Code & Country */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WizardFieldWrapper
            fieldName="legal_postal_code"
            label="Postal Code"
            isRequired={false}
          >
            <Input
              id="legal_postal_code"
              value={stepData.legal_postal_code || ''}
              onChange={(e) => updateFieldValue('legal_postal_code', e.target.value)}
              placeholder="e.g., SW1A 1AA"
              className="text-base"
            />
          </WizardFieldWrapper>

          <WizardFieldWrapper
            fieldName="legal_country"
            label="Country"
            isRequired={false}
          >
            <Select
              value={stepData.legal_country || 'UK'}
              onValueChange={(value) => updateFieldValue('legal_country', value)}
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
    </div>
  )
}

