/**
 * Mail Provider Interface
 * Abstraction for email sending services (SendGrid, Mailgun, AWS SES, etc.)
 */

export interface EmailMessage {
  to: string
  from: string
  fromName?: string
  replyTo?: string
  subject: string
  html: string
  text?: string
  headers?: Record<string, string>
  trackOpens?: boolean
  trackClicks?: boolean
  tags?: string[]
  metadata?: Record<string, any>
}

export interface EmailSendResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export interface EmailBounce {
  email: string
  bounceType: 'hard' | 'soft' | 'complaint'
  reason: string
  timestamp: string
}

export interface EmailWebhookEvent {
  eventType: 'delivered' | 'open' | 'click' | 'bounce' | 'unsubscribe' | 'spam_report'
  messageId: string
  email: string
  timestamp: string
  metadata?: any
}

/**
 * Base Mail Provider Interface
 */
export interface IMailProvider {
  name: string
  
  /**
   * Send a single email
   */
  sendEmail(message: EmailMessage): Promise<EmailSendResult>
  
  /**
   * Send bulk emails (batch)
   */
  sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]>
  
  /**
   * Verify provider configuration
   */
  verifyConfiguration(): Promise<boolean>
  
  /**
   * Parse webhook events
   */
  parseWebhook(payload: any): EmailWebhookEvent[]
  
  /**
   * Get sending statistics
   */
  getStats?(startDate: Date, endDate: Date): Promise<{
    sent: number
    delivered: number
    bounced: number
    opened: number
    clicked: number
  }>
}

/**
 * No-Op Provider (for testing/development)
 */
export class NoOpMailProvider implements IMailProvider {
  name = 'noop'
  
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    console.log('[MAIL] NoOp Provider - Would send email:', {
      to: message.to,
      subject: message.subject,
      from: message.from
    })
    
    return {
      success: true,
      messageId: `noop_${Date.now()}`,
      provider: 'noop'
    }
  }
  
  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    console.log(`[MAIL] NoOp Provider - Would send ${messages.length} emails`)
    
    return messages.map((msg, i) => ({
      success: true,
      messageId: `noop_bulk_${Date.now()}_${i}`,
      provider: 'noop'
    }))
  }
  
  async verifyConfiguration(): Promise<boolean> {
    return true
  }
  
  parseWebhook(payload: any): EmailWebhookEvent[] {
    console.log('[MAIL] NoOp Provider - Webhook received:', payload)
    return []
  }
}

/**
 * SendGrid Provider (stub - implement when API key is available)
 */
export class SendGridMailProvider implements IMailProvider {
  name = 'sendgrid'
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async sendEmail(message: EmailMessage): Promise<EmailSendResult> {
    // TODO: Implement SendGrid API call
    console.log('[MAIL] SendGrid - Ready to send when API key configured')
    
    return {
      success: true,
      messageId: `sg_${Date.now()}`,
      provider: 'sendgrid'
    }
  }
  
  async sendBulk(messages: EmailMessage[]): Promise<EmailSendResult[]> {
    // TODO: Implement SendGrid batch API
    return messages.map(() => ({
      success: true,
      messageId: `sg_batch_${Date.now()}`,
      provider: 'sendgrid'
    }))
  }
  
  async verifyConfiguration(): Promise<boolean> {
    // TODO: Test API key with SendGrid
    return !!this.apiKey
  }
  
  parseWebhook(payload: any): EmailWebhookEvent[] {
    // TODO: Parse SendGrid webhook format
    return []
  }
}

/**
 * Provider Factory
 */
export function createMailProvider(
  providerName: string,
  config: any
): IMailProvider {
  switch (providerName) {
    case 'sendgrid':
      return new SendGridMailProvider(config.apiKey)
    
    case 'mailgun':
      // TODO: Implement Mailgun provider
      console.log('[MAIL] Mailgun provider not yet implemented')
      return new NoOpMailProvider()
    
    case 'ses':
      // TODO: Implement AWS SES provider
      console.log('[MAIL] AWS SES provider not yet implemented')
      return new NoOpMailProvider()
    
    case 'noop':
    default:
      return new NoOpMailProvider()
  }
}

