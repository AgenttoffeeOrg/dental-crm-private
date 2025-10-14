// Real-time updates using Supabase Realtime

import { createClient } from './supabase-client'
import { RealtimeChannel } from '@supabase/supabase-js'

export class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map()

  subscribeToDeals(tenantId: string, callback: (payload: any) => void) {
    const supabase = createClient()
    const channelName = `deals:${tenantId}`

    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deals',
          filter: `tenant_id=eq.${tenantId}`
        },
        callback
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribe(channelName)
  }

  subscribeToContacts(tenantId: string, callback: (payload: any) => void) {
    const supabase = createClient()
    const channelName = `contacts:${tenantId}`

    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contacts',
          filter: `tenant_id=eq.${tenantId}`
        },
        callback
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribe(channelName)
  }

  subscribeToTasks(tenantId: string, callback: (payload: any) => void) {
    const supabase = createClient()
    const channelName = `tasks:${tenantId}`

    if (this.channels.has(channelName)) {
      return () => this.unsubscribe(channelName)
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `tenant_id=eq.${tenantId}`
        },
        callback
      )
      .subscribe()

    this.channels.set(channelName, channel)

    return () => this.unsubscribe(channelName)
  }

  private unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName)
    if (channel) {
      channel.unsubscribe()
      this.channels.delete(channelName)
    }
  }

  unsubscribeAll() {
    this.channels.forEach(channel => channel.unsubscribe())
    this.channels.clear()
  }
}

export const realtimeService = new RealtimeService()


