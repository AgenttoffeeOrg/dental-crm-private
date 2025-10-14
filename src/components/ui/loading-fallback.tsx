'use client'

import { Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface LoadingFallbackProps {
  message?: string
  fullScreen?: boolean
}

export function LoadingFallback({ 
  message = 'Loading...', 
  fullScreen = false 
}: LoadingFallbackProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      <p className="text-sm text-gray-600">{message}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8">
            {content}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  )
}

interface ErrorFallbackProps {
  message?: string
  onRetry?: () => void
  fullScreen?: boolean
}

export function ErrorFallback({ 
  message = 'Something went wrong',
  onRetry,
  fullScreen = false 
}: ErrorFallbackProps) {
  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
        <AlertCircle className="h-6 w-6 text-red-600" />
      </div>
      <p className="text-sm text-gray-600 text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Try again
        </button>
      )}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-96">
          <CardContent className="p-8">
            {content}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  )
}
