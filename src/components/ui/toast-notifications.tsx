'use client'

import { toast as sonnerToast } from 'sonner'
import { Check, X, AlertCircle, Info } from 'lucide-react'

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      icon: <Check className="h-5 w-5" />
    })
  },

  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      icon: <X className="h-5 w-5" />
    })
  },

  warning: (message: string, description?: string) => {
    sonnerToast.warning(message, {
      description,
      icon: <AlertCircle className="h-5 w-5" />
    })
  },

  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      icon: <Info className="h-5 w-5" />
    })
  },

  promise: async <T,>(
    promise: Promise<T>,
    { loading, success, error }: { loading: string; success: string; error: string }
  ) => {
    return sonnerToast.promise(promise, {
      loading,
      success,
      error
    })
  }
}

