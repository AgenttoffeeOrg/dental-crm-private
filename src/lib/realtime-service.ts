/**
 * Real-time Data Subscription Service
 * 
 * Provides WebSocket-based real-time updates for dashboard data.
 * Uses Supabase Realtime for live database change notifications.
 */

import { createClient } from './supabase-client'
import { RealtimeChannel } from '@supabase/supabase-js'

type ChangeCallback = (payload: any) => void

/**
 * Debounce function to prevent update storms
 */
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Subscribe to deal changes
 */
export function subscribeToDeals(
  tenantId: string,
  callback: ChangeCallback
): RealtimeChannel {
  const supabase = createClient()
  const debouncedCallback = debounce(callback, 1000)

  const channel = supabase
    .channel(`deals:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'deals',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        console.log('[Realtime] Deal change:', payload.eventType)
        debouncedCallback(payload)
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Deals subscription status:', status)
    })

  return channel
}

/**
 * Subscribe to contact changes
 */
export function subscribeToContacts(
  tenantId: string,
  callback: ChangeCallback
): RealtimeChannel {
  const supabase = createClient()
  const debouncedCallback = debounce(callback, 1000)

  const channel = supabase
    .channel(`contacts:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'contacts',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        console.log('[Realtime] Contact change:', payload.eventType)
        debouncedCallback(payload)
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Contacts subscription status:', status)
    })

  return channel
}

/**
 * Subscribe to task changes
 */
export function subscribeToTasks(
  tenantId: string,
  callback: ChangeCallback
): RealtimeChannel {
  const supabase = createClient()
  const debouncedCallback = debounce(callback, 1000)

  const channel = supabase
    .channel(`tasks:${tenantId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tasks',
        filter: `tenant_id=eq.${tenantId}`
      },
      (payload) => {
        console.log('[Realtime] Task change:', payload.eventType)
        debouncedCallback(payload)
      }
    )
    .subscribe((status) => {
      console.log('[Realtime] Tasks subscription status:', status)
    })

  return channel
}

/**
 * Subscribe to all dashboard changes
 */
export function subscribeToAllChanges(
  tenantId: string,
  callbacks: {
    onDealChange?: ChangeCallback
    onContactChange?: ChangeCallback
    onTaskChange?: ChangeCallback
  }
): () => void {
  const channels: RealtimeChannel[] = []

  if (callbacks.onDealChange) {
    channels.push(subscribeToDeals(tenantId, callbacks.onDealChange))
  }

  if (callbacks.onContactChange) {
    channels.push(subscribeToContacts(tenantId, callbacks.onContactChange))
  }

  if (callbacks.onTaskChange) {
    channels.push(subscribeToTasks(tenantId, callbacks.onTaskChange))
  }

  // Return cleanup function
  return () => {
    channels.forEach(channel => {
      channel.unsubscribe()
    })
  }
}

/**
 * Hook for dashboard real-time updates
 */
import { useEffect } from 'react'

export function useDashboardRealtime(
  tenantId: string | undefined,
  onDataChange: () => void,
  enabled: boolean = true
) {
  useEffect(() => {
    if (!tenantId || !enabled) return

    console.log('[Realtime] Setting up dashboard subscriptions')

    const cleanup = subscribeToAllChanges(tenantId, {
      onDealChange: () => {
        console.log('[Realtime] Deals updated, refreshing dashboard')
        onDataChange()
      },
      onContactChange: () => {
        console.log('[Realtime] Contacts updated, refreshing dashboard')
        onDataChange()
      },
      onTaskChange: () => {
        console.log('[Realtime] Tasks updated, refreshing dashboard')
        onDataChange()
      }
    })

    return cleanup
  }, [tenantId, enabled, onDataChange])
}
