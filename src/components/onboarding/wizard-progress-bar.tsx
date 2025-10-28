'use client'

import React from 'react'
import { useWizard } from '@/contexts/wizard-context'
import { Check, Circle, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'

/**
 * WizardProgressBar
 * 
 * Visual progress indicator showing:
 * - All steps
 * - Completed steps (green check)
 * - Current step (blue pulse)
 * - Future steps (gray)
 * - Progress percentage
 */

export function WizardProgressBar() {
  const {
    steps,
    currentStep,
    completedSteps,
    skippedSteps,
    progressPercentage,
    setCurrentStep,
    isStepCompleted
  } = useWizard()

  const getStepIcon = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] || Circle
    return Icon
  }

  const getStepStatus = (index: number, stepId: string) => {
    if (isStepCompleted(stepId)) return 'completed'
    if (skippedSteps.includes(stepId)) return 'skipped'
    if (index + 1 === currentStep) return 'current'
    if (index + 1 < currentStep) return 'accessible'
    return 'locked'
  }

  const canClickStep = (index: number, stepId: string) => {
    // Can go back to completed or previous steps
    return index + 1 <= currentStep || isStepCompleted(stepId)
  }

  return (
    <div className="w-full">
      {/* Overall Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
          <span className="text-sm font-bold text-blue-600">{progressPercentage}%</span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="relative">
        {/* Connection Line */}
        <div className="absolute top-6 left-0 right-0 h-0.5 bg-gray-200 hidden md:block" />
        
        {/* Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:justify-between gap-4 md:gap-2">
          {steps.map((step, index) => {
            const Icon = getStepIcon(step.stepIcon)
            const status = getStepStatus(index, step.stepId)
            const clickable = canClickStep(index, step.stepId)

            return (
              <button
                key={`step-${step.stepId}-${index}`}
                onClick={() => clickable && setCurrentStep(index + 1)}
                disabled={!clickable}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-3 rounded-lg transition-all',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  clickable && 'cursor-pointer hover:bg-gray-50',
                  !clickable && 'cursor-not-allowed opacity-50'
                )}
              >
                {/* Step Circle */}
                <div
                  className={cn(
                    'relative z-10 w-12 h-12 rounded-full flex items-center justify-center',
                    'border-2 transition-all duration-300',
                    status === 'completed' && 'bg-green-500 border-green-500',
                    status === 'skipped' && 'bg-gray-300 border-gray-400',
                    status === 'current' && 'bg-blue-500 border-blue-600 ring-4 ring-blue-100 animate-pulse',
                    status === 'accessible' && 'bg-white border-gray-300',
                    status === 'locked' && 'bg-gray-100 border-gray-200'
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-6 w-6 text-white" />
                  ) : status === 'locked' ? (
                    <Lock className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Icon
                      className={cn(
                        'h-6 w-6',
                        status === 'current' && 'text-white',
                        status === 'accessible' && 'text-gray-600',
                        status === 'skipped' && 'text-gray-500'
                      )}
                    />
                  )}
                </div>

                {/* Step Label */}
                <div className="text-center max-w-[120px]">
                  <p
                    className={cn(
                      'text-xs font-medium line-clamp-2',
                      status === 'current' && 'text-blue-600',
                      status === 'completed' && 'text-green-600',
                      status === 'skipped' && 'text-gray-500',
                      (status === 'accessible' || status === 'locked') && 'text-gray-600'
                    )}
                  >
                    {step.stepName}
                  </p>
                  {status === 'skipped' && (
                    <span className="text-[10px] text-gray-400">Skipped</span>
                  )}
                </div>

                {/* Step Number Badge */}
                <div
                  className={cn(
                    'absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center',
                    'text-[10px] font-bold',
                    status === 'completed' && 'bg-green-100 text-green-700',
                    status === 'current' && 'bg-blue-100 text-blue-700',
                    (status === 'accessible' || status === 'locked' || status === 'skipped') && 'bg-gray-200 text-gray-600'
                  )}
                >
                  {index + 1}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Mobile Step Indicator */}
      <div className="md:hidden mt-4 text-center">
        <p className="text-sm text-gray-600">
          Step {currentStep} of {steps.length}:{' '}
          <span className="font-medium text-gray-900">
            {steps[currentStep - 1]?.stepName}
          </span>
        </p>
      </div>
    </div>
  )
}

