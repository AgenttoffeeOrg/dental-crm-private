'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { Button } from '@/components/ui/button'
import { X, Save } from 'lucide-react'
import { toast } from 'sonner'

/**
 * WizardHeader
 * 
 * Top header with:
 * - DentalCRM branding
 * - Save & Exit button
 * - Current step indicator
 */

interface WizardHeaderProps {
  onClose?: () => void
}

export function WizardHeader({ onClose }: WizardHeaderProps) {
  const {
    currentStep,
    totalSteps,
    currentStepId,
    formData,
    saveStepData,
    hasUnsavedChanges,
    saving
  } = useWizard()

  const handleSaveAndExit = async () => {
    if (hasUnsavedChanges) {
      const saved = await saveStepData(currentStepId, formData[currentStepId] || {}, false)
      if (!saved) {
        toast.error('Failed to save progress')
        return
      }
    }

    toast.success('Progress saved')
    if (onClose) {
      onClose()
    }
  }

  return (
    <div className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              DentalCRM
            </h1>
            <div className="hidden sm:block h-6 w-px bg-gray-300" />
            <div className="hidden sm:flex flex-col">
              <span className="text-sm font-medium text-gray-900">Getting Started</span>
              <span className="text-xs text-gray-500">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="hidden sm:inline text-xs text-amber-600 font-medium mr-2">
                Unsaved changes
              </span>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveAndExit}
              disabled={saving}
              className="flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Save className="h-4 w-4 animate-pulse" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Save & Exit</span>
                  <X className="h-4 w-4 sm:hidden" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

