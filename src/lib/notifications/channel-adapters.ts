/**
 * Notification Channel Adapters
 *
 * Adapters for delivering notifications via multiple channels:
 * - In-App (database insert + Realtime — handled directly by the router)
 * - Email (multi-provider, via sendEmail from lib/services/email-service)
 * - SMS (Twilio)
 * - WhatsApp (Twilio)
 * - Push (Firebase — future)
 *
 * Each adapter handles delivery, error handling and writes to
 * `notification_delivery_log` for audit. Retry logic lives at the channel-adapter level
 * (currently best-effort; durable retry queue is a Phase 2b worker concern).
 */

import { createServiceClient as createClient } from '@/lib/supabase-server'
import { sendEmail } from '@/lib/services/email-service'

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
  event_key?: string  // routes per-event template selection in generateEmailHTML
}

/**
 * Email Channel Adapter — Resend only.
 *
 * The previous implementation read `tenant_settings.value.provider` to choose between
 * SendGrid and Resend; the `tenant_settings` table doesn't exist in this database, so
 * the lookup always silently fell through to a hardcoded SendGrid path. The platform
 * standardised on Resend; SendGrid + the tenant_settings lookup are removed entirely.
 */
export async function sendEmailNotification(payload: NotificationPayload): Promise<boolean> {
  const supabase = createClient()
  const fromEmail = process.env.RESEND_FROM_EMAIL

  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email Adapter] RESEND_API_KEY not configured; skipping send')
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'failed',
      provider: 'resend',
      error_message: 'RESEND_API_KEY not configured',
      failed_at: new Date().toISOString(),
    })
    return false
  }

  if (!fromEmail) {
    console.warn('[Email Adapter] RESEND_FROM_EMAIL not configured; skipping send')
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'failed',
      provider: 'resend',
      error_message: 'RESEND_FROM_EMAIL not configured',
      failed_at: new Date().toISOString(),
    })
    return false
  }

  if (!payload.user_email) {
    console.warn('[Email Adapter] No user email on payload; skipping send')
    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'failed',
      provider: 'resend',
      error_message: 'recipient email missing',
      failed_at: new Date().toISOString(),
    })
    return false
  }

  await supabase.from('notification_delivery_log').insert({
    notification_id: payload.notification_id,
    channel: 'email',
    status: 'pending',
    provider: 'resend',
  })

  try {
    const result = await sendEmail({
      to: { email: payload.user_email },
      from: { email: fromEmail },
      subject: payload.title,
      html: generateEmailHTML(payload),
    })

    if (!result?.success) {
      throw new Error(result?.error ?? 'Resend send returned an unsuccessful result')
    }

    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'sent',
      provider: 'resend',
      external_id: result.messageId ?? null,
      sent_at: new Date().toISOString(),
    })

    return true
  } catch (error) {
    console.error('[Email Adapter] Error:', error)

    await supabase.from('notification_delivery_log').insert({
      notification_id: payload.notification_id,
      channel: 'email',
      status: 'failed',
      provider: 'resend',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      failed_at: new Date().toISOString(),
    })

    return false
  }
}

/**
 * HTML escape helper — channel adapters render straight into the message body, so any
 * candidate-controlled string (lead name, treatment label, etc.) needs to be escaped.
 */
function escapeHtml(value: string | undefined | null): string {
  if (value == null) return ''
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Per-event template dispatcher. Default events get the generic template;
 * `lead.arrived` gets a purpose-built template that surfaces lead/treatment/source/SLA.
 */
function generateEmailHTML(payload: NotificationPayload): string {
  if (payload.event_key === 'lead.arrived') {
    return generateLeadArrivedEmailHTML(payload)
  }
  return generateGenericEmailHTML(payload)
}

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? ''
  return path.startsWith('http') ? path : `${base}${path}`
}

function generateLeadArrivedEmailHTML(payload: NotificationPayload): string {
  const m = payload.metadata ?? {}
  const leadName = escapeHtml((m.lead_name as string) || 'A new lead')
  const treatment = escapeHtml((m.treatment_label as string) || 'a general enquiry')
  const source = escapeHtml((m.source_label as string) || 'a website channel')
  const respondWithin = Number(m.respond_within_minutes) || null
  const slaDueAt = m.sla_due_at as string | undefined
  const ctaUrl = payload.entity_url ? appUrl(payload.entity_url) : appUrl('/contacts')

  const respondLine = respondWithin
    ? `Respond within <strong>${respondWithin} minutes</strong>${slaDueAt ? ` (by ${escapeHtml(new Date(slaDueAt).toLocaleString())})` : ''} to hit your SLA.`
    : `Try to respond as soon as possible.`

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(payload.title)}</title>
</head>
<body style="margin: 0; padding: 0; background: #f5f7fb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px;">
    <div style="background: #111827; padding: 20px 24px; border-radius: 12px 12px 0 0;">
      <p style="margin: 0; color: #9ca3af; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase;">New Lead</p>
      <h1 style="margin: 4px 0 0 0; color: #ffffff; font-size: 22px; line-height: 1.3;">${leadName}</h1>
      <p style="margin: 6px 0 0 0; color: #d1d5db; font-size: 14px;">enquired about <strong style="color: #ffffff;">${treatment}</strong></p>
    </div>

    <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none;">
      <table cellspacing="0" cellpadding="0" style="width: 100%; font-size: 14px; color: #374151;">
        <tr>
          <td style="padding: 6px 0; color: #6b7280; width: 110px;">Source</td>
          <td style="padding: 6px 0;">${source}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">Submitted</td>
          <td style="padding: 6px 0;">${escapeHtml(new Date().toLocaleString())}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #6b7280;">SLA</td>
          <td style="padding: 6px 0;">${respondLine}</td>
        </tr>
      </table>

      <div style="margin-top: 24px;">
        <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 22px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">View Lead</a>
      </div>
    </div>

    <div style="background: #ffffff; padding: 16px 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        You're receiving this because you're on the lead routing list for this practice.
        <a href="${escapeHtml(appUrl('/settings?tab=notifications'))}" style="color: #2563eb; text-decoration: none;">Manage notifications</a>
      </p>
    </div>
  </div>
</body>
</html>
`.trim()
}

function generateGenericEmailHTML(payload: NotificationPayload): string {
  const title = escapeHtml(payload.title)
  const body = payload.body ? `<p style="font-size: 16px; color: #4b5563; margin-bottom: 20px;">${escapeHtml(payload.body)}</p>` : ''
  const actions = (payload.quick_actions ?? [])
    .map(action => {
      const url = action.navigation_url ? appUrl(action.navigation_url) : '#'
      return `<a href="${escapeHtml(url)}" style="display: inline-block; background: #667eea; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-right: 10px; margin-bottom: 10px;">${escapeHtml(action.label)}</a>`
    })
    .join('')
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">${title}</h1>
  </div>
  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    ${body}
    ${actions ? `<div style="margin-top: 20px;">${actions}</div>` : ''}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    <p style="font-size: 12px; color: #9ca3af;">
      You received this notification because you're subscribed to updates for this event.
      <a href="${escapeHtml(appUrl('/settings?tab=notifications'))}" style="color: #667eea; text-decoration: none;">Manage notification preferences</a>
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

