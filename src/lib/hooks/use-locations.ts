import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase-client'

export interface Location {
  id: string
  tenant_id: string
  name: string
  address?: string
  is_primary?: boolean
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

  useEffect(() => {
    const fetchAccessibleLocations = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/locations/accessible')
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
    }

    fetchAccessibleLocations()
  }, [])

  return { locations, loading, error, refetch: () => {} }
}

