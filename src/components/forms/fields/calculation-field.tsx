'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Calculator } from 'lucide-react'

interface CalculationFieldProps {
  id: string
  label: string
  formula: string // e.g., "base_price + (addon_1 * qty)"
  formData: Record<string, any>
  prefix?: string // e.g., "£" or "$"
  suffix?: string // e.g., "per month"
  decimals?: number
}

export function CalculationField({
  id,
  label,
  formula,
  formData,
  prefix = '£',
  suffix = '',
  decimals = 2,
}: CalculationFieldProps) {
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    calculateResult()
  }, [formula, formData])

  const calculateResult = () => {
    try {
      // Replace variables in formula with actual values
      let processedFormula = formula

      Object.entries(formData).forEach(([key, value]) => {
        const numValue = parseFloat(value) || 0
        processedFormula = processedFormula.replace(
          new RegExp(`\\b${key}\\b`, 'g'),
          numValue.toString()
        )
      })

      // Evaluate formula (safe evaluation)
      const calculatedResult = evaluateFormula(processedFormula)

      setResult(calculatedResult)
      setError(null)
    } catch (err) {
      setError('Invalid formula')
      setResult(null)
    }
  }

  const evaluateFormula = (formula: string): number => {
    // Safe formula evaluation (only allows numbers and basic operators)
    const sanitized = formula.replace(/[^0-9+\-*/(). ]/g, '')

    // Check for dangerous patterns
    if (/[a-zA-Z]/.test(sanitized)) {
      throw new Error('Invalid formula')
    }

    try {
      // Use Function constructor for safer evaluation than eval
      const func = new Function(`return ${sanitized}`)
      return func()
    } catch {
      throw new Error('Evaluation failed')
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <Calculator className="h-4 w-4 text-blue-600" />
        {label}
      </Label>

      <Card className="bg-blue-50 border-blue-200">
        <div className="p-4">
          {error ? (
            <p className="text-red-600 text-sm">{error}</p>
          ) : result !== null ? (
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-900">
                {prefix}{result.toFixed(decimals).toLocaleString()}{suffix && ` ${suffix}`}
              </div>
              <p className="text-xs text-blue-700 mt-1">Estimated based on your selections</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 text-center">
              Fill in the fields above to see the calculation
            </p>
          )}
        </div>
      </Card>

      {/* Formula Display (for debugging) */}
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-gray-500 font-mono">
          Formula: {formula}
        </p>
      )}
    </div>
  )
}

