import { useState } from 'react'
import { z } from 'zod'
import { toast } from 'sonner'

export function useFormValidation<T extends z.ZodType>(schema: T) {
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const validate = (data: unknown) => {
    try {
      const result = schema.parse(data)
      setErrors({})
      return { success: true, data: result }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path) {
            fieldErrors[err.path.join('.')] = err.message
          }
        })
        setErrors(fieldErrors)
      }
      return { success: false, data: null }
    }
  }

  const handleSubmit = async (
    data: unknown,
    onSuccess: (validData: z.infer<T>) => Promise<void>
  ) => {
    setIsSubmitting(true)
    const result = validate(data)
    
    if (result.success) {
      try {
        await onSuccess(result.data)
        toast.success('Saved successfully!')
      } catch (error) {
        toast.error('Failed to save')
      }
    } else {
      toast.error('Please fix validation errors')
    }
    
    setIsSubmitting(false)
  }

  return { errors, isSubmitting, validate, handleSubmit, setErrors }
}

