import { createServiceClient } from '@/lib/supabase-server'
import { sendEmailWithIntegration } from '@/lib/integrations/email-provider'
import { smsService } from '@/lib/sms-service'
import { whatsappService } from '@/lib/whatsapp-service'
import { voiceService } from '@/lib/voice-service'
import { recordProviderFailure } from '@/lib/monitoring/metrics'
import { loadTenantIntegrationSettings } from '@/lib/integrations/tenant-integration-config'
import { detectAndFireFirstResponse } from '@/lib/conversions/first-response-detector'

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

function inferEmailPurpose(subject: string, html: string): string {
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

function inferSmsPurpose(message: string): string {
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

function inferWhatsAppPurpose(message: string): string {
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

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  if (!settings || !settings.is_email_configured) {
    recordProviderFailure('email', 'send', 'Email integration not configured')
    throw new Error('Email integration not configured. Please configure in Settings → Integrations.')
  }

  const emailSettings = {
    email_provider: settings.email_provider,
    email_api_key: settings.email_api_key,
    email_from_address: settings.email_from_address,
    email_from_name: settings.email_from_name,
    email_oauth_token: undefined,
    email_oauth_refresh_token: undefined,
    email_oauth_expires_at: undefined,
  }

  const sendResult = await sendEmailWithIntegration(emailSettings, {
    to: options.to,
    cc: options.cc,
    bcc: options.bcc,
    subject: options.subject,
    html: options.html,
    fromEmail: settings.email_from_address || undefined,
    fromName: settings.email_from_name || undefined,
    replyTo: settings.email_reply_to_address || undefined,
  })

  if (!sendResult.success) {
    recordProviderFailure(settings.email_provider || 'email', 'send', sendResult.error || 'Unknown error')
    throw new Error(sendResult.error || 'Email send failed')
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

  const aiPurpose = inferEmailPurpose(options.subject, options.html)
  const aiOutcome = sendResult.status === 'failed' ? 'Failed to send' : 'Sent successfully'
  const aiSummary = `${aiPurpose} email to ${options.to.join(', ')}`
  const emailOccurredAt = new Date().toISOString()

  const { data: activity, error: activityError } = await supabase
    .from('activities')
    .insert({
      tenant_id: context.tenantId,
      type: 'email',
      contact_id: context.contactId ?? null,
      deal_id: context.dealId ?? null,
      agent_user_id: context.userId,
      direction: 'outbound',
      subject: options.subject,
      snippet: options.html.substring(0, 200),
      rich_content: options.html,
      integration_provider: settings.email_provider,
      external_id: sendResult.externalId || null,
      email_to: options.to,
      email_cc: options.cc || [],
      email_bcc: options.bcc || [],
      email_from: settings.email_from_address,
      message_status: sendResult.status || 'sent',
      metadata: {
        ai_purpose: aiPurpose,
        ai_outcome: aiOutcome,
        ai_summary: aiSummary,
        ai_sentiment: 'neutral',
      },
      // Phase 2b.1.b.1: explicit occurred_at so the FirstResponse detector can
      // match it against deals.first_response_at (set by the AFTER INSERT trigger).
      occurred_at: emailOccurredAt,
      created_at: emailOccurredAt,
    })
    .select()
    .single()

  if (activityError) {
    console.error('[EMAIL] Activity log insert failed:', activityError)
  } else if (activity) {
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
        body_length: options.html.length,
        ai_purpose: aiPurpose,
      },
      response_data: sendResult.providerResponse || null,
      status: sendResult.success ? 'success' : 'error',
      error_message: sendResult.success ? null : sendResult.error || null,
    })
  }

  // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if this is
  // the first outbound activity for the deal. Best-effort.
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

  return {
    activityId: activity?.id ?? null,
    externalId: sendResult.externalId || null,
    status: sendResult.status || 'sent',
    aiPurpose,
    aiOutcome,
    aiSummary,
  }
}

