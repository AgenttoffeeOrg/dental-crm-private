import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * VOICE WEBHOOK ENDPOINT (Twilio)
 * 
 * This endpoint receives call status updates from Twilio
 * Configure this URL in Twilio Console → Phone Numbers → Voice & Fax (Status Callback):
 * https://your-domain.com/api/webhooks/voice
 */

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form data
    const formData = await request.formData()
    
    // Extract Twilio Voice webhook parameters
    // Full list: https://www.twilio.com/docs/voice/twiml#request-parameters
    const callSid = formData.get('CallSid') as string
    const callStatus = formData.get('CallStatus') as string // queued, ringing, in-progress, completed, busy, failed, no-answer
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const duration = formData.get('CallDuration') as string
    const recordingUrl = formData.get('RecordingUrl') as string
    const direction = formData.get('Direction') as string // inbound or outbound-api
    
    console.log('[WEBHOOK VOICE] Call update:', { callSid, callStatus, from, to, duration })

    if (!callSid) {
      return NextResponse.json(
        { error: 'Invalid voice webhook payload' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Find existing activity by call_sid (for outbound) or create new (for inbound)
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('call_sid', callSid)
      .limit(1)

    const existingActivity = existingActivities && existingActivities.length > 0 ? existingActivities[0] : null

    if (existingActivity) {
      // UPDATE existing activity (outbound call status update)
      const updateData: any = {
        message_status: callStatus === 'completed' ? 'delivered' : callStatus,
        outcome: callStatus,
        updated_at: new Date().toISOString()
      }

      if (duration) {
        updateData.duration_seconds = parseInt(duration)
      }

      if (recordingUrl) {
        updateData.recording_url = recordingUrl
        updateData.integration_metadata = {
          ...(existingActivity.integration_metadata || {}),
          recording_url: recordingUrl
        }
      }

      const { error: updateError } = await supabase
        .from('activities')
        .update(updateData)
        .eq('id', existingActivity.id)

      if (updateError) {
        console.error('[WEBHOOK VOICE] Error updating activity:', updateError)
        return NextResponse.json({ error: 'Failed to update call activity' }, { status: 500 })
      }

      console.log(`[WEBHOOK VOICE] ✅ Updated activity ${existingActivity.id} with status ${callStatus}`)

      return NextResponse.json({
        success: true,
        activity_id: existingActivity.id,
        status: callStatus
      })
      
    } else if (direction === 'inbound') {
      // CREATE new activity for inbound call
      const phoneNumber = from

      // Find contact by phone number
      const { data: contacts } = await supabase
        .from('contacts')
        .select('*')
        .eq('primary_phone', phoneNumber)
        .limit(1)

      const contact = contacts && contacts.length > 0 ? contacts[0] : null

      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          tenant_id: contact?.tenant_id || '550e8400-e29b-41d4-a716-446655440000',
          type: 'call',
          contact_id: contact?.id || null,
          deal_id: null, // TODO: Smart deal linking
          direction: 'inbound',
          subject: 'Incoming Call',
          snippet: `Call from ${phoneNumber}`,
          integration_provider: 'twilio_voice',
          external_id: callSid,
          call_sid: callSid,
          call_from: from,
          call_to: to,
          outcome: callStatus,
          duration_seconds: duration ? parseInt(duration) : null,
          recording_url: recordingUrl || null,
          message_status: callStatus,
          integration_metadata: {
            recording_url: recordingUrl || null
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (activityError) {
        console.error('[WEBHOOK VOICE] Error creating activity:', activityError)
        return NextResponse.json({ error: 'Failed to log incoming call' }, { status: 500 })
      }

      console.log(`[WEBHOOK VOICE] ✅ Incoming call logged as activity ${activity.id}`)

      // TODO: Trigger AI transcription if recording exists
      if (recordingUrl) {
        console.log(`[WEBHOOK VOICE] Recording available: ${recordingUrl}`)
        // Trigger transcription job
      }

      return NextResponse.json({
        success: true,
        activity_id: activity.id
      })
    }

    return NextResponse.json({ success: true, message: 'Call status received' })

  } catch (error: unknown) {
    console.error('[WEBHOOK VOICE] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Support GET for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    endpoint: 'voice-webhook',
    message: 'Voice webhook is active and ready to receive call events'
  })
}

