'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowUpRight, ArrowDownRight, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MetricCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  iconColor?: string
  change?: number
  changeLabel?: string
  context?: string
  trend?: 'up' | 'down' | 'neutral'
  loading?: boolean
  onClick?: () => void
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = 'text-blue-600',
  change,
  changeLabel,
  context,
  trend,
  loading = false,
  onClick,
  className,
}: MetricCardProps) {
  // Auto-determine trend from change if not provided
  const determinedTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral')
  
  const trendConfig = {
    up: {
      icon: ArrowUpRight,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
    },
    down: {
      icon: ArrowDownRight,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700',
    },
    neutral: {
      icon: Minus,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700',
    },
  }

  const config = trendConfig[determinedTrend]
  const TrendIcon = config.icon

  if (loading) {
    return (
      <Card className={cn('border-gray-200', className)}>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-5 w-5 bg-gray-200 rounded" />
            </div>
            <div className="h-8 w-32 bg-gray-200 rounded mb-3" />
            <div className="h-3 w-20 bg-gray-200 rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card 
      className={cn(
        'border-gray-200 transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          {Icon && (
            <div className={cn('p-2 rounded-lg bg-opacity-10', iconColor.replace('text-', 'bg-'))}>
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
          )}
        </div>

        {/* Value */}
        <p className="text-3xl font-bold text-gray-900 mb-3">
          {value}
        </p>

        {/* Trend & Context */}
        <div className="flex items-center justify-between">
          {change !== undefined && (
            <div className="flex items-center gap-1">
              <TrendIcon className={cn('h-4 w-4', config.color)} />
              <span className={cn('text-sm font-semibold', config.textColor)}>
                {change > 0 ? '+' : ''}{change.toFixed(1)}%
              </span>
              {changeLabel && (
                <span className="text-xs text-gray-500 ml-1">{changeLabel}</span>
              )}
            </div>
          )}
          
          {context && (
            <span className="text-xs text-gray-500">{context}</span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Skeleton loader variant
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('border-gray-200', className)}>
      <CardContent className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="h-4 w-24 bg-gray-200 rounded" />
            <div className="h-10 w-10 bg-gray-200 rounded-lg" />
          </div>
          <div className="h-8 w-32 bg-gray-200 rounded mb-3" />
          <div className="h-4 w-28 bg-gray-200 rounded" />
        </div>
      </CardContent>
    </Card>
  )
}

