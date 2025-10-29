'use client'

/**
 * Health Pill Component
 * 
 * Displays deal health status with icon and color coding
 * Status: Excellent (green), Good (green), At Risk (amber), Stalled (red)
 */

import { HEALTH_COLORS } from '@/types/deal-intelligence'
import type { DealHealthInfo, DealHealth } from '@/types/deal-intelligence'

interface HealthPillProps {
  health: DealHealthInfo
  compact?: boolean  // Compact mode shows only icon
  className?: string
}

/**
 * Get icon for health status
 */
function getHealthIcon(status: DealHealth): string {
  switch (status) {
    case 'Excellent':
      return '●' // Solid circle
    case 'Good':
      return '✓'  // Check
    case 'At Risk':
      return '⚠'  // Warning
    case 'Stalled':
      return '●'  // Solid circle (red)
    default:
      return '●'
  }
}

export function HealthPill({ health, compact = false, className = '' }: HealthPillProps) {
  const { status, daysSinceUpdate } = health
  const colors = HEALTH_COLORS[status]
  const icon = getHealthIcon(status)
  
  // Format days ago text
  const daysText = daysSinceUpdate === 0 
    ? 'Today' 
    : daysSinceUpdate === 1 
    ? '1d ago' 
    : `${daysSinceUpdate}d ago`
  
  if (compact) {
    return (
      <div 
        className={`inline-flex items-center justify-center w-6 h-6 rounded-full ${colors.bg} ${className}`}
        title={`Health: ${status} (Last activity: ${daysText})`}
      >
        <span className={`text-xs ${colors.text}`}>{icon}</span>
      </div>
    )
  }
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border} ${className}`}
      title={`Last activity: ${daysText}`}
    >
      <span className="text-xs leading-none">{icon}</span>
      <span className="text-xs font-medium leading-none">{status}</span>
    </div>
  )
}

/**
 * Mini version - just the icon in a circle
 */
export function HealthPillMini({ health }: { health: DealHealthInfo }) {
  return <HealthPill health={health} compact className="flex-shrink-0" />
}


