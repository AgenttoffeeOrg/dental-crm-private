'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { ChevronRight, Check } from 'lucide-react'
import type { MarketingForm, FormField } from '@/hooks/use-marketing-forms'
import { motion, AnimatePresence } from 'framer-motion'

interface ConversationalFormRendererProps {
  form: MarketingForm
  onSubmit?: (data: any) => void
}

export function ConversationalFormRenderer({
  form,
  onSubmit,
}: ConversationalFormRendererProps) {
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const fields = form.fields_json
  const currentField = fields[currentFieldIndex]
  const progress = ((currentFieldIndex + 1) / fields.length) * 100
  const isLastField = currentFieldIndex === fields.length - 1

  // Auto-focus input on field change
  useEffect(() => {
    inputRef.current?.focus()
  }, [currentFieldIndex])

  const validateField = (field: FormField, value: any): string | null => {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `Please answer this question`
    }

    if (field.type === 'email' && value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(value)) {
        return 'Please enter a valid email address'
      }
    }

    if (field.type === 'phone' && value) {
      const phoneRegex = /^[\d\s+()-]{10,}$/
      if (!phoneRegex.test(value)) {
        return 'Please enter a valid phone number'
      }
    }

    return null
  }

  const handleNext = () => {
    const validation = validateField(currentField, formData[currentField.id])
    
    if (validation) {
      setError(validation)
      return
    }

    setError(null)

    if (isLastField) {
      handleSubmit()
    } else {
      setCurrentFieldIndex(currentFieldIndex + 1)
    }
  }

  const handleBack = () => {
    if (currentFieldIndex > 0) {
      setCurrentFieldIndex(currentFieldIndex - 1)
      setError(null)
    }
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    if (onSubmit) {
      onSubmit(formData)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleNext()
    }
  }

  const handleFieldChange = (value: any) => {
    setFormData({ ...formData, [currentField.id]: value })
    setError(null)
  }

  const renderField = () => {
    const value = formData[currentField.id] || ''

    switch (currentField.type) {
      case 'text':
      case 'email':
      case 'phone':
        return (
          <Input
            ref={inputRef}
            type={currentField.type}
            value={value}
            onChange={(e) => handleFieldChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={currentField.placeholder || 'Type your answer...'}
            className="text-2xl border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-600 focus:ring-0 px-0"
            autoFocus
          />
        )

      case 'select':
        return (
          <div className="space-y-3">
            {currentField.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  handleFieldChange(option)
                  setTimeout(handleNext, 300)
                }}
                className={`
                  w-full text-left px-6 py-4 rounded-lg border-2 transition-all
                  ${value === option
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{option}</span>
                  {value === option && (
                    <Check className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )

      case 'radio':
        return (
          <div className="space-y-3">
            {currentField.options?.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => {
                  handleFieldChange(option)
                  setTimeout(handleNext, 300)
                }}
                className={`
                  w-full text-left px-6 py-4 rounded-lg border-2 transition-all
                  ${value === option
                    ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{option}</span>
                  {value === option && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        )

      case 'scale':
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              {Array.from(
                { length: (currentField.validation?.max || 10) + 1 },
                (_, i) => i
              ).map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => {
                    handleFieldChange(num)
                    setTimeout(handleNext, 300)
                  }}
                  className={`
                    w-12 h-12 rounded-lg font-bold text-lg transition-all
                    ${value === num
                      ? 'bg-blue-600 text-white scale-110'
                      : 'bg-gray-100 text-gray-700 hover:bg-blue-100'
                    }
                  `}
                >
                  {num}
                </button>
              ))}
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{currentField.validation?.min || 0}</span>
              <span>{currentField.validation?.max || 10}</span>
            </div>
          </div>
        )

      case 'textarea':
        return (
          <textarea
            ref={inputRef as any}
            value={value}
            onChange={(e) => handleFieldChange(e.target.value)}
            placeholder={currentField.placeholder || 'Type your answer...'}
            className="w-full text-xl border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-600 focus:ring-0 px-0 resize-none"
            rows={4}
            autoFocus
          />
        )

      default:
        return (
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => handleFieldChange(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your answer..."
            className="text-2xl border-0 border-b-2 border-gray-300 rounded-none focus:border-blue-600 focus:ring-0 px-0"
            autoFocus
          />
        )
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl w-full text-center"
        >
          <div className="bg-white rounded-2xl shadow-xl p-12">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
            >
              <svg className="h-24 w-24 text-green-500 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Thank You!
            </h2>
            <p className="text-xl text-gray-600 whitespace-pre-line">
              {form.success_message.replace(/\{\{(\w+)\}\}/g, (match, key) => formData[key] || match)}
            </p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b shadow-sm">
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-screen p-6 pt-20">
        <div className="max-w-3xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentFieldIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Question Number */}
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white font-bold">
                  {currentFieldIndex + 1}
                </div>
                <span className="text-sm text-gray-500">
                  of {fields.length}
                </span>
              </div>

              {/* Question */}
              <div>
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  {currentField.label}
                  {currentField.required && <span className="text-blue-600 ml-2">*</span>}
                </h2>
                {currentField.placeholder && currentField.type !== 'select' && currentField.type !== 'radio' && (
                  <p className="text-lg text-gray-500 mb-6">
                    {currentField.placeholder}
                  </p>
                )}
              </div>

              {/* Field Input */}
              <div className="bg-white rounded-xl shadow-lg p-8">
                {renderField()}
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border-2 border-red-300 rounded-lg p-4 text-red-700"
                >
                  {error}
                </motion.div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between">
                {currentFieldIndex > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleBack}
                    className="text-gray-600"
                  >
                    ← Back
                  </Button>
                ) : (
                  <div></div>
                )}

                {!['select', 'radio'].includes(currentField.type) && (
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-gray-500">
                      Press <kbd className="px-2 py-1 bg-gray-100 border rounded text-xs font-mono">Enter ↵</kbd>
                    </div>
                    <Button
                      type="button"
                      onClick={handleNext}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLastField ? 'Submit' : 'Next'}
                      <ChevronRight className="h-5 w-5 ml-2" />
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Progress Indicator (Bottom) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
        <div className="bg-white border shadow-lg rounded-full px-4 py-2 flex items-center gap-2">
          {fields.map((_, index) => (
            <div
              key={index}
              className={`
                w-2 h-2 rounded-full transition-all
                ${index < currentFieldIndex
                  ? 'bg-green-500'
                  : index === currentFieldIndex
                  ? 'bg-blue-600 w-3 h-3'
                  : 'bg-gray-300'
                }
              `}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

