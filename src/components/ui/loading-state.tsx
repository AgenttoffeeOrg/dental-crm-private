import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

/**
 * LoadingState - Consistent loading spinner
 * 
 * Features:
 * - Three sizes (sm/md/lg)
 * - Optional message
 * - Smooth animation
 * - Accessible (aria-label)
 */
export function LoadingState({ message, size = 'md', className }: LoadingStateProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  }
  
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loader2 className={cn('animate-spin text-blue-600', sizeClasses[size])} aria-label="Loading" />
      {message && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  )
}

/**
 * LoadingSkeleton - Skeleton loader for cards/lists
 */
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse space-y-4', className)}>
      <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
      <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
    </div>
  )
}

/**
 * LoadingCard - Skeleton for card layouts
 */
export function LoadingCard() {
  return (
    <div className="rounded-lg border border-gray-200 p-5 shadow-sm dark:border-gray-800">
      <div className="animate-pulse space-y-4">
        <div className="h-6 w-1/2 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
        <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-800" />
      </div>
    </div>
  )
}

/**
 * LoadingTable - Skeleton for table rows
 */
export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse rounded border border-gray-200 p-4 dark:border-gray-800">
          <div className="flex items-center gap-4">
            <div className="h-4 w-4 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  )
}

