'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

/**
 * Wizard Context - Centralized state management for the onboarding wizard
 */

export interface WizardStep {
  stepId: string
  stepName: string
  stepDescription: string
  stepIcon: string
  stepOrder: number
  stepCategory: string
  isSkippable: boolean
  fields: WizardField[]
}

export interface WizardField {
  fieldName: string
  isRequired: boolean
  displayOrder: number
  helpText: string
  validationRules: Record<string, any>
}

export interface WizardFormData {
  [stepId: string]: {
    [fieldName: string]: any
  }
}

export interface ValidationError {
  field: string
  message: string
}

export interface WizardContextType {
  // State
  currentStep: number
  totalSteps: number
  accountType: 'organization' | 'solo'
  steps: WizardStep[]
  formData: WizardFormData
  completedSteps: string[]
  skippedSteps: string[]
  loading: boolean
  saving: boolean
  hasUnsavedChanges: boolean
  validationErrors: ValidationError[]
  
  // Progress
  progressPercentage: number
  currentStepId: string
  currentStepData: WizardStep | null
  
  // Actions
  setCurrentStep: (step: number) => void
  goToNext: () => Promise<boolean>
  goToPrevious: () => void
  updateFieldValue: (fieldName: string, value: any) => void
  saveStepData: (stepId: string, data: any, complete?: boolean) => Promise<boolean>
  validateCurrentStep: () => Promise<boolean>
  skipCurrentStep: () => Promise<boolean>
  completeWizard: () => Promise<boolean>
  resumeWizard: () => Promise<void>
  
  // Utilities
  isStepCompleted: (stepId: string) => boolean
  isStepSkipped: (stepId: string) => boolean
  canGoNext: () => boolean
  canSkipCurrent: () => boolean
}

