'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { MapPin, Building2, Check, Loader2 } from 'lucide-react'
import { FeatureFlags } from '@/lib/feature-flags'
import { useAccessibleLocations, useSwitchLocation, useCurrentLocation } from '@/lib/hooks/use-multi-location'

interface LocationSwitcherProps {
  currentTenantId?: string
  onLocationChange?: (tenantId: string) => void
}

export function LocationSwitcher({ currentTenantId, onLocationChange }: LocationSwitcherProps) {
  const { locations, loading, isMultiLocation } = useAccessibleLocations()
  const { switchLocation, switching } = useSwitchLocation()
  const { currentLocation } = useCurrentLocation()

  // Don't show if multi-location is disabled
  if (!FeatureFlags.ENABLE_MULTI_LOCATION) {
    return null
  }

  // Don't show switcher if only one location or not loaded yet
  if (!isMultiLocation || locations.length <= 1) {
    return null
  }

  const handleSwitchLocation = async (tenantId: string) => {
    if (tenantId === currentTenantId) return

    const result = await switchLocation(tenantId)
    
    if (result.success && onLocationChange) {
      onLocationChange(tenantId)
    }
  }

  const effectiveCurrentId = currentTenantId || currentLocation?.id
  const displayLocation = locations.find(l => l.id === effectiveCurrentId) || currentLocation
  const displayName = displayLocation?.location_name || displayLocation?.name || 'Select Location'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-blue-200 hover:border-blue-300 hover:bg-blue-50 transition-colors w-full justify-start"
          disabled={loading || switching}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4 text-blue-600" />
          )}
          <span className="font-medium text-gray-900 truncate flex-1 text-left">{displayName}</span>
          {locations.length > 1 && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {locations.length}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="flex items-center gap-2 text-gray-600">
          <Building2 className="h-4 w-4" />
          Switch Location
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {locations.map((location) => {
          const isActive = location.id === effectiveCurrentId
          return (
            <DropdownMenuItem
              key={location.id}
              onClick={() => handleSwitchLocation(location.id)}
              disabled={switching}
              className={`cursor-pointer ${isActive ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <MapPin className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <div>
                    <p className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                      {location.location_name || location.name}
                    </p>
                    {location.location_name && (
                      <p className="text-xs text-gray-500">{location.name}</p>
                    )}
                  </div>
                </div>
                {isActive && <Check className="h-4 w-4 text-blue-600" />}
              </div>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
