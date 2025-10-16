import * as React from 'react'
import { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  change?: {
    value: string
    color: string
    icon?: string
  }
  icon?: LucideIcon
  badge?: {
    label: string
    variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary'
  }
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  onClick?: () => void
}

/**
 * MetricCard - Refined, enterprise-grade metric display
 * 
 * Features:
 * - Consistent spacing (20px padding)
 * - Optional icon with semantic colors
 * - Change indicator with color coding
 * - Badge support
 * - Hover state
 * - Click support
 */
export function MetricCard({
  title,
  value,
  change,
  icon: Icon,
  badge,
  trend,
  className,
  onClick,
}: MetricCardProps) {
  const isClickable = !!onClick
  
  return (
    <Card
      className={cn(
        'p-5',
        isClickable && 'cursor-pointer hover:shadow-lg active:scale-[0.99] transition-all duration-200',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {title}
        </CardTitle>
        {Icon && (
          <div className={cn(
            'p-2 rounded-lg',
            trend === 'up' && 'bg-green-100 text-green-600',
            trend === 'down' && 'bg-red-100 text-red-600',
            trend === 'neutral' && 'bg-gray-100 text-gray-600',
            !trend && 'bg-blue-100 text-blue-600'
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          {value}
        </div>
        {(change || badge) && (
          <div className="flex items-center gap-2">
            {change && (
              <div className={cn('text-sm font-medium flex items-center gap-1', change.color)}>
                {change.icon && <span>{change.icon}</span>}
                <span>{change.value}</span>
              </div>
            )}
            {badge && (
              <Badge variant={badge.variant} size="sm">
                {badge.label}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