export async function dispatchSms(options: {
  context: BaseContext
  to: string
  message: string
}) {
  const supabase = createServiceClient()
  const { context } = options

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  if (!settings || !settings.is_sms_configured) {
    recordProviderFailure('twilio_sms', 'send', 'SMS integration not configured')
    throw new Error('SMS integration not configured. Please configure in Settings → Integrations.')
  }

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
    recordProviderFailure('twilio_sms', 'send', 'SMS send failed')
    throw new Error('Failed to send SMS')
  }

  const aiPurpose = inferSmsPurpose(options.message)
  const aiOutcome = sendResult.status === 'failed' ? 'Failed to send' : 'Sent successfully'
  const aiSummary = `${aiPurpose} SMS to ${options.to}`
  const smsOccurredAt = new Date().toISOString()

  const { data: activity, error: activityError } = await supabase
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
      external_id: sendResult.messageId || null,
      from_number: settings.sms_from_number || null,
      to_number: options.to,
      message_status: sendResult.status || 'queued',
      metadata: {
        ai_purpose: aiPurpose,
        ai_outcome: aiOutcome,
        ai_summary: aiSummary,
        ai_sentiment: 'neutral',
      },
      // Phase 2b.1.b.1: explicit occurred_at so the FirstResponse detector can match.
      occurred_at: smsOccurredAt,
      created_at: smsOccurredAt,
    })
    .select()
    .single()

  if (activityError) {
    console.error('[SMS] Activity log insert failed:', activityError)
  } else if (activity) {
    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'sms',
      action: 'send',
      provider: 'twilio',
      activity_id: activity.id,
      external_id: sendResult.messageId || null,
      request_data: { to: options.to, message_length: options.message.length, ai_purpose: aiPurpose },
      response_data: sendResult.providerResponse || null,
      status: sendResult.success ? 'success' : 'error',
      error_message: sendResult.success ? null : 'Twilio send failed',
    })
  }

  // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if applicable.
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

  return {
    activityId: activity?.id ?? null,
    externalId: sendResult.messageId || null,
    status: sendResult.status || 'queued',
    aiPurpose,
    aiOutcome,
    aiSummary,
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

  const settings = await loadTenantIntegrationSettings(context.tenantId, { supabase })

  if (!settings || !settings.is_whatsapp_configured) {
    recordProviderFailure('twilio_whatsapp', 'send', 'WhatsApp integration not configured')
    throw new Error('WhatsApp integration not configured. Please configure in Settings → Integrations.')
  }

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
    recordProviderFailure('twilio_whatsapp', 'send', 'WhatsApp send failed')
    throw new Error('Failed to send WhatsApp message')
  }

  const aiPurpose = inferWhatsAppPurpose(options.message)
  const aiOutcome = sendResult.status === 'failed' ? 'Failed to send' : 'Sent successfully'
  const aiSummary = `${aiPurpose} WhatsApp to ${options.to}${options.mediaUrl ? ' (with attachment)' : ''}`
  const whatsappOccurredAt = new Date().toISOString()

  const { data: activity, error: activityError } = await supabase
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
      external_id: sendResult.messageId || null,
      from_number: settings.whatsapp_from_number,
      to_number: `whatsapp:${options.to}`,
      message_status: sendResult.status || 'queued',
      metadata: {
        ai_purpose: aiPurpose,
        ai_outcome: aiOutcome,
        ai_summary: aiSummary,
        ai_sentiment: 'neutral',
        has_media: Boolean(options.mediaUrl),
      },
      integration_metadata: {
        has_media: Boolean(options.mediaUrl),
        media_url: options.mediaUrl || null,
      },
      // Phase 2b.1.b.1: explicit occurred_at so the FirstResponse detector can match.
      occurred_at: whatsappOccurredAt,
      created_at: whatsappOccurredAt,
    })
    .select()
    .single()

  if (activityError) {
    console.error('[WHATSAPP] Activity log insert failed:', activityError)
  } else if (activity) {
    await supabase.from('integration_logs').insert({
      tenant_id: context.tenantId,
      integration_type: 'whatsapp',
      action: 'send',
      provider: 'twilio',
      activity_id: activity.id,
      external_id: sendResult.messageId || null,
      request_data: { to: options.to, message_length: options.message.length, has_media: Boolean(options.mediaUrl), ai_purpose: aiPurpose },
      response_data: sendResult.providerResponse || null,
      status: sendResult.success ? 'success' : 'error',
      error_message: sendResult.success ? null : 'Twilio WhatsApp send failed',
    })
  }

  // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if applicable.
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

  return {
    activityId: activity?.id ?? null,
    externalId: sendResult.messageId || null,
    status: sendResult.status || 'queued',
    aiPurpose,
    aiOutcome,
    aiSummary,
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

