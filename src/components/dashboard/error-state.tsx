'use client'

import { AlertCircle, RefreshCw, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  type?: 'error' | 'network' | 'empty'
  className?: string
}

/**
 * Reusable Error State Component
 * 
 * Displays user-friendly error messages with retry functionality.
 * Used across dashboard widgets for consistent error UX.
 */
export function ErrorState({
  title = 'Something went wrong',
  message = 'We couldn\'t load this data. Please try again.',
  onRetry,
  type = 'error',
  className = ''
}: ErrorStateProps) {
  const Icon = type === 'network' ? WifiOff : AlertCircle

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="rounded-full bg-red-50 p-3 mb-4">
        <Icon className="h-6 w-6 text-red-600" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">
        {message}
      </p>

      {onRetry && (
        <Button
          onClick={onRetry}
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * Empty State Component
 */
export function EmptyState({
  title = 'No data yet',
  message = 'Data will appear here once available.',
  action,
  className = ''
}: {
  title?: string
  message?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}>
      <div className="rounded-full bg-gray-50 p-3 mb-4">
        <AlertCircle className="h-6 w-6 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-sm text-gray-600 text-center max-w-md mb-6">
        {message}
      </p>

      {action}
    </div>
  )
}

