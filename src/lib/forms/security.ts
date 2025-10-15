/**
 * Security Hardening for Forms
 * Protects against common web vulnerabilities
 */

import crypto from 'crypto'

/**
 * Generate CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Verify CSRF token
 */
export function verifyCSRFToken(token: string, expectedToken: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(expectedToken)
  )
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHTML(html: string): string {
  return html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * Validate and sanitize form field values
 */
export function sanitizeFieldValue(value: any, fieldType: string): any {
  if (typeof value !== 'string') {
    return value
  }

  // Remove null bytes
  let sanitized = value.replace(/\0/g, '')

  // For text fields, remove potential XSS
  if (['text', 'textarea', 'email'].includes(fieldType)) {
    sanitized = sanitizeHTML(sanitized)
  }

  // For phone, allow only valid characters
  if (fieldType === 'phone') {
    sanitized = sanitized.replace(/[^0-9+\s\-()]/g, '')
  }

  return sanitized.trim()
}

/**
 * Generate secure form token (prevents replay attacks)
 */
export function generateFormToken(formId: string, expiresIn: number = 3600): {
  token: string
  expiresAt: number
} {
  const payload = {
    formId,
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  }

  const token = Buffer.from(JSON.stringify(payload)).toString('base64')
  const expiresAt = Date.now() + expiresIn * 1000

  return { token, expiresAt }
}

/**
 * Verify form token
 */
export function verifyFormToken(token: string, formId: string): boolean {
  try {
    const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))

    // Check form ID matches
    if (payload.formId !== formId) {
      return false
    }

    // Check not expired (1 hour max)
    const age = Date.now() - payload.timestamp
    if (age > 3600000) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * Check if IP is in ban list
 */
const bannedIPs: Set<string> = new Set()

export function isBannedIP(ip: string): boolean {
  return bannedIPs.has(ip)
}

export function banIP(ip: string): void {
  bannedIPs.add(ip)
  console.warn(`[Security] Banned IP: ${ip}`)
}

export function unbanIP(ip: string): void {
  bannedIPs.delete(ip)
}

/**
 * Detect suspicious patterns in form data
 */
export interface SecurityCheck {
  passed: boolean
  warnings: string[]
  riskScore: number // 0-1, where 1 is high risk
}

export function performSecurityCheck(formData: Record<string, any>): SecurityCheck {
  const warnings: string[] = []
  let riskScore = 0

  // Check for SQL injection patterns
  Object.values(formData).forEach((value) => {
    if (typeof value === 'string') {
      const sqlPatterns = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'UNION', '--', '/*']
      if (sqlPatterns.some(pattern => value.toUpperCase().includes(pattern))) {
        warnings.push('Potential SQL injection detected')
        riskScore += 0.5
      }

      // Check for script tags
      if (/<script/i.test(value)) {
        warnings.push('Potential XSS attempt detected')
        riskScore += 0.5
      }

      // Check for excessive length (potential DoS)
      if (value.length > 10000) {
        warnings.push('Unusually long input detected')
        riskScore += 0.2
      }
    }
  })

  // Check for too many fields (potential enumeration attack)
  if (Object.keys(formData).length > 50) {
    warnings.push('Excessive number of fields')
    riskScore += 0.3
  }

  return {
    passed: riskScore < 0.5,
    warnings,
    riskScore: Math.min(riskScore, 1),
  }
}

/**
 * Content Security Policy headers for forms
 */
export const FORM_CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com https://www.gstatic.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co",
    "frame-ancestors 'self' *", // Allow embedding
  ].join('; '),
}

