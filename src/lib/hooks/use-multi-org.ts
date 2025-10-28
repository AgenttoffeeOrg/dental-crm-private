/**
 * Multi-Organization Hooks
 * 
 * Comprehensive React hooks for multi-org functionality:
 * - useMemberships: Get user's organization memberships
 * - useOrgSwitcher: Handle organization switching logic
 * - useOrgPreferences: Manage pinned orgs, recents, preferences
 * - useOrgValidation: Check org validation status
 * - useEmailVerification: Check email verification status
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase-client'
import { useFeatureFlag } from '@/lib/feature-flags-client'
import { useRouter } from 'next/navigation'

// ============================================================================
// Types
// ============================================================================

export interface Membership {
  id: string
  tenant_id: string
  tenant_name: string
  tenant_logo?: string | null
  role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer'
  status: 'active' | 'inactive' | 'pending' | 'invited'
  joined_at: string
  is_primary?: boolean
  validation_status?: 'VALIDATED' | 'UNVALIDATED' | 'EXPIRED_GRACE'
}

export interface OrgPreferences {
  is_pinned: boolean
  is_favorite: boolean
  custom_display_name?: string | null
  last_accessed_at?: string | null
  access_count: number
}

export interface OrgSwitchResult {
  success: boolean
  error?: string
  previous_tenant?: string
  new_tenant?: string
}

// ============================================================================
// Hook: useMemberships
// ============================================================================

export function useMemberships() {
  const { appUser, loading: authLoading } = useAuth()
  const multiOrgEnabled = useFeatureFlag('multi_org_enabled', (appUser?.active_tenant_id || appUser?.tenant_id))
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMemberships = useCallback(async () => {
    if (!appUser?.id) {
      setMemberships([])
      setLoading(false)
      return
    }

    // If multi-org not enabled, return single membership from app_user
    if (!multiOrgEnabled) {
      if ((appUser?.active_tenant_id || (appUser?.active_tenant_id || appUser?.tenant_id))) {
        setMemberships([{
          id: appUser.id,
          tenant_id: (appUser?.active_tenant_id || (appUser?.active_tenant_id || appUser?.tenant_id)),
          tenant_name: 'My Organization', // Will be replaced with actual tenant name
          role: appUser.role as any,
          status: 'active',
          joined_at: appUser.created_at || new Date().toISOString(),
        }])
      }
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/org/memberships')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch memberships')
      }

      setMemberships(data.memberships || [])
    } catch (err: any) {
      console.error('[useMemberships] Error:', err)
      setError(err.message)
      setMemberships([])
    } finally {
      setLoading(false)
    }
  }, [appUser?.id, (appUser?.active_tenant_id || appUser?.tenant_id), appUser?.role, multiOrgEnabled])

  useEffect(() => {
    if (!authLoading) {
      fetchMemberships()
    }
  }, [authLoading, fetchMemberships])

  const activeMemberships = useMemo(
    () => memberships.filter(m => m.status === 'active'),
    [memberships]
  )

  const currentMembership = useMemo(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[useMemberships] Finding current membership:', {
        activeTenantId: appUser?.active_tenant_id,
        tenantId: (appUser?.active_tenant_id || appUser?.tenant_id),
        membershipCount: memberships.length,
        memberships: memberships.map(m => ({ id: m.tenant_id, name: m.tenant_name }))
      })
    }
    
    // CRITICAL: Check active_tenant_id FIRST (takes priority over tenant_id)
    // Only fall back to tenant_id if active_tenant_id is not set
    const activeTenantId = appUser?.active_tenant_id || (appUser?.active_tenant_id || appUser?.tenant_id)
    const found = memberships.find(m => m.tenant_id === activeTenantId)
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[useMemberships] Using tenant ID:', activeTenantId)
      console.log('[useMemberships] Current membership found:', found?.tenant_name || 'NONE')
    }
    
    return found
  }, [memberships, appUser])

  const isMultiOrg = useMemo(
    () => multiOrgEnabled && activeMemberships.length > 1,
    [multiOrgEnabled, activeMemberships]
  )

  return {
    memberships,
    activeMemberships,
    currentMembership,
    isMultiOrg,
    loading: loading || authLoading,
    error,
    refetch: fetchMemberships,
  }
}

// ============================================================================
// Hook: useOrgSwitcher
// ============================================================================

export function useOrgSwitcher() {
  const { appUser, refreshUser } = useAuth()
  const router = useRouter()
  const [switching, setSwitching] = useState(false)
  const [lastSwitch, setLastSwitch] = useState<OrgSwitchResult | null>(null)

  const switchOrg = useCallback(async (tenantId: string): Promise<OrgSwitchResult> => {
    console.log('[useOrgSwitcher] switchOrg called with tenantId:', tenantId)
    console.log('[useOrgSwitcher] Current appUser:', { 
      tenant_id: (appUser?.active_tenant_id || appUser?.tenant_id), 
      active_tenant_id: appUser?.active_tenant_id 
    })
    
    if (!appUser) {
      console.log('[useOrgSwitcher] ❌ No appUser, aborting')
      return { success: false, error: 'Not authenticated' }
    }

    console.log('[useOrgSwitcher] ✅ Proceeding with switch...')
    setSwitching(true)

    try {
      console.log('[useOrgSwitcher] Calling API...')
      const response = await fetch('/api/org/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      
      console.log('[useOrgSwitcher] API response:', response.status)

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to switch organization')
      }

      const result: OrgSwitchResult = {
        success: true,
        previous_tenant: appUser.active_tenant_id || (appUser?.active_tenant_id || (appUser?.active_tenant_id || appUser?.tenant_id)),
        new_tenant: tenantId,
      }

      setLastSwitch(result)

      console.log('[useOrgSwitcher] Switch successful, refreshing user...')
      
      // Refresh the auth state to pick up new tenant context
      await refreshUser()
      
      console.log('[useOrgSwitcher] User refreshed, forcing full page reload...')
      
      // CRITICAL: Use window.location.href with cache-busting timestamp
      // This forces a complete reload and ensures all components re-fetch data
      globalThis.location.href = '/dashboard?_t=' + Date.now()
      
      // Note: Code after location.href won't execute (page is reloading)
      return result
    } catch (err: any) {
      console.error('[useOrgSwitcher] Error:', err)
      const result: OrgSwitchResult = {
        success: false,
        error: err.message,
      }
      setLastSwitch(result)
      setSwitching(false)
      return result
    }
  }, [appUser, router, refreshUser])

  return {
    switchOrg,
    switching,
    lastSwitch,
    canSwitch: !!appUser && !switching,
  }
}

// ============================================================================
// Hook: useOrgPreferences
// ============================================================================

export function useOrgPreferences(tenantId?: string) {
  const { appUser } = useAuth()
  const [preferences, setPreferences] = useState<OrgPreferences | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPreferences = useCallback(async () => {
    if (!appUser?.id || !tenantId) return

    try {
      setLoading(true)
      const response = await fetch(`/api/org/preferences?tenant_id=${tenantId}`)
      const data = await response.json()

      if (response.ok) {
        setPreferences(data.preferences)
      }
    } catch (err) {
      console.error('[useOrgPreferences] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [appUser?.id, tenantId])

  useEffect(() => {
    if (tenantId) {
      fetchPreferences()
    }
  }, [tenantId, fetchPreferences])

  const togglePin = useCallback(async () => {
    if (!appUser?.id || !tenantId) return

    try {
      const response = await fetch('/api/org/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          is_pinned: !preferences?.is_pinned,
        }),
      })

      if (response.ok) {
        await fetchPreferences()
      }
    } catch (err) {
      console.error('[useOrgPreferences] togglePin error:', err)
    }
  }, [appUser, tenantId, preferences, fetchPreferences])

  const setFavorite = useCallback(async (isFavorite: boolean) => {
    if (!appUser?.id || !tenantId) return

    try {
      const response = await fetch('/api/org/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          is_favorite: isFavorite,
        }),
      })

      if (response.ok) {
        await fetchPreferences()
      }
    } catch (err) {
      console.error('[useOrgPreferences] setFavorite error:', err)
    }
  }, [appUser, tenantId, fetchPreferences])

  const updateDisplayName = useCallback(async (displayName: string | null) => {
    if (!appUser?.id || !tenantId) return

    try {
      const response = await fetch('/api/org/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenantId,
          custom_display_name: displayName,
        }),
      })

      if (response.ok) {
        await fetchPreferences()
      }
    } catch (err) {
      console.error('[useOrgPreferences] updateDisplayName error:', err)
    }
  }, [appUser, tenantId, fetchPreferences])

  return {
    preferences,
    loading,
    isPinned: preferences?.is_pinned || false,
    isFavorite: preferences?.is_favorite || false,
    displayName: preferences?.custom_display_name,
    togglePin,
    setFavorite,
    updateDisplayName,
    refetch: fetchPreferences,
  }
}

// ============================================================================
// Hook: useOrgValidation
// ============================================================================

export function useOrgValidation() {
  const { appUser } = useAuth()
  const [validation, setValidation] = useState<{
    status: 'VALIDATED' | 'UNVALIDATED' | 'EXPIRED_GRACE' | null
    grace_ends_at: string | null
    days_remaining: number | null
  }>({
    status: null,
    grace_ends_at: null,
    days_remaining: null,
  })

  useEffect(() => {
    const fetchValidation = async () => {
      if (!(appUser?.active_tenant_id || appUser?.tenant_id)) return

      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('tenants')
          .select('validation_status, grace_period_ends_at')
          .eq('id', appUser.active_tenant_id || (appUser?.active_tenant_id || (appUser?.active_tenant_id || appUser?.tenant_id)))
          .single()

        if (data) {
          let daysRemaining = null
          if (data.grace_period_ends_at) {
            const graceEnd = new Date(data.grace_period_ends_at)
            const now = new Date()
            daysRemaining = Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          }

          setValidation({
            status: data.validation_status || 'VALIDATED',
            grace_ends_at: data.grace_period_ends_at,
            days_remaining: daysRemaining,
          })
        }
      } catch (err) {
        console.error('[useOrgValidation] Error:', err)
      }
    }

    fetchValidation()
  }, [appUser])

  return {
    isValidated: validation.status === 'VALIDATED',
    isUnvalidated: validation.status === 'UNVALIDATED',
    isExpired: validation.status === 'EXPIRED_GRACE',
    status: validation.status,
    graceEndsAt: validation.grace_ends_at,
    daysRemaining: validation.days_remaining,
    needsValidation: validation.status === 'UNVALIDATED' || validation.status === 'EXPIRED_GRACE',
  }
}

// ============================================================================
// Hook: useEmailVerification
// ============================================================================

export function useEmailVerification() {
  const { appUser, user } = useAuth()
  const emailVerificationRequired = useFeatureFlag('email_verification_required', (appUser?.active_tenant_id || appUser?.tenant_id))

  const isVerified = useMemo(() => {
    // Check both Supabase auth email_confirmed_at and app_users email_verified
    return !!(user?.email_confirmed_at || appUser?.email_verified)
  }, [user, appUser])

  const graceEndsAt = useMemo(() => {
    return appUser?.verification_grace_ends_at || null
  }, [appUser])

  const daysRemaining = useMemo(() => {
    if (!graceEndsAt) return null
    const graceEnd = new Date(graceEndsAt)
    const now = new Date()
    return Math.ceil((graceEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  }, [graceEndsAt])

  const needsVerification = useMemo(() => {
    return emailVerificationRequired && !isVerified
  }, [emailVerificationRequired, isVerified])

  const isGracePeriod = useMemo(() => {
    return needsVerification && daysRemaining !== null && daysRemaining > 0
  }, [needsVerification, daysRemaining])

  const isExpired = useMemo(() => {
    return needsVerification && daysRemaining !== null && daysRemaining <= 0
  }, [needsVerification, daysRemaining])

  return {
    isVerified,
    needsVerification,
    isGracePeriod,
    isExpired,
    graceEndsAt,
    daysRemaining,
    canPerformActions: isVerified || isGracePeriod,
  }
}


