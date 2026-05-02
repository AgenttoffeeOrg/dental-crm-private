/**
 * URL Parameter Prefilling Utilities
 * Parses URL parameters and prefills form fields
 * 
 * Features:
 * - Field name mapping (e.g., ?email=test@test.com)
 * - Field alias support (e.g., ?e=test@test.com → email field)
 * - UTM parameter capture
 * - Hidden field support
 */

export interface PrefillConfig {
  allowPrefill?: boolean // Field-level setting
  urlParamName?: string // Custom URL parameter name for this field
  defaultValue?: string // Default value for hidden fields
}

/**
 * Parse URL parameters into an object
 */
export function parseUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}

  for (const [key, value] of params.entries()) {
    result[key] = decodeURIComponent(value)
  }

  return result
}

/**
 * Extract UTM parameters from URL
 */
export function extractUtmParams(): Record<string, string> {
  const params = parseUrlParams()
  const utmParams: Record<string, string> = {}

  const utmKeys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content']

  for (const key of utmKeys) {
    if (params[key]) {
      utmParams[key] = params[key]
    }
  }

  return utmParams
}

/**
 * Get prefilled value for a field from URL parameters
 */
export function getPrefillValue(
  fieldId: string,
  fieldName: string,
  fieldType: string,
  config?: PrefillConfig
): string | undefined {
  if (config?.allowPrefill === false) {
    return undefined
  }

  const urlParams = parseUrlParams()

  // Check custom URL parameter name first
  if (config?.urlParamName && urlParams[config.urlParamName]) {
    return urlParams[config.urlParamName]
  }

  // Check field name
  if (urlParams[fieldName]) {
    return urlParams[fieldName]
  }

  // Check field ID
  if (urlParams[fieldId]) {
    return urlParams[fieldId]
  }

  // Common aliases
  const aliases: Record<string, string[]> = {
    email: ['e', 'mail', 'email_address'],
    phone: ['p', 'tel', 'phone_number', 'mobile'],
    name: ['n', 'full_name', 'fullname'],
    firstName: ['fname', 'first_name', 'f'],
    lastName: ['lname', 'last_name', 'l'],
  }

  const fieldAliases = aliases[fieldName.toLowerCase()] || []
  for (const alias of fieldAliases) {
    if (urlParams[alias]) {
      return urlParams[alias]
    }
  }

  // Return default value for hidden fields
  if (config?.defaultValue) {
    return config.defaultValue
  }

  return undefined
}

/**
 * Build initial form data with URL prefilling
 */
export function buildInitialFormData(
  fields: Array<{
    id: string
    type: string
    label?: string
    fieldName?: string
    allowPrefill?: boolean
    urlParamName?: string
    defaultValue?: string
    hidden?: boolean
  }>,
  includeUtm: boolean = true
): Record<string, any> {
  const initialData: Record<string, any> = {}

  // Prefill regular fields
  for (const field of fields) {
    const fieldName = field.fieldName || field.id
    const prefillValue = getPrefillValue(field.id, fieldName, field.type, {
      allowPrefill: field.allowPrefill,
      urlParamName: field.urlParamName,
      defaultValue: field.hidden ? field.defaultValue : undefined,
    })

    if (prefillValue !== undefined) {
      initialData[field.id] = prefillValue
    } else {
      initialData[field.id] = ''
    }
  }

  // Add UTM parameters as hidden fields if requested
  if (includeUtm) {
    const utmParams = extractUtmParams()
    for (const [key, value] of Object.entries(utmParams)) {
      // Store UTM params with utm_ prefix to avoid conflicts
      initialData[`utm_${key.replace('utm_', '')}`] = value
    }
  }

  return initialData
}




