'use client'

import { useEffect, useRef } from 'react'
import { useWizard } from '@/contexts/wizard-context'

/**
 * useWizardAutoSave
 * 
 * Auto-saves wizard data after a debounce period
 * Prevents excessive API calls while user is typing
 */

export function useWizardAutoSave(debounceMs = 2000) {
  const {
    currentStepId,
    formData,
    saveStepData,
    hasUnsavedChanges
  } = useWizard()

  const timeoutRef = useRef<NodeJS.Timeout>()
  const lastSavedData = useRef<string>('')

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Only auto-save if there are unsaved changes
    if (!hasUnsavedChanges) return

    const currentData = JSON.stringify(formData[currentStepId] || {})
    
    // Don't save if data hasn't actually changed
    if (currentData === lastSavedData.current) return

    // Set up new timeout for auto-save
    timeoutRef.current = setTimeout(async () => {
      console.log('[AutoSave] Saving data for step:', currentStepId)
      const saved = await saveStepData(currentStepId, formData[currentStepId] || {}, false)
      
      if (saved) {
        lastSavedData.current = currentData
      }
    }, debounceMs)

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [currentStepId, formData, hasUnsavedChanges, saveStepData, debounceMs])
}

/**
 * useWizardUnsavedChanges
 * 
 * Warns user about unsaved changes when leaving the page
 */

export function useWizardUnsavedChanges() {
  const { hasUnsavedChanges } = useWizard()

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges])
}

/**
 * useWizardKeyboardNavigation
 * 
 * Enables keyboard shortcuts for wizard navigation
 * - Ctrl/Cmd + Right Arrow: Next step
 * - Ctrl/Cmd + Left Arrow: Previous step
 * - Ctrl/Cmd + S: Save and continue
 */

export function useWizardKeyboardNavigation() {
  const { goToNext, goToPrevious, currentStep, totalSteps } = useWizard()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl (Windows) or Cmd (Mac)
      const isModifierPressed = e.ctrlKey || e.metaKey

      if (!isModifierPressed) return

      // Right Arrow: Next
      if (e.key === 'ArrowRight' && currentStep < totalSteps) {
        e.preventDefault()
        goToNext()
      }

      // Left Arrow: Previous
      if (e.key === 'ArrowLeft' && currentStep > 1) {
        e.preventDefault()
        goToPrevious()
      }

      // S: Save and continue
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        goToNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [goToNext, goToPrevious, currentStep, totalSteps])
}

