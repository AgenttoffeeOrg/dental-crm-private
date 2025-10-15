'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'

interface NPSFieldProps {
  id: string
  label: string
  required?: boolean
  value?: number
  onChange: (score: number) => void
  placeholder?: string
}

export function NPSField({
  id,
  label,
  required = false,
  value,
  onChange,
  placeholder = 'How likely are you to recommend us to a friend or colleague?',
}: NPSFieldProps) {
  const [hoverScore, setHoverScore] = useState<number | null>(null)

  const scores = Array.from({ length: 11 }, (_, i) => i)

  const getScoreCategory = (score: number) => {
    if (score >= 9) return { label: 'Promoter', color: 'text-green-600' }
    if (score >= 7) return { label: 'Passive', color: 'text-yellow-600' }
    return { label: 'Detractor', color: 'text-red-600' }
  }

  const displayScore = hoverScore !== null ? hoverScore : value
  const category = displayScore !== undefined ? getScoreCategory(displayScore) : null

  return (
    <div className="space-y-3">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {placeholder && (
        <p className="text-sm text-gray-600">{placeholder}</p>
      )}

      {/* Score Grid */}
      <div className="space-y-2">
        <div className="grid grid-cols-11 gap-1">
          {scores.map((score) => {
            const isSelected = value === score
            const isHovered = hoverScore === score
            const isInRange = displayScore !== undefined && score <= displayScore

            return (
              <button
                key={score}
                type="button"
                onClick={() => onChange(score)}
                onMouseEnter={() => setHoverScore(score)}
                onMouseLeave={() => setHoverScore(null)}
                className={`
                  h-12 rounded-lg font-semibold text-sm transition-all
                  focus:outline-none focus:ring-2 focus:ring-blue-500
                  ${isSelected
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                    : isHovered
                    ? 'bg-blue-500 text-white'
                    : isInRange
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
                aria-label={`Score ${score}`}
              >
                {score}
              </button>
            )
          })}
        </div>

        {/* Labels */}
        <div className="flex justify-between text-xs text-gray-500">
          <span>Not at all likely</span>
          <span>Extremely likely</span>
        </div>
      </div>

      {/* Category Display */}
      {value !== undefined && category && (
        <div className={`text-center py-3 rounded-lg bg-gray-50 border border-gray-200`}>
          <p className="text-sm text-gray-600">
            Your score: <span className="font-bold text-lg">{value}</span>
          </p>
          <p className={`text-sm font-semibold ${category.color}`}>
            Category: {category.label}
          </p>
        </div>
      )}

      {/* Info Tooltip */}
      {value === undefined && (
        <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg p-2">
          <p><strong>0-6:</strong> Detractors • <strong>7-8:</strong> Passives • <strong>9-10:</strong> Promoters</p>
        </div>
      )}
    </div>
  )
}

