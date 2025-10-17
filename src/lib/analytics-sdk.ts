// Analytics SDK - Tracks all user behavior
// Sends events to analytics_events table for super admin dashboard

import { createClient } from './supabase-client'

interface AnalyticsEvent {
  eventType: 'page_view' | 'button_click' | 'feature_used' | 'form_submit' | 'error'
  eventName: string
  eventCategory?: string
  elementId?: string
  elementText?: string
  metadata?: Record<string, any>
  pageUrl?: string
  pageLoadTime?: number
}

class AnalyticsSDK {
  private sessionId: string
  private tenantId: string | null = null
  private userId: string | null = null
  private eventQueue: any[] = []
  private flushInterval: any = null

  constructor() {
    this.sessionId = this.generateSessionId()
    this.startSession()
    this.setupAutoFlush()
  }

  private generateSessionId() {
    // Use crypto for secure random session IDs
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    // Fallback for older environments
    return `${Date.now()}-${Date.now().toString(36)}`
  }

  private startSession() {
    if (typeof window === 'undefined') return

    // Track page load time
    window.addEventListener('load', () => {
      const loadTime = performance.now()
      this.track({
        eventType: 'page_view',
        eventName: 'initial_page_load',
        eventCategory: 'performance',
        pageUrl: window.location.pathname,
        pageLoadTime: Math.round(loadTime)
      })
    })

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.flush() // Flush events when user leaves
      }
    })
  }

  setUser(tenantId: string, userId: string) {
    this.tenantId = tenantId
    this.userId = userId
  }

  track(event: AnalyticsEvent) {
    const analyticsEvent = {
      tenant_id: this.tenantId,
      user_id: this.userId,
      session_id: this.sessionId,
      event_type: event.eventType,
      event_name: event.eventName,
      event_category: event.eventCategory,
      page_url: event.pageUrl || (typeof window !== 'undefined' ? window.location.pathname : null),
      element_id: event.elementId,
      element_text: event.elementText,
      metadata: event.metadata,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      page_load_time_ms: event.pageLoadTime,
      occurred_at: new Date().toISOString()
    }

    this.eventQueue.push(analyticsEvent)

    // Flush if queue gets large
    if (this.eventQueue.length >= 10) {
      this.flush()
    }
  }

  trackPageView(pageName: string) {
    this.track({
      eventType: 'page_view',
      eventName: pageName,
      eventCategory: 'navigation',
      pageUrl: typeof window !== 'undefined' ? window.location.pathname : undefined
    })
  }

  trackClick(buttonName: string, elementId?: string) {
    this.track({
      eventType: 'button_click',
      eventName: buttonName,
      eventCategory: 'interaction',
      elementId,
      elementText: buttonName
    })
  }

  trackFeature(featureName: string, metadata?: Record<string, any>) {
    this.track({
      eventType: 'feature_used',
      eventName: featureName,
      eventCategory: this.getCategory(featureName),
      metadata
    })
  }

  trackError(error: Error, context?: Record<string, any>) {
    this.track({
      eventType: 'error',
      eventName: error.name,
      eventCategory: 'error',
      metadata: {
        message: error.message,
        stack: error.stack,
        ...context
      }
    })
  }

  private getCategory(featureName: string): string {
    if (featureName.includes('contact') || featureName.includes('deal') || featureName.includes('pipeline')) {
      return 'crm'
    }
    if (featureName.includes('campaign') || featureName.includes('marketing')) {
      return 'marketing'
    }
    if (featureName.includes('analytics') || featureName.includes('report')) {
      return 'analytics'
    }
    if (featureName.includes('setting')) {
      return 'settings'
    }
    return 'other'
  }

  private async flush() {
    if (this.eventQueue.length === 0) return

    const events = [...this.eventQueue]
    this.eventQueue = []

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('analytics_events')
        .insert(events)

      if (error) {
        console.error('Analytics flush error:', error)
        // Re-add to queue if failed
        this.eventQueue.push(...events)
      }
    } catch (error) {
      console.error('Analytics error:', error)
    }
  }

  private setupAutoFlush() {
    // Flush every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flush()
    }, 30000)

    // Flush on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.flush()
      })
    }
  }

  destroy() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval)
    }
    this.flush()
  }
}

// Singleton instance
export const analytics = new AnalyticsSDK()

// Helper hooks for React components
export function useAnalytics() {
  return analytics
}

