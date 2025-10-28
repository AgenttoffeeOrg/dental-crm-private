/**
 * useActiveTenantId Hook
 * 
 * Returns the currently active tenant ID, respecting org switching.
 * This ensures consistent behavior across all components.
 * 
 * Priority:
 * 1. active_tenant_id (currently selected org)
 * 2. tenant_id (home/default org)
 */

import { useAuth } from '@/lib/auth'

export function useActiveTenantId(): string | null {
  const { appUser } = useAuth()
  
  // Return active_tenant_id if set, otherwise fall back to tenant_id
  return appUser?.active_tenant_id || appUser?.tenant_id || null
}

