import { v4 as uuidv4 } from 'uuid'
import { createServiceClient } from '@/lib/supabase-server'
import { sendEmailWithIntegration } from '@/lib/integrations/email-provider'
import { computeConversationId } from '@/lib/communications/conversation-id'
import { smsService } from '@/lib/sms-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { voiceService } from '@/lib/voice-service'
import { recordProviderFailure } from '@/lib/monitoring/metrics'
import { loadTenantIntegrationSettings } from '@/lib/integrations/tenant-integration-config'
import { detectAndFireFirstResponse } from '@/lib/conversions/first-response-detector'

/** Lazy-load so SMS/WhatsApp send routes do not pull jsdom at cold start (Vercel). */
function getDOMPurify() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('isomorphic-dompurify') as { default: { sanitize: (html: string, opts: object) => string } }
  return mod.default
}

export function sanitiseOutboundHtml(html: string | undefined): string {
  if (!html) return ''
  try {
    return getDOMPurify().sanitize(html, {
      USE_PROFILES: { html: true },
    })
  } catch (error) {
    // jsdom/DOMPurify can fail on Vercel serverless; strip scripts and continue send.
    console.error('[sanitiseOutboundHtml] DOMPurify unavailable, using fallback', error)
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
  }
}

async function markActivityFailed(
  supabase: ReturnType<typeof createServiceClient>,
  activityId: string,
  friendlyLabel: string,
  providerErr: unknown
) {
  const rawErr =
    providerErr instanceof Error
      ? { name: providerErr.name, message: providerErr.message, stack: providerErr.stack }
      : providerErr
  try {
    await supabase
      .from('activities')
      .update({
        message_status: 'failed',
        integration_metadata: {
          error: { message: friendlyLabel, raw: rawErr },
        },
      })
      .eq('id', activityId)
  } catch (updateErr) {
    console.error('[markActivityFailed] update failed', updateErr)
  }
}

function getTwilioErrorCode(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'code' in err) {
    const code = (err as { code: unknown }).code
    if (typeof code === 'number') return code
    if (typeof code === 'string') {
      const parsed = parseInt(code, 10)
      if (!Number.isNaN(parsed)) return parsed
    }
  }
  const message = err instanceof Error ? err.message : String(err)
  const match = message.match(/(?:error code|code)[:\s]+(\d{5})/i) ?? message.match(/\b(2\d{4}|63\d{3})\b/)
  return match ? parseInt(match[1], 10) : undefined
}

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'status' in err) {
    const status = (err as { status: unknown }).status
    if (typeof status === 'number') return status
  }
  const message = err instanceof Error ? err.message : String(err)
  const match = message.match(/\b([45]\d{2})\b/)
  return match ? parseInt(match[1], 10) : undefined
}

function friendlyEmailError(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  const lower = message.toLowerCase()
  const status = getHttpStatus(err)

  if (status === 401 || status === 403 || lower.includes('unauthorized') || lower.includes('forbidden') || lower.includes('api key')) {
    return 'Send failed — invalid email API key'
  }
  if (status === 422 || lower.includes('invalid recipient')) {
    return 'Send failed — invalid recipient address'
  }
  if ((status !== undefined && status >= 500) || lower.includes('temporarily unavailable')) {
    return 'Send failed — email provider temporarily unavailable'
  }
  return 'Send failed — email provider error'
}

function friendlySmsError(err: unknown): string {
  const code = getTwilioErrorCode(err)
  if (code === 20003) return 'Send failed — invalid SMS credentials'
  if (code === 21211 || code === 21614) return 'Send failed — invalid recipient number'
  const status = getHttpStatus(err)
  if (status !== undefined && status >= 400 && status < 500) {
    return 'Send failed — SMS provider rejected the message'
  }
  return 'Send failed — SMS provider error'
}

function friendlyWhatsAppError(err: unknown): string {
  const code = getTwilioErrorCode(err)
  if (code === 63003) return 'Send failed — WhatsApp number not approved for this sender'
  if (code === 63007) return 'Send failed — outside 24h customer-initiated window'
  const status = getHttpStatus(err)
  if (status !== undefined && status >= 400 && status < 500) {
    return 'Send failed — WhatsApp provider rejected the message'
  }
  return 'Send failed — WhatsApp provider error'
}

