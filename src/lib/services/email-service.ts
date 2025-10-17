/**
 * Email Service
 * 
 * Abstraction layer for sending emails with support for multiple providers.
 * Supports: Resend, SendGrid, Console (development)
 */

import { 
  getEmailProvider, 
  getEmailApiKey, 
  EmailConfig, 
  EmailProviders,
  EmailTemplates,
  type EmailTemplate 
} from '@/config/email'
import { FeatureFlags } from '@/lib/feature-flags'

export interface EmailAddress {
  email: string
  name?: string
}

export interface EmailData {
  to: EmailAddress | EmailAddress[]
  from?: EmailAddress
  replyTo?: EmailAddress
  subject: string
  html: string
  text?: string
  template?: EmailTemplate
  metadata?: Record<string, any>
}

export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send email using configured provider
 */
export async function sendEmail(data: EmailData): Promise<EmailResult> {
  // Check if email sending is enabled
  if (!FeatureFlags.ENABLE_EMAIL_SENDING) {
    console.log('📧 Email sending disabled. Would send:')
    console.log('To:', data.to)
    console.log('Subject:', data.subject)
    console.log('Template:', data.template)
    
    return {
      success: true,
      messageId: 'console-log-' + Date.now(),
    }
  }
  
  const provider = getEmailProvider()
  
  switch (provider) {
    case EmailProviders.RESEND:
      return sendViaResend(data)
    
    case EmailProviders.SENDGRID:
      return sendViaSendGrid(data)
    
    case EmailProviders.CONSOLE:
    default:
      return sendViaConsole(data)
  }
}

/**
 * Send via Resend
 */
async function sendViaResend(data: EmailData): Promise<EmailResult> {
  const apiKey = getEmailApiKey()
  
  if (!apiKey) {
    return {
      success: false,
      error: 'Resend API key not configured',
    }
  }
  
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(apiKey)
    
    const response = await resend.emails.send({
      from: formatEmailAddress(data.from || {
        email: EmailConfig.DEFAULT_FROM,
      }),
      to: Array.isArray(data.to) 
        ? data.to.map(formatEmailAddress)
        : formatEmailAddress(data.to),
      replyTo: data.replyTo ? formatEmailAddress(data.replyTo) : undefined,
      subject: data.subject,
      html: data.html,
      text: data.text,
    })
    
    if (response.error) {
      return {
        success: false,
        error: response.error.message,
      }
    }
    
    return {
      success: true,
      messageId: response.data?.id,
    }
  } catch (error: any) {
    console.error('Resend error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send via Resend',
    }
  }
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(data: EmailData): Promise<EmailResult> {
  const apiKey = getEmailApiKey()
  
  if (!apiKey) {
    return {
      success: false,
      error: 'SendGrid API key not configured',
    }
  }
  
  try {
    const sgMail = await import('@sendgrid/mail')
    sgMail.default.setApiKey(apiKey)
    
    const msg = {
      from: formatEmailAddress(data.from || {
        email: EmailConfig.DEFAULT_FROM,
      }),
      to: Array.isArray(data.to) 
        ? data.to.map(formatEmailAddress)
        : formatEmailAddress(data.to),
      replyTo: data.replyTo ? formatEmailAddress(data.replyTo) : undefined,
      subject: data.subject,
      html: data.html,
      text: data.text,
    }
    
    const response = await sgMail.default.send(msg)
    
    return {
      success: true,
      messageId: response[0].headers['x-message-id'],
    }
  } catch (error: any) {
    console.error('SendGrid error:', error)
    return {
      success: false,
      error: error.message || 'Failed to send via SendGrid',
    }
  }
}

/**
 * Send via Console (development)
 */
async function sendViaConsole(data: EmailData): Promise<EmailResult> {
  console.log('📧 ============================================')
  console.log('📧 EMAIL (Console Log)')
  console.log('📧 ============================================')
  console.log('From:', data.from || EmailConfig.DEFAULT_FROM)
  console.log('To:', data.to)
  console.log('Reply-To:', data.replyTo || EmailConfig.REPLY_TO)
  console.log('Subject:', data.subject)
  console.log('Template:', data.template || 'None')
  console.log('Metadata:', data.metadata || {})
  console.log('-------------------------------------------')
  console.log('HTML:', data.html.substring(0, 200) + '...')
  console.log('📧 ============================================')
  
  return {
    success: true,
    messageId: 'console-' + Date.now(),
  }
}

/**
 * Format email address for providers
 */
function formatEmailAddress(address: EmailAddress | string): string {
  if (typeof address === 'string') {
    return address
  }
  
  if (address.name) {
    return `${address.name} <${address.email}>`
  }
  
  return address.email
}

/**
 * Send invitation email
 */
