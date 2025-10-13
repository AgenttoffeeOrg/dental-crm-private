// SMS Service using Twilio

import twilio from 'twilio'

export interface SMSOptions {
  to: string
  message: string
  from?: string
}

export class SMSService {
  private client: any = null
  private fromNumber: string = ''

  async initialize(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken)
    this.fromNumber = fromNumber
  }

  async send(options: SMSOptions) {
    if (!this.client) {
      throw new Error('SMS service not initialized. Configure in Settings → SMS')
    }

    try {
      const result = await this.client.messages.create({
        body: options.message,
        from: options.from || this.fromNumber,
        to: options.to
      })

      console.log('✅ SMS sent:', result.sid)
      return { success: true, messageId: result.sid }
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

