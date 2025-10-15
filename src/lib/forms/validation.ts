/**
 * Form Field Validation Utilities
 * Enterprise-grade validation for all field types
 */

import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { validate as validateEmail } from 'email-validator'

// Common disposable email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'temp-mail.org',
  'fakeinbox.com',
  'maildrop.cc',
  'yopmail.com',
  'sharklasers.com',
]

/**
 * Validate email address
 */
export interface EmailValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
}

export function validateEmailField(email: string): EmailValidationResult {
  if (!email || email.trim() === '') {
    return { valid: false, error: 'Email is required' }
  }

  const trimmedEmail = email.trim().toLowerCase()

  // Basic format validation
  if (!validateEmail(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' }
  }

  const warnings: string[] = []

  // Check for disposable email
  const domain = trimmedEmail.split('@')[1]
  if (domain && DISPOSABLE_EMAIL_DOMAINS.includes(domain)) {
    warnings.push('Disposable email address detected')
  }

  // Check for common typos
  const commonDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com']
  const suggestedDomain = commonDomains.find(d => 
    domain && (
      domain === d.replace('o', '0') ||
      domain === d.replace('l', '1') ||
      domain === d.replace('i', '1')
    )
  )
  if (suggestedDomain) {
    warnings.push(`Did you mean @${suggestedDomain}?`)
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  }
}

/**
 * Validate phone number
 */
export interface PhoneValidationResult {
  valid: boolean
  error?: string
  formatted?: string
  country?: string
}

export function validatePhoneField(
  phone: string,
  defaultCountry: string = 'GB'
): PhoneValidationResult {
  if (!phone || phone.trim() === '') {
    return { valid: false, error: 'Phone number is required' }
  }

  const trimmedPhone = phone.trim()

  try {
    // Check if valid
    if (!isValidPhoneNumber(trimmedPhone, defaultCountry as any)) {
      return { valid: false, error: 'Invalid phone number' }
    }

    // Parse and format
    const phoneNumber = parsePhoneNumber(trimmedPhone, defaultCountry as any)

    return {
      valid: true,
      formatted: phoneNumber.formatInternational(),
      country: phoneNumber.country,
    }
  } catch (error) {
    return { valid: false, error: 'Invalid phone number format' }
  }
}

/**
 * Validate URL
 */
export function validateURL(url: string): { valid: boolean; error?: string } {
  if (!url || url.trim() === '') {
    return { valid: false, error: 'URL is required' }
  }

  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'URL must use HTTP or HTTPS' }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid URL format' }
  }
}

/**
 * Validate number range
 */
export function validateNumber(
  value: string | number,
  min?: number,
  max?: number
): { valid: boolean; error?: string } {
  const num = typeof value === 'string' ? parseFloat(value) : value

  if (isNaN(num)) {
    return { valid: false, error: 'Must be a valid number' }
  }

  if (min !== undefined && num < min) {
    return { valid: false, error: `Must be at least ${min}` }
  }

  if (max !== undefined && num > max) {
    return { valid: false, error: `Must be no more than ${max}` }
  }

  return { valid: true }
}

/**
 * Validate text length
 */
export function validateTextLength(
  text: string,
  minLength?: number,
  maxLength?: number
): { valid: boolean; error?: string } {
  const length = text.length

  if (minLength !== undefined && length < minLength) {
    return {
      valid: false,
      error: `Must be at least ${minLength} characters (currently ${length})`,
    }
  }

  if (maxLength !== undefined && length > maxLength) {
    return {
      valid: false,
      error: `Must be no more than ${maxLength} characters (currently ${length})`,
    }
  }

  return { valid: true }
}

/**
 * Validate against regex pattern
 */
export function validatePattern(
  value: string,
  pattern: string,
  errorMessage: string = 'Invalid format'
): { valid: boolean; error?: string } {
  try {
    const regex = new RegExp(pattern)
    if (!regex.test(value)) {
      return { valid: false, error: errorMessage }
    }
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid validation pattern' }
  }
}

/**
 * Validate file upload
 */
export interface FileValidationOptions {
  maxSizeMB?: number
  allowedTypes?: string[]
  allowedExtensions?: string[]
}

export function validateFile(
  file: File,
  options: FileValidationOptions = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 10, allowedTypes, allowedExtensions } = options

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB (current: ${fileSizeMB.toFixed(1)}MB)`,
    }
  }

  // Check file type
  if (allowedTypes && allowedTypes.length > 0) {
    const isAllowed = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        const prefix = type.slice(0, -2)
        return file.type.startsWith(prefix)
      }
      return file.type === type
    })

    if (!isAllowed) {
      return {
        valid: false,
        error: `File type not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      }
    }
  }

  // Check file extension
  if (allowedExtensions && allowedExtensions.length > 0) {
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    if (!fileExt || !allowedExtensions.includes(fileExt)) {
      return {
        valid: false,
        error: `File extension not allowed. Allowed: ${allowedExtensions.join(', ')}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate date
 */
export function validateDate(
  date: string,
  minDate?: string,
  maxDate?: string
): { valid: boolean; error?: string } {
  if (!date) {
    return { valid: false, error: 'Date is required' }
  }

  const dateObj = new Date(date)
  if (isNaN(dateObj.getTime())) {
    return { valid: false, error: 'Invalid date' }
  }

  if (minDate) {
    const minDateObj = new Date(minDate)
    if (dateObj < minDateObj) {
      return {
        valid: false,
        error: `Date must be after ${minDateObj.toLocaleDateString()}`,
      }
    }
  }

  if (maxDate) {
    const maxDateObj = new Date(maxDate)
    if (dateObj > maxDateObj) {
      return {
        valid: false,
        error: `Date must be before ${maxDateObj.toLocaleDateString()}`,
      }
    }
  }

  return { valid: true }
}

/**
 * Validate required field
 */
export function validateRequired(
  value: any,
  fieldName: string = 'This field'
): { valid: boolean; error?: string } {
  if (value === null || value === undefined || value === '') {
    return { valid: false, error: `${fieldName} is required` }
  }

  if (Array.isArray(value) && value.length === 0) {
    return { valid: false, error: `${fieldName} requires at least one selection` }
  }

  return { valid: true }
}

/**
 * Check for SQL injection patterns (basic security check)
 */
export function checkForSQLInjection(value: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
    /(--|;|\/\*|\*\/|xp_|sp_)/gi,
    /(\bOR\b.*=.*\bOR\b|\bAND\b.*=.*\bAND\b)/gi,
  ]

  return sqlPatterns.some(pattern => pattern.test(value))
}

/**
 * Check for XSS patterns (basic security check)
 */
export function checkForXSS(value: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi, // onclick, onerror, etc.
  ]

  return xssPatterns.some(pattern => pattern.test(value))
}

/**
 * Sanitize user input
 */
export function sanitizeInput(value: string): string {
  return value
    .trim()
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
}

