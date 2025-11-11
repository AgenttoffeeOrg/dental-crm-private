// SMS Service using Twilio

import twilio, { Twilio } from 'twilio'

export interface SMSOptions {
  to: string
  message: string
  from?: string
  messagingServiceSid?: string
}

interface SMSInitConfig {
  accountSid: string
  authToken: string
  fromNumber?: string | null
  messagingServiceSid?: string | null
}

export class SMSService {
  private client: Twilio | null = null
  private fromNumber: string | null = null
  private messagingServiceSid: string | null = null
  private accountSid: string | null = null
  private authToken: string | null = null

  async initialize(config: SMSInitConfig) {
    const { accountSid, authToken, fromNumber, messagingServiceSid } = config

    if (
      this.client &&
      this.accountSid === accountSid &&
      this.fromNumber === (fromNumber || null) &&
      this.messagingServiceSid === (messagingServiceSid || null)
    ) {
      return
    }

    this.client = twilio(accountSid, authToken)
    this.fromNumber = fromNumber || null
    this.messagingServiceSid = messagingServiceSid || null
    this.accountSid = accountSid
    this.authToken = authToken
  }

  async send(options: SMSOptions) {
    if (!this.client) {
      throw new Error('SMS service not initialized. Configure in Settings → SMS')
    }

    try {
      const messageConfig: any = {
        body: options.message,
        to: options.to,
      }

      const messagingServiceSid = options.messagingServiceSid || this.messagingServiceSid

      if (messagingServiceSid) {
        messageConfig.messagingServiceSid = messagingServiceSid
      } else {
        messageConfig.from = options.from || this.fromNumber
      }

      const result = await this.client.messages.create(messageConfig)

      console.log('✅ SMS sent:', result.sid)
      return { 
        success: true, 
        messageId: result.sid,
        status: result.status,
        providerResponse: {
          sid: result.sid,
          status: result.status,
          to: result.to,
          from: result.from,
          numSegments: result.numSegments,
        }
      }
    } catch (error: any) {
      console.error('SMS send error:', error)
      throw new Error(`Failed to send SMS: ${error.message}`)
    }
  }

  async sendBulk(recipients: string[], message: string) {
    const results = await Promise.allSettled(
      recipients.map(to => this.send({ to, message }))
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return { successful, failed, total: recipients.length }
  }
}

export const smsService = new SMSService()


