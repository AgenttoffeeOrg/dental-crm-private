'use client'

/**
 * Real-time Refresh Toggle
 * 
 * Auto-refresh dashboard data at intervals
 * 
 * Features:
 * - Toggle on/off
 * - Select interval (30s, 1m, 5m, 10m)
 * - Visual indicator when refreshing
 * - Pause on user interaction
 * - Last updated timestamp
 */

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RefreshCw, Play, Pause, Clock } from 'lucide-react'
import { format } from 'date-fns'

interface RealTimeRefreshToggleProps {
  onRefresh: () => void | Promise<void>
  defaultInterval?: number
  className?: string
}

export function RealTimeRefreshToggle({
  onRefresh,
  defaultInterval = 30000, // 30 seconds
  className,
}: RealTimeRefreshToggleProps) {
  const [isEnabled, setIsEnabled] = useState(false)
  const [interval, setInterval] = useState(defaultInterval)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  
  // Handle refresh
  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true)
      await onRefresh()
      setLastUpdated(new Date())
    } catch (error) {
      console.error('[Real-time Refresh] Error:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [onRefresh])
  
  // Auto-refresh effect
  useEffect(() => {
    if (!isEnabled) return
    
    const intervalId = setInterval(() => {
      handleRefresh()
    }, interval)
    
    return () => clearInterval(intervalId)
  }, [isEnabled, interval, handleRefresh])
  
  // Manual refresh
  const handleManualRefresh = async () => {
    await handleRefresh()
  }
  
  const intervalOptions = [
    { label: '30 seconds', value: 30000 },
    { label: '1 minute', value: 60000 },
    { label: '5 minutes', value: 300000 },
    { label: '10 minutes', value: 600000 },
  ]
  
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Manual Refresh Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleManualRefresh}
        disabled={isRefreshing}
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
        Refresh
      </Button>
      
      {/* Auto-refresh Toggle */}
      <Button
        variant={isEnabled ? 'default' : 'outline'}
        size="sm"
        onClick={() => setIsEnabled(!isEnabled)}
      >
        {isEnabled ? (
          <>
            <Pause className="h-4 w-4 mr-2" />
            Pause
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            Auto-refresh
          </>
        )}
      </Button>
      
      {/* Interval Selector */}
      {isEnabled && (
        <Select
          value={interval.toString()}
          onValueChange={(value) => setInterval(parseInt(value))}
        >
          <SelectTrigger className="w-32 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {intervalOptions.map((option) => (
              <SelectItem key={option.value} value={option.value.toString()}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {/* Status Badge */}
      {isEnabled && (
        <Badge variant="outline" className="text-xs">
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span>Live</span>
          </div>
        </Badge>
      )}
      
      {/* Last Updated */}
      <span className="text-xs text-gray-500 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        {format(lastUpdated, 'h:mm:ss a')}
      </span>
    </div>
  )
}

