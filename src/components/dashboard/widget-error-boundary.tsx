'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Props {
  children: ReactNode
  widgetName: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary for Dashboard Widgets
 * 
 * Catches errors in individual widgets and displays a user-friendly
 * error state with retry functionality. Prevents entire dashboard
 * from crashing if one widget fails.
 */
export class WidgetErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    console.error(`[Widget Error: ${this.props.widgetName}]`, error, errorInfo)
    
    // Update state with error details
    this.setState({
      error,
      errorInfo
    })

    // TODO: Send error to monitoring service (Sentry) in production
    // if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, {
    //     tags: { widget: this.props.widgetName },
    //     contexts: { errorInfo }
    //   })
    // }
  }

  handleRetry = () => {
    // Reset error state to retry rendering
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default error UI
      return (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="rounded-full bg-red-100 p-3">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              
              <div>
                <h3 className="font-semibold text-gray-900">
                  {this.props.widgetName} Failed to Load
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Something went wrong while loading this widget
                </p>
              </div>

              <Button
                onClick={this.handleRetry}
                variant="outline"
                size="sm"
                className="mt-2"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-left w-full">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Error Details (Development Only)
                  </summary>
                  <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-40">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return this.props.children
  }
}

/**
 * Lightweight error boundary for non-critical sections
 */
export function LightweightErrorBoundary({ 
  children, 
  fallback 
}: { 
  children: ReactNode
  fallback?: ReactNode 
}) {
  return (
    <WidgetErrorBoundary 
      widgetName="Section" 
      fallback={fallback || <div className="text-sm text-gray-500">Content unavailable</div>}
    >
      {children}
    </WidgetErrorBoundary>
  )
}