interface BaseContext {
  tenantId: string
  userId?: string
  contactId?: string | null
  dealId?: string | null
}

async function extractCallInsights(
  dealId?: string,
  contactId?: string,
  tenantId?: string,
  supabase?: ReturnType<typeof createServiceClient>
) {
  if (dealId && supabase && tenantId) {
    try {
      const { data: deal } = await supabase
        .from('deals')
        .select('title, stage:pipeline_stages(name), treatment_tags')
        .eq('id', dealId)
        .single()

      if (deal) {
        const stageName = deal.stage?.name?.toLowerCase() || ''
        const title = deal.title?.toLowerCase() || ''
        const tags = deal.treatment_tags || []

        if (stageName.includes('initial') || stageName.includes('new') || stageName.includes('lead')) {
          return {
            purpose: 'Initial Consultation Call',
            summary: `First contact call to discuss ${tags[0] || 'treatment options'} and schedule consultation`,
          }
        }
        if (stageName.includes('consultation') || stageName.includes('assessment')) {
          return {
            purpose: 'Treatment Planning Call',
            summary: `Discussing treatment plan details, timeline, and answering patient questions`,
          }
        }
        if (stageName.includes('quote') || stageName.includes('proposal')) {
          return {
            purpose: 'Quote Follow-up Call',
            summary: `Following up on ${title || 'quote'}, addressing concerns, and moving to booking`,
          }
        }
        if (stageName.includes('scheduled') || stageName.includes('approved')) {
          return {
            purpose: 'Appointment Confirmation',
            summary: `Confirming upcoming appointment details and pre-treatment instructions`,
          }
        }
        if (stageName.includes('treatment') || stageName.includes('in progress')) {
          return {
            purpose: 'Treatment Progress Call',
            summary: `Checking in on ongoing ${tags[0] || 'treatment'} and addressing any concerns`,
          }
        }
        if (stageName.includes('follow') || stageName.includes('post')) {
          return {
            purpose: 'Post-Treatment Follow-up',
            summary: `Following up after treatment to ensure recovery is going well`,
          }
        }
        if (stageName.includes('lost') || stageName.includes('cold')) {
          return {
            purpose: 'Re-engagement Call',
            summary: `Reaching out to re-engage patient and understand their situation`,
          }
        }

        return {
          purpose: 'Deal Follow-up Call',
          summary: `Follow-up regarding ${deal.title} to move deal forward`,
        }
      }
    } catch (error) {
      console.error('[VOICE] Error fetching deal context for call insights:', error)
    }
  }

  return {
    purpose: 'Initial Contact Call',
    summary: 'First outbound call to introduce services and assess patient needs',
  }
}

function stripHtml(input: string): string {
  return input.replace(/<[^>]+>/g, ' ')
}

export function inferEmailPurpose(subject: string, html: string): string {
  const combined = `${subject} ${stripHtml(html)}`.toLowerCase()

  if (combined.includes('quote') || combined.includes('pricing') || combined.includes('cost') || combined.includes('price')) {
    return 'Quote Request'
  }
  if (combined.includes('appointment') || combined.includes('schedule') || combined.includes('book') || combined.includes('reschedule')) {
    return 'Appointment Scheduling'
  }
  if (combined.includes('follow up') || combined.includes('follow-up') || combined.includes('checking in')) {
    return 'Follow-up'
  }
  if (combined.includes('question') || combined.includes('inquiry') || combined.includes('wondering')) {
    return 'Question/Inquiry'
  }
  if (combined.includes('thank you') || combined.includes('thanks')) {
    return 'Thank You'
  }
  if (combined.includes('confirm') || combined.includes('confirmation')) {
    return 'Confirmation'
  }
  if (combined.includes('consultation') || combined.includes('consult')) {
    return 'Consultation Request'
  }
  if (combined.includes('information') || combined.includes('details')) {
    return 'Information Request'
  }
  if (combined.includes('treatment') || combined.includes('procedure')) {
    return 'Treatment Discussion'
  }
  if (combined.includes('payment') || combined.includes('invoice') || combined.includes('bill')) {
    return 'Payment/Billing'
  }
  if (combined.includes('reminder')) {
    return 'Reminder'
  }

  return 'General Communication'
}

