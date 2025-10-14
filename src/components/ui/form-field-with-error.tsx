'use client'

import { Label } from './label'
import { Input } from './input'
import { Textarea } from './textarea'
import { InfoTooltip } from './info-tooltip'

interface FormFieldProps {
  label: string
  name: string
  type?: 'text' | 'email' | 'tel' | 'number' | 'date' | 'textarea'
  value: string | number
  onChange: (value: string | number) => void
  error?: string
  required?: boolean
  placeholder?: string
  help?: string
  maxLength?: number
  disabled?: boolean
}

export function FormFieldWithError({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  required,
  placeholder,
  help,
  maxLength,
  disabled
}: FormFieldProps) {
  const showCharCount = maxLength && type !== 'number'
  const currentLength = String(value).length

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={name}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
        {help && <InfoTooltip content={help} />}
      </div>
      
      {type === 'textarea' ? (
        <Textarea
          id={name}
          value={value as string}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={error ? 'border-red-500' : ''}
        />
      ) : (
        <Input
          id={name}
          type={type}
          value={value}
          onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={error ? 'border-red-500' : ''}
        />
      )}
      
      <div className="flex items-center justify-between">
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        {showCharCount && (
          <p className={`text-xs ${currentLength > maxLength! ? 'text-red-600' : 'text-gray-500'} ml-auto`}>
            {currentLength}/{maxLength}
          </p>
        )}
      </div>
    </div>
  )
}