export async function sendInvitationEmail(
  to: EmailAddress,
  invitedBy: string,
  organizationName: string,
  inviteLink: string,
  role: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">You've been invited!</h1>
        
        <p>Hi ${to.name || 'there'},</p>
        
        <p><strong>${invitedBy}</strong> has invited you to join <strong>${organizationName}</strong> on Dental CRM.</p>
        
        <p>You'll be joining as <strong>${role}</strong>.</p>
        
        <div style="margin: 30px 0;">
          <a href="${inviteLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This invitation link will expire in 7 days. If you didn't expect this invitation, you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Dental CRM - Practice Management Made Simple<br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}" style="color: #2563eb;">Visit our website</a>
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
You've been invited to join ${organizationName}!

${invitedBy} has invited you to join ${organizationName} on Dental CRM as ${role}.

Accept your invitation: ${inviteLink}

This invitation link will expire in 7 days.
  `.trim()
  
  return sendEmail({
    to,
    subject: `You've been invited to join ${organizationName}`,
    html,
    text,
    template: EmailTemplates.INVITATION,
    metadata: {
      organizationName,
      invitedBy,
      role,
    },
  })
}

/**
 * Send join request notification to admins
 */
export async function sendJoinRequestNotification(
  adminEmail: EmailAddress,
  requesterName: string,
  requesterEmail: string,
  organizationName: string,
  reviewLink: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2563eb;">New Join Request</h1>
        
        <p>Hi ${adminEmail.name || 'there'},</p>
        
        <p><strong>${requesterName}</strong> (${requesterEmail}) has requested to join <strong>${organizationName}</strong>.</p>
        
        <div style="margin: 30px 0;">
          <a href="${reviewLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Request
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          You can approve or reject this request from your admin dashboard.
        </p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Dental CRM - Practice Management Made Simple
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
New Join Request

${requesterName} (${requesterEmail}) has requested to join ${organizationName}.

Review the request: ${reviewLink}
  `.trim()
  
  return sendEmail({
    to: adminEmail,
    subject: `New join request for ${organizationName}`,
    html,
    text,
    template: EmailTemplates.JOIN_REQUEST_RECEIVED,
    metadata: {
      organizationName,
      requesterName,
      requesterEmail,
    },
  })
}

/**
 * Send join request approval notification
 */
export async function sendJoinRequestApproved(
  requesterEmail: EmailAddress,
  organizationName: string,
  role: string,
  loginLink: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #10b981;">Request Approved! 🎉</h1>
        
        <p>Hi ${requesterEmail.name || 'there'},</p>
        
        <p>Great news! Your request to join <strong>${organizationName}</strong> has been approved.</p>
        
        <p>You've been added as <strong>${role}</strong>.</p>
        
        <div style="margin: 30px 0;">
          <a href="${loginLink}" 
             style="background-color: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Sign In Now
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Dental CRM - Practice Management Made Simple
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
Request Approved!

Your request to join ${organizationName} has been approved. You've been added as ${role}.

Sign in now: ${loginLink}
  `.trim()
  
  return sendEmail({
    to: requesterEmail,
    subject: `Welcome to ${organizationName}!`,
    html,
    text,
    template: EmailTemplates.JOIN_REQUEST_APPROVED,
  })
}

/**
 * Send join request rejection notification
 */
export async function sendJoinRequestRejected(
  requesterEmail: EmailAddress,
  organizationName: string,
  reason?: string
): Promise<EmailResult> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444;">Request Not Approved</h1>
        
        <p>Hi ${requesterEmail.name || 'there'},</p>
        
        <p>Your request to join <strong>${organizationName}</strong> was not approved.</p>
        
        ${reason ? `<p style="background: #fef2f2; padding: 15px; border-left: 4px solid #ef4444;"><strong>Reason:</strong> ${reason}</p>` : ''}
        
        <p>If you believe this is an error, please contact the organization administrator directly.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Dental CRM - Practice Management Made Simple
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
Request Not Approved

Your request to join ${organizationName} was not approved.

${reason ? `Reason: ${reason}` : ''}

If you believe this is an error, please contact the organization administrator.
  `.trim()
  
  return sendEmail({
    to: requesterEmail,
    subject: `Join request for ${organizationName}`,
    html,
    text,
    template: EmailTemplates.JOIN_REQUEST_REJECTED,
  })
}

/**
 * Send seat limit warning to admins
 */
export async function sendSeatLimitWarning(
  adminEmail: EmailAddress,
  organizationName: string,
  activeSeats: number,
  seatLimit: number,
  upgradeLink: string
): Promise<EmailResult> {
  const percentage = Math.round((activeSeats / seatLimit) * 100)
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f59e0b;">⚠️ Seat Limit Warning</h1>
        
        <p>Hi ${adminEmail.name || 'there'},</p>
        
        <p><strong>${organizationName}</strong> is approaching its seat limit.</p>
        
        <div style="background: #fffbeb; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; font-size: 24px; font-weight: bold; color: #f59e0b;">
            ${activeSeats} / ${seatLimit} seats used (${percentage}%)
          </p>
        </div>
        
        <p>Consider upgrading your plan to add more team members.</p>
        
        <div style="margin: 30px 0;">
          <a href="${upgradeLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Upgrade Plan
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        
        <p style="color: #999; font-size: 12px;">
          Dental CRM - Practice Management Made Simple
        </p>
      </div>
    </body>
    </html>
  `
  
  return sendEmail({
    to: adminEmail,
    subject: `⚠️ ${organizationName} approaching seat limit`,
    html,
    template: EmailTemplates.SEAT_LIMIT_WARNING,
  })
}

