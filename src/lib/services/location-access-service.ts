/**
 * Location Access Service
 * 
 * Manages user access to multiple locations within a dental group.
 * Only used for multi-location organizations (5% of users).
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FeatureFlags } from '@/lib/feature-flags'

export interface LocationAccessInfo {
  id: string
  user_id: string
  tenant_id: string
  location_name: string
  is_active: boolean
  granted_at: string
  granted_by: {
    id: string
    name: string | null
  } | null
}

/**
 * Grant user access to a location
 */
export async function grantLocationAccess(
  userId: string,
  tenantId: string,
  grantedByUserId: string,
  notes?: string
): Promise<{ success: boolean; error?: string; access_id?: string }> {
  if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
    return {
      success: false,
      error: 'Multi-location feature is not enabled',
    }
  }
  
  const supabase = await createServerSupabaseClient()
  
  // Use database function for idempotency
  const { data, error } = await supabase.rpc('grant_location_access', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_granted_by: grantedByUserId,
    p_notes: notes || null,
  })
  
  if (error) {
    console.error('Error granting location access:', error)
    return {
      success: false,
      error: error.message,
    }
  }
  
  return {
    success: true,
    access_id: data,
  }
}

/**
 * Revoke user access to a location
 */
export async function revokeLocationAccess(
  userId: string,
  tenantId: string,
  revokedByUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
    return {
      success: false,
      error: 'Multi-location feature is not enabled',
    }
  }
  
  const supabase = await createServerSupabaseClient()
  
  // Use database function
  const { data, error } = await supabase.rpc('revoke_location_access', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_revoked_by: revokedByUserId,
    p_reason: reason || null,
  })
  
  if (error) {
    console.error('Error revoking location access:', error)
    return {
      success: false,
      error: error.message,
    }
  }
  
  if (!data) {
    return {
      success: false,
      error: 'Access not found or already revoked',
    }
  }
  
  return { success: true }
}

/**
 * Get all locations a user has access to
 */
export async function getUserLocationAccess(
  userId: string
): Promise<LocationAccessInfo[]> {
  const supabase = await createServerSupabaseClient()
  
  const { data, error } = await supabase
    .from('user_location_access')
    .select(`
      id,
      user_id,
      tenant_id,
      is_active,
      granted_at,
      granted_by_user_id,
      tenants (
        name,
        location_name
      ),
      granted_by:app_users!granted_by_user_id (
        id,
        auth_users:id (
          email
        )
      )
    `)
    .eq('user_id', userId)
    .order('granted_at', { ascending: false })
  
  if (error || !data) {
    console.error('Error fetching user location access:', error)
    return []
  }
  
  return data.map((access: any) => {
    const tenant = Array.isArray(access.tenants) ? access.tenants[0] : access.tenants
    const grantedBy = Array.isArray(access.granted_by) ? access.granted_by[0] : access.granted_by
    
    return {
      id: access.id,
      user_id: access.user_id,
      tenant_id: access.tenant_id,
      location_name: tenant?.location_name || tenant?.name || 'Unknown',
      is_active: access.is_active,
      granted_at: access.granted_at,
      granted_by: grantedBy ? {
        id: grantedBy.id,
        name: grantedBy.auth_users?.email || null,
      } : null,
    }
  })
}

/**
 * Get all users with access to a location
 */
