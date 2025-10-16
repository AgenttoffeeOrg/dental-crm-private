/**
 * Tenant Context Hook - Enterprise Multi-Tenant Security
 * 
 * Provides secure access to current user's tenant/organization context
 * 
 * SECURITY: This hook is the ONLY way to get tenant_id in the application.
 * Never hardcode tenant IDs. Never use default parameters.
 * 
 * @module hooks/use-tenant-context
 */

'use client'

import { useAuth } from '@/lib/auth'
import { useMemo } from 'react'

export interface TenantContext {
  /** Current organization ID (tenant_id) */
  orgId: string | null
  
  /** Current user ID */
  userId: string | null
  
  /** User's role in current org */
  role: string | null
  
  /** Location IDs user has access to (empty = all locations) */
  locations: string[]
  
  /** User's permissions in current org */
  permissions: string[]
  
  /** Loading state */
  isLoading: boolean
  
  /** Error state */
  error: Error | null
  
  /** User's email */
  email: string | null
  
  /** User's full name */
  fullName: string | null
}

/**
 * Get current user's tenant context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { orgId, isLoading } = useTenantContext()
 *   
 *   if (isLoading) return <LoadingState />
 *   if (!orgId) return <div>Not authenticated</div>
 *   
 *   // Safe to use orgId here
 *   const { data } = await supabase
 *     .from('deals')
 *     .select('*')
 *     .eq('tenant_id', orgId) // ALWAYS filter by tenant
 * }
 * ```
 */
export function useTenantContext(): TenantContext {
  const { appUser, loading, error } = useAuth()

  return useMemo(() => ({
    orgId: appUser?.tenant_id || null,
    userId: appUser?.id || null,
    role: appUser?.role || null,
    locations: appUser?.locations || [],
    permissions: appUser?.permissions || [],
    isLoading: loading,
    error: error || null,
    email: appUser?.email || null,
    fullName: appUser?.full_name || null,
  }), [appUser, loading, error])
}

/**
 * Assert that tenant context is available
 * Throws error if orgId is missing
 * 
 * Use this in components that REQUIRE tenant context
 * 
 * @example
 * ```tsx
 * function DealsList() {
 *   const context = useTenantContext()
 *   requireTenantContext(context) // Throws if no orgId
 *   
 *   // TypeScript now knows context.orgId is string (not null)
 *   const { data } = await supabase.from('deals').eq('tenant_id', context.orgId)
 * }
 * ```
 */
export function requireTenantContext(context: TenantContext): asserts context is Required<Omit<TenantContext, 'error' | 'locations' | 'permissions' | 'email' | 'fullName'> & Pick<TenantContext, 'error' | 'locations' | 'permissions' | 'email' | 'fullName'>> {
  if (!context.orgId) {
    throw new Error('SECURITY: Tenant context required but not available. User must be authenticated.')
  }
  if (!context.userId) {
    throw new Error('SECURITY: User context required but not available.')
  }
}

/**
 * Hook for components that need tenant ID or should show loading
 * 
 * @returns {string | null} orgId or null if loading/not authenticated
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const orgId = useTenantId()
 *   if (!orgId) return <LoadingState />
 *   
 *   // Safe to use orgId
 * }
 * ```
 */
export function useTenantId(): string | null {
  const { orgId } = useTenantContext()
  return orgId
}

/**
 * Get tenant ID or throw error
 * Use in components that MUST have tenant context
 * 
 * @throws {Error} If no tenant context available
 */
export function useRequiredTenantId(): string {
  const context = useTenantContext()
  requireTenantContext(context)
  return context.orgId
}

