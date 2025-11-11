/**
 * Integration Error Handler
 * 
 * Provides user-friendly error messages and recovery actions
 */

export interface IntegrationError {
  code: string
  message: string
  userMessage: string
  recoverable: boolean
  recoveryAction?: string
}

export const INTEGRATION_ERRORS: Record<string, IntegrationError> = {
  'missing_table': {
    code: 'missing_table',
    message: 'Integration connections table does not exist',
    userMessage: 'Integration system is not set up yet. Please contact your administrator.',
    recoverable: false,
  },
  'auth_failed': {
    code: 'auth_failed',
    message: 'Authentication failed',
    userMessage: 'Please sign in again to continue.',
    recoverable: true,
    recoveryAction: 'sign_in',
  },
  'GOOGLE_OAUTH_NOT_CONFIGURED': {
    code: 'GOOGLE_OAUTH_NOT_CONFIGURED',
    message: 'Google OAuth Client ID is missing',
    userMessage: 'Google OAuth is not configured. Please contact your administrator to set up Google OAuth credentials. See OAUTH_SETUP_REQUIRED.md for instructions.',
    recoverable: false,
  },
  'FACEBOOK_OAUTH_NOT_CONFIGURED': {
    code: 'FACEBOOK_OAUTH_NOT_CONFIGURED',
    message: 'Facebook App ID is missing',
    userMessage: 'Facebook OAuth is not configured. Please contact your administrator to set up Facebook OAuth credentials. See OAUTH_SETUP_REQUIRED.md for instructions.',
    recoverable: false,
  },
  'MICROSOFT_OAUTH_NOT_CONFIGURED': {
    code: 'MICROSOFT_OAUTH_NOT_CONFIGURED',
    message: 'Microsoft Client ID is missing',
    userMessage: 'Microsoft OAuth is not configured. Please contact your administrator to set up Microsoft OAuth credentials. See OAUTH_SETUP_REQUIRED.md for instructions.',
    recoverable: false,
  },
  'oauth_cancelled': {
    code: 'oauth_cancelled',
    message: 'User cancelled OAuth flow',
    userMessage: 'Connection cancelled. You can try again anytime.',
    recoverable: true,
    recoveryAction: 'retry',
  },
  'oauth_denied': {
    code: 'oauth_denied',
    message: 'User denied OAuth permissions',
    userMessage: 'Permissions were denied. Some features may not work. You can reconnect later.',
    recoverable: true,
    recoveryAction: 'reconnect',
  },
  'token_expired': {
    code: 'token_expired',
    message: 'OAuth token expired',
    userMessage: 'Your connection expired. We\'ll refresh it automatically, or you can reconnect.',
    recoverable: true,
    recoveryAction: 'refresh',
  },
  'verification_pending': {
    code: 'verification_pending',
    message: 'App verification pending',
    userMessage: 'This service is waiting for app verification. It will be available in 2-6 weeks.',
    recoverable: false,
  },
  'missing_scopes': {
    code: 'missing_scopes',
    message: 'Required scopes not granted',
    userMessage: 'Some permissions are missing. Click "Enable" to grant additional access.',
    recoverable: true,
    recoveryAction: 'enable',
  },
  'network_error': {
    code: 'network_error',
    message: 'Network request failed',
    userMessage: 'Network error. Please check your connection and try again.',
    recoverable: true,
    recoveryAction: 'retry',
  },
}

export function getErrorInfo(error: any): IntegrationError {
  const errorCode = error?.code || error?.error?.code || 'unknown'
  const errorMessage = error?.message || error?.error?.message || 'Unknown error'

  // Check if we have a known error
  if (INTEGRATION_ERRORS[errorCode]) {
    return INTEGRATION_ERRORS[errorCode]
  }

  // Check error message for patterns
  if (errorMessage.includes('table') && errorMessage.includes('does not exist')) {
    return INTEGRATION_ERRORS['missing_table']
  }

  if (errorMessage.includes('Unauthorized') || errorMessage.includes('401')) {
    return INTEGRATION_ERRORS['auth_failed']
  }

  if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
    return INTEGRATION_ERRORS['network_error']
  }

  // Default error
  return {
    code: 'unknown',
    message: errorMessage,
    userMessage: 'Something went wrong. Please try again or contact support.',
    recoverable: true,
    recoveryAction: 'retry',
  }
}

export function formatErrorForUser(error: any): string {
  const errorInfo = getErrorInfo(error)
  return errorInfo.userMessage
}