const WizardContext = createContext<WizardContextType | undefined>(undefined)

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [accountType, setAccountType] = useState<'organization' | 'solo'>('organization')
  const [steps, setSteps] = useState<WizardStep[]>([])
  const [formData, setFormData] = useState<WizardFormData>({})
  const [completedSteps, setCompletedSteps] = useState<string[]>([])
  const [skippedSteps, setSkippedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])

  const totalSteps = steps.length
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps.length / totalSteps) * 100) : 0
  const currentStepId = steps[currentStep - 1]?.stepId || ''
  const currentStepData = steps[currentStep - 1] || null

  // Initialize wizard - Load configuration and resume data
  useEffect(() => {
    initializeWizard()
  }, [])

  const initializeWizard = async () => {
    try {
      setLoading(true)
      
      console.log('[WIZARD] Initializing wizard...')
      
      // Load configuration
      const configResponse = await fetch('/api/onboarding/config')
      if (!configResponse.ok) {
        const errorText = await configResponse.text()
        console.error('[WIZARD] Config fetch failed:', configResponse.status, errorText)
        throw new Error('Failed to load configuration')
      }
      
      const configData = await configResponse.json()
      console.log('[WIZARD] Config loaded:', configData)
      console.log('[WIZARD] Steps count:', configData.steps?.length)
      console.log('[WIZARD] First step:', configData.steps?.[0])
      
      setSteps(configData.steps || [])
      setAccountType(configData.accountType)
      
      // Load saved progress
      const resumeResponse = await fetch('/api/onboarding/resume')
      if (resumeResponse.ok) {
        const resumeData = await resumeResponse.json()
        console.log('[WIZARD] Resume data:', resumeData)
        
        if (resumeData.canResume) {
          setFormData(resumeData.savedData || {})
          setCompletedSteps(resumeData.completedSteps || [])
          setSkippedSteps(resumeData.skippedSteps || [])
          
          // Find resume step index
          const resumeIndex = configData.steps.findIndex(
            (s: WizardStep) => s.stepId === resumeData.resumeFromStep
          )
          if (resumeIndex >= 0) {
            setCurrentStep(resumeIndex + 1)
          }
        }
      }
      
      console.log('[WIZARD] Initialization complete')
      
    } catch (error) {
      console.error('[WIZARD] Error initializing wizard:', error)
      toast.error('Failed to load wizard configuration')
    } finally {
      setLoading(false)
    }
  }

  // Update field value
  const updateFieldValue = useCallback((fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [currentStepId]: {
        ...prev[currentStepId],
        [fieldName]: value
      }
    }))
    setHasUnsavedChanges(true)
  }, [currentStepId])

  // Save step data
  const saveStepData = async (stepId: string, data: any, complete = false): Promise<boolean> => {
    try {
      setSaving(true)
      
      const response = await fetch('/api/onboarding/save-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId,
          fieldData: data,
          isComplete: complete
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save progress')
      }

      const result = await response.json()
      
      if (complete && !completedSteps.includes(stepId)) {
        setCompletedSteps(prev => [...prev, stepId])
      }
      
      setHasUnsavedChanges(false)
      return true

    } catch (error: any) {
      console.error('Error saving step data:', error)
      toast.error(error.message || 'Failed to save progress')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    try {
      console.log('[WIZARD] Validating step:', currentStepId)
      console.log('[WIZARD] Form data for step:', formData[currentStepId])
      
      const response = await fetch('/api/onboarding/validate-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepId: currentStepId,
          fieldData: formData[currentStepId] || {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('[WIZARD] Validation failed:', response.status, errorData)
        throw new Error(errorData.error || 'Validation failed')
      }

      const result = await response.json()
      console.log('[WIZARD] Validation result:', result)
      setValidationErrors(result.errors || [])
      
      return result.valid
    } catch (error) {
      console.error('[WIZARD] Error validating step:', error)
      return false
    }
  }

  // Go to next step
  const goToNext = async (): Promise<boolean> => {
    // Validate current step
    const isValid = await validateCurrentStep()
    if (!isValid) {
      toast.error('Please fix the errors before proceeding')
      return false
    }

    // Save and mark complete
    const saved = await saveStepData(currentStepId, formData[currentStepId] || {}, true)
    if (!saved) return false

    // Move to next step
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
      setValidationErrors([])
      return true
    }

    // Last step - complete wizard
    return await completeWizard()
  }

  // Go to previous step
  const goToPrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setValidationErrors([])
    }
  }

  // Skip current step
  const skipCurrentStep = async (): Promise<boolean> => {
    if (!currentStepData?.isSkippable) {
      toast.error('This step cannot be skipped')
      return false
    }

    try {
      const response = await fetch('/api/onboarding/skip-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: currentStepId })
      })

      if (!response.ok) throw new Error('Failed to skip step')

      const result = await response.json()
      setSkippedSteps(prev => [...prev, currentStepId])
      
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1)
      }
      
      toast.success('Step skipped')
      return true
    } catch (error: any) {
      toast.error(error.message || 'Failed to skip step')
      return false
    }
  }

  // Complete wizard
  const completeWizard = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/onboarding/complete', {
        method: 'PUT'
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to complete onboarding')
      }

      toast.success('🎉 Onboarding completed! Welcome aboard!')
      return true
    } catch (error: any) {
      toast.error(error.message)
      return false
    }
  }

  // Resume wizard
  const resumeWizard = async () => {
    await initializeWizard()
  }

  // Utility functions
  const isStepCompleted = (stepId: string) => completedSteps.includes(stepId)
  const isStepSkipped = (stepId: string) => skippedSteps.includes(stepId)
  const canGoNext = () => currentStep < totalSteps || currentStep === totalSteps
  const canSkipCurrent = () => currentStepData?.isSkippable || false

  const value: WizardContextType = {
    currentStep,
    totalSteps,
    accountType,
    steps,
    formData,
    completedSteps,
    skippedSteps,
    loading,
    saving,
    hasUnsavedChanges,
    validationErrors,
    progressPercentage,
    currentStepId,
    currentStepData,
    setCurrentStep,
    goToNext,
    goToPrevious,
    updateFieldValue,
    saveStepData,
    validateCurrentStep,
    skipCurrentStep,
    completeWizard,
    resumeWizard,
    isStepCompleted,
    isStepSkipped,
    canGoNext,
    canSkipCurrent
  }

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>
}

export function useWizard() {
  const context = useContext(WizardContext)
  if (context === undefined) {
    throw new Error('useWizard must be used within a WizardProvider')
  }
  return context
}

