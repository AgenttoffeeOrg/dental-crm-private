'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Calendar } from 'lucide-react'

interface DatePickerFieldProps {
  id: string
  label: string
  required?: boolean
  value?: string
  onChange: (date: string) => void
  placeholder?: string
  minDate?: string
  maxDate?: string
  type?: 'date' | 'time' | 'datetime-local'
}

export function DatePickerField({
  id,
  label,
  required = false,
  value,
  onChange,
  placeholder,
  minDate,
  maxDate,
  type = 'date',
}: DatePickerFieldProps) {
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return ''
    
    try {
      const date = new Date(dateString)
      if (type === 'date') {
        return date.toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      } else if (type === 'time') {
        return date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
        })
      } else {
        return date.toLocaleString('en-GB', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      }
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={minDate}
          max={maxDate}
          className="pr-10"
        />
        <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
      </div>

      {value && (
        <p className="text-sm text-gray-600">
          Selected: <span className="font-medium">{formatDateForDisplay(value)}</span>
        </p>
      )}
    </div>
  )
}

