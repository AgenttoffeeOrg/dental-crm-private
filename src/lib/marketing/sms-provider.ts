/**
 * SMS Provider Interface
 * Abstraction for SMS sending services (Twilio, etc.)
 */

export interface SmsMessage {
  to: string // Phone number
  from: string // From number
  body: string // Message content (160 chars recommended)
  mediaUrls?: string[] // For MMS
  metadata?: Record<string, any>
}

export interface SmsSendResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
  segments?: number // How many SMS segments (160 chars each)
  estimatedCost?: number
}

export interface SmsWebhookEvent {
  eventType: 'sent' | 'delivered' | 'failed' | 'undelivered'
  messageId: string
  to: string
  status: string
  errorCode?: string
  errorMessage?: string
  timestamp: string
}

/**
 * Base SMS Provider Interface
 */
export interface ISmsProvider {
  name: string
  
  /**
   * Send a single SMS
   */
  sendSms(message: SmsMessage): Promise<SmsSendResult>
  
  /**
   * Send bulk SMS (batch)
   */
  sendBulk(messages: SmsMessage[]): Promise<SmsSendResult[]>
  
  /**
   * Verify provider configuration
   */
  verifyConfiguration(): Promise<boolean>
  
  /**
   * Parse webhook events
   */
  parseWebhook(payload: any): SmsWebhookEvent[]
  
  /**
   * Calculate message segments (for billing)
   */
  calculateSegments(text: string): number
}

/**
 * No-Op SMS Provider (for testing/development)
 */
export class NoOpSmsProvider implements ISmsProvider {
  name = 'noop'
  
  async sendSms(message: SmsMessage): Promise<SmsSendResult> {
    console.log('[SMS] NoOp Provider - Would send SMS:', {
      to: message.to,
      from: message.from,
      body: message.body.substring(0, 50) + '...'
    })
    
    return {
      success: true,
      messageId: `noop_sms_${Date.now()}`,
      provider: 'noop',
      segments: this.calculateSegments(message.body)
    }
  }
  
  async sendBulk(messages: SmsMessage[]): Promise<SmsSendResult[]> {
    console.log(`[SMS] NoOp Provider - Would send ${messages.length} SMS`)
    
    return messages.map((msg, i) => ({
      success: true,
      messageId: `noop_sms_bulk_${Date.now()}_${i}`,
      provider: 'noop',
      segments: this.calculateSegments(msg.body)
    }))
  }
  
  async verifyConfiguration(): Promise<boolean> {
    return true
  }
  
  parseWebhook(payload: any): SmsWebhookEvent[] {
    console.log('[SMS] NoOp Provider - Webhook received:', payload)
    return []
  }
  
  calculateSegments(text: string): number {
    // Standard SMS = 160 chars per segment
    // Unicode/emoji = 70 chars per segment
    const hasUnicode = /[^\u0020-\u007E]/.test(text)
    const charsPerSegment = hasUnicode ? 70 : 160
    return Math.ceil(text.length / charsPerSegment)
  }
}

/**
 * Twilio SMS Provider (stub - implement when credentials available)
 */
export class TwilioSmsProvider implements ISmsProvider {
  name = 'twilio'
  private accountSid: string
  private authToken: string
  private fromNumber: string
  
  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.fromNumber = fromNumber
  }
  
  async sendSms(message: SmsMessage): Promise<SmsSendResult> {
    // TODO: Implement Twilio API call
    console.log('[SMS] Twilio - Ready to send when credentials configured')
    
    const segments = this.calculateSegments(message.body)
    
    return {
      success: true,
      messageId: `twilio_${Date.now()}`,
      provider: 'twilio',
      segments,
      estimatedCost: segments * 0.0075 // ~$0.0075 per segment
    }
  }
  
  async sendBulk(messages: SmsMessage[]): Promise<SmsSendResult[]> {
    // TODO: Implement Twilio bulk sending
    return messages.map(msg => ({
      success: true,
      messageId: `twilio_bulk_${Date.now()}`,
      provider: 'twilio',
      segments: this.calculateSegments(msg.body)
    }))
  }
  
  async verifyConfiguration(): Promise<boolean> {
    // TODO: Test Twilio credentials
    return !!this.accountSid && !!this.authToken
  }
  
  parseWebhook(payload: any): SmsWebhookEvent[] {
    // TODO: Parse Twilio webhook format
    return []
  }
  
  calculateSegments(text: string): number {
    const hasUnicode = /[^\u0020-\u007E]/.test(text)
    const charsPerSegment = hasUnicode ? 70 : 160
    return Math.ceil(text.length / charsPerSegment)
  }
}

/**
 * Provider Factory
 */
export function createSmsProvider(
  providerName: string,
  config: any
): ISmsProvider {
  switch (providerName) {
    case 'twilio':
      return new TwilioSmsProvider(
        config.accountSid,
        config.authToken,
        config.fromNumber
      )
    
    case 'noop':
    default:
      return new NoOpSmsProvider()
  }
}




