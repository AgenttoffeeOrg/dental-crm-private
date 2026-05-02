'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Home } from 'lucide-react'

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-red-50">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-4">⚠️</div>
        <h2 className="text-3xl font-semibold text-gray-900 mb-2">Something went wrong!</h2>
        <p className="text-gray-600 mb-6">
          We&apos;re sorry for the inconvenience. The error has been logged and we&apos;ll look into it.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={reset}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/'}>
            <Home className="h-4 w-4 mr-2" />
            Go Home
          </Button>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-8 text-left">
            <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
              Error Details (Dev Only)
            </summary>
            <pre className="mt-2 p-4 bg-gray-900 text-gray-100 text-xs rounded overflow-auto">
              {error.message}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

