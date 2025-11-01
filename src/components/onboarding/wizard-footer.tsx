'use client'

import React, { useState } from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CheckCircle, SkipForward, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

/**
 * WizardFooter
 * 
 * Navigation controls:
 * - Previous button
 * - Next button
 * - Skip button (for optional steps)
 * - Complete button (on last step)
 */

interface WizardFooterProps {
  onClose?: () => void
}

export function WizardFooter({ onClose }: WizardFooterProps) {
  const {
    currentStep,
    totalSteps,
    goToNext,
    goToPrevious,
    skipCurrentStep,
    completeWizard,
    canSkipCurrent,
    saving,
    hasUnsavedChanges
  } = useWizard()

  const [showSkipDialog, setShowSkipDialog] = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [processing, setProcessing] = useState(false)

  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  const handleNext = async () => {
    setProcessing(true)
    try {
      const success = await goToNext()
      if (success && isLastStep) {
        // If last step, show completion dialog
        setShowCompleteDialog(true)
      }
    } finally {
      setProcessing(false)
    }
  }

  const handleSkip = async () => {
    setProcessing(true)
    try {
      await skipCurrentStep()
      setShowSkipDialog(false)
    } finally {
      setProcessing(false)
    }
  }

  const handleComplete = async () => {
    setProcessing(true)
    try {
      const success = await completeWizard()
      if (success) {
        // Close the modal and show success
        toast.success('🎉 Onboarding completed! Welcome aboard!')
        setTimeout(() => {
          if (onClose) onClose()
        }, 1500)
      }
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      <div className="mt-6 flex items-center justify-between gap-4">
        {/* Previous Button */}
        <Button
          variant="outline"
          size="lg"
          onClick={goToPrevious}
          disabled={isFirstStep || processing}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        {/* Center: Skip Button */}
        {canSkipCurrent() && !isLastStep && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSkipDialog(true)}
            disabled={processing}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <SkipForward className="h-4 w-4" />
            Skip this step
          </Button>
        )}

        {/* Next/Complete Button */}
        <Button
          size="lg"
          onClick={isLastStep ? () => setShowCompleteDialog(true) : handleNext}
          disabled={processing || saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
        >
          {processing || saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="font-medium">{saving ? 'Saving...' : 'Processing...'}</span>
            </>
          ) : isLastStep ? (
            <>
              <span className="font-medium">Complete Setup</span>
              <CheckCircle className="h-4 w-4" />
            </>
          ) : (
            <>
              <span className="font-medium">Continue</span>
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
          <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
          <p className="text-xs text-amber-700 font-medium">
            You have unsaved changes • Click Continue to save
          </p>
        </div>
      )}

      {/* Skip Confirmation Dialog */}
      <AlertDialog open={showSkipDialog} onOpenChange={setShowSkipDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this step?</AlertDialogTitle>
            <AlertDialogDescription>
              You can skip this optional step and complete it later from your settings.
              Are you sure you want to skip?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSkip}
              disabled={processing}
              className="bg-gray-600 hover:bg-gray-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Skipping...
                </>
              ) : (
                'Yes, Skip'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Complete Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🎉 Complete Your Setup?</AlertDialogTitle>
            <AlertDialogDescription>
              You're all set! Complete your onboarding and start using DentalCRM.
              You can always update your preferences from the settings page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Review Again</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleComplete}
              disabled={processing}
              className="bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Setup
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

