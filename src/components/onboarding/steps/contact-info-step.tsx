'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Input } from '@/components/ui/input'
import { Phone, Mail, Globe } from 'lucide-react'

/**
 * ContactInfoStep
 * 
 * Step 8: Contact Information
 * Fields:
 * - Main Phone (required)
 * - Support Phone (optional)
 * - Main Email (required)
 * - Support Email (optional)
 * - Website (optional)
 */

export function ContactInfoStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  return (
    <div className="space-y-4">
      {/* Phone Numbers */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
          <Phone className="h-3.5 w-3.5 text-gray-600" />
          Phone Numbers
        </div>

        <WizardFieldWrapper
          fieldName="phone_main"
          label="Main Phone Number"
          isRequired={true}
          helpText="Your organization's primary contact number"
        >
          <Input
            id="phone_main"
            type="tel"
            value={stepData.phone_main || ''}
            onChange={(e) => updateFieldValue('phone_main', e.target.value)}
            placeholder="+44 20 7946 0958"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="phone_support"
          label="Support Phone Number"
          isRequired={false}
          helpText="Dedicated support line (if different from main)"
        >
          <Input
            id="phone_support"
            type="tel"
            value={stepData.phone_support || ''}
            onChange={(e) => updateFieldValue('phone_support', e.target.value)}
            placeholder="+44 20 7946 0959"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Email Addresses */}
      <div className="space-y-3 pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
          <Mail className="h-3.5 w-3.5 text-gray-600" />
          Email Addresses
        </div>

        <WizardFieldWrapper
          fieldName="email_main"
          label="Main Email Address"
          isRequired={true}
          helpText="Your organization's primary email contact"
        >
          <Input
            id="email_main"
            type="email"
            value={stepData.email_main || ''}
            onChange={(e) => updateFieldValue('email_main', e.target.value)}
            placeholder="contact@dentalcare.com"
            className="text-base"
          />
        </WizardFieldWrapper>

        <WizardFieldWrapper
          fieldName="email_support"
          label="Support Email Address"
          isRequired={false}
          helpText="Dedicated support email (if different from main)"
        >
          <Input
            id="email_support"
            type="email"
            value={stepData.email_support || ''}
            onChange={(e) => updateFieldValue('email_support', e.target.value)}
            placeholder="support@dentalcare.com"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Website */}
      <div className="pt-3 border-t border-gray-200">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 mb-2 uppercase tracking-wide">
          <Globe className="h-3.5 w-3.5 text-gray-600" />
          Online Presence
        </div>

        <WizardFieldWrapper
          fieldName="website"
          label="Website URL"
          isRequired={false}
          helpText="Your organization's website (include https://)"
        >
          <Input
            id="website"
            type="url"
            value={stepData.website || ''}
            onChange={(e) => updateFieldValue('website', e.target.value)}
            placeholder="https://www.dentalcare.com"
            className="text-base"
          />
        </WizardFieldWrapper>
      </div>

      {/* Preview Card */}
      {(stepData.phone_main || stepData.email_main || stepData.website) && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Contact Information Preview</h4>
          <div className="space-y-2 text-sm">
            {stepData.phone_main && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{stepData.phone_main}</span>
                {stepData.phone_support && (
                  <span className="text-gray-400 text-xs">(Support: {stepData.phone_support})</span>
                )}
              </div>
            )}
            {stepData.email_main && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">{stepData.email_main}</span>
              </div>
            )}
            {stepData.website && (
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-500" />
                <a 
                  href={stepData.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {stepData.website}
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

