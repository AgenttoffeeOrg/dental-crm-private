/**
 * Tenant Context Service
 * 
 * Manages tenant context for the current user, including:
 * - Single vs multi-location detection
 * - Accessible locations
 * - Active location switching
 * - Performance optimization (dual-path architecture)
 */

import { createServerClient } from '@/lib/supabase-server'
import { cache } from 'react'

export interface TenantInfo {
  id: string
  name: string
  website_url: string | null
  website_host: string | null
  is_multi_location: boolean
  dental_group_id: string | null
  location_name: string | null
}

export interface UserTenantContext {
  /** User's primary tenant */
  primaryTenant: TenantInfo
  
  /** All accessible tenants (includes primary) */
  accessibleTenants: TenantInfo[]
  
  /** Is this user multi-location? */
  isMultiLocation: boolean
  
  /** Total accessible locations */
  locationCount: number
  
  /** Dental group info (if multi-location) */
  dentalGroup: {
    id: string
    name: string
  } | null
}

/**
 * Get tenant context for current user
 * Cached per request for performance
 */
export const getTenantContext = cache(async (): Promise<UserTenantContext | null> => {
  const supabase = await createServerClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return null
  }
  
  // Get user's primary tenant from app_users
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  
  if (appUserError || !appUser) {
    return null
  }
  
  // Get primary tenant info
  const { data: primaryTenant, error: tenantError } = await supabase
    .from('tenants')
    .select('id, name, website_url, website_host, is_multi_location, dental_group_id, location_name')
    .eq('id', appUser.tenant_id)
    .single()
  
  if (tenantError || !primaryTenant) {
    return null
  }
  
  // FAST PATH: Single-location user
  if (!primaryTenant.is_multi_location) {
    return {
      primaryTenant,
      accessibleTenants: [primaryTenant],
      isMultiLocation: false,
      locationCount: 1,
      dentalGroup: null,
    }
  }
  
  // MULTI-LOCATION PATH: Get all accessible locations
  const { data: locationAccess, error: accessError } = await supabase
    .from('user_location_access')
    .select(`
      tenant_id,
      tenants (
        id,
        name,
        website_url,
        website_host,
        is_multi_location,
        dental_group_id,
        location_name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
  
  if (accessError) {
    console.error('Error fetching location access:', accessError)
    // Fallback to primary tenant only
    return {
      primaryTenant,
      accessibleTenants: [primaryTenant],
      isMultiLocation: false,
      locationCount: 1,
      dentalGroup: null,
    }
  }
  
  // Extract tenant info from join results
  const accessibleTenants: TenantInfo[] = [primaryTenant]
  
  if (locationAccess) {
    for (const access of locationAccess) {
      if (access.tenants && access.tenant_id !== primaryTenant.id) {
        const tenant = Array.isArray(access.tenants) ? access.tenants[0] : access.tenants
        if (tenant) {
          accessibleTenants.push(tenant as TenantInfo)
        }
      }
    }
  }
  
  // Get dental group info if exists
  let dentalGroup = null
  if (primaryTenant.dental_group_id) {
    const { data: group } = await supabase
      .from('dental_groups')
      .select('id, name')
      .eq('id', primaryTenant.dental_group_id)
      .single()
    
    if (group) {
      dentalGroup = group
    }
  }
  
  return {
    primaryTenant,
    accessibleTenants,
    isMultiLocation: true,
    locationCount: accessibleTenants.length,
    dentalGroup,
  }
})

/**
 * Get accessible tenant IDs for current user
 * Lightweight version for permission checks
 */
export const getAccessibleTenantIds = cache(async (): Promise<string[]> => {
  const context = await getTenantContext()
  
  if (!context) {
    return []
  }
  
  return context.accessibleTenants.map(t => t.id)
})

/**
 * Check if user has access to a specific tenant
 */
export async function hasAccessToTenant(tenantId: string): Promise<boolean> {
  const accessibleIds = await getAccessibleTenantIds()
  return accessibleIds.includes(tenantId)
}

/**
 * Get user's primary tenant ID
 */
export async function getPrimaryTenantId(): Promise<string | null> {
  const context = await getTenantContext()
  return context?.primaryTenant.id || null
}

/**
 * Check if current user is multi-location
 */
export async function isMultiLocationUser(): Promise<boolean> {
  const context = await getTenantContext()
  return context?.isMultiLocation || false
}

/**
 * Get location count for current user
 */
export async function getLocationCount(): Promise<number> {
  const context = await getTenantContext()
  return context?.locationCount || 0
}

/**
 * Get dental group for current user (if multi-location)
 */
export async function getDentalGroup(): Promise<{ id: string; name: string } | null> {
  const context = await getTenantContext()
  return context?.dentalGroup || null
}

/**
 * Switch active location (for multi-location users)
 * This updates the user's session to use a different tenant as primary
 * 
 * NOTE: This requires updating app_users.tenant_id, which affects RLS
 * Use with caution and ensure user has access to target tenant
 */
export async function switchActiveLocation(
  targetTenantId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerClient()
  
  // Verify user has access to target tenant
  const hasAccess = await hasAccessToTenant(targetTenantId)
  
  if (!hasAccess) {
    return {
      success: false,
      error: 'You do not have access to this location',
    }
  }
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return {
      success: false,
      error: 'Not authenticated',
    }
  }
  
  // Update app_user's primary tenant
  const { error } = await supabase
    .from('app_users')
    .update({ tenant_id: targetTenantId })
    .eq('id', user.id)
  
  if (error) {
    console.error('Error switching location:', error)
    return {
      success: false,
      error: 'Failed to switch location',
    }
  }
  
  return { success: true }
}

/**
 * Get locations for dropdown/switcher UI
 */
export async function getLocationsForSwitcher(): Promise<Array<{
  id: string
  name: string
  locationName: string | null
  isPrimary: boolean
}>> {
  const context = await getTenantContext()
  
  if (!context) {
    return []
  }
  
  return context.accessibleTenants.map(tenant => ({
    id: tenant.id,
    name: tenant.name,
    locationName: tenant.location_name,
    isPrimary: tenant.id === context.primaryTenant.id,
  }))
}

/**
 * Performance monitoring: Log context fetch time
 */
export async function measureTenantContextPerformance(): Promise<{
  durationMs: number
  isMultiLocation: boolean
  locationCount: number
}> {
  const start = performance.now()
  const context = await getTenantContext()
  const end = performance.now()
  
  return {
    durationMs: end - start,
    isMultiLocation: context?.isMultiLocation || false,
    locationCount: context?.locationCount || 0,
  }
}

