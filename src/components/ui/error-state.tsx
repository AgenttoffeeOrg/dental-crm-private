import * as React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorStateProps {
  title?: string
  message: string
  retry?: () => void
  className?: string
}

/**
 * ErrorState - Consistent error display
 * 
 * Features:
 * - Clear error message
 * - Optional retry button
 * - Semantic colors (red)
 * - Accessible
 */
export function ErrorState({
  title = 'Something went wrong',
  message,
  retry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4 text-center', className)}>
      <div className="mb-4 rounded-full bg-red-100 p-6 dark:bg-red-950/30">
        <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mb-6 max-w-md text-sm text-gray-600 dark:text-gray-400">
        {message}
      </p>
      {retry && (
        <Button onClick={retry} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      )}
    </div>
  )
}

/**
 * InlineError - Small inline error message
 */
export function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <p>{message}</p>
    </div>
  )
}

