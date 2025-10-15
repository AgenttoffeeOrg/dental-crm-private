/**
 * Notification Channel Adapters
 * 
 * Adapters for delivering notifications via multiple channels:
 * - In-App (database insert + WebSocket)
 * - Email (SendGrid/Resend)
 * - SMS (Twilio)
 * - WhatsApp (Twilio)
 * - Push (Firebase - future)
 * 
 * Each adapter handles:
 * - Delivery
 * - Retry logic
 * - Delivery logging
 * - Error handling
 * - Provider-specific formatting
 */

import { createClient } from '@/lib/supabase-client'

interface NotificationPayload {
  notification_id: string
  user_id: string
  user_email?: string
  user_phone?: string
  title: string
  body?: string
  entity_url?: string
  quick_actions?: any[]
  metadata?: Record<string, any>
}

/**
 * Email Channel Adapter (SendGrid/Resend)
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Log delivery attempt
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'pending',
      provider: 'sendgrid',  // or 'resend' based on env config
    })
    
    // Get email provider config from settings
    const { data: emailConfig } = await supabase
      .from('tenant_settings')
      .select('value')
      .eq('key', 'email_provider')
      .single()
    
    const provider = emailConfig?.value?.provider || 'sendgrid'
    
    // Send email based on provider
    if (provider === 'sendgrid') {
      await sendViaSendGrid(payload)
    } else if (provider === 'resend') {
      await sendViaResend(payload)
    }
    
    // Log success
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'sent',
      provider,
      sent_at: new Date().toISOString(),
    })
    
    return true
  } catch (error) {
    console.error('[Email Adapter] Error:', error)
    
    // Log failure
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      failed_at: new Date().toISOString(),
    })
    
    return false
  }
}

/**
 * Send via SendGrid
 */
async function sendViaSendGrid(payload: NotificationPayload): Promise<void> {
  const sendgridApiKey = process.env.SENDGRID_API_KEY
  
  if (!sendgridApiKey) {
    throw new Error('SendGrid API key not configured')
  }
  
  if (!payload.user_email) {
    throw new Error('User email not provided')
  }
  
  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${sendgridApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.user_email }],
        },
      ],
      from: {
        email: process.env.FROM_EMAIL || 'notifications@yourcrm.com',
        name: 'Your Dental CRM',
      },
      subject: payload.title,
      content: [
        {
          type: 'text/html',
          value: generateEmailHTML(payload),
        },
      ],
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`SendGrid error: ${error}`)
  }
}

/**
 * Send via Resend
 */
async function sendViaResend(payload: NotificationPayload): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY
  
  if (!resendApiKey) {
    throw new Error('Resend API key not configured')
  }
  
  if (!payload.user_email) {
    throw new Error('User email not provided')
  }
  
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: process.env.FROM_EMAIL || 'notifications@yourcrm.com',
      to: [payload.user_email],
      subject: payload.title,
      html: generateEmailHTML(payload),
    }),
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Resend error: ${error}`)
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(payload: NotificationPayload): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${payload.title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${payload.title}</h1>
  </div>
  
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${payload.body ? `<p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">${payload.body}</p>` : ''}
    
    ${payload.quick_actions && payload.quick_actions.length > 0 ? `
    <div style="margin-top: 20px;">
      ${payload.quick_actions.map(action => `
        <a href="${action.navigation_url || '#'}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">
          ${action.label}
        </a>
      `).join('')}
    </div>
    ` : ''}
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 12px; color: #9ca3af;">
      You received this notification because you're subscribed to updates for this event.
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=notifications" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>
  `.trim()
}

/**
 * SMS Channel Adapter (Twilio)
 */
export async function sendSMSNotification(payload: NotificationPayload): Promise<boolean> {
  const supabase = createClient()
  
  try {
    // Log attempt
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'sms',
      status: 'pending',
      provider: 'twilio',
    })
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const fromNumber = process.env.TWILIO_PHONE_NUMBER
    
    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio not configured')
    }
    
    if (!payload.user_phone) {
      throw new Error('User phone not provided')
    }
    
    // Format SMS text (max 160 chars)
    const smsText = `${payload.title}\n${payload.body || ''}\n${payload.entity_url || ''}`.substring(0, 160)
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          From: fromNumber,
          To: payload.user_phone,
          Body: smsText,
        }),
      }
    )
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Twilio error: ${error}`)
    }
    
    const result = await response.json()
    
    // Log success
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'sms',
      status: 'sent',
      provider: 'twilio',
      external_id: result.sid,
      sent_at: new Date().toISOString(),
    })
    
    return true
  } catch (error) {
    console.error('[SMS Adapter] Error:', error)
    
    // Log failure
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'sms',
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      failed_at: new Date().toISOString(),
    })
    
    return false
  }
}

/**
 * WhatsApp Channel Adapter (Twilio)
 */
export async function sendWhatsAppNotification(payload: NotificationPayload): Promise<boolean> {
  // Similar to SMS but uses WhatsApp-specific Twilio API
  // For now, use SMS adapter
  return sendSMSNotification(payload)
}

/**
 * In-App Channel (Already handled by database insert)
 */
export async function sendInAppNotification(payload: NotificationPayload): Promise<boolean> {
  // In-app notifications are already inserted to database by the router
  // This is just a placeholder for consistency
  return true
}

/**
 * Master delivery function - routes to appropriate channel
 */
export async function deliverNotification(
  payload: NotificationPayload,
  channels: string[]
): Promise<void> {
  const results = await Promise.allSettled(
    channels.map(channel => {
      switch (channel) {
        case 'email':
          return sendEmailNotification(payload)
        case 'sms':
          return sendSMSNotification(payload)
        case 'in_app':
          return sendInAppNotification(payload)
        default:
          console.warn(`[Channels] Unknown channel: ${channel}`)
          return Promise.resolve(false)
      }
    })
  )
  
  // Log any failures
  const failures = results.filter(r => r.status === 'rejected')
  if (failures.length > 0) {
    console.error('[Channels] Some deliveries failed:', failures)
  }
}

