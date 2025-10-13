// WhatsApp Service using Twilio WhatsApp Business API

import twilio from 'twilio'

export interface WhatsAppOptions {
  to: string
  message: string
  mediaUrl?: string
}

export class WhatsAppService {
  private client: any = null
  private fromNumber: string = ''

  async initialize(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken)
    this.fromNumber = fromNumber.startsWith('whatsapp:') ? fromNumber : `whatsapp:${fromNumber}`
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
      return { success: true, messageId: result.sid }
    } catch (error: any) {
      console.error('WhatsApp send error:', error)
      throw new Error(`Failed to send WhatsApp: ${error.message}`)
    }
  }
}

export const whatsappService = new WhatsAppService()

