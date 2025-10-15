/**
 * Google Analytics 4 Event Tracking for Forms
 * Tracks form interactions and conversions
 */

declare global {
  interface Window {
    gtag?: (...args: any[]) => void
    dataLayer?: any[]
  }
}

export interface FormEventParams {
  form_id: string
  form_name: string
  form_type?: string
  field_count?: number
  step_number?: number
  error_field?: string
  submission_id?: string
}

/**
 * Track form view
 */
export function trackFormView(params: FormEventParams) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'form_view', {
    event_category: 'Form',
    event_label: params.form_name,
    form_id: params.form_id,
    form_type: params.form_type,
    field_count: params.field_count,
  })
}

/**
 * Track form start (first interaction)
 */
export function trackFormStart(params: FormEventParams) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'form_start', {
    event_category: 'Form',
    event_label: params.form_name,
    form_id: params.form_id,
    form_type: params.form_type,
  })
}

/**
 * Track form step completion (for multi-step forms)
 */
export function trackFormStep(params: FormEventParams) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'form_step', {
    event_category: 'Form',
    event_label: params.form_name,
    form_id: params.form_id,
    step_number: params.step_number,
  })
}

/**
 * Track form submission
 */
export function trackFormSubmit(params: FormEventParams) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'form_submit', {
    event_category: 'Form',
    event_label: params.form_name,
    form_id: params.form_id,
    submission_id: params.submission_id,
  })

  // Also track as conversion
  window.gtag('event', 'conversion', {
    event_category: 'Lead',
    event_label: params.form_name,
    send_to: 'CONVERSION_ID/CONVERSION_LABEL', // Configure in Google Ads
  })
}

/**
 * Track form error/abandonment
 */
export function trackFormError(params: FormEventParams) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'form_error', {
    event_category: 'Form',
    event_label: params.form_name,
    form_id: params.form_id,
    error_field: params.error_field,
  })
}

/**
 * Track field interaction (focus)
 */
export function trackFieldInteraction(formId: string, fieldName: string) {
  if (typeof window === 'undefined' || !window.gtag) return

  window.gtag('event', 'field_interaction', {
    event_category: 'Form',
    form_id: formId,
    field_name: fieldName,
  })
}

/**
 * Initialize GA4 tracking
 */
export function initializeGA4(measurementId: string) {
  if (typeof window === 'undefined') return

  // Load gtag.js script
  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  window.gtag = function() {
    window.dataLayer?.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId)
}

/**
 * Check if GA4 is loaded
 */
export function isGA4Loaded(): boolean {
  return typeof window !== 'undefined' && !!window.gtag
}

