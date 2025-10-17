/**
 * Email Configuration
 * 
 * Centralized configuration for email sending, providers, and templates.
 */

/**
 * Supported email providers
 */
export const EmailProviders = {
  RESEND: 'resend' as const,
  SENDGRID: 'sendgrid' as const,
  CONSOLE: 'console' as const, // For development/testing
} as const

export type EmailProvider = typeof EmailProviders[keyof typeof EmailProviders]

/**
 * Get configured email provider
 */
export function getEmailProvider(): EmailProvider {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase()
  
  switch (provider) {
    case 'resend':
      return EmailProviders.RESEND
    case 'sendgrid':
      return EmailProviders.SENDGRID
    default:
      // Default to console in development
      return process.env.NODE_ENV === 'production' 
        ? EmailProviders.RESEND 
        : EmailProviders.CONSOLE
  }
}

/**
 * Email sender configuration
 */
export const EmailConfig = {
  /**
   * Default "from" address
   */
  DEFAULT_FROM: process.env.EMAIL_FROM || 'Dental CRM <noreply@dentalcrm.com>',
  
  /**
   * Support email
   */
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'support@dentalcrm.com',
  
  /**
   * No-reply email
   */
  NO_REPLY_EMAIL: process.env.NO_REPLY_EMAIL || 'noreply@dentalcrm.com',
  
  /**
   * Reply-to address
   */
  REPLY_TO: process.env.EMAIL_REPLY_TO || 'support@dentalcrm.com',
} as const

/**
 * Email template types
 */
export const EmailTemplates = {
  // Authentication
  INVITATION: 'invitation',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  EMAIL_VERIFICATION: 'email_verification',
  
  // Organization
  JOIN_REQUEST_RECEIVED: 'join_request_received',
  JOIN_REQUEST_APPROVED: 'join_request_approved',
  JOIN_REQUEST_REJECTED: 'join_request_rejected',
  LOCATION_ACCESS_GRANTED: 'location_access_granted',
  LOCATION_ACCESS_REVOKED: 'location_access_revoked',
  
  // Billing
  SUBSCRIPTION_CREATED: 'subscription_created',
  SUBSCRIPTION_RENEWED: 'subscription_renewed',
  PAYMENT_FAILED: 'payment_failed',
  SEAT_LIMIT_WARNING: 'seat_limit_warning',
  SEAT_LIMIT_REACHED: 'seat_limit_reached',
  
  // Notifications
  NEW_LOCATION_ADDED: 'new_location_added',
  USER_ROLE_CHANGED: 'user_role_changed',
} as const

export type EmailTemplate = typeof EmailTemplates[keyof typeof EmailTemplates]

/**
 * Email rate limiting configuration
 */
export const EmailRateLimits = {
  /**
   * Maximum emails per hour (per sender)
   */
  MAX_EMAILS_PER_HOUR: 100,
  
  /**
   * Maximum emails per day (per sender)
   */
  MAX_EMAILS_PER_DAY: 500,
  
  /**
   * Cooldown between identical emails (in seconds)
   */
  DUPLICATE_EMAIL_COOLDOWN: 300, // 5 minutes
} as const

/**
 * Email retry configuration
 */
export const EmailRetryConfig = {
  /**
   * Maximum retry attempts for failed emails
   */
  MAX_RETRIES: 3,
  
  /**
   * Delay between retries (in milliseconds)
   */
  RETRY_DELAYS: [1000, 5000, 15000], // 1s, 5s, 15s
  
  /**
   * Timeout for email sending (in milliseconds)
   */
  TIMEOUT: 10000, // 10 seconds
} as const

/**
 * Email logging configuration
 */
export const EmailLogging = {
  /**
   * Log all email attempts
   */
  LOG_ATTEMPTS: true,
  
  /**
   * Log email content (be careful with PII)
   */
  LOG_CONTENT: process.env.NODE_ENV !== 'production',
  
  /**
   * Store email history in database
   */
  STORE_HISTORY: true,
} as const

/**
 * Get API key for configured provider
 */
export function getEmailApiKey(): string | undefined {
  const provider = getEmailProvider()
  
  switch (provider) {
    case EmailProviders.RESEND:
      return process.env.RESEND_API_KEY
    case EmailProviders.SENDGRID:
      return process.env.SENDGRID_API_KEY
    default:
      return undefined
  }
}

/**
 * Validate email configuration
 */
export function validateEmailConfig(): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  const provider = getEmailProvider()
  
  // Check if provider is configured
  if (provider === EmailProviders.CONSOLE && process.env.NODE_ENV === 'production') {
    errors.push('Email provider not configured for production')
  }
  
  // Check API key
  const apiKey = getEmailApiKey()
  if (provider !== EmailProviders.CONSOLE && !apiKey) {
    errors.push(`API key not configured for ${provider}`)
  }
  
  // Check from address
  if (!EmailConfig.DEFAULT_FROM) {
    errors.push('Default from address not configured')
  }
  
  return {
    valid: errors.length === 0,
    errors,
  }
}

