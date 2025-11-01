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
    <div className="bg-white border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-sm">D</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  DentalCRM
                </h1>
                <p className="text-xs text-gray-500 -mt-0.5">Getting Started</p>
              </div>
            </div>
            <div className="hidden lg:block h-6 w-px bg-gray-300" />
            <div className="hidden lg:flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Step {currentStep} of {totalSteps}
              </span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-md">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-amber-700">
                  Unsaved
                </span>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveAndExit}
              disabled={saving}
              className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 h-8 px-3"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline text-xs">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline text-xs">Save & Exit</span>
                  <X className="h-3.5 w-3.5 sm:hidden" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

