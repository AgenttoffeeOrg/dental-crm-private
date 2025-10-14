// Email Service - Handles all email sending via Resend

import { Resend } from 'resend'

// Lazy initialize Resend only when needed (not during build)
let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  from?: string
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  attachments?: Array<{
    filename: string
    content: Buffer | string
  }>
}

export class EmailService {
  private static instance: EmailService
  private defaultFrom = process.env.EMAIL_FROM || 'noreply@dentalcrm.com'

  static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService()
    }
    return EmailService.instance
  }

  async send(options: EmailOptions) {
    try {
      const client = getResendClient()
      
      if (!client) {
        console.warn('⚠️ Resend API key not configured, skipping email send')
        return { success: false, error: 'Email service not configured' }
      }

      const { data, error } = await client.emails.send({
        from: options.from || this.defaultFrom,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        reply_to: options.replyTo,
        cc: options.cc,
        bcc: options.bcc,
        attachments: options.attachments
      })

      if (error) {
        console.error('Email send error:', error)
        throw new Error(`Failed to send email: ${error.message}`)
      }

      console.log('✅ Email sent successfully:', data)
      return { success: true, messageId: data?.id }
    } catch (error) {
      console.error('Email service error:', error)
      throw error
    }
  }

  async sendInvitation(to: string, inviterName: string, practiceName: string, inviteLink: string, role: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">You're Invited! 🎉</h1>
          </div>
          <div class="content">
            <p><strong>${inviterName}</strong> has invited you to join <strong>${practiceName}</strong> on Dental CRM.</p>
            
            <p>You've been assigned the role of <strong>${role}</strong>.</p>
            
            <p>Click the button below to accept your invitation and set up your account:</p>
            
            <div style="text-align: center;">
              <a href="${inviteLink}" class="button">Accept Invitation</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This invitation will expire in 7 days.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>Dental CRM - Modern Practice Management</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.send({
      to,
      subject: `You're invited to join ${practiceName}`,
      html
    })
  }

  async sendWelcome(to: string, name: string, practiceName: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 32px;">Welcome to Dental CRM! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name},</p>
            
            <p>Thank you for signing up for Dental CRM! Your practice <strong>${practiceName}</strong> is now set up and ready to use.</p>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>Complete your onboarding wizard</li>
              <li>Import your existing contacts</li>
              <li>Set up your first pipeline</li>
              <li>Invite your team members</li>
              <li>Explore analytics and insights</li>
            </ul>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" class="button">Complete Setup</a>
            </div>
            
            <p>Need help? Check out our <a href="${process.env.NEXT_PUBLIC_APP_URL}/help">Help Center</a> or reply to this email.</p>
            
            <p>Best regards,<br>The Dental CRM Team</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.send({
      to,
      subject: `Welcome to Dental CRM, ${name}! 🎉`,
      html
    })
  }

  async sendPasswordReset(to: string, resetLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Reset Your Password</h1>
          </div>
          <div class="content">
            <p>You requested to reset your password for Dental CRM.</p>
            
            <p>Click the button below to set a new password:</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 1 hour.</p>
            
            <p style="color: #6b7280; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.send({
      to,
      subject: 'Reset Your Password - Dental CRM',
      html
    })
  }

  async sendEmailVerification(to: string, confirmLink: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 40px; border: 1px solid #e5e7eb; border-top: none; }
          .button { display: inline-block; background: #667eea; color: white; padding: 16px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Verify Your Email ✉️</h1>
          </div>
          <div class="content">
            <p>Thank you for signing up for Dental CRM!</p>
            
            <p>Please verify your email address by clicking the button below:</p>
            
            <div style="text-align: center;">
              <a href="${confirmLink}" class="button">Verify Email</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">This link will expire in 24 hours.</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.send({
      to,
      subject: 'Verify Your Email - Dental CRM',
      html
    })
  }
}

export const emailService = EmailService.getInstance()


