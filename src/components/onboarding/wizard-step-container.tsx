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
  const { currentStep, currentStepData, validationErrors, accountType } = useWizard()

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
      // STEP 1: Email Verification
      case 'email_verification':
        return <EmailVerificationStep />
      
      // STEP 2: Profile Setup (simplified)
      case 'profile_setup':
      case 'profile_personal':
      case 'personal_info':
        return <PersonalInfoStep />
      
      // STEP 3: Organization Setup (simplified)
      case 'organization_setup':
      case 'org_company':
      case 'company_info':
        return <CompanyInfoStep />
      
      // STEP 4: Location Setup (simplified)
      case 'location_setup':
      case 'location_first':
      case 'first_location':
        return <FirstLocationStep />
      
      // Legacy/Additional Profile Steps (optional)
      case 'profile_work':
      case 'work_preferences':
        return <WorkPreferencesStep />
      
      case 'profile_communication':
      case 'communication_settings':
        return <CommunicationSettingsStep />
      
      case 'profile_security':
      case 'security_settings':
        return <SecuritySettingsStep />
      
      // Legacy Organization Steps (optional)
      case 'org_legal':
      case 'legal_details':
        return <LegalDetailsStep />
      
      case 'org_contact':
      case 'contact_info':
        return <ContactInfoStep />
      
      case 'org_business':
      case 'business_settings':
        return <BusinessSettingsStep />
      
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
      {/* Step Header - Compact Professional Design */}
      <CardHeader className="border-b bg-gray-50/50 px-6 py-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 relative">
            <div className="w-12 h-12 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <Icon className="h-6 w-6 text-white" />
            </div>
            <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-blue-600 border-2 border-white flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {currentStep}
              </span>
            </div>
          </div>

          {/* Title & Description */}
          <div className="flex-1 pt-0.5">
            <CardTitle className="text-xl font-bold text-gray-900 mb-1.5">
              {currentStepData.stepName}
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 leading-relaxed">
              {currentStepData.stepDescription}
            </CardDescription>

            {/* Optional Badge */}
            {currentStepData.isSkippable && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Optional
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="px-6 pt-4">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="font-semibold mb-1.5 text-red-900 text-sm">Please fix the following errors:</div>
              <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
                {validationErrors.map((error, idx) => (
                  <li key={idx}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Step Content */}
      <CardContent className="px-6 py-6">
        {getStepComponent()}
      </CardContent>
    </>
  )
}

