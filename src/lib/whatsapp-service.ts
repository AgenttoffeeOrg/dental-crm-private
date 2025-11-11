// WhatsApp Service using Twilio WhatsApp Business API

import twilio, { Twilio } from 'twilio'

export interface WhatsAppOptions {
  to: string
  message: string
  mediaUrl?: string
}

export class WhatsAppService {
  private client: Twilio | null = null
  private fromNumber: string = ''
  private accountSid: string | null = null

  async initialize(accountSid: string, authToken: string, fromNumber: string) {
    if (
      this.client &&
      this.accountSid === accountSid &&
      this.fromNumber === (fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`)
    ) {
      return
    }

    this.client = twilio(accountSid, authToken)
    this.fromNumber = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`
    this.accountSid = accountSid
  }

  async send(options: WhatsAppOptions) {
    if (!this.client) {
      throw new Error('WhatsApp service not initialized. Configure in Settings → WhatsApp')
    }

    try {
      const to = options.to.startsWith('whatsapp:') ? options.to : `whatsapp:${options.to}`
      
      const messageData: any = {
        body: options.message,
        from: this.fromNumber,
        to
      }

      if (options.mediaUrl) {
        messageData.mediaUrl = [options.mediaUrl]
      }

      const result = await this.client.messages.create(messageData)

      console.log('✅ WhatsApp sent:', result.sid)
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
      console.error('WhatsApp send error:', error)
      throw new Error(`Failed to send WhatsApp: ${error.message}`)
    }
  }
}

export const whatsappService = new WhatsAppService()


