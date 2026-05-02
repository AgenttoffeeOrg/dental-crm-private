/**
 * Unified OAuth Scope Management
 * 
 * One OAuth connection per provider = All services from that provider
 * 
 * Example:
 * - Connect Google once → Gmail + Analytics + Ads + Calendar all connected
 * - Connect Facebook once → Pages + Ads + Instagram all connected
 */

export interface IntegrationGroup {
  name: string
  provider: 'google' | 'facebook' | 'microsoft'
  services: string[]
  scopes: string[]
  oauthUrl: string
  clientIdEnvVar: string
  clientSecretEnvVar: string
  sensitiveScopes?: string[] // Scopes that require app verification
}

export const INTEGRATION_GROUPS: Record<string, IntegrationGroup> = {
  google: {
    name: 'Google',
    provider: 'google',
    services: ['gmail', 'google_analytics', 'google_ads', 'google_calendar'],
    scopes: [
      // Gmail
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      // Analytics
      'https://www.googleapis.com/auth/analytics.readonly',
      // Ads
      'https://www.googleapis.com/auth/adwords',
      // Calendar
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    sensitiveScopes: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/adwords',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    oauthUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    clientIdEnvVar: 'GOOGLE_OAUTH_CLIENT_ID',
    clientSecretEnvVar: 'GOOGLE_OAUTH_CLIENT_SECRET',
  },
  facebook: {
    name: 'Facebook',
    provider: 'facebook',
    services: ['facebook_pages', 'facebook_ads', 'instagram'],
    scopes: [
      // Facebook Pages
      'pages_manage_posts',
      'pages_read_engagement',
      // Facebook Ads
      'ads_management',
      'ads_read',
      // Instagram
      'instagram_basic',
      'instagram_manage_messages',
      'pages_read_engagement',
    ],
    oauthUrl: 'https://www.facebook.com/v18.0/dialog/oauth',
    clientIdEnvVar: 'FACEBOOK_APP_ID',
    clientSecretEnvVar: 'FACEBOOK_APP_SECRET',
  },
  microsoft: {
    name: 'Microsoft',
    provider: 'microsoft',
    services: ['outlook', 'onedrive', 'microsoft_calendar'],
    scopes: [
      // Outlook
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Read',
      // OneDrive
      'https://graph.microsoft.com/Files.ReadWrite',
      // Calendar
      'https://graph.microsoft.com/Calendars.ReadWrite',
      // User info
      'https://graph.microsoft.com/User.Read',
      'offline_access',
    ],
    oauthUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    clientIdEnvVar: 'MICROSOFT_CLIENT_ID',
    clientSecretEnvVar: 'MICROSOFT_CLIENT_SECRET',
  },
}

/**
 * Get integration group by service type
 */
export function getGroupForService(serviceType: string): IntegrationGroup | null {
  for (const group of Object.values(INTEGRATION_GROUPS)) {
    if (group.services.includes(serviceType)) {
      return group
    }
  }
  return null
}

/**
 * Get required scopes for a specific service
 */
export function getRequiredScopesForService(serviceType: string): string[] {
  const group = getGroupForService(serviceType)
  if (!group) return []

  // Map service types to their specific scopes
  const serviceScopeMap: Record<string, string[]> = {
    gmail: [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
    ],
    google_analytics: [
      'https://www.googleapis.com/auth/analytics.readonly',
    ],
    google_ads: [
      'https://www.googleapis.com/auth/adwords',
    ],
    google_calendar: [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
    ],
    facebook_pages: [
      'pages_manage_posts',
      'pages_read_engagement',
    ],
    facebook_ads: [
      'ads_management',
      'ads_read',
    ],
    instagram: [
      'instagram_basic',
      'instagram_manage_messages',
      'pages_read_engagement',
    ],
    outlook: [
      'https://graph.microsoft.com/Mail.Send',
      'https://graph.microsoft.com/Mail.Read',
    ],
    onedrive: [
      'https://graph.microsoft.com/Files.ReadWrite',
    ],
    microsoft_calendar: [
      'https://graph.microsoft.com/Calendars.ReadWrite',
    ],
  }

  return serviceScopeMap[serviceType] || []
}

/**
 * Check which services can be activated based on granted scopes
 */
export function getActivableServices(
  provider: string,
  grantedScopes: string[]
): string[] {
  const group = INTEGRATION_GROUPS[provider]
  if (!group) return []

  const activableServices: string[] = []

  for (const service of group.services) {
    const requiredScopes = getRequiredScopesForService(service)
    const hasAllScopes = requiredScopes.every(scope => grantedScopes.includes(scope))
    
    if (hasAllScopes) {
      activableServices.push(service)
    }
  }

  return activableServices
}

/**
 * Check if a scope requires app verification
 */
export function isSensitiveScope(scope: string, provider: string): boolean {
  const group = INTEGRATION_GROUPS[provider]
  if (!group?.sensitiveScopes) return false
  
  return group.sensitiveScopes.includes(scope)
}

/**
 * Get missing scopes for a service
 */
export function getMissingScopesForService(
  serviceType: string,
  grantedScopes: string[]
): string[] {
  const requiredScopes = getRequiredScopesForService(serviceType)
  return requiredScopes.filter(scope => !grantedScopes.includes(scope))
}

