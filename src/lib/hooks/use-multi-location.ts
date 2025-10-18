/**
 * Multi-Location Hooks
 * 
 * Provides clean, reusable hooks for multi-location functionality
 * Handles location access, switching, and state management
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import { FeatureFlags } from '@/lib/feature-flags'

export interface AccessibleLocation {
  id: string
  name: string
  location_name: string | null
  is_multi_location: boolean
  dental_group_id: string | null
  website_url: string | null
  created_at: string
}

export interface LocationSwitchResult {
  success: boolean
  error?: string
}

/**
 * Hook: useAccessibleLocations
 * 
 * Returns all locations the current user has access to
 * Handles both single-location and multi-location scenarios
 */
export function useAccessibleLocations() {
  const [locations, setLocations] = useState<AccessibleLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadLocations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      // Call the get_accessible_tenants function (returns array of tenant IDs)
      const { data: tenantIds, error: fnError } = await supabase
        .rpc('get_accessible_tenants')

      if (fnError) {
        console.error('[useAccessibleLocations] RPC error:', fnError)
        throw new Error('Failed to get accessible tenants')
      }

      // If no tenant IDs returned, fall back to user's primary tenant
      if (!tenantIds || tenantIds.length === 0) {
        const { data: appUser } = await supabase
          .from('app_users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (appUser?.tenant_id) {
          const { data: tenant } = await supabase
            .from('tenants')
            .select('id, name, location_name, is_multi_location, dental_group_id, website_url, created_at')
            .eq('id', appUser.tenant_id)
            .single()

          if (tenant) {
            setLocations([tenant as AccessibleLocation])
          }
        }
        return
      }

      // Fetch full details for all accessible tenants
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name, location_name, is_multi_location, dental_group_id, website_url, created_at')
        .in('id', tenantIds)
        .order('name')

      if (tenantsError) {
        console.error('[useAccessibleLocations] Tenants query error:', tenantsError)
        throw new Error('Failed to fetch location details')
      }

      setLocations((tenants || []) as AccessibleLocation[])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      console.error('[useAccessibleLocations] Error:', err)
      setError(message)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadLocations()
  }, [loadLocations])

  return {
    locations,
    loading,
    error,
    refresh: loadLocations,
    isMultiLocation: locations.length > 1,
  }
}

/**
 * Hook: useSwitchLocation
 * 
 * Provides a function to switch the user's current location
 * Handles the update and page refresh
 */
export function useSwitchLocation() {
  const [switching, setSwitching] = useState(false)
  const router = useRouter()

  const switchLocation = useCallback(async (tenantId: string): Promise<LocationSwitchResult> => {
    setSwitching(true)
    
    try {
      const supabase = createClient()
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('No authenticated user')
      }

      // Use the safe database function to switch locations
      const { data: result, error: rpcError } = await supabase
        .rpc('switch_user_location', { p_new_tenant_id: tenantId })

      if (rpcError) {
        console.error('[useSwitchLocation] RPC error:', rpcError)
        throw new Error(`Failed to switch location: ${rpcError.message}`)
      }

      // Check the result from the function
      if (!result || !result.success) {
        const errorMsg = result?.error || 'Unknown error'
        console.error('[useSwitchLocation] Function returned error:', errorMsg)
        throw new Error(errorMsg)
      }

      // Success! Refresh the page to reload all data with new tenant context
      toast.success('Location switched successfully')
      
      // Use router.refresh() first, then reload
      router.refresh()
      
      // Small delay to ensure state is updated
      setTimeout(() => {
        window.location.reload()
      }, 100)

      return { success: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to switch location'
      console.error('[useSwitchLocation] Error:', err)
      toast.error(message)
      
      return { 
        success: false, 
        error: message 
      }
    } finally {
      setSwitching(false)
    }
  }, [router])

  return {
    switchLocation,
    switching,
  }
}

/**
 * Hook: useCurrentLocation
 * 
 * Returns the current location (tenant) the user is viewing
 */
export function useCurrentLocation() {
  const [currentLocation, setCurrentLocation] = useState<AccessibleLocation | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCurrentLocation = async () => {
      try {
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: appUser } = await supabase
          .from('app_users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (!appUser?.tenant_id) return

        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, name, location_name, is_multi_location, dental_group_id, website_url, created_at')
          .eq('id', appUser.tenant_id)
          .single()

        if (tenant) {
          setCurrentLocation(tenant as AccessibleLocation)
        }
      } catch (err) {
        console.error('[useCurrentLocation] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCurrentLocation()
  }, [])

  return {
    currentLocation,
    loading,
    displayName: currentLocation?.location_name || currentLocation?.name || 'Unknown Location',
  }
}

/**
 * Hook: useDentalGroup
 * 
 * Returns the dental group information for the current user
 * Only relevant for multi-location setups
 */
export function useDentalGroup() {
  const [dentalGroup, setDentalGroup] = useState<{
    id: string
    name: string
    primary_email: string
    is_active: boolean
    location_count: number
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadDentalGroup = async () => {
      if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
        setLoading(false)
        return
      }

      try {
        const supabase = createClient()
        
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: appUser } = await supabase
          .from('app_users')
          .select('tenant_id')
          .eq('id', user.id)
          .single()

        if (!appUser?.tenant_id) return

        const { data: tenant } = await supabase
          .from('tenants')
          .select('dental_group_id')
          .eq('id', appUser.tenant_id)
          .single()

        if (!tenant?.dental_group_id) return

        const { data: group } = await supabase
          .from('dental_groups')
          .select('id, name, primary_email, is_active')
          .eq('id', tenant.dental_group_id)
          .single()

        if (group) {
          // Get location count
          const { count } = await supabase
            .from('tenants')
            .select('*', { count: 'exact', head: true })
            .eq('dental_group_id', group.id)

          setDentalGroup({
            ...group,
            location_count: count || 0
          })
        }
      } catch (err) {
        console.error('[useDentalGroup] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDentalGroup()
  }, [])

  return {
    dentalGroup,
    loading,
    isPartOfGroup: !!dentalGroup,
  }
}

