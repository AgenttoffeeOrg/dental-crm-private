/**
 * Location Switcher Component
 * 
 * Dropdown for multi-location users to switch between accessible locations.
 * Optimized to appear only for multi-location users (5% of users).
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, Check, ChevronDown, Loader2, Building2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/auth-fetch'
import { useAuth } from '@/lib/auth'

interface Location {
  id: string
  name: string
  locationName: string | null
  isPrimary: boolean
}

interface LocationSwitcherProps {
  currentLocationId: string
  currentLocationName: string
  isMultiLocation: boolean
  className?: string
}

export function LocationSwitcher({
  currentLocationId,
  currentLocationName,
  isMultiLocation,
  className = '',
}: LocationSwitcherProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(false)
  const [switching, setSwitching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { refreshUser } = useAuth()

  useEffect(() => {
    if (isOpen && locations.length === 0) {
      loadLocations()
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Don't render if not multi-location (after all hooks)
  if (!isMultiLocation) {
    return null
  }

  const loadLocations = async () => {
    setLoading(true)

    try {
      const response = await authFetch('/api/locations/accessible')

      if (response.ok) {
        const data = await response.json()
        setLocations(data.locations || [])
      } else {
        console.error('Failed to load locations, status:', response.status)
      }
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const switchLocation = async (locationId: string) => {
    if (locationId === currentLocationId) {
      setIsOpen(false)
      return
    }

    setSwitching(true)

    try {
      const response = await authFetch('/api/locations/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location_id: locationId }),
      })

      if (response.ok) {
        // CRITICAL: Force a full page refresh with cache bypass
        // This ensures all state is reset and auth is re-fetched
        window.location.href = window.location.pathname + '?_refresh=' + Date.now()
      } else {
        const data = await response.json()
        alert('Failed to switch location: ' + (data.error || 'Unknown error'))
        setSwitching(false)
      }
    } catch (error: any) {
      console.error('Error switching location:', error)
      alert('Failed to switch location')
      setSwitching(false)
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={switching}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <MapPin className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900 max-w-[150px] truncate">
          {currentLocationName}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform ${
          isOpen ? 'rotate-180' : ''
        }`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2">
          {/* Header */}
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-medium text-gray-500 uppercase">
              Switch Location
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="px-3 py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            </div>
          )}

          {/* Switching State */}
          {switching && (
            <div className="px-3 py-8 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-600">Switching location...</p>
              </div>
            </div>
          )}

          {/* Locations List */}
          {!loading && !switching && locations.length > 0 && (
            <div className="max-h-64 overflow-y-auto">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => switchLocation(location.id)}
                  className={`w-full px-3 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                    location.id === currentLocationId ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Building2 className={`w-4 h-4 flex-shrink-0 ${
                      location.id === currentLocationId ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                    <div className="flex-1 min-w-0 text-left">
                      <p className={`text-sm font-medium truncate ${
                        location.id === currentLocationId ? 'text-blue-900' : 'text-gray-900'
                      }`}>
                        {location.locationName || location.name}
                      </p>
                      {location.isPrimary && (
                        <p className="text-xs text-gray-500">Primary Location</p>
                      )}
                    </div>
                  </div>
                  
                  {location.id === currentLocationId && (
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && !switching && locations.length === 0 && (
            <div className="px-3 py-8 text-center">
              <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600">
                No locations available
              </p>
            </div>
          )}

          {/* Footer */}
          <div className="px-3 py-2 border-t border-gray-200 mt-2">
            <button
              onClick={() => {
                setIsOpen(false)
                router.push('/settings/locations')
              }}
              className="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors text-left"
            >
              Manage Locations
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Compact Location Badge
 * Shows current location without switcher functionality
 */
interface LocationBadgeProps {
  locationName: string
  className?: string
}

export function LocationBadge({ locationName, className = '' }: LocationBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full ${className}`}>
      <MapPin className="w-3.5 h-3.5 text-gray-600" />
      <span className="text-sm font-medium text-gray-900 max-w-[120px] truncate">
        {locationName}
      </span>
    </div>
  )
}