export async function getLocationUsers(
  tenantId: string
): Promise<Array<{
  user_id: string
  email: string
  is_active: boolean
  granted_at: string
  is_primary: boolean
}>> {
  const supabase = await createServerSupabaseClient()
  
  // Get users from user_location_access
  const { data: accessData, error: accessError } = await supabase
    .from('user_location_access')
    .select(`
      user_id,
      is_active,
      granted_at,
      app_users!inner (
        id,
        tenant_id
      )
    `)
    .eq('tenant_id', tenantId)
  
  if (accessError) {
    console.error('Error fetching location users:', accessError)
    return []
  }
  
  // Get user emails from auth.users
  const userIds = accessData?.map((a: any) => a.user_id) || []
  
  if (userIds.length === 0) {
    return []
  }
  
  const { data: userData, error: userError } = await supabase
    .from('app_users')
    .select('id, tenant_id')
    .in('id', userIds)
  
  if (userError || !userData) {
    return []
  }
  
  // Combine data
  return accessData?.map((access: any) => {
    const appUser = userData.find((u: any) => u.id === access.user_id)
    
    return {
      user_id: access.user_id,
      email: 'user@example.com', // TODO: Get from auth.users
      is_active: access.is_active,
      granted_at: access.granted_at,
      is_primary: appUser?.tenant_id === tenantId,
    }
  }) || []
}

/**
 * Bulk grant access to multiple users
 */
export async function bulkGrantLocationAccess(
  userIds: string[],
  tenantId: string,
  grantedByUserId: string
): Promise<{
  success: boolean
  granted: number
  failed: number
  errors: string[]
}> {
  const results = await Promise.all(
    userIds.map(userId =>
      grantLocationAccess(userId, tenantId, grantedByUserId)
    )
  )
  
  const granted = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const errors = results
    .filter(r => !r.success && r.error)
    .map(r => r.error!)
  
  return {
    success: failed === 0,
    granted,
    failed,
    errors,
  }
}

/**
 * Bulk revoke access from multiple users
 */
export async function bulkRevokeLocationAccess(
  userIds: string[],
  tenantId: string,
  revokedByUserId: string,
  reason?: string
): Promise<{
  success: boolean
  revoked: number
  failed: number
  errors: string[]
}> {
  const results = await Promise.all(
    userIds.map(userId =>
      revokeLocationAccess(userId, tenantId, revokedByUserId, reason)
    )
  )
  
  const revoked = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length
  const errors = results
    .filter(r => !r.success && r.error)
    .map(r => r.error!)
  
  return {
    success: failed === 0,
    revoked,
    failed,
    errors,
  }
}

/**
 * Check if user has access to a specific location
 */
export async function hasLocationAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const supabase = await createServerSupabaseClient()
  
  // Check if this is user's primary tenant
  const { data: appUser } = await supabase
    .from('app_users')
    .select('tenant_id')
    .eq('id', userId)
    .single()
  
  if (appUser?.tenant_id === tenantId) {
    return true
  }
  
  // Check user_location_access
  const { data } = await supabase
    .from('user_location_access')
    .select('id')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()
  
  return !!data
}

/**
 * Get location access stats for a dental group
 */
export async function getLocationAccessStats(dentalGroupId: string): Promise<{
  total_locations: number
  total_users: number
  multi_location_users: number
  single_location_users: number
}> {
  const supabase = await createServerSupabaseClient()
  
  // Count locations in group
  const { count: totalLocations } = await supabase
    .from('tenants')
    .select('id', { count: 'exact', head: true })
    .eq('dental_group_id', dentalGroupId)
  
  // Count total unique users
  const { data: users } = await supabase
    .from('app_users')
    .select('id, tenant_id')
    .in('tenant_id', 
      supabase
        .from('tenants')
        .select('id')
        .eq('dental_group_id', dentalGroupId)
    )
  
  const uniqueUsers = new Set(users?.map(u => u.id) || [])
  
  // Count multi-location users (users with location_access records)
  const { data: multiLocationUsers } = await supabase
    .from('user_location_access')
    .select('user_id')
    .eq('is_active', true)
    .in('tenant_id',
      supabase
        .from('tenants')
        .select('id')
        .eq('dental_group_id', dentalGroupId)
    )
  
  const uniqueMultiLocationUsers = new Set(multiLocationUsers?.map(u => u.user_id) || [])
  
  return {
    total_locations: totalLocations || 0,
    total_users: uniqueUsers.size,
    multi_location_users: uniqueMultiLocationUsers.size,
    single_location_users: uniqueUsers.size - uniqueMultiLocationUsers.size,
  }
}