export function inferSmsPurpose(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('reminder')) {
    return 'Appointment Reminder'
  }
  if (lower.includes('confirm') || lower.includes('confirmation')) {
    return 'Confirmation'
  }
  if (lower.includes('follow up') || lower.includes('follow-up') || lower.includes('checking')) {
    return 'Follow-up'
  }
  if (lower.includes('thank')) {
    return 'Thank You'
  }
  if (lower.includes('question') || lower.includes('?')) {
    return 'Question'
  }

  return 'Quick Message'
}

export function inferWhatsAppPurpose(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('book')) {
    return 'Appointment Scheduling'
  }
  if (lower.includes('confirm') || lower.includes('confirmation')) {
    return 'Confirmation'
  }
  if (lower.includes('follow up') || lower.includes('follow-up')) {
    return 'Follow-up'
  }
  if (lower.includes('question') || lower.includes('?') || lower.includes('inquiry')) {
    return 'Question'
  }
  if (lower.includes('thank')) {
    return 'Thank You'
  }
  if (lower.includes('information') || lower.includes('details')) {
    return 'Information Sharing'
  }

  return 'General Message'
}

export async function dispatchEmail(options: {
  context: BaseContext
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  html: string
}) {
  const supabase = createServiceClient()
  const { context } = options
  const emailOccurredAt = new Date().toISOString()
  const notConfiguredMsg =
    'Email provider not configured. Please configure in Settings → Integrations.'

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  const conversationId = computeConversationId({
    tenantId: context.tenantId,
    contactId: context.contactId,
    channel: 'email',
  })
  const messageIdRfc5322 = `<${uuidv4()}@dental-crm-nine.vercel.app>`
  const emailProviderName = settings?.email_provider ?? null

  const { data: activity, error: insertErr } = await supabase
    .from('activities')
    .insert({
      tenant_id: context.tenantId,
      type: 'email',
      contact_id: context.contactId ?? null,
      deal_id: context.dealId ?? null,
      agent_user_id: context.userId,
      direction: 'outbound',
      subject: options.subject,
      snippet: (options.html ?? '').slice(0, 200),
      rich_content: null,
      integration_provider: emailProviderName,
      email_to: options.to,
      email_cc: options.cc || [],
      email_bcc: options.bcc || [],
      email_from: settings?.email_from_address ?? null,
      message_status: 'pending',
      conversation_id: conversationId,
      metadata: {
        ai_purpose: inferEmailPurpose(options.subject, options.html),
        ai_sentiment: 'neutral',
        message_id: messageIdRfc5322,
        provider_name: emailProviderName,
      },
      occurred_at: emailOccurredAt,
      created_at: emailOccurredAt,
    })
    .select('id')
    .single()

  if (insertErr || !activity) {
    console.error('[dispatchEmail] activity insert failed', insertErr)
    throw new Error('Failed to record outbound email attempt')
  }

  if (!settings || !settings.is_email_configured) {
    await markActivityFailed(supabase, activity.id, notConfiguredMsg, null)
    recordProviderFailure(settings?.email_provider ?? 'email', 'send_email', 'not_configured')
    throw new Error(notConfiguredMsg)
  }

  const sanitisedHtml = sanitiseOutboundHtml(options.html)

  const emailSettings = {
    email_provider: settings.email_provider,
    email_api_key: settings.email_api_key,
    email_from_address: settings.email_from_address,
    email_from_name: settings.email_from_name,
    email_oauth_token: undefined,
    email_oauth_refresh_token: undefined,
    email_oauth_expires_at: undefined,
  }

  try {
    const sendResult = await sendEmailWithIntegration(emailSettings, {
      to: options.to,
      cc: options.cc,
      bcc: options.bcc,
      subject: options.subject,
      html: sanitisedHtml,
      fromEmail: settings.email_from_address || undefined,
      fromName: settings.email_from_name || undefined,
      replyTo: settings.email_reply_to_address || undefined,
      headers: { 'Message-ID': messageIdRfc5322 },
    })

    if (!sendResult.success) {
      throw Object.assign(new Error(sendResult.error || 'Email send failed'), {
        providerResponse: sendResult,
      })
    }

    if (sendResult.updatedToken && settings._debug?.channelSource === 'legacy') {
      await supabase
        .from('integration_settings')
        .update({
          email_oauth_token: sendResult.updatedToken.accessToken,
          email_oauth_expires_at: sendResult.updatedToken.expiresAt || null,
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_id', context.tenantId)
    }

    const aiPurpose = inferEmailPurpose(options.subject, sanitisedHtml)
    const aiOutcome = 'Sent successfully'
    const aiSummary = `${aiPurpose} email to ${options.to.join(', ')}`

    const { error: updateErr } = await supabase
      .from('activities')
      .update({
        rich_content: sanitisedHtml,
        snippet: sanitisedHtml.slice(0, 200),
        external_id: sendResult.externalId ?? null,
        message_status: sendResult.status || 'sent',
        integration_metadata: { response: sendResult.providerResponse ?? null },
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral',
          message_id: messageIdRfc5322,
          provider_name: emailProviderName,
          provider_message_id: sendResult.providerMessageId ?? sendResult.externalId ?? null,
        },
      })
      .eq('id', activity.id)

    if (updateErr) {
      console.error('[dispatchEmail] activity update failed', updateErr)
    }

    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'email',
      action: 'send',
      provider: settings.email_provider,
      activity_id: activity.id,
      external_id: sendResult.externalId || null,
      request_data: {
        to: options.to,
        hasCc: Boolean(options.cc?.length),
        hasBcc: Boolean(options.bcc?.length),
        subject: options.subject,
        body_length: sanitisedHtml.length,
        ai_purpose: aiPurpose,
      },
      response_data: sendResult.providerResponse || null,
      status: 'success',
      error_message: null,
    })

    if (context.dealId) {
      await detectAndFireFirstResponse(
        {
          tenant_id: context.tenantId,
          contact_id: context.contactId ?? null,
          deal_id: context.dealId,
          direction: 'outbound',
          occurred_at: emailOccurredAt,
        },
        supabase
      )
    }

    // 2b.64 — Path X auto-done. If the operator had any open
    // type='email' tasks for this contact, close them now and
    // stamp this activity as the cause. Fail-soft — task hiccups
    // don't bubble up as dispatcher errors.
    const { autoCompleteTasksOnOutbound } = await import('@/lib/tasks/auto-complete-on-outbound')
    await autoCompleteTasksOnOutbound(supabase, {
      tenantId: context.tenantId,
      contactId: context.contactId ?? null,
      channel: 'email',
      activityId: activity.id,
      activityOccurredAt: emailOccurredAt,
    })

    return {
      activityId: activity.id,
      externalId: sendResult.externalId || null,
      status: sendResult.status || 'sent',
      aiPurpose,
      aiOutcome,
      aiSummary,
    }
  } catch (providerErr) {
    const friendly = friendlyEmailError(providerErr)
    await markActivityFailed(supabase, activity.id, friendly, providerErr)
    recordProviderFailure(settings.email_provider || 'email', 'send_email', providerErr)
    throw new Error(friendly)
  }
}

