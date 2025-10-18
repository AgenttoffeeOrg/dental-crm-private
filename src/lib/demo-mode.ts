/**
 * Demo Mode Utilities
 * 
 * Handles demo tenant isolation and feature overrides.
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true'
const DEMO_TENANT_ID = process.env.DEMO_TENANT_ID || 'demo-tenant'
const DEMO_FEATURES_ALL_ENABLED = process.env.DEMO_FEATURES_ALL_ENABLED === 'true'

/**
 * Check if current tenant is the demo tenant
 */
export function isDemoTenant(tenantId: string | null | undefined): boolean {
  if (!DEMO_MODE || !tenantId) return false
  return tenantId === DEMO_TENANT_ID
}

/**
 * Check if demo mode is enabled
 */
export function isDemoMode(): boolean {
  return DEMO_MODE
}

/**
 * Feature override for demo tenant
 * 
 * In demo mode, all features are enabled for the demo tenant.
 * This allows showcasing all functionality without subscriptions.
 */
export function isDemoFeatureEnabled(featureName: string, tenantId: string | null | undefined): boolean {
  if (!isDemoMode() || !isDemoTenant(tenantId)) {
    return false
  }

  if (DEMO_FEATURES_ALL_ENABLED) {
    console.log(`[DEMO] Feature "${featureName}" enabled for demo tenant`)
    return true
  }

  return false
}

/**
 * Check if operation is allowed in demo mode
 * 
 * Some destructive operations are blocked for demo tenant.
 */
export function isDemoOperationAllowed(operation: 'delete_org' | 'purge_data' | 'billing_change' | 'delete_user', tenantId: string | null | undefined): boolean {
  if (!isDemoMode() || !isDemoTenant(tenantId)) {
    return true // Not demo tenant, allow everything
  }

  // Block destructive operations for demo tenant
  const blockedOperations: typeof operation[] = [
    'delete_org',
    'purge_data',
    'billing_change',
  ]

  if (blockedOperations.includes(operation)) {
    console.warn(`[DEMO] Blocked operation "${operation}" for demo tenant`)
    return false
  }

  return true
}

/**
 * Get demo tenant ID
 */
export function getDemoTenantId(): string {
  return DEMO_TENANT_ID
}

