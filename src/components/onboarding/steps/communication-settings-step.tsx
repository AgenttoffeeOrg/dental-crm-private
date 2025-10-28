'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { WizardFieldWrapper } from '../wizard-field-wrapper'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from 'lucide-react'

/**
 * CommunicationSettingsStep
 * 
 * Step 4: Communication Settings
 * Fields:
 * - Email Signature (optional)
 * - SMS Signature (optional)
 */

export function CommunicationSettingsStep() {
  const { updateFieldValue, formData, currentStepId } = useWizard()
  const stepData = formData[currentStepId] || {}

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <div className="text-sm">
            Set up default signatures for your email and SMS communications.
            These can be personalized later from your profile settings.
          </div>
        </AlertDescription>
      </Alert>

      {/* Email Signature */}
      <WizardFieldWrapper
        fieldName="email_signature"
        label="Email Signature"
        isRequired={false}
        helpText="Your default signature for email communications (max 500 characters)"
      >
        <Textarea
          id="email_signature"
          value={stepData.email_signature || ''}
          onChange={(e) => updateFieldValue('email_signature', e.target.value)}
          placeholder="Best regards,&#10;Dr. Sarah Johnson&#10;General Dentist&#10;DentalCare Practice"
          rows={6}
          maxLength={500}
          className="text-base font-mono resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(stepData.email_signature || '').length}/500 characters
        </div>
      </WizardFieldWrapper>

      {/* SMS Signature */}
      <WizardFieldWrapper
        fieldName="sms_signature"
        label="SMS Signature"
        isRequired={false}
        helpText="Your default signature for SMS messages (max 160 characters)"
      >
        <Textarea
          id="sms_signature"
          value={stepData.sms_signature || ''}
          onChange={(e) => updateFieldValue('sms_signature', e.target.value)}
          placeholder="- Dr. Sarah Johnson, DentalCare"
          rows={3}
          maxLength={160}
          className="text-base font-mono resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(stepData.sms_signature || '').length}/160 characters
        </div>
      </WizardFieldWrapper>

      {/* Preview */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-3">Preview</h4>
        
        {stepData.email_signature && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-1">Email Signature:</p>
            <div className="bg-white border border-gray-200 rounded p-3 text-sm whitespace-pre-wrap font-mono">
              {stepData.email_signature}
            </div>
          </div>
        )}
        
        {stepData.sms_signature && (
          <div>
            <p className="text-xs text-gray-500 mb-1">SMS Signature:</p>
            <div className="bg-white border border-gray-200 rounded p-3 text-sm whitespace-pre-wrap font-mono">
              {stepData.sms_signature}
            </div>
          </div>
        )}
        
        {!stepData.email_signature && !stepData.sms_signature && (
          <p className="text-sm text-gray-400 italic">No signatures set yet</p>
        )}
      </div>
    </div>
  )
}

