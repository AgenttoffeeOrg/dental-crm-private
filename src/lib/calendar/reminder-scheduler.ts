/**
 * Appointment Reminder Scheduler
 * Handles automated reminder sending (email/SMS/WhatsApp)
 */

import { createClient } from '@/lib/supabase-client'
import { addHours, subHours, isBefore } from 'date-fns'

export interface ReminderConfig {
  email_48h?: boolean
  email_24h?: boolean
  email_2h?: boolean
  sms_24h?: boolean
  sms_2h?: boolean
  whatsapp_24h?: boolean
  whatsapp_2h?: boolean
}

export class ReminderScheduler {
  private supabase = createClient()

  /**
   * Schedule reminders for an appointment
   */
  async scheduleReminders(
    appointmentId: string,
    tenantId: string,
    startTime: Date,
    config?: ReminderConfig
  ): Promise<void> {
    try {
      const defaultConfig: ReminderConfig = {
        email_48h: true,
        email_24h: true,
        email_2h: false,
        sms_24h: true,
        sms_2h: true,
        whatsapp_24h: false,
        whatsapp_2h: false,
        ...config
      }

      const reminders: any[] = []

      // Email reminders
      if (defaultConfig.email_48h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'email',
          scheduled_for: subHours(startTime, 48).toISOString(),
          subject: 'Appointment Reminder - 48 Hours',
          status: 'pending'
        })
      }

      if (defaultConfig.email_24h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'email',
          scheduled_for: subHours(startTime, 24).toISOString(),
          subject: 'Appointment Reminder - Tomorrow',
          status: 'pending'
        })
      }

      if (defaultConfig.email_2h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'email',
          scheduled_for: subHours(startTime, 2).toISOString(),
          subject: 'Appointment Starting Soon',
          status: 'pending'
        })
      }

      // SMS reminders
      if (defaultConfig.sms_24h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'sms',
          scheduled_for: subHours(startTime, 24).toISOString(),
          status: 'pending'
        })
      }

      if (defaultConfig.sms_2h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'sms',
          scheduled_for: subHours(startTime, 2).toISOString(),
          status: 'pending'
        })
      }

      // WhatsApp reminders
      if (defaultConfig.whatsapp_24h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'whatsapp',
          scheduled_for: subHours(startTime, 24).toISOString(),
          status: 'pending'
        })
      }

      if (defaultConfig.whatsapp_2h) {
        reminders.push({
          tenant_id: tenantId,
          appointment_id: appointmentId,
          reminder_type: 'whatsapp',
          scheduled_for: subHours(startTime, 2).toISOString(),
          status: 'pending'
        })
      }

      // Filter out reminders that are in the past
      const validReminders = reminders.filter(r => !isBefore(new Date(r.scheduled_for), new Date()))

      if (validReminders.length > 0) {
        const { error } = await this.supabase
          .from('appointment_reminders')
          .insert(validReminders)

        if (error) throw error

        console.log(`[Reminder Scheduler] Scheduled ${validReminders.length} reminders for appointment ${appointmentId}`)
      }
    } catch (error) {
      console.error('[Reminder Scheduler] Error:', error)
      throw error
    }
  }

  /**
   * Process pending reminders (called by cron job)
   */
  async processPendingReminders(): Promise<void> {
    try {
      const now = new Date()

      // Get reminders due now
      const { data: dueReminders, error } = await this.supabase
        .from('appointment_reminders')
        .select(`
          *,
          appointment:appointments(
            *,
            contact:contacts(id, full_name, primary_email, primary_phone),
            provider:providers(id, name)
          )
        `)
        .eq('status', 'pending')
        .lte('scheduled_for', now.toISOString())
        .limit(100) // Process in batches

      if (error) throw error

      if (!dueReminders || dueReminders.length === 0) {
        console.log('[Reminder Scheduler] No due reminders')
        return
      }

      console.log(`[Reminder Scheduler] Processing ${dueReminders.length} reminders`)

      for (const reminder of dueReminders) {
        try {
          await this.sendReminder(reminder)
        } catch (err) {
          console.error(`[Reminder Scheduler] Failed to send reminder ${reminder.id}:`, err)
        }
      }
    } catch (error) {
      console.error('[Reminder Scheduler] Process error:', error)
      throw error
    }
  }

  private async sendReminder(reminder: any): Promise<void> {
    try {
      const { appointment, reminder_type } = reminder

      if (!appointment || !appointment.contact) {
        throw new Error('Missing appointment or contact data')
      }

      switch (reminder_type) {
        case 'email':
          await this.sendEmailReminder(reminder)
          break
        case 'sms':
          await this.sendSMSReminder(reminder)
          break
        case 'whatsapp':
          await this.sendWhatsAppReminder(reminder)
          break
        default:
          throw new Error(`Unknown reminder type: ${reminder_type}`)
      }

      // Mark as sent
      await this.supabase
        .from('appointment_reminders')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString()
        })
        .eq('id', reminder.id)

      console.log(`[Reminder Scheduler] Sent ${reminder_type} reminder for appointment ${appointment.id}`)
    } catch (error) {
      // Mark as failed
      await this.supabase
        .from('appointment_reminders')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('id', reminder.id)

      throw error
    }
  }

  private async sendEmailReminder(reminder: any): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[Reminder Scheduler] Would send email to ${reminder.appointment.contact.primary_email}`)
  }

  private async sendSMSReminder(reminder: any): Promise<void> {
    // TODO: Integrate with SMS service (Twilio, etc.)
    console.log(`[Reminder Scheduler] Would send SMS to ${reminder.appointment.contact.primary_phone}`)
  }

  private async sendWhatsAppReminder(reminder: any): Promise<void> {
    // TODO: Integrate with WhatsApp Business API
    console.log(`[Reminder Scheduler] Would send WhatsApp to ${reminder.appointment.contact.primary_phone}`)
  }

  /**
   * Cancel all reminders for an appointment
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('appointment_reminders')
        .update({ status: 'cancelled' })
        .eq('appointment_id', appointmentId)
        .eq('status', 'pending')

      if (error) throw error

      console.log(`[Reminder Scheduler] Cancelled reminders for appointment ${appointmentId}`)
    } catch (error) {
      console.error('[Reminder Scheduler] Cancel error:', error)
      throw error
    }
  }
}

export const reminderScheduler = new ReminderScheduler()