export async function dispatchSms(options: {
  context: BaseContext
  to: string
  message: string
}) {
  const supabase = createServiceClient()
  const { context } = options
  const smsOccurredAt = new Date().toISOString()
  const notConfiguredMsg =
    'SMS provider not configured. Please configure in Settings → Integrations.'

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  const smsConversationId = computeConversationId({
    tenantId: context.tenantId,
    contactId: context.contactId,
    channel: 'sms',
  })

  const { data: activity, error: insertErr } = await supabase
    .from('activities')
    .insert({
      tenant_id: context.tenantId,
      type: 'sms',
      contact_id: context.contactId ?? null,
      deal_id: context.dealId ?? null,
      agent_user_id: context.userId,
      direction: 'outbound',
      subject: 'SMS',
      snippet: options.message.substring(0, 200),
      integration_provider: 'twilio_sms',
      from_number: settings?.sms_from_number ?? null,
      to_number: options.to,
      message_status: 'pending',
      conversation_id: smsConversationId,
      metadata: {
        ai_purpose: inferSmsPurpose(options.message),
        ai_sentiment: 'neutral',
      },
      occurred_at: smsOccurredAt,
      created_at: smsOccurredAt,
    })
    .select('id')
    .single()

  if (insertErr || !activity) {
    console.error('[dispatchSms] activity insert failed', insertErr)
    throw new Error('Failed to record outbound SMS attempt')
  }

  if (!settings || !settings.is_sms_configured) {
    await markActivityFailed(supabase, activity.id, notConfiguredMsg, null)
    recordProviderFailure('twilio_sms', 'send_sms', 'not_configured')
    throw new Error(notConfiguredMsg)
  }

  try {
    await smsService.initialize({
      accountSid: settings.sms_account_sid!,
      authToken: settings.sms_auth_token!,
      fromNumber: settings.sms_from_number || null,
      messagingServiceSid: settings.sms_messaging_service_sid || null,
    })

    const sendResult = await smsService.send({
      to: options.to,
      message: options.message,
      messagingServiceSid: settings.sms_messaging_service_sid || undefined,
      from: settings.sms_from_number || undefined,
    })

    if (!sendResult.success) {
      throw new Error('Failed to send SMS')
    }

    const aiPurpose = inferSmsPurpose(options.message)
    const aiOutcome = 'Sent successfully'
    const aiSummary = `${aiPurpose} SMS to ${options.to}`

    const twilioSid = sendResult.messageId ?? null
    await supabase
      .from('activities')
      .update({
        external_id: twilioSid,
        message_status: sendResult.status || 'queued',
        integration_metadata: { response: sendResult.providerResponse ?? null },
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral',
          message_id: twilioSid,
          provider_message_id: twilioSid,
          provider_name: 'twilio',
        },
      })
      .eq('id', activity.id)

    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'sms',
      action: 'send',
      provider: 'twilio',
      activity_id: activity.id,
      external_id: sendResult.messageId || null,
      request_data: { to: options.to, message_length: options.message.length, ai_purpose: aiPurpose },
      response_data: sendResult.providerResponse || null,
      status: 'success',
      error_message: null,
    })

    if (context.dealId) {
      await detectAndFireFirstResponse(
        {
          tenant_id: context.tenantId,
          contact_id: context.contactId ?? null,
          deal_id: context.dealId,
          direction: 'outbound',
          occurred_at: smsOccurredAt,
        },
        supabase
      )
    }

    // 2b.64 — Path X auto-done for outbound SMS.
    const { autoCompleteTasksOnOutbound: autoCompleteSms } = await import(
      '@/lib/tasks/auto-complete-on-outbound'
    )
    await autoCompleteSms(supabase, {
      tenantId: context.tenantId,
      contactId: context.contactId ?? null,
      channel: 'sms',
      activityId: activity.id,
      activityOccurredAt: smsOccurredAt,
    })

    return {
      activityId: activity.id,
      externalId: sendResult.messageId || null,
      status: sendResult.status || 'queued',
      aiPurpose,
      aiOutcome,
      aiSummary,
    }
  } catch (providerErr) {
    const friendly = friendlySmsError(providerErr)
    await markActivityFailed(supabase, activity.id, friendly, providerErr)
    recordProviderFailure('twilio_sms', 'send_sms', providerErr)
    throw new Error(friendly)
  }
}

