import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface LocationBadgeProps {
  locationName: string
  locationId?: string
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  className?: string
  variant?: 'default' | 'secondary' | 'outline'
}

export function LocationBadge({
  locationName,
  locationId,
  size = 'sm',
  showIcon = true,
  className,
  variant = 'secondary'
}: LocationBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4'
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1 font-medium',
        sizeClasses[size],
        className
      )}
      title={locationId ? `Location ID: ${locationId}` : undefined}
    >
      {showIcon && <MapPin className={iconSizes[size]} />}
      <span>{locationName}</span>
    </Badge>
  )
}

interface OrgBadgeProps {
  orgName: string
  orgId?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
  variant?: 'default' | 'secondary' | 'outline'
}

export function OrgBadge({
  orgName,
  orgId,
  size = 'sm',
  className,
  variant = 'outline'
}: OrgBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  }

  return (
    <Badge
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1 font-medium border-blue-200 bg-blue-50 text-blue-700',
        sizeClasses[size],
        className
      )}
      title={orgId ? `Organization ID: ${orgId}` : undefined}
    >
      <span className="font-semibold">🏢</span>
      <span>{orgName}</span>
    </Badge>
  )
}

interface LocationOrgBadgeGroupProps {
  locationName?: string
  locationId?: string
  orgName: string
  orgId?: string
  className?: string
}

export function LocationOrgBadgeGroup({
  locationName,
  locationId,
  orgName,
  orgId,
  className
}: LocationOrgBadgeGroupProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <OrgBadge orgName={orgName} orgId={orgId} size="sm" />
      {locationName && (
        <>
          <span className="text-gray-300">•</span>
          <LocationBadge locationName={locationName} locationId={locationId} size="sm" />
        </>
      )}
    </div>
  )
}

