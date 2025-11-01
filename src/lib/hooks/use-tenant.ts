/**
 * useTenant Hook
 * 
 * Gets the current tenant from authenticated user
 * Replaces ALL hardcoded tenant IDs throughout the app
 * 
 * Usage:
 * const { tenantId, tenant, loading } = useTenant()
 */

'use client'

import { useAuth } from '../auth'
import { useState, useEffect } from 'react'
import { createClient } from '../supabase-client'

interface Tenant {
  id: string
  name: string
  timezone: string
  marketing_enabled?: boolean
  marketing_plan?: string
  pms_integration_enabled?: boolean
  created_at: string
}

export function useTenant() {
  const { appUser, loading: authLoading } = useAuth()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (authLoading) {
      setLoading(true)
      return
    }

    // ✅ Check active_tenant_id first (for multi-org support), fall back to tenant_id
    const effectiveTenantId = appUser?.active_tenant_id || appUser?.tenant_id

    if (!effectiveTenantId) {
      setLoading(false)
      setTenant(null)
      return
    }

    loadTenant(effectiveTenantId)
  }, [appUser?.active_tenant_id, appUser?.tenant_id, authLoading])

  const loadTenant = async (tenantId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single()

      if (error) {
        console.error('[useTenant] Error loading tenant:', error)
        setTenant(null)
      } else {
        setTenant(data)
      }
    } catch (error) {
      console.error('[useTenant] Error:', error)
      setTenant(null)
    } finally {
      setLoading(false)
    }
  }

  return {
    tenantId: tenant?.id || null,
    tenant,
    loading,
    // Helper methods
    isMarketingEnabled: tenant?.marketing_enabled || false,
    isPMSEnabled: tenant?.pms_integration_enabled || false,
    timezone: tenant?.timezone || 'America/New_York'
  }
}

/**
 * useCurrentUser Hook
 * 
 * Gets the current authenticated user with full profile
 * Replaces ALL hardcoded user IDs
 * 
 * Usage:
 * const { userId, user, loading } = useCurrentUser()
 */
export function useCurrentUser() {
  const { appUser, loading } = useAuth()

  return {
    userId: appUser?.id || null,
    user: appUser,
    loading,
    // Helper methods
    fullName: appUser?.full_name || 'User',
    role: appUser?.role || 'staff',
    isOwner: appUser?.role === 'owner',
    isManager: appUser?.role === 'manager' || appUser?.role === 'owner',
  }
}


