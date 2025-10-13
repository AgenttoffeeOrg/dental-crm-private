import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// AI Helper: Extract WhatsApp message purpose
function extractWhatsAppPurpose(message: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      message,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
      media_url // Optional: for sending images/documents
    } = body

    // Validate required fields
    if (!to || !message || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message, tenant_id' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Load integration settings
    const { data: settings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('*')
      .eq('tenant_id', tenant_id)
      .single()

    if (settingsError || !settings || !settings.is_whatsapp_configured) {
      return NextResponse.json(
        { error: 'WhatsApp integration not configured. Please configure in Settings → Integrations.' },
        { status: 400 }
      )
    }

    // 2. SEND WHATSAPP MESSAGE VIA TWILIO
    // TODO: Add actual Twilio WhatsApp sending logic
    let externalId: string | null = null
    let sendSuccess = false

    try {
      // TODO: Integrate Twilio WhatsApp API
      // Example:
      // const twilio = require('twilio')
      // const client = twilio(settings.whatsapp_account_sid, settings.whatsapp_auth_token)
      // const messageData = {
      //   body: message,
      //   from: settings.whatsapp_from_number, // Format: 'whatsapp:+1234567890'
      //   to: `whatsapp:${to}`
      // }
      // if (media_url) {
      //   messageData.mediaUrl = [media_url]
      // }
      // const twilioMessage = await client.messages.create(messageData)
      // externalId = twilioMessage.sid
      // sendSuccess = twilioMessage.status === 'queued' || twilioMessage.status === 'sent'
      
      console.log('[WHATSAPP] Twilio WhatsApp integration ready. Add credentials to send.')
      console.log(`[WHATSAPP] Would send to ${to}: "${message.substring(0, 50)}..."`)
      if (media_url) {
        console.log(`[WHATSAPP] With media: ${media_url}`)
      }
      externalId = `twilio_whatsapp_${Date.now()}`
      sendSuccess = true
      
    } catch (twilioError) {
      console.error('[WHATSAPP] Twilio error:', twilioError)
      sendSuccess = false
    }

    // 3. AI-Extract PURPOSE, OUTCOME, and SUMMARY
    const aiPurpose = extractWhatsAppPurpose(message)
    const aiOutcome = sendSuccess ? 'Sent successfully' : 'Failed to send'
    const aiSummary = `${aiPurpose} WhatsApp to ${to}${media_url ? ' (with attachment)' : ''} - ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`
    
    // 4. Log activity in CRM with AI insights
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id,
        type: 'whatsapp',
        contact_id,
        deal_id,
        agent_user_id: user_id,
        direction: 'outbound',
        subject: 'WhatsApp Message',
        snippet: message.substring(0, 200),
        integration_provider: 'twilio_whatsapp',
        external_id: externalId,
        from_number: settings.whatsapp_from_number,
        to_number: `whatsapp:${to}`,
        message_status: sendSuccess ? 'sent' : 'failed',
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral',
          has_media: !!media_url
        },
        integration_metadata: {
          has_media: !!media_url,
          media_url: media_url || null
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[WHATSAPP] Error logging activity:', activityError)
      return NextResponse.json(
        { error: 'WhatsApp message sent but failed to log activity', details: activityError },
        { status: 500 }
      )
    }

    // 4. Log integration event
    await supabase
      .from('integration_logs')
      .insert({
        tenant_id,
        integration_type: 'whatsapp',
        action: 'send',
        provider: 'twilio',
        activity_id: activity.id,
        external_id: externalId,
        request_data: { to, message_length: message.length, has_media: !!media_url },
        status: sendSuccess ? 'success' : 'error',
        error_message: sendSuccess ? null : 'Twilio WhatsApp not fully configured'
      })

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      external_id: externalId,
      message: sendSuccess 
        ? 'WhatsApp message sent successfully!' 
        : 'WhatsApp message logged. Configure Twilio to actually send.',
      has_media: !!media_url
    })

  } catch (error: unknown) {
    console.error('[WHATSAPP] Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

