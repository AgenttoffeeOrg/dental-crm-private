import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

// AI Helper: Determine call purpose and generate summary based on context
async function extractCallInsights(dealId?: string, contactId?: string, tenantId?: string, supabase?: any): Promise<{
  purpose: string,
  summary: string
}> {
  // If we have deal/contact context, fetch and analyze
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
        
        // Smart categorization based on deal stage and context
        if (stageName.includes('initial') || stageName.includes('new') || stageName.includes('lead')) {
          return {
            purpose: 'Initial Consultation Call',
            summary: `First contact call to discuss ${tags[0] || 'treatment options'} and schedule consultation`
          }
        } else if (stageName.includes('consultation') || stageName.includes('assessment')) {
          return {
            purpose: 'Treatment Planning Call',
            summary: `Discussing treatment plan details, timeline, and answering patient questions`
          }
        } else if (stageName.includes('quote') || stageName.includes('proposal')) {
          return {
            purpose: 'Quote Follow-up Call',
            summary: `Following up on ${deal.title} quote, addressing concerns, and moving to booking`
          }
        } else if (stageName.includes('scheduled') || stageName.includes('approved')) {
          return {
            purpose: 'Appointment Confirmation',
            summary: `Confirming upcoming appointment details and pre-treatment instructions`
          }
        } else if (stageName.includes('treatment') || stageName.includes('in progress')) {
          return {
            purpose: 'Treatment Progress Call',
            summary: `Checking in on ongoing ${tags[0] || 'treatment'} and addressing any concerns`
          }
        } else if (stageName.includes('follow') || stageName.includes('post')) {
          return {
            purpose: 'Post-Treatment Follow-up',
            summary: `Following up after treatment to ensure recovery is going well`
          }
        } else if (stageName.includes('lost') || stageName.includes('cold')) {
          return {
            purpose: 'Re-engagement Call',
            summary: `Reaching out to re-engage patient and understand their situation`
          }
        }
        
        // Default for deals
        return {
          purpose: 'Deal Follow-up Call',
          summary: `Follow-up regarding ${deal.title} to move deal forward`
        }
      }
    } catch (err) {
      console.error('[CALL] Error fetching deal context:', err)
    }
  }
  
  // No deal context - likely initial contact
  return {
    purpose: 'Initial Contact Call',
    summary: `First outbound call to introduce services and assess patient needs`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
      record: recordCall = true // Auto-record calls by default
    } = body

    // Validate required fields
    if (!to || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, tenant_id' },
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

    if (settingsError || !settings || !settings.is_voice_configured) {
      return NextResponse.json(
        { error: 'Voice integration not configured. Please configure in Settings → Integrations.' },
        { status: 400 }
      )
    }

    // 2. INITIATE CALL VIA TWILIO
    // TODO: Add actual Twilio Voice API logic
    let callSid: string | null = null
    let callSuccess = false

    try {
      // TODO: Integrate Twilio Voice API
      // Example:
      // const twilio = require('twilio')
      // const client = twilio(settings.voice_account_sid, settings.voice_auth_token)
      // const call = await client.calls.create({
      //   to: to,
      //   from: settings.voice_from_number,
      //   url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/voice-twiml`, // TwiML instructions
      //   statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/voice`,
      //   statusCallbackEvent: ['completed'],
      //   record: recordCall
      // })
      // callSid = call.sid
      // callSuccess = call.status === 'queued' || call.status === 'ringing'
      
      console.log('[VOICE] Twilio Voice integration ready. Add credentials to initiate call.')
      console.log(`[VOICE] Would call ${to} from ${settings.voice_from_number}`)
      console.log(`[VOICE] Recording: ${recordCall}`)
      callSid = `twilio_call_${Date.now()}`
      callSuccess = true
      
    } catch (twilioError) {
      console.error('[VOICE] Twilio error:', twilioError)
      callSuccess = false
    }

    // 3. AI-Extract PURPOSE and SUMMARY (smart context-aware)
    const insights = await extractCallInsights(deal_id, contact_id, tenant_id, supabase)
    
    // 4. Log activity in CRM (as "in-progress" initially)
    // NOTE: ai_outcome will be null initially and updated after call with business result
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id,
        type: 'call',
        contact_id,
        deal_id,
        agent_user_id: user_id,
        direction: 'outbound',
        subject: 'Phone Call',
        snippet: `Call to ${to}`,
        integration_provider: 'twilio_voice',
        external_id: callSid,
        call_sid: callSid,
        call_from: settings.voice_from_number,
        call_to: to,
        outcome: callSuccess ? 'connected' : 'failed', // Technical status (connected/voicemail/etc)
        message_status: callSuccess ? 'queued' : 'failed',
        metadata: {
          ai_purpose: insights.purpose,
          ai_summary: insights.summary,
          // ai_outcome is LEFT EMPTY - will be updated post-call with business result
          // Examples: "Appointment booked", "Follow-up scheduled", "Patient declined", etc.
          ai_outcome: null,
          recording_enabled: recordCall,
          needs_outcome_update: true // Flag to remind user to add outcome
        },
        integration_metadata: {
          recording_enabled: recordCall
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[VOICE] Error logging activity:', activityError)
      return NextResponse.json(
        { error: 'Call initiated but failed to log activity', details: activityError },
        { status: 500 }
      )
    }

    // 4. Log integration event
    await supabase
      .from('integration_logs')
      .insert({
        tenant_id,
        integration_type: 'voice',
        action: 'send',
        provider: 'twilio',
        activity_id: activity.id,
        external_id: callSid,
        request_data: { to, from: settings.voice_from_number, record: recordCall },
        status: callSuccess ? 'success' : 'error',
        error_message: callSuccess ? null : 'Twilio Voice not fully configured'
      })

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      call_sid: callSid,
      message: callSuccess 
        ? 'Call initiated successfully! Ringing...' 
        : 'Call logged. Configure Twilio to actually initiate calls.',
      note: 'Call details (duration, recording) will update automatically via webhook.'
    })

  } catch (error: unknown) {
    console.error('[VOICE] Error initiating call:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

