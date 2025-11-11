/**
 * Scope Checking and Service Activation Logic
 * 
 * Handles:
 * - Checking which scopes were granted
 * - Determining which services can be activated
 * - Handling partial approvals
 * - Checking verification status
 */

import { getRequiredScopesForService, getMissingScopesForService, isSensitiveScope, INTEGRATION_GROUPS } from './unified-scopes'

export interface ServiceStatus {
  serviceType: string
  canActivate: boolean
  status: 'connected' | 'pending_verification' | 'missing_scopes' | 'available'
  missingScopes: string[]
  requiresVerification: boolean
  grantedScopes: string[]
}

/**
 * Check service status based on granted scopes
 */
export function checkServiceStatus(
  serviceType: string,
  grantedScopes: string[]
): ServiceStatus {
  const requiredScopes = getRequiredScopesForService(serviceType)
  const missingScopes = getMissingScopesForService(serviceType, grantedScopes)
  const hasAllScopes = missingScopes.length === 0

  // Check if any required scope is sensitive (requires verification)
  const hasSensitiveScopes = requiredScopes.some(scope => {
    const group = Object.values(INTEGRATION_GROUPS).find(g => 
      g.services.includes(serviceType)
    )
    return group ? isSensitiveScope(scope, group.provider) : false
  })

  // Determine status
  let status: ServiceStatus['status'] = 'available'
  let canActivate = false

  if (hasAllScopes) {
    // Check if sensitive scopes are granted but might be blocked
    // In production, we'd check actual verification status
    // For now, assume if scopes granted, service can activate
    canActivate = true
    status = 'connected'
  } else {
    canActivate = false
    status = 'missing_scopes'
  }

  return {
    serviceType,
    canActivate,
    status,
    missingScopes,
    requiresVerification: hasSensitiveScopes,
    grantedScopes: grantedScopes.filter(scope => requiredScopes.includes(scope)),
  }
}

/**
 * Get all service statuses for a provider
 */
export function getAllServiceStatuses(
  provider: string,
  grantedScopes: string[]
): ServiceStatus[] {
  const group = INTEGRATION_GROUPS[provider]
  if (!group) return []

  return group.services.map(serviceType => 
    checkServiceStatus(serviceType, grantedScopes)
  )
}

/**
 * Check if service needs incremental authorization
 */
export function needsIncrementalAuth(
  serviceType: string,
  grantedScopes: string[]
): boolean {
  const status = checkServiceStatus(serviceType, grantedScopes)
  return status.status === 'missing_scopes' && status.missingScopes.length > 0
}

/**
 * Get incremental auth URL for missing scopes
 */
export function getIncrementalAuthUrl(
  serviceType: string,
  grantedScopes: string[],
  redirectUri: string,
  state: string
): string | null {
  const status = checkServiceStatus(serviceType, grantedScopes)
  
  if (!status.missingScopes.length) {
    return null
  }

  const group = Object.values(INTEGRATION_GROUPS).find(g => 
    g.services.includes(serviceType)
  )

  if (!group) return null

  const clientId = process.env[group.clientIdEnvVar]
  if (!clientId) return null

  // Request only missing scopes
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: status.missingScopes.join(' '),
    state,
    access_type: 'offline',
    prompt: 'consent',
  })

  return `${group.oauthUrl}?${params.toString()}`
}

