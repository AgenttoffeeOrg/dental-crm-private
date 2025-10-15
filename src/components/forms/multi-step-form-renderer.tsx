'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { FormRenderer } from '@/components/forms/form-renderer'
import type { MarketingForm } from '@/hooks/use-marketing-forms'

interface Step {
  id: string
  title: string
  description?: string
  fields: any[]
}

interface MultiStepFormRendererProps {
  form: MarketingForm
  onSubmit?: (data: any) => void
  standalone?: boolean
}

/**
 * Split fields into steps based on "page_break" field type
 * or create automatic steps if no page breaks defined
 */
function splitIntoSteps(fields: any[]): Step[] {
  const steps: Step[] = []
  let currentStep: any[] = []
  let stepIndex = 0

  fields.forEach((field, index) => {
    if (field.type === 'page_break') {
      // Save current step
      if (currentStep.length > 0) {
        steps.push({
          id: `step-${stepIndex}`,
          title: field.label || `Step ${stepIndex + 1}`,
          description: field.placeholder || undefined,
          fields: currentStep,
        })
        currentStep = []
        stepIndex++
      }
    } else {
      currentStep.push(field)
    }
  })

  // Add remaining fields as last step
  if (currentStep.length > 0) {
    steps.push({
      id: `step-${stepIndex}`,
      title: `Step ${stepIndex + 1}`,
      fields: currentStep,
    })
  }

  // If no steps created (no page breaks), return all fields as single step
  if (steps.length === 0 && fields.length > 0) {
    steps.push({
      id: 'step-0',
      title: 'Form',
      fields: fields,
    })
  }

  return steps
}

export function MultiStepFormRenderer({
  form,
  onSubmit,
  standalone = false,
}: MultiStepFormRendererProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [stepErrors, setStepErrors] = useState<Record<number, string[]>>({})
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())

  const steps = splitIntoSteps(form.fields_json)
  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1
  const progress = ((currentStepIndex + 1) / steps.length) * 100

  // Load saved progress from localStorage
  useEffect(() => {
    const savedKey = `form-progress-${form.id}`
    const saved = localStorage.getItem(savedKey)
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setFormData(parsed.data || {})
        setCurrentStepIndex(parsed.step || 0)
        setCompletedSteps(new Set(parsed.completedSteps || []))
      } catch (e) {
        console.error('Failed to load saved progress:', e)
      }
    }
  }, [form.id])

  // Save progress to localStorage
  useEffect(() => {
    const savedKey = `form-progress-${form.id}`
    localStorage.setItem(
      savedKey,
      JSON.stringify({
        data: formData,
        step: currentStepIndex,
        completedSteps: Array.from(completedSteps),
        timestamp: Date.now(),
      })
    )
  }, [formData, currentStepIndex, completedSteps, form.id])

  const validateCurrentStep = (): boolean => {
    const errors: string[] = []
    const currentFields = currentStep.fields

    currentFields.forEach((field) => {
      if (field.required && !formData[field.id]) {
        errors.push(`${field.label} is required`)
      }
    })

    if (errors.length > 0) {
      setStepErrors({
        ...stepErrors,
        [currentStepIndex]: errors,
      })
      return false
    }

    // Clear errors for this step
    const newErrors = { ...stepErrors }
    delete newErrors[currentStepIndex]
    setStepErrors(newErrors)

    return true
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      // Mark current step as completed
      setCompletedSteps(new Set([...completedSteps, currentStepIndex]))
      
      if (!isLastStep) {
        setCurrentStepIndex(currentStepIndex + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex(currentStepIndex - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData({
      ...formData,
      [fieldId]: value,
    })
  }

  const handleSubmit = () => {
    if (validateCurrentStep()) {
      // Clear saved progress
      localStorage.removeItem(`form-progress-${form.id}`)
      
      if (onSubmit) {
        onSubmit(formData)
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress Bar */}
      {steps.length > 1 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStepIndex + 1} of {steps.length}
            </span>
            <span className="text-sm text-gray-500">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Step Indicators */}
      {steps.length > 1 && (
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.has(index)
            const isCurrent = index === currentStepIndex
            const isPast = index < currentStepIndex

            return (
              <div key={step.id} className="flex items-center flex-1">
                <button
                  onClick={() => {
                    if (isPast || isCompleted) {
                      setCurrentStepIndex(index)
                    }
                  }}
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                    transition-all
                    ${
                      isCurrent
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                        : isCompleted || isPast
                        ? 'bg-green-500 text-white hover:bg-green-600 cursor-pointer'
                        : 'bg-gray-200 text-gray-500'
                    }
                  `}
                >
                  {isCompleted && !isCurrent ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </button>
                
                {index < steps.length - 1 && (
                  <div
                    className={`
                      flex-1 h-1 mx-2
                      ${isPast || isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                    `}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Step Title */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{currentStep.title}</h2>
        {currentStep.description && (
          <p className="text-gray-600 mt-2">{currentStep.description}</p>
        )}
      </div>

      {/* Step Errors */}
      {stepErrors[currentStepIndex] && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm font-semibold text-red-800 mb-2">
            Please fix the following errors:
          </p>
          <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
            {stepErrors[currentStepIndex].map((error, i) => (
              <li key={i}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Current Step Fields */}
      <div className="space-y-6 mb-8">
        {currentStep.fields.map((field) => {
          // Render individual field
          // This would use the same field rendering logic from FormRenderer
          return (
            <div key={field.id}>
              {/* Field rendering logic here */}
              {/* For now, simplified version */}
              <div className="text-sm text-gray-600">
                {field.label} ({field.type})
              </div>
            </div>
          )
        })}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          onClick={handleBack}
          disabled={isFirstStep}
          variant="outline"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex gap-2">
          {!isLastStep ? (
            <Button onClick={handleNext}>
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Submit Form
            </Button>
          )}
        </div>
      </div>

      {/* Save Progress Indicator */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Your progress is automatically saved. You can return to this form later.
        </p>
      </div>
    </div>
  )
}

/**
 * Page Break Field Component
 * Used in form builder to insert page breaks
 */
export function PageBreakField() {
  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
      <div className="text-gray-600 font-medium mb-1">Page Break</div>
      <div className="text-sm text-gray-500">
        Fields after this will appear on the next step
      </div>
    </div>
  )
}

