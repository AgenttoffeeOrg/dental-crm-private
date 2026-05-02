/**
 * Verification Status Tracker
 * 
 * Tracks app verification status for sensitive OAuth scopes
 */

import { createServiceClient } from '@/lib/supabase-server'
import { INTEGRATION_GROUPS, isSensitiveScope } from './unified-scopes'

export interface VerificationStatus {
  provider: string
  status: 'verified' | 'pending' | 'not_required' | 'rejected'
  submittedAt?: string
  verifiedAt?: string
  rejectionReason?: string
}

/**
 * Check if provider needs verification
 */
export function needsVerification(provider: string): boolean {
  const group = INTEGRATION_GROUPS[provider]
  if (!group?.sensitiveScopes) return false
  return group.sensitiveScopes.length > 0
}

/**
 * Get verification status for a provider
 */
export async function getVerificationStatus(provider: string): Promise<VerificationStatus> {
  // In production, this would check a database table or external API
  // For now, return default status
  
  const group = INTEGRATION_GROUPS[provider]
  if (!group) {
    return {
      provider,
      status: 'not_required',
    }
  }

  // Check environment variable for verification status
  const verificationStatus = process.env[`${provider.toUpperCase()}_VERIFICATION_STATUS`] || 'pending'

  return {
    provider,
    status: verificationStatus as VerificationStatus['status'],
    submittedAt: process.env[`${provider.toUpperCase()}_VERIFICATION_SUBMITTED_AT`],
    verifiedAt: process.env[`${provider.toUpperCase()}_VERIFICATION_VERIFIED_AT`],
  }
}

/**
 * Check if a specific scope requires verification
 */
export function scopeRequiresVerification(scope: string, provider: string): boolean {
  return isSensitiveScope(scope, provider)
}

/**
 * Get all scopes that require verification for a provider
 */
export function getSensitiveScopes(provider: string): string[] {
  const group = INTEGRATION_GROUPS[provider]
  return group?.sensitiveScopes || []
}

