'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Star } from 'lucide-react'

interface StarRatingFieldProps {
  id: string
  label: string
  required?: boolean
  value?: number
  onChange: (rating: number) => void
  maxStars?: number
  placeholder?: string
}

export function StarRatingField({
  id,
  label,
  required = false,
  value = 0,
  onChange,
  maxStars = 5,
  placeholder,
}: StarRatingFieldProps) {
  const [hoverRating, setHoverRating] = useState(0)

  const handleClick = (rating: number) => {
    onChange(rating)
  }

  const handleMouseEnter = (rating: number) => {
    setHoverRating(rating)
  }

  const handleMouseLeave = () => {
    setHoverRating(0)
  }

  const displayRating = hoverRating || value

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      {placeholder && (
        <p className="text-sm text-gray-500">{placeholder}</p>
      )}

      <div className="flex items-center gap-1">
        {Array.from({ length: maxStars }, (_, index) => {
          const starValue = index + 1
          const isFilled = starValue <= displayRating

          return (
            <button
              key={starValue}
              type="button"
              onClick={() => handleClick(starValue)}
              onMouseEnter={() => handleMouseEnter(starValue)}
              onMouseLeave={handleMouseLeave}
              className="transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
              aria-label={`Rate ${starValue} star${starValue > 1 ? 's' : ''}`}
            >
              <Star
                className={`
                  h-8 w-8 transition-colors
                  ${isFilled 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'fill-none text-gray-300 hover:text-yellow-400'
                  }
                `}
              />
            </button>
          )
        })}
      </div>

      {value > 0 && (
        <p className="text-sm text-gray-600">
          You rated: <span className="font-semibold">{value} out of {maxStars} stars</span>
        </p>
      )}
    </div>
  )
}

