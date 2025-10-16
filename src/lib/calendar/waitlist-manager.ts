/**
 * Waitlist Manager
 * Manages patient waitlist for cancelled/available slots
 */

import { createClient } from '@/lib/supabase-client'

export interface WaitlistEntry {
  id: string
  tenant_id: string
  contact_id: string
  appointment_type_id?: string
  provider_id?: string
  preferred_dates: string[] // ISO date strings
  preferred_times: string[] // '09:00', '14:00', etc.
  notes?: string
  priority: 'low' | 'normal' | 'high' | 'urgent'
  status: 'active' | 'contacted' | 'scheduled' | 'expired'
  created_at: string
  notified_at?: string
}

export class WaitlistManager {
  private supabase = createClient()

  /**
   * Add patient to waitlist
   */
  async addToWaitlist(
    tenantId: string,
    contactId: string,
    preferences: {
      appointmentTypeId?: string
      providerId?: string
      preferredDates?: string[]
      preferredTimes?: string[]
      notes?: string
      priority?: 'low' | 'normal' | 'high' | 'urgent'
    }
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('waitlist')
        .insert([{
          tenant_id: tenantId,
          contact_id: contactId,
          appointment_type_id: preferences.appointmentTypeId || null,
          provider_id: preferences.providerId || null,
          preferred_dates: preferences.preferredDates || [],
          preferred_times: preferences.preferredTimes || [],
          notes: preferences.notes || null,
          priority: preferences.priority || 'normal',
          status: 'active'
        }])
        .select('id')
        .single()

      if (error) throw error

      console.log(`[Waitlist] Added contact ${contactId} to waitlist`)
      return data.id
    } catch (error) {
      console.error('[Waitlist] Add error:', error)
      throw error
    }
  }

  /**
   * Find matching waitlist entries for a cancelled slot
   */
  async findMatchingEntries(
    tenantId: string,
    appointmentDate: Date,
    providerId?: string,
    appointmentTypeId?: string
  ): Promise<WaitlistEntry[]> {
    try {
      const dateStr = appointmentDate.toISOString().split('T')[0]

      let query = this.supabase
        .from('waitlist')
        .select(`
          *,
          contact:contacts(id, full_name, primary_email, primary_phone)
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      // Filter by provider if specified
      if (providerId) {
        query = query.or(`provider_id.eq.${providerId},provider_id.is.null`)
      }

      // Filter by appointment type if specified
      if (appointmentTypeId) {
        query = query.or(`appointment_type_id.eq.${appointmentTypeId},appointment_type_id.is.null`)
      }

      const { data, error } = await query

      if (error) throw error

      // Filter by preferred dates
      const matches = (data || []).filter((entry: any) => {
        if (entry.preferred_dates && entry.preferred_dates.length > 0) {
          return entry.preferred_dates.includes(dateStr)
        }
        return true // No date preference = matches all
      })

      return matches
    } catch (error) {
      console.error('[Waitlist] Find matches error:', error)
      throw error
    }
  }

  /**
   * Notify waitlist entries about available slot
   */
  async notifyWaitlistEntries(
    entries: WaitlistEntry[],
    appointmentDetails: {
      date: Date
      time: string
      providerId?: string
      appointmentTypeId?: string
    }
  ): Promise<void> {
    try {
      for (const entry of entries.slice(0, 5)) { // Notify top 5
        // TODO: Send email/SMS notification
        console.log(`[Waitlist] Would notify contact ${entry.contact_id} about available slot`)

        // Mark as contacted
        await this.supabase
          .from('waitlist')
          .update({
            status: 'contacted',
            notified_at: new Date().toISOString()
          })
          .eq('id', entry.id)
      }
    } catch (error) {
      console.error('[Waitlist] Notify error:', error)
      throw error
    }
  }

  /**
   * Remove from waitlist (scheduled or expired)
   */
  async removeFromWaitlist(
    waitlistId: string,
    status: 'scheduled' | 'expired'
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('waitlist')
        .update({ status })
        .eq('id', waitlistId)

      if (error) throw error

      console.log(`[Waitlist] Entry ${waitlistId} marked as ${status}`)
    } catch (error) {
      console.error('[Waitlist] Remove error:', error)
      throw error
    }
  }

  /**
   * Get waitlist for a tenant
   */
  async getWaitlist(
    tenantId: string,
    filters?: {
      status?: string
      providerId?: string
      appointmentTypeId?: string
    }
  ): Promise<WaitlistEntry[]> {
    try {
      let query = this.supabase
        .from('waitlist')
        .select(`
          *,
          contact:contacts(id, full_name, primary_email, primary_phone),
          provider:providers(id, name),
          appointment_type:appointment_types(id, name)
        `)
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true })

      if (filters?.status) {
        query = query.eq('status', filters.status)
      }

      if (filters?.providerId) {
        query = query.eq('provider_id', filters.providerId)
      }

      if (filters?.appointmentTypeId) {
        query = query.eq('appointment_type_id', filters.appointmentTypeId)
      }

      const { data, error } = await query

      if (error) throw error

      return data || []
    } catch (error) {
      console.error('[Waitlist] Get error:', error)
      throw error
    }
  }
}

export const waitlistManager = new WaitlistManager()

