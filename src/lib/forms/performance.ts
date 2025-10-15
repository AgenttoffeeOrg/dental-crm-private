/**
 * Performance Optimization Utilities for Forms
 * Ensures fast load times and smooth user experience
 */

/**
 * Lazy load component
 */
export function lazyLoadComponent<T extends React.ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return React.lazy(importFunc)
}

/**
 * Debounce function for expensive operations
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }

    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function for rate-limiting events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Measure form interaction time
 */
export class FormPerformanceTracker {
  private startTime: number
  private firstInteractionTime: number | null = null
  private submitTime: number | null = null
  private fieldInteractions: Map<string, number[]> = new Map()

  constructor() {
    this.startTime = Date.now()
  }

  trackFirstInteraction(): void {
    if (this.firstInteractionTime === null) {
      this.firstInteractionTime = Date.now()
    }
  }

  trackFieldInteraction(fieldId: string): void {
    if (!this.fieldInteractions.has(fieldId)) {
      this.fieldInteractions.set(fieldId, [])
    }
    this.fieldInteractions.get(fieldId)?.push(Date.now())
  }

  trackSubmission(): void {
    this.submitTime = Date.now()
  }

  getMetrics() {
    return {
      timeToFirstInteraction: this.firstInteractionTime
        ? this.firstInteractionTime - this.startTime
        : null,
      totalCompletionTime: this.submitTime ? this.submitTime - this.startTime : null,
      fieldInteractionCounts: Object.fromEntries(
        Array.from(this.fieldInteractions.entries()).map(([field, times]) => [
          field,
          times.length,
        ])
      ),
    }
  }
}

/**
 * Preload critical resources
 */
export function preloadFormAssets(formId: string): void {
  // Preload form data
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = `/api/forms/${formId}`
  document.head.appendChild(link)
}

/**
 * Optimize images in form
 */
export function optimizeImage(url: string, width?: number): string {
  // If using Supabase storage, add transformation params
  if (url.includes('supabase')) {
    const params = new URLSearchParams()
    if (width) params.set('width', width.toString())
    params.set('quality', '85')
    params.set('format', 'webp')
    return `${url}?${params.toString()}`
  }

  return url
}

/**
 * Check if form should use lazy loading
 */
export function shouldLazyLoad(fieldType: string): boolean {
  const heavyFields = ['file', 'signature', 'rating']
  return heavyFields.includes(fieldType)
}

/**
 * Monitor form performance metrics
 */
export interface PerformanceMetrics {
  timeToInteractive: number
  firstPaint: number
  firstContentfulPaint: number
  largestContentfulPaint: number
  cumulativeLayoutShift: number
}

export function getFormPerformanceMetrics(): PerformanceMetrics | null {
  if (typeof window === 'undefined' || !window.performance) {
    return null
  }

  const navigation = performance.getEntriesByType('navigation')[0] as any
  const paint = performance.getEntriesByType('paint')

  return {
    timeToInteractive: navigation?.domInteractive || 0,
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    largestContentfulPaint: 0, // Would need PerformanceObserver
    cumulativeLayoutShift: 0, // Would need PerformanceObserver
  }
}

