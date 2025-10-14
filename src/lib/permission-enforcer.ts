/**
 * Permission Enforcement System
 * 
 * Checks permissions in real-time across the entire app
 * Works with custom roles and granular permissions
 */

import { createClient } from '@/lib/supabase-client'

export interface UserPermissionContext {
  userId: string
  tenantId: string
  roleId?: string
  isAdmin?: boolean
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  context: UserPermissionContext,
  permissionKey: string
): Promise<boolean> {
  try {
    if (!context.roleId) {
      // No role assigned = no permissions (except viewing own data)
      return permissionKey.includes('.view_own') || permissionKey.includes('.edit_own_profile')
    }

    const supabase = createClient()

    // Admin roles have all permissions
    const { data: role } = await supabase
      .from('custom_roles')
      .select('is_admin')
      .eq('id', context.roleId)
      .single()

    if (role?.is_admin) return true

    // Check specific permission
    const { data: permission } = await supabase
      .from('role_permissions')
      .select('granted')
      .eq('role_id', context.roleId)
      .eq('permission_key', permissionKey)
      .single()

    return permission?.granted || false

  } catch (error) {
    console.error('Error checking permission:', error)
    return false // Deny by default on error
  }
}

/**
 * Check multiple permissions at once
 */
export async function hasAnyPermission(
  context: UserPermissionContext,
  permissionKeys: string[]
): Promise<boolean> {
  const results = await Promise.all(
    permissionKeys.map(key => hasPermission(context, key))
  )
  return results.some(result => result === true)
}

/**
 * Check all permissions
 */
export async function hasAllPermissions(
  context: UserPermissionContext,
  permissionKeys: string[]
): Promise<boolean> {
  const results = await Promise.all(
    permissionKeys.map(key => hasPermission(context, key))
  )
  return results.every(result => result === true)
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(
  context: UserPermissionContext
): Promise<string[]> {
  try {
    if (!context.roleId) return []

    const supabase = createClient()

    // Check if admin
    const { data: role } = await supabase
      .from('custom_roles')
      .select('is_admin')
      .eq('id', context.roleId)
      .single()

    if (role?.is_admin) {
      // Admin gets all permissions
      const { data: allPerms } = await supabase
        .from('permission_definitions')
        .select('key')

      return allPerms?.map(p => p.key) || []
    }

    // Get granted permissions
    const { data: permissions } = await supabase
      .from('role_permissions')
      .select('permission_key')
      .eq('role_id', context.roleId)
      .eq('granted', true)

    return permissions?.map(p => p.permission_key) || []

  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * React hook for permission checking (client-side)
 */
export function usePermission(permissionKey: string, context: UserPermissionContext) {
  const [hasAccess, setHasAccess] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    hasPermission(context, permissionKey).then(result => {
      setHasAccess(result)
      setLoading(false)
    })
  }, [permissionKey, context.userId, context.roleId])

  return { hasAccess, loading }
}

/**
 * HOC to protect components with permission check
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  requiredPermission: string,
  fallback?: React.ReactNode
) {
  return function ProtectedComponent(props: P & { userContext: UserPermissionContext }) {
    const { hasAccess, loading } = usePermission(requiredPermission, props.userContext)

    if (loading) return null // Can be replaced with loading component
    if (!hasAccess) return fallback || null

    return Component(props)
  }
}

/**
 * Filter resources based on permissions and ownership
 */
export async function filterByPermission<T extends { owner_user_id?: string }>(
  resources: T[],
  context: UserPermissionContext,
  viewAllPermission: string,
  viewOwnPermission: string
): Promise<T[]> {
  const canViewAll = await hasPermission(context, viewAllPermission)
  
  if (canViewAll) {
    return resources // Can see everything
  }

  const canViewOwn = await hasPermission(context, viewOwnPermission)
  
  if (canViewOwn) {
    // Can only see own + unassigned
    return resources.filter(r => 
      r.owner_user_id === context.userId || !r.owner_user_id
    )
  }

  return [] // No permission
}

/**
 * Throw error if user doesn't have permission
 */
export async function requirePermission(
  context: UserPermissionContext,
  permissionKey: string,
  errorMessage?: string
): Promise<void> {
  const allowed = await hasPermission(context, permissionKey)
  
  if (!allowed) {
    throw new Error(errorMessage || `Permission denied: ${permissionKey}`)
  }
}

// Import React for hooks
import React from 'react'


