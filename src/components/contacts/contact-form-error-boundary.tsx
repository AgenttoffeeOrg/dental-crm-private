'use client'

/**
 * Contact Form Error Boundary
 * 
 * Catches and handles errors in contact forms gracefully.
 * Prevents the entire app from crashing when contact operations fail.
 * 
 * @module components/contacts/contact-form-error-boundary
 */

import { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary Component for Contact Forms
 * 
 * Usage:
 * ```tsx
 * <ContactFormErrorBoundary>
 *   <ContactForm />
 * </ContactFormErrorBoundary>
 * ```
 */
export class ContactFormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[ContactFormErrorBoundary] Error caught:', error)
      console.error('[ContactFormErrorBoundary] Error info:', errorInfo)
    }

    // Update state with error details
    this.setState({ errorInfo })

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // TODO: Send error to Sentry when implemented
    // Sentry.captureException(error, {
    //   contexts: { react: errorInfo },
    //   tags: { component: 'ContactForm' },
    // })
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-red-600">
              <p className="font-medium mb-2">
                We encountered an error while processing your contact form.
              </p>
              <p className="text-xs">
                Don't worry - your data is safe. Please try one of the options below.
              </p>
            </div>

            {/* Error details in development */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="bg-white p-3 rounded border border-red-200">
                <summary className="cursor-pointer text-xs font-medium text-red-700 mb-2">
                  Error Details (Dev Only)
                </summary>
                <pre className="text-xs overflow-auto max-h-32 text-red-600">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>

              <Button
                onClick={this.handleReload}
                variant="ghost"
                size="sm"
              >
                Reload Page
              </Button>

              <Button
                onClick={() => window.history.back()}
                variant="ghost"
                size="sm"
              >
                Go Back
              </Button>
            </div>

            {/* Help text */}
            <div className="text-xs text-gray-600 pt-2 border-t">
              <p>If the problem persists:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Try refreshing the page</li>
                <li>Clear your browser cache</li>
                <li>Contact support if needed</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Functional wrapper for easier usage
 * 
 * Usage:
 * ```tsx
 * <ContactFormWithErrorBoundary>
 *   <ContactForm />
 * </ContactFormWithErrorBoundary>
 * ```
 */
export function ContactFormWithErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ContactFormErrorBoundary
      onError={(error, errorInfo) => {
        // Future: Log to error tracking service
        console.error('Contact form error:', error, errorInfo)
      }}
    >
      {children}
    </ContactFormErrorBoundary>
  )
}

