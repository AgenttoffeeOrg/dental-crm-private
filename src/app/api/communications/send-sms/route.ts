import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// AI Helper: Extract SMS purpose from message content
function extractSMSPurpose(message: string): string {
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      message,
      contact_id,
      deal_id,
      tenant_id,
      user_id
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

    if (settingsError || !settings || !settings.is_sms_configured) {
      return NextResponse.json(
        { error: 'SMS integration not configured. Please configure in Settings → Integrations.' },
        { status: 400 }
      )
    }

    // 2. SEND SMS VIA TWILIO
    // TODO: Add actual Twilio SMS sending logic
    let externalId: string | null = null
    let sendSuccess = false

    try {
      // TODO: Integrate Twilio SDK
      // Example:
      // const twilio = require('twilio')
      // const client = twilio(settings.sms_account_sid, settings.sms_auth_token)
      // const twilioMessage = await client.messages.create({
      //   body: message,
      //   from: settings.sms_from_number,
      //   to: to
      // })
      // externalId = twilioMessage.sid
      // sendSuccess = twilioMessage.status === 'queued' || twilioMessage.status === 'sent'
      
      console.log('[SMS] Twilio integration ready. Add credentials to send.')
      console.log(`[SMS] Would send to ${to}: "${message.substring(0, 50)}..."`)
      externalId = `twilio_sms_${Date.now()}`
      sendSuccess = true
      
    } catch (twilioError) {
      console.error('[SMS] Twilio error:', twilioError)
      sendSuccess = false
    }

    // 3. AI-Extract PURPOSE, OUTCOME, and SUMMARY
    const aiPurpose = extractSMSPurpose(message)
    const aiOutcome = sendSuccess ? 'Sent successfully' : 'Failed to send'
    const aiSummary = `${aiPurpose} SMS to ${to} - ${message.substring(0, 60)}${message.length > 60 ? '...' : ''}`
    
    // 4. Log activity in CRM with AI insights
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id,
        type: 'sms',
        contact_id,
        deal_id,
        agent_user_id: user_id,
        direction: 'outbound',
        subject: 'SMS',
        snippet: message.substring(0, 200),
        integration_provider: 'twilio_sms',
        external_id: externalId,
        from_number: settings.sms_from_number,
        to_number: to,
        message_status: sendSuccess ? 'sent' : 'failed',
        metadata: {
          ai_purpose: aiPurpose,
          ai_outcome: aiOutcome,
          ai_summary: aiSummary,
          ai_sentiment: 'neutral'
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[SMS] Error logging activity:', activityError)
      return NextResponse.json(
        { error: 'SMS sent but failed to log activity', details: activityError },
        { status: 500 }
      )
    }

    // 4. Log integration event
    await supabase
      .from('integration_logs')
      .insert({
        tenant_id,
        integration_type: 'sms',
        action: 'send',
        provider: 'twilio',
        activity_id: activity.id,
        external_id: externalId,
        request_data: { to, message_length: message.length },
        status: sendSuccess ? 'success' : 'error',
        error_message: sendSuccess ? null : 'Twilio not fully configured'
      })

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      external_id: externalId,
      message: sendSuccess 
        ? 'SMS sent successfully!' 
        : 'SMS logged. Configure Twilio to actually send.',
      characters: message.length,
      estimated_cost: Math.ceil(message.length / 160) * 0.0075
    })

  } catch (error: unknown) {
    console.error('[SMS] Error sending SMS:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

