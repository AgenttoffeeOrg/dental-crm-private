/**
 * Email Queue Service
 * Handles email sending with retry mechanism and status tracking
 * 
 * Features:
 * - Retry on failure (exponential backoff)
 * - Status tracking in database
 * - Rate limiting
 * - Priority queuing
 */

import { emailService, EmailOptions } from './email-service'
import { createClient } from './supabase-client'
import logger from './logger'

export interface QueuedEmail extends EmailOptions {
  id?: string
  email_type: 'verification' | 'password_reset' | 'invitation' | 'notification' | 'campaign'
  user_id?: string
  tenant_id?: string
  priority?: 'high' | 'normal' | 'low'
  metadata?: Record<string, any>
}

export class EmailQueue {
  private static instance: EmailQueue
  private processingInterval: NodeJS.Timeout | null = null
  private isProcessing = false

  static getInstance() {
    if (!EmailQueue.instance) {
      EmailQueue.instance = new EmailQueue()
    }
    return EmailQueue.instance
  }

  /**
   * Add email to queue
   */
  async enqueue(email: QueuedEmail): Promise<string> {
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('email_logs')
        .insert([{
          user_id: email.user_id,
          tenant_id: email.tenant_id,
          email_type: email.email_type,
          to_email: Array.isArray(email.to) ? email.to[0] : email.to,
          from_email: email.from || process.env.EMAIL_FROM || 'noreply@dentalcrm.com',
          subject: email.subject,
          status: 'queued',
          queued_at: new Date().toISOString(),
          metadata: {
            html: email.html,
            replyTo: email.replyTo,
            cc: email.cc,
            bcc: email.bcc,
            priority: email.priority || 'normal',
            ...email.metadata,
          },
        }])
        .select('id')
        .single()

      if (error) {
        logger.error({ error }, 'Failed to enqueue email')
        throw error
      }

      logger.info({ emailId: data.id, type: email.email_type, to: email.to }, 'Email queued successfully')
      
      // Trigger immediate processing for high priority
      if (email.priority === 'high') {
        this.processQueue().catch(err => logger.error({ err }, 'Error processing queue'))
      }

      return data.id

    } catch (error) {
      logger.error({ error }, 'Error enqueueing email')
      throw error
    }
  }

  /**
   * Process queued emails
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return // Already processing
    }

    this.isProcessing = true
    const supabase = createClient()

    try {
      // Get pending/failed emails (up to 10 at a time)
      const { data: emails, error } = await supabase
        .from('email_logs')
        .select('*')
        .in('status', ['queued', 'failed'])
        .lt('retry_count', 3)
        .order('created_at', { ascending: true })
        .limit(10)

      if (error || !emails || emails.length === 0) {
        return
      }

      logger.info({ count: emails.length }, 'Processing email queue')

      // Process each email
      for (const email of emails) {
        await this.sendEmail(email)
      }

    } catch (error) {
      logger.error({ error }, 'Error processing email queue')
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * Send a single email with retry
   */
  private async sendEmail(emailLog: any): Promise<void> {
    const supabase = createClient()

    try {
      // Update status to sending
      await supabase
        .from('email_logs')
        .update({ status: 'sending' })
        .eq('id', emailLog.id)

      // Attempt to send
      const result = await emailService.send({
        to: emailLog.to_email,
        from: emailLog.from_email,
        subject: emailLog.subject,
        html: emailLog.metadata.html,
        replyTo: emailLog.metadata.replyTo,
        cc: emailLog.metadata.cc,
        bcc: emailLog.metadata.bcc,
      })

      // Update status to sent
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          provider_message_id: result.messageId,
        })
        .eq('id', emailLog.id)

      logger.info({ emailId: emailLog.id, messageId: result.messageId }, 'Email sent successfully')

    } catch (error: any) {
      const retryCount = (emailLog.retry_count || 0) + 1
      const maxRetries = emailLog.max_retries || 3
      const shouldRetry = retryCount < maxRetries

      logger.error({ 
        emailId: emailLog.id, 
        error, 
        retryCount, 
        willRetry: shouldRetry 
      }, 'Email send failed')

      // Update status
      await supabase
        .from('email_logs')
        .update({
          status: 'failed', // Removed redundant conditional
          failed_at: new Date().toISOString(),
          error_message: error.message,
          error_code: error.code,
          retry_count: retryCount,
        })
        .eq('id', emailLog.id)

      // Schedule retry with exponential backoff
      if (shouldRetry) {
        const backoffMs = Math.pow(2, retryCount) * 1000 // 2s, 4s, 8s
        logger.info({ emailId: emailLog.id, backoffMs }, 'Scheduling retry')
        
        setTimeout(() => {
          this.processQueue().catch(err => 
            logger.error({ err }, 'Error in retry processing')
          )
        }, backoffMs)
      }
    }
  }

  /**
   * Start queue processor (runs every minute)
   */
  startProcessor(): void {
    if (this.processingInterval) {
      return // Already started
    }

    logger.info('Starting email queue processor')

    // Process immediately
    this.processQueue().catch(err => logger.error({ err }, 'Error in initial queue processing'))

    // Then process every minute
    this.processingInterval = setInterval(() => {
      this.processQueue().catch(err => 
        logger.error({ err }, 'Error in scheduled queue processing')
      )
    }, 60 * 1000) // Every 60 seconds
  }

  /**
   * Stop queue processor
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
      logger.info('Email queue processor stopped')
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number
    queued: number
    sent: number
    failed: number
    total: number
  }> {
    const supabase = createClient()

    const { data } = await supabase
      .from('email_logs')
      .select('status')

    const stats = {
      pending: 0,
      queued: 0,
      sent: 0,
      failed: 0,
      total: data?.length || 0,
    }

    data?.forEach(email => {
      if (email.status === 'pending') stats.pending++
      if (email.status === 'queued') stats.queued++
      if (email.status === 'sent') stats.sent++
      if (email.status === 'failed') stats.failed++
    })

    return stats
  }
}

export const emailQueue = EmailQueue.getInstance()

// Start processor in server environment
if (typeof window === 'undefined' && process.env.NODE_ENV !== 'test') {
  emailQueue.startProcessor()
}

