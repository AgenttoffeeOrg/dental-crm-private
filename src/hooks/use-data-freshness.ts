/**
 * Data Freshness Hook
 * 
 * Tracks when data was last updated and provides human-readable time ago.
 * Updates every minute to keep the display current.
 */

import { useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

export function useDataFreshness(lastUpdated: Date | null) {
  const [timeAgo, setTimeAgo] = useState<string>('')

  useEffect(() => {
    if (!lastUpdated) {
      setTimeAgo('Never')
      return
    }

    // Update immediately
    const updateTimeAgo = () => {
      try {
        setTimeAgo(formatDistanceToNow(lastUpdated, { addSuffix: true }))
      } catch (error) {
        setTimeAgo('Recently')
      }
    }

    updateTimeAgo()

    // Update every minute
    const interval = setInterval(updateTimeAgo, 60000)

    return () => clearInterval(interval)
  }, [lastUpdated])

  return timeAgo
}

/**
 * Auto-refresh hook
 * 
 * Automatically refreshes data at specified intervals.
 */
export function useAutoRefresh(
  callback: () => void | Promise<void>,
  intervalMinutes: number = 5,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      callback()
    }, intervalMinutes * 60 * 1000)

    return () => clearInterval(interval)
  }, [callback, intervalMinutes, enabled])
}

