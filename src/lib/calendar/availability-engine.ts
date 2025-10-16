/**
 * Calendar Availability Engine
 * Calculates available time slots for appointments
 */

import { createClient } from '@/lib/supabase-client'
import { addMinutes, format, isWithinInterval, parse, setHours, setMinutes } from 'date-fns'

export interface AvailabilitySlot {
  start: Date
  end: Date
  provider_id?: string
  operatory_id?: string
  available: boolean
  reason?: string
}

export interface AvailabilityOptions {
  tenantId: string
  providerId?: string
  operatoryId?: string
  appointmentTypeId?: string
  startDate: Date
  endDate: Date
  slotDuration: number // minutes
}

export class AvailabilityEngine {
  private supabase = createClient()

  /**
   * Get available slots for booking
   */
  async getAvailableSlots(options: AvailabilityOptions): Promise<AvailabilitySlot[]> {
    const {
      tenantId,
      providerId,
      operatoryId,
      appointmentTypeId,
      startDate,
      endDate,
      slotDuration
    } = options

    try {
      // Get availability rules
      const rules = await this.getAvailabilityRules(tenantId, providerId)
      
      // Get existing appointments
      const appointments = await this.getExistingAppointments(
        tenantId,
        startDate,
        endDate,
        providerId,
        operatoryId
      )

      // Get time off blocks
      const timeOffBlocks = await this.getTimeOffBlocks(tenantId, startDate, endDate, providerId)

      // Generate slots
      const slots: AvailabilitySlot[] = []
      let currentDate = new Date(startDate)

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay()
        const dayRules = rules.filter(r => r.day_of_week === dayOfWeek && r.is_available)

        for (const rule of dayRules) {
          // Parse start and end times
          const [startHour, startMinute] = rule.start_time.split(':').map(Number)
          const [endHour, endMinute] = rule.end_time.split(':').map(Number)

          let slotStart = setMinutes(setHours(new Date(currentDate), startHour), startMinute)
          const dayEnd = setMinutes(setHours(new Date(currentDate), endHour), endMinute)

          while (slotStart < dayEnd) {
            const slotEnd = addMinutes(slotStart, slotDuration)

            if (slotEnd > dayEnd) break

            // Check if slot is during break
            if (rule.break_start && rule.break_end) {
              const [breakStartHour, breakStartMinute] = rule.break_start.split(':').map(Number)
              const [breakEndHour, breakEndMinute] = rule.break_end.split(':').map(Number)
              const breakStart = setMinutes(setHours(new Date(currentDate), breakStartHour), breakStartMinute)
              const breakEnd = setMinutes(setHours(new Date(currentDate), breakEndHour), breakEndMinute)

              if (
                isWithinInterval(slotStart, { start: breakStart, end: breakEnd }) ||
                isWithinInterval(slotEnd, { start: breakStart, end: breakEnd })
              ) {
                slotStart = addMinutes(slotStart, slotDuration)
                continue
              }
            }

            // Check conflicts
            const hasConflict = appointments.some(apt =>
              (slotStart >= new Date(apt.start_at) && slotStart < new Date(apt.end_at)) ||
              (slotEnd > new Date(apt.start_at) && slotEnd <= new Date(apt.end_at)) ||
              (slotStart <= new Date(apt.start_at) && slotEnd >= new Date(apt.end_at))
            )

            // Check time off
            const isTimeOff = timeOffBlocks.some(block =>
              isWithinInterval(slotStart, { start: new Date(block.start_at), end: new Date(block.end_at) }) ||
              isWithinInterval(slotEnd, { start: new Date(block.start_at), end: new Date(block.end_at) })
            )

            slots.push({
              start: slotStart,
              end: slotEnd,
              provider_id: providerId,
              operatory_id: operatoryId,
              available: !hasConflict && !isTimeOff,
              reason: hasConflict ? 'Conflict' : isTimeOff ? 'Time Off' : undefined
            })

            slotStart = addMinutes(slotStart, slotDuration)
          }
        }

        // Move to next day
        currentDate = addMinutes(setHours(currentDate, 0), 24 * 60)
      }

      return slots
    } catch (error) {
      console.error('[Availability Engine] Error:', error)
      throw error
    }
  }

  /**
   * Check if a specific time slot is available
   */
  async isSlotAvailable(
    tenantId: string,
    startTime: Date,
    duration: number,
    providerId?: string,
    operatoryId?: string
  ): Promise<{ available: boolean; conflicts: string[] }> {
    const endTime = addMinutes(startTime, duration)
    const conflicts: string[] = []

    try {
      // Check provider availability
      if (providerId) {
        const { data: providerConflicts } = await this.supabase
          .from('appointments')
          .select('id, title, start_at, end_at')
          .eq('tenant_id', tenantId)
          .eq('provider_id', providerId)
          .neq('status', 'cancelled')
          .or(`and(start_at.lte.${endTime.toISOString()},end_at.gte.${startTime.toISOString()})`)

        if (providerConflicts && providerConflicts.length > 0) {
          conflicts.push(`Provider has ${providerConflicts.length} conflicting appointment(s)`)
        }
      }

      // Check operatory availability
      if (operatoryId) {
        const { data: operatoryConflicts } = await this.supabase
          .from('appointments')
          .select('id, title, start_at, end_at')
          .eq('tenant_id', tenantId)
          .eq('operatory_id', operatoryId)
          .neq('status', 'cancelled')
          .or(`and(start_at.lte.${endTime.toISOString()},end_at.gte.${startTime.toISOString()})`)

        if (operatoryConflicts && operatoryConflicts.length > 0) {
          conflicts.push(`Operatory has ${operatoryConflicts.length} conflicting appointment(s)`)
        }
      }

      return {
        available: conflicts.length === 0,
        conflicts
      }
    } catch (error) {
      console.error('[Availability Engine] Conflict check error:', error)
      return { available: true, conflicts: [] } // Fail open
    }
  }

  private async getAvailabilityRules(tenantId: string, providerId?: string) {
    const query = this.supabase
      .from('availability_rules')
      .select('*')
      .eq('tenant_id', tenantId)

    if (providerId) {
      query.eq('provider_id', providerId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  private async getExistingAppointments(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    providerId?: string,
    operatoryId?: string
  ) {
    let query = this.supabase
      .from('appointments')
      .select('id, start_at, end_at, provider_id, operatory_id')
      .eq('tenant_id', tenantId)
      .neq('status', 'cancelled')
      .gte('start_at', startDate.toISOString())
      .lte('start_at', endDate.toISOString())

    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    if (operatoryId) {
      query = query.eq('operatory_id', operatoryId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  private async getTimeOffBlocks(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    providerId?: string
  ) {
    let query = this.supabase
      .from('provider_time_off')
      .select('*')
      .eq('tenant_id', tenantId)
      .lte('start_at', endDate.toISOString())
      .gte('end_at', startDate.toISOString())

    if (providerId) {
      query = query.eq('provider_id', providerId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }
}

export const availabilityEngine = new AvailabilityEngine()

