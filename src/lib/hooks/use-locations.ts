import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'
import { authFetch } from '@/lib/auth-fetch'
import { useAuth } from '@/lib/auth'

export interface Location {
  id: string
  tenant_id: string
  name: string
  address?: string
  address_line1?: string
  phone?: string
  phone_number?: string
  city?: string
  postal_code?: string
  email?: string
  is_primary?: boolean
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

// Helper functions for safe field access during migration
export function getLocationAddress(location: Partial<Location>): string | undefined {
  return location.address_line1 || location.address || undefined
}

export function getLocationPhone(location: Partial<Location>): string | undefined {
  return location.phone_number || location.phone || undefined
}

// Helper to prepare location data for forms (maps DB fields to form fields)
export function mapLocationForForm(location: Partial<Location>): Partial<Location> {
  return {
    ...location,
    address_line1: location.address_line1 || location.address,
    phone_number: location.phone_number || location.phone,
  }
}

// Helper to prepare form data for DB (maps form fields to current DB fields)
export function mapLocationForDB(formData: Partial<Location>): Partial<Location> {
  const result: Partial<Location> = { ...formData }

  if (formData.address_line1 !== undefined) {
    result.address = formData.address_line1
    delete (result as Record<string, unknown>).address_line1
  }

  if (formData.phone_number !== undefined) {
    result.phone = formData.phone_number
    delete (result as Record<string, unknown>).phone_number
  }

  return result
}

export function useLocation(locationId: string | null | undefined) {
  const [location, setLocation] = useState<Location | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!locationId) {
      setLocation(null)
      return
    }

    const fetchLocation = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('id', locationId)
          .single()

        if (fetchError) throw fetchError
        setLocation(data)
      } catch (err: any) {
        console.error('[useLocation] Error:', err)
        setError(err.message)
        setLocation(null)
      } finally {
        setLoading(false)
      }
    }

    fetchLocation()
  }, [locationId])

  return { location, loading, error }
}

export function useLocations(tenantId: string | null | undefined) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!tenantId) {
      setLocations([])
      return
    }

    const fetchLocations = async () => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { data, error: fetchError } = await supabase
          .from('locations')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('name')

        if (fetchError) throw fetchError
        setLocations(data || [])
      } catch (err: any) {
        console.error('[useLocations] Error:', err)
        setError(err.message)
        setLocations([])
      } finally {
        setLoading(false)
      }
    }

    fetchLocations()
  }, [tenantId])

  // Create a map for quick lookup
  const locationMap = new Map<string, Location>()
  locations.forEach(loc => locationMap.set(loc.id, loc))

  // Helper to get location name by ID
  const getLocationName = (locationId: string | null | undefined): string => {
    if (!locationId) return 'No Location'
    return locationMap.get(locationId)?.name || 'Unknown Location'
  }

  // Helper to get location by ID
  const getLocation = (locationId: string | null | undefined): Location | null => {
    if (!locationId) return null
    return locationMap.get(locationId) || null
  }

  return { locations, locationMap, getLocationName, getLocation, loading, error }
}

export function useAccessibleLocations() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { refreshUser } = useAuth()

  const fetchAccessibleLocations = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await authFetch('/api/locations/accessible')
      if (!response.ok) throw new Error('Failed to fetch accessible locations')

      const data = await response.json()
      setLocations(data.locations || [])
    } catch (err: any) {
      console.error('[useAccessibleLocations] Error:', err)
      setError(err.message)
      setLocations([])
    } finally {
      setLoading(false)
    }
  }, [refreshUser])

  useEffect(() => {
    fetchAccessibleLocations()
  }, [fetchAccessibleLocations])

  return { locations, loading, error, refetch: fetchAccessibleLocations }
}