export async function dispatchWhatsApp(options: {
  context: BaseContext
  to: string
  message: string
  mediaUrl?: string
}) {
  const supabase = createServiceClient()
  const { context } = options
  const whatsappOccurredAt = new Date().toISOString()
  const notConfiguredMsg =
    'WhatsApp provider not configured. Please configure in Settings → Integrations.'

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  const whatsappConversationId = computeConversationId({
    tenantId: context.tenantId,
    contactId: context.contactId,
    channel: 'whatsapp',
  })

  const { data: activity, error: insertErr } = await supabase
    .from('activities')
    .insert({
      tenant_id: context.tenantId,
      type: 'whatsapp',
      contact_id: context.contactId ?? null,
      deal_id: context.dealId ?? null,
      agent_user_id: context.userId,
      direction: 'outbound',
      subject: 'WhatsApp Message',
      snippet: options.message.substring(0, 200),
      integration_provider: 'twilio_whatsapp',
      from_number: settings?.whatsapp_from_number ?? null,
      to_number: `whatsapp:${options.to}`,
      message_status: 'pending',
      conversation_id: whatsappConversationId,
      metadata: {
        ai_purpose: inferWhatsAppPurpose(options.message),
        ai_sentiment: 'neutral',
        has_media: Boolean(options.mediaUrl),
      },
      integration_metadata: {
        has_media: Boolean(options.mediaUrl),
        media_url: options.mediaUrl || null,
      },
      occurred_at: whatsappOccurredAt,
      created_at: whatsappOccurredAt,
    })
    .select('id')
    .single()

  if (insertErr || !activity) {
    console.error('[dispatchWhatsApp] activity insert failed', insertErr)
    throw new Error('Failed to record outbound WhatsApp attempt')
  }

  if (!settings || !settings.is_whatsapp_configured) {
    await markActivityFailed(supabase, activity.id, notConfiguredMsg, null)
    recordProviderFailure('twilio_whatsapp', 'send_whatsapp', 'not_configured')
    throw new Error(notConfiguredMsg)
  }

  try {
    await whatsappService.initialize(
      settings.whatsapp_account_sid!,
      settings.whatsapp_auth_token!,
      settings.whatsapp_from_number!
    )

    const sendResult = await whatsappService.send({
      to: options.to,
      message: options.message,
      mediaUrl: options.mediaUrl,
    })

    if (!sendResult.success) {
      throw new Error('Failed to send WhatsApp message')
    }

    const aiPurpose = inferWhatsAppPurpose(options.message)
    const aiOutcome = 'Sent successfully'
    const aiSummary = `${aiPurpose} WhatsApp to ${options.to}${options.mediaUrl ? ' (with attachment)' : ''}`

    const whatsappSid = sendResult.messageId ?? null
    await supabase
      .from('activities')
      .update({
        external_id: whatsappSid,
        message_status: sendResult.status || 'queued',
        integration_metadata: {
          has_media: Boolean(options.mediaUrl),
          media_url: options.mediaUrl || null,
          response: sendResult.providerResponse ?? null,
        },
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral',
          has_media: Boolean(options.mediaUrl),
          message_id: whatsappSid,
          provider_message_id: whatsappSid,
          provider_name: 'twilio',
        },
      })
      .eq('id', activity.id)

    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'whatsapp',
      action: 'send',
      provider: 'twilio',
      activity_id: activity.id,
      external_id: sendResult.messageId || null,
      request_data: {
        to: options.to,
        message_length: options.message.length,
        has_media: Boolean(options.mediaUrl),
        ai_purpose: aiPurpose,
      },
      response_data: sendResult.providerResponse || null,
      status: 'success',
      error_message: null,
    })

    if (context.dealId) {
      await detectAndFireFirstResponse(
        {
          tenant_id: context.tenantId,
          contact_id: context.contactId ?? null,
          deal_id: context.dealId,
          direction: 'outbound',
          occurred_at: whatsappOccurredAt,
        },
        supabase
      )
    }

    // 2b.64 — Path X auto-done for outbound WhatsApp.
    const { autoCompleteTasksOnOutbound: autoCompleteWa } = await import(
      '@/lib/tasks/auto-complete-on-outbound'
    )
    await autoCompleteWa(supabase, {
      tenantId: context.tenantId,
      contactId: context.contactId ?? null,
      channel: 'whatsapp',
      activityId: activity.id,
      activityOccurredAt: whatsappOccurredAt,
    })

    return {
      activityId: activity.id,
      externalId: sendResult.messageId || null,
      status: sendResult.status || 'queued',
      aiPurpose,
      aiOutcome,
      aiSummary,
    }
  } catch (providerErr) {
    const friendly = friendlyWhatsAppError(providerErr)
    await markActivityFailed(supabase, activity.id, friendly, providerErr)
    recordProviderFailure('twilio_whatsapp', 'send_whatsapp', providerErr)
    throw new Error(friendly)
  }
}

