// Client-side analytics tracking

interface AnalyticsEvent {
  name: string
  properties?: Record<string, any>
}

class Analytics {
  track(event: AnalyticsEvent) {
    // In production, send to analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics]', event.name, event.properties)
    }

    // Example: Send to Mixpanel, Amplitude, etc.
    // if (window.mixpanel) {
    //   window.mixpanel.track(event.name, event.properties)
    // }
  }

  page(pageName: string) {
    this.track({ name: 'Page View', properties: { page: pageName } })
  }

  identify(userId: string, traits?: Record<string, any>) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Analytics] Identify:', userId, traits)
    }
  }
}

export const analytics = new Analytics()

