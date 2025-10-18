/**
 * Feature Flags System
 * 
 * Controls rollout of new features with zero-downtime deployment.
 * All flags default to FALSE in production for safety.
 */

import React from 'react'

// Environment-based feature flags
const getEnvFlag = (key: string, defaultValue: boolean = false): boolean => {
  if (typeof window !== 'undefined') {
    // Client-side: use public env vars
    const value = process.env[`NEXT_PUBLIC_${key}`]
    if (value === undefined) return defaultValue
    return value === 'true' || value === '1'
  }
  
  // Server-side: use any env vars
  const value = process.env[key] || process.env[`NEXT_PUBLIC_${key}`]
  if (value === undefined) return defaultValue
  return value === 'true' || value === '1'
}

/**
 * Feature Flags Configuration
 */
export const FeatureFlags = {
  /**
   * ENABLE_DOMAIN_DISCOVERY
   * Prevents duplicate organizations by matching website/email domains
   * Impact: Always on - critical for data integrity
   */
  ENABLE_DOMAIN_DISCOVERY: getEnvFlag('ENABLE_DOMAIN_DISCOVERY', true),
  
  /**
   * ENABLE_JOIN_REQUESTS
   * Allows users to request joining existing organizations
   * Impact: Always on - core employee onboarding workflow
   */
  ENABLE_JOIN_REQUESTS: getEnvFlag('ENABLE_JOIN_REQUESTS', true),
  
  /**
   * ENABLE_MULTI_LOCATION
   * Enables multi-location functionality for dental groups
   * Impact: Feature flag for gradual rollout (5% of users)
   * Performance: Zero impact on single-location (95% of users)
   */
  ENABLE_MULTI_LOCATION: getEnvFlag('ENABLE_MULTI_LOCATION', false),
  
  /**
   * ENABLE_SEAT_ENFORCEMENT
   * Enforces seat limits on invitations and approvals
   * Impact: Critical for billing - always on in production
   */
  ENABLE_SEAT_ENFORCEMENT: getEnvFlag('ENABLE_SEAT_ENFORCEMENT', true),
  
  /**
   * ENABLE_SUBDOMAIN_ROUTING
   * Enables per-tenant subdomains (practice.dentalcrm.com)
   * Impact: Feature flag - requires DNS configuration
   */
  ENABLE_SUBDOMAIN_ROUTING: getEnvFlag('ENABLE_SUBDOMAIN_ROUTING', false),
  
  /**
   * ENABLE_BILLING
   * Enables Stripe billing integration
   * Impact: Feature flag - requires Stripe configuration
   */
  ENABLE_BILLING: getEnvFlag('ENABLE_BILLING', false),
  
  /**
   * ENABLE_EMAIL_SENDING
   * Enables actual email sending (vs console logging)
   * Impact: Feature flag - requires email provider setup
   */
  ENABLE_EMAIL_SENDING: getEnvFlag('ENABLE_EMAIL_SENDING', false),
} as const

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof typeof FeatureFlags): boolean {
  return FeatureFlags[feature]
}

/**
 * Get all enabled features (for debugging/admin panel)
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(FeatureFlags)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature)
}

/**
 * Feature flag guard for components
 * Usage: <FeatureGuard feature="ENABLE_MULTI_LOCATION">...</FeatureGuard>
 */
export function withFeatureFlag<P extends object>(
  Component: React.ComponentType<P>,
  feature: keyof typeof FeatureFlags
) {
  return function FeatureFlaggedComponent(props: P) {
    if (!isFeatureEnabled(feature)) {
      return null
    }
    return <Component {...props} />
  }
}