export async function dispatchVoiceCall(options: {
  context: BaseContext
  to: string
  record?: boolean
}) {
  const supabase = createServiceClient()
  const { context } = options
  const recordCall = options.record ?? true

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  if (!settings || !settings.is_voice_configured) {
    recordProviderFailure('twilio_voice', 'send', 'Voice integration not configured')
    throw new Error('Voice integration not configured. Please configure in Settings → Integrations.')
  }

  await voiceService.initialize({
    accountSid: settings.voice_account_sid!,
    authToken: settings.voice_auth_token!,
    defaultFrom: settings.voice_from_number!,
  })

  const rawAppUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL
  if (!rawAppUrl) {
    throw new Error('App URL not configured. Set APP_URL or NEXT_PUBLIC_APP_URL to enable voice calls.')
  }

  const normalizedBaseUrl = rawAppUrl.replace(/\/$/, '')
  const twimlUrl = new URL(`${normalizedBaseUrl}/api/webhooks/voice/outgoing`)
  twimlUrl.searchParams.set('tenant_id', context.tenantId)
  if (context.contactId) twimlUrl.searchParams.set('contact_id', context.contactId)
  if (context.dealId) twimlUrl.searchParams.set('deal_id', context.dealId)
  twimlUrl.searchParams.set('record', recordCall ? 'true' : 'false')

  const statusCallbackUrl = `${normalizedBaseUrl}/api/webhooks/voice`

  const callResult = await voiceService.initiateCall({
    to: options.to,
    from: settings.voice_from_number!,
    url: twimlUrl.toString(),
    statusCallback: statusCallbackUrl,
    record: recordCall,
  })

  const callSid = callResult.callSid || `voice_${Date.now()}`
  const callSuccess = callResult.success

  const insights = await extractCallInsights(context.dealId ?? undefined, context.contactId ?? undefined, context.tenantId, supabase)

  let activityId: string | null = null
  const callOccurredAt = new Date().toISOString()

  try {
    // Phase 2b.11: voice activities deliberately do not get conversation_id.
    // Calls are discrete events, not threaded back-and-forth. Future
    // Conversations UI will surface voice separately. See docs/2b/2b-11-changes.md §0.4.
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: context.tenantId,
        type: 'call',
        contact_id: context.contactId ?? null,
        deal_id: context.dealId ?? null,
        agent_user_id: context.userId,
        direction: 'outbound',
        subject: 'Phone Call',
        snippet: `Call to ${options.to}`,
        integration_provider: 'twilio_voice',
        external_id: callSid,
        call_sid: callSid,
        call_from: settings.voice_from_number,
        call_to: options.to,
        outcome: callSuccess ? 'connected' : 'failed',
        message_status: callSuccess ? 'queued' : 'failed',
        metadata: {
          ai_purpose: insights.purpose,
          ai_summary: insights.summary,
          ai_outcome: null,
          recording_enabled: recordCall,
          needs_outcome_update: true,
        },
        integration_metadata: {
          recording_enabled: recordCall,
        },
        // Phase 2b.1.b.1: explicit occurred_at so the FirstResponse detector can match.
        occurred_at: callOccurredAt,
        created_at: callOccurredAt,
      })
      .select()
      .single()

    if (activityError) {
      console.error('[VOICE] Activity log insert failed:', activityError)
    } else {
      activityId = activity.id
    }
  } catch (activityInsertError) {
    console.error('[VOICE] Unexpected error logging activity:', activityInsertError)
  }

  if (activityId) {
    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'voice',
      action: 'send',
      provider: 'twilio',
      activity_id: activityId,
      external_id: callSid,
      request_data: {
        to: options.to,
        from: settings.voice_from_number,
        record: recordCall,
        statusCallback: statusCallbackUrl,
      },
      response_data: callResult.providerResponse || null,
      status: callSuccess ? 'success' : 'error',
      error_message: callSuccess ? null : callResult.error || 'Twilio Voice call failed',
    })
  }

  // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if applicable.
  // We fire even if the call failed-to-queue: a "failed call attempt" still
  // counts as the practice's first outbound action toward the deal. The detector
  // will skip if there's no deal or no fresh first_response_at stamp.
  if (context.dealId) {
    await detectAndFireFirstResponse(
      {
        tenant_id: context.tenantId,
        contact_id: context.contactId ?? null,
        deal_id: context.dealId,
        direction: 'outbound',
        occurred_at: callOccurredAt,
      },
      supabase
    )
  }

  return {
    activityId: activityId,
    callSid,
    status: callSuccess ? callResult.status || 'queued' : 'failed',
    aiPurpose: insights.purpose,
    aiSummary: insights.summary,
    success: callSuccess,
    providerResponse: callResult.providerResponse,
    error: callResult.error,
  }
}

