'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface EnhancedKPICardProps {
  title: string
  value: string | number
  icon: React.ReactNode
  trend?: {
    value: number // percentage change
    period: string // e.g., "vs. last month"
  }
  subtitle?: string
  href?: string
  color: 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray'
  onRefresh?: () => void
  refreshing?: boolean
  lastUpdated?: string
  tooltip?: string
}

const colorClasses = {
  green: {
    border: 'border-l-green-500 hover:border-l-green-600',
    icon: 'text-green-600',
    value: 'text-green-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
    hover: 'text-green-600'
  },
  blue: {
    border: 'border-l-blue-500 hover:border-l-blue-600',
    icon: 'text-blue-600',
    value: 'text-blue-700',
    trendPositive: 'text-blue-600',
    trendNegative: 'text-red-600',
    hover: 'text-blue-600'
  },
  purple: {
    border: 'border-l-purple-500 hover:border-l-purple-600',
    icon: 'text-purple-600',
    value: 'text-purple-700',
    trendPositive: 'text-purple-600',
    trendNegative: 'text-red-600',
    hover: 'text-purple-600'
  },
  orange: {
    border: 'border-l-orange-500 hover:border-l-orange-600',
    icon: 'text-orange-600',
    value: 'text-orange-700',
    trendPositive: 'text-orange-600',
    trendNegative: 'text-red-600',
    hover: 'text-orange-600'
  },
  red: {
    border: 'border-l-red-500 hover:border-l-red-600',
    icon: 'text-red-600',
    value: 'text-red-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
    hover: 'text-red-600'
  },
  gray: {
    border: 'border-l-gray-500 hover:border-l-gray-600',
    icon: 'text-gray-600',
    value: 'text-gray-700',
    trendPositive: 'text-green-600',
    trendNegative: 'text-red-600',
    hover: 'text-gray-600'
  }
}

export function EnhancedKPICard({
  title,
  value,
  icon,
  trend,
  subtitle,
  href,
  color,
  onRefresh,
  refreshing = false,
  lastUpdated,
  tooltip
}: EnhancedKPICardProps) {
  const colors = colorClasses[color]
  
  const TrendIcon = trend 
    ? trend.value > 0 
      ? TrendingUp 
      : trend.value < 0 
        ? TrendingDown 
        : Minus
    : null

  const cardContent = (
    <Card className={`hover:shadow-lg transition-all duration-200 border-l-4 ${colors.border} ${href ? 'cursor-pointer' : ''} group`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2 flex-1">
          <CardTitle className="text-sm font-medium text-gray-600">
            {title}
          </CardTitle>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button className="text-gray-400 hover:text-gray-600">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onRefresh()
              }}
              disabled={refreshing}
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          )}
          <div className={`${colors.icon} group-hover:scale-110 transition-transform`}>
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold ${colors.value}`}>
          {value}
        </div>
        
        {(trend || subtitle) && (
          <div className="mt-2 flex items-center justify-between">
            {trend && TrendIcon && (
              <div className={`flex items-center text-sm ${
                trend.value > 0 ? colors.trendPositive : 
                trend.value < 0 ? colors.trendNegative : 
                'text-gray-500'
              }`}>
                <TrendIcon className="h-3 w-3 mr-1" />
                <span className="font-medium">
                  {trend.value > 0 && '+'}{trend.value.toFixed(1)}%
                </span>
                <span className="text-gray-500 ml-1 text-xs">
                  {trend.period}
                </span>
              </div>
            )}
            
            {subtitle && !trend && (
              <p className="text-sm text-gray-600">{subtitle}</p>
            )}
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs text-gray-400 mt-2">
            Updated {lastUpdated}
          </p>
        )}

        {href && (
          <p className={`text-xs ${colors.hover} mt-2 font-medium opacity-0 group-hover:opacity-100 transition-opacity`}>
            Click to view details →
          </p>
        )}
      </CardContent>
    </Card>
  )

  if (href) {
    return <Link href={href}>{cardContent}</Link>
  }

  return cardContent
}

