'use client'

/**
 * Location Context Indicator
 * 
 * Shows which location the current data belongs to
 * Only visible in multi-location setups
 */

import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'

interface LocationIndicatorProps {
  /** Optional: Show even if not multi-location */
  alwaysShow?: boolean
  /** Optional: Custom class name */
  className?: string
  /** Optional: Size variant */
  size?: 'sm' | 'md' | 'lg'
}

/**
 * Shows current location context to user
 * Typically displayed at top of data tables
 */
export function LocationIndicator({ alwaysShow = false, className = '', size = 'md' }: LocationIndicatorProps) {
  const { currentLocation, isMultiLocation, isLoading } = useTenantContext()

  // Don't show if not multi-location (unless forced)
  if (!alwaysShow && !isMultiLocation) {
    return null
  }

  if (isLoading) {
    return null
  }

  const displayName = currentLocation.displayName || 'Unknown Location'
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  return (
    <Badge 
      variant="outline" 
      className={`${sizeClasses[size]} border-blue-200 bg-blue-50 text-blue-900 flex items-center gap-1.5 ${className}`}
    >
      <MapPin className={size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5'} />
      <span className="font-medium">{displayName}</span>
    </Badge>
  )
}

/**
 * Banner version - full width alert banner
 * Use at top of pages
 */
export function LocationBanner({ className = '' }: { className?: string }) {
  const { currentLocation, isMultiLocation, isLoading, accessibleLocations } = useTenantContext()

  if (!isMultiLocation || isLoading) {
    return null
  }

  const displayName = currentLocation.displayName || 'Unknown Location'
  const locationCount = accessibleLocations.length

  return (
    <div className={`bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <MapPin className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <p className="text-sm font-semibold text-blue-900">
            Viewing: {displayName}
          </p>
          <p className="text-xs text-blue-600">
            You have access to {locationCount} {locationCount === 1 ? 'location' : 'locations'}
          </p>
        </div>
      </div>
      <p className="text-xs text-blue-600">
        Use the location switcher to change locations
      </p>
    </div>
  )
}

/**
 * Inline badge for table headers or cards
 */
export function InlineLocationBadge({ className = '' }: { className?: string }) {
  return <LocationIndicator size="sm" className={className} />
}

