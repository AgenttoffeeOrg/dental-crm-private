'use client'

import React from 'react'
import { WizardProvider, useWizard } from '@/contexts/wizard-context'
import { WizardHeader } from './wizard-header'
import { WizardProgressBar } from './wizard-progress-bar'
import { WizardStepContainer } from './wizard-step-container'
import { WizardFooter } from './wizard-footer'
import { Card } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'
import { useWizardAutoSave } from '@/hooks/use-wizard-hooks'

/**
 * EnhancedOnboardingWizard
 * 
 * Main component that orchestrates the entire onboarding experience
 * Now works as a slide-over modal instead of a full page
 */

interface EnhancedOnboardingWizardProps {
  onClose?: () => void
}

function WizardContent({ onClose }: EnhancedOnboardingWizardProps) {
  const {
    loading,
    currentStep,
    totalSteps,
    currentStepData,
    accountType
  } = useWizard()

  // ✅ Enable auto-save functionality (debounced, saves after 2 seconds of inactivity)
  useWizardAutoSave(2000)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading your onboarding wizard...</p>
        </div>
      </div>
    )
  }

  if (!currentStepData) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="p-8">
          <p className="text-red-600">Error: No wizard steps configured</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <WizardHeader onClose={onClose} />

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-8 py-6 max-w-4xl">
          {/* Progress Bar */}
          <div className="mb-6">
            <WizardProgressBar />
          </div>

          {/* Step Container - Compact Professional Card */}
          <Card className="mb-6 border border-gray-200 shadow-lg bg-white">
            <WizardStepContainer />
          </Card>

          {/* Footer */}
          <WizardFooter onClose={onClose} />

          {/* Footer Info */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              Progress is automatically saved • You can resume anytime from your dashboard
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function EnhancedOnboardingWizard({ onClose }: EnhancedOnboardingWizardProps) {
  return (
    <WizardProvider>
      <WizardContent onClose={onClose} />
    </WizardProvider>
  )
}

