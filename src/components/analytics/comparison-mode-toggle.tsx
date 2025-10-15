'use client'

/**
 * Comparison Mode Toggle
 * 
 * Allows overlaying previous period data on charts for trend analysis
 * 
 * Features:
 * - MoM (Month-over-Month)
 * - YoY (Year-over-Year)
 * - Custom period
 * - Automatic % change calculations
 * - Visual indicators (up/down arrows)
 * 
 * Usage:
 * ```typescript
 * const { comparisonMode, comparisonData, setComparisonMode } = useComparisonMode(currentData)
 * 
 * <ComparisonModeToggle mode={comparisonMode} onChange={setComparisonMode} />
 * 
 * <LineChart data={comparisonData}>
 *   <Line dataKey="revenue" stroke="#blue" name="Current" />
 *   <Line dataKey="revenue_previous" stroke="#gray" strokeDasharray="5 5" name="Previous" />
 * </LineChart>
 * ```
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TrendingUp, TrendingDown, ArrowLeftRight } from 'lucide-react'

export type ComparisonMode = 'none' | 'mom' | 'yoy' | 'custom'

interface ComparisonModeToggleProps {
  mode: ComparisonMode
  onChange: (mode: ComparisonMode) => void
  className?: string
}

export function ComparisonModeToggle({ mode, onChange, className }: ComparisonModeToggleProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-sm text-gray-600">Compare:</span>
      <Select value={mode} onValueChange={(value) => onChange(value as ComparisonMode)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No Comparison</SelectItem>
          <SelectItem value="mom">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              Month-over-Month
            </div>
          </SelectItem>
          <SelectItem value="yoy">
            <div className="flex items-center gap-2">
              <ArrowLeftRight className="h-3 w-3" />
              Year-over-Year
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      
      {mode !== 'none' && (
        <Badge variant="outline" className="text-xs">
          {mode === 'mom' ? 'vs Last Month' : 'vs Last Year'}
        </Badge>
      )}
    </div>
  )
}

/**
 * Comparison Change Indicator
 * 
 * Shows % change with color-coded arrow
 */
interface ComparisonChangeProps {
  current: number
  previous: number
  format?: 'number' | 'currency' | 'percent'
  inverse?: boolean // If true, down is good (e.g., CAC)
}

export function ComparisonChange({ 
  current, 
  previous, 
  format = 'number',
  inverse = false 
}: ComparisonChangeProps) {
  if (previous === 0) {
    return <span className="text-xs text-gray-500">N/A</span>
  }
  
  const change = ((current - previous) / previous) * 100
  const isPositive = inverse ? change < 0 : change > 0
  const color = isPositive ? 'text-green-600' : 'text-red-600'
  const Icon = isPositive ? TrendingUp : TrendingDown
  
  const formatValue = (val: number) => {
    switch (format) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val)
      case 'percent':
        return `${val.toFixed(1)}%`
      default:
        return val.toLocaleString()
    }
  }
  
  return (
    <div className="flex items-center gap-1">
      <span className={`text-xs font-medium ${color}`}>
        {change > 0 && '+'}{change.toFixed(1)}%
      </span>
      <Icon className={`h-3 w-3 ${color}`} />
      <span className="text-xs text-gray-500">
        ({formatValue(previous)} → {formatValue(current)})
      </span>
    </div>
  )
}

/**
 * Hook for managing comparison data
 */
export function useComparisonData<T extends Record<string, any>>(
  currentData: T[],
  previousData: T[],
  dataKey: string
): T[] {
  // Merge current and previous data
  return currentData.map((current, index) => {
    const previous = previousData[index]
    
    if (!previous) return current
    
    return {
      ...current,
      [`${dataKey}_previous`]: previous[dataKey],
      [`${dataKey}_change`]: previous[dataKey] 
        ? ((current[dataKey] - previous[dataKey]) / previous[dataKey]) * 100
        : null,
    }
  })
}

