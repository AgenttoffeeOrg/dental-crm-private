'use client'

import React from 'react'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { AlertCircle, HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

/**
 * WizardFieldWrapper
 * 
 * Standardized field wrapper providing:
 * - Label with required indicator
 * - Help text tooltip
 * - Error display
 * - Consistent spacing and styling
 */

interface WizardFieldWrapperProps {
  fieldName: string
  label: string
  isRequired?: boolean
  helpText?: string
  error?: string
  children: React.ReactNode
  className?: string
}

export function WizardFieldWrapper({
  fieldName,
  label,
  isRequired = false,
  helpText,
  error,
  children,
  className
}: WizardFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Label Row */}
      <div className="flex items-center gap-2">
        <Label htmlFor={fieldName} className="text-sm font-medium text-gray-700">
          {label}
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </Label>

        {/* Help Text Tooltip */}
        {helpText && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                <p className="text-sm">{helpText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Field Input */}
      <div className={cn(error && 'ring-2 ring-red-500 ring-offset-2 rounded-md')}>
        {children}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-1.5 text-red-600">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}
    </div>
  )
}

