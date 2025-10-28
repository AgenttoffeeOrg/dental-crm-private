'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Info } from 'lucide-react'
import * as LucideIcons from 'lucide-react'

// Import all step components
import { EmailVerificationStep } from './steps/email-verification-step'
import { PersonalInfoStep } from './steps/personal-info-step'
import { WorkPreferencesStep } from './steps/work-preferences-step'
import { CommunicationSettingsStep } from './steps/communication-settings-step'
import { SecuritySettingsStep } from './steps/security-settings-step'
import { CompanyInfoStep } from './steps/company-info-step'
import { LegalDetailsStep } from './steps/legal-details-step'
import { ContactInfoStep } from './steps/contact-info-step'
import { BusinessSettingsStep } from './steps/business-settings-step'
import { FirstLocationStep } from './steps/first-location-step'

/**
 * WizardStepContainer
 * 
 * Renders the current step's content with:
 * - Step header (title, description, icon)
 * - Validation errors display
 * - Dynamic step content based on stepId
 * - Help text and guidance
 */

export function WizardStepContainer() {
  const { currentStepData, validationErrors, accountType } = useWizard()

  console.log('[STEP_CONTAINER] Rendering with:', {
    currentStepData,
    stepId: currentStepData?.stepId,
    accountType
  })

  if (!currentStepData) {
    return (
      <div className="p-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error: Step data not found</AlertDescription>
        </Alert>
      </div>
    )
  }

  const Icon = (LucideIcons as any)[currentStepData.stepIcon] || Info

  // Map stepId to component
  const getStepComponent = () => {
    console.log('[STEP_CONTAINER] Getting component for stepId:', currentStepData.stepId)
    
    switch (currentStepData.stepId) {
      case 'email_verification':
        return <EmailVerificationStep />
      
      // Profile steps (user-specific)
      case 'profile_personal':
      case 'personal_info':
        return <PersonalInfoStep />
      
      case 'profile_work':
      case 'work_preferences':
        return <WorkPreferencesStep />
      
      case 'profile_communication':
      case 'communication_settings':
        return <CommunicationSettingsStep />
      
      case 'profile_security':
      case 'security_settings':
        return <SecuritySettingsStep />
      
      // Organization steps
      case 'org_company':
      case 'company_info':
        return <CompanyInfoStep />
      
      case 'org_legal':
      case 'legal_details':
        return <LegalDetailsStep />
      
      case 'org_contact':
      case 'contact_info':
        return <ContactInfoStep />
      
      case 'org_business':
      case 'business_settings':
        return <BusinessSettingsStep />
      
      // Location step
      case 'location_first':
      case 'first_location':
        return <FirstLocationStep />
      
      default:
        return (
          <div className="p-8 text-center text-gray-500">
            Step component not implemented yet: {currentStepData.stepId}
          </div>
        )
    }
  }

  return (
    <>
      {/* Step Header */}
      <CardHeader className="border-b bg-gray-50">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
            <Icon className="h-6 w-6 text-blue-600" />
          </div>

          {/* Title & Description */}
          <div className="flex-1">
            <CardTitle className="text-2xl text-gray-900 mb-2">
              {currentStepData.stepName}
            </CardTitle>
            <CardDescription className="text-base text-gray-600">
              {currentStepData.stepDescription}
            </CardDescription>

            {/* Optional Badge */}
            {currentStepData.isSkippable && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  Optional
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="px-6 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-medium mb-1">Please fix the following errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step Content */}
      <CardContent className="p-6">
        {getStepComponent()}
      </CardContent>
    </>
  )
}

