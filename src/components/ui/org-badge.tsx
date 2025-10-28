import { Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface OrgBadgeProps {
  orgName?: string | null
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'outline' | 'secondary'
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
}

export function OrgBadge({ 
  orgName, 
  className,
  size = 'md',
  variant = 'secondary'
}: OrgBadgeProps) {
  if (!orgName) {
    return null
  }

  return (
    <Badge 
      variant={variant}
      className={cn(
        'inline-flex items-center gap-1.5 font-medium',
        sizeClasses[size],
        className
      )}
    >
      <Building2 className="h-3 w-3" />
      <span>{orgName}</span>
    </Badge>
  )
}

interface LocationOrgBadgeGroupProps {
  orgName?: string | null
  locationName?: string | null
  locationId?: string
  className?: string
}

export function LocationOrgBadgeGroup({
  orgName,
  locationName,
  locationId,
  className
}: LocationOrgBadgeGroupProps) {
  if (!orgName && !locationName) {
    return null
  }

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {orgName && <OrgBadge orgName={orgName} size="sm" />}
      {locationName && (
        <Badge variant="outline" className="text-xs px-2 py-0.5 inline-flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>{locationName}</span>
        </Badge>
      )}
    </div>
  )
}

