import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * VOICESTACK WEBHOOK ENDPOINT
 * 
 * This endpoint receives incoming call events from VoiceStack
 * Configure this URL in your VoiceStack admin panel:
 * https://your-domain.com/api/webhooks/voicestack
 * 
 * VoiceStack will send webhooks for:
 * - New incoming calls
 * - Call completed
 * - Recording available
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // VoiceStack webhook payload structure (adjust based on actual API)
    const {
      call_id,
      from_number,
      to_number,
      direction, // 'inbound' or 'outbound'
      status, // 'ringing', 'answered', 'completed', 'missed'
      duration_seconds,
      recording_url,
      transcription_url,
      started_at,
      ended_at
    } = body

    console.log('[WEBHOOK VOICESTACK] Received call event:', {
      call_id,
      from_number,
      status,
      duration_seconds
    })

    if (!call_id || !from_number) {
      return NextResponse.json(
        { error: 'Invalid VoiceStack webhook payload' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Find contact by phone number
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .or(`primary_phone.eq.${from_number},secondary_phone.eq.${from_number}`)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK VOICESTACK] No contact found for number: ${from_number}`)
      // TODO: Create new lead or alert team
    }

    // 2. Check if activity already exists for this call
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('external_id', `voicestack_${call_id}`)
      .limit(1)

    const existingActivity = existingActivities && existingActivities.length > 0 ? existingActivities[0] : null

    if (existingActivity && status === 'completed') {
      // UPDATE existing activity with final details
      const { error: updateError } = await supabase
        .from('activities')
        .update({
          outcome: status === 'completed' ? 'connected' : (status === 'missed' ? 'no_answer' : status),
          duration_seconds,
          recording_url,
          message_status: 'delivered',
          integration_metadata: {
            transcription_url,
            call_id,
            voicestack_data: body
          },
        })
        .eq('id', existingActivity.id)

      if (updateError) {
        console.error('[WEBHOOK VOICESTACK] Error updating activity:', updateError)
        return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
      }

      // Trigger transcription if recording is available
      if (recording_url) {
        console.log(`[WEBHOOK VOICESTACK] Recording available: ${recording_url}`)
        console.log('[WEBHOOK VOICESTACK] TODO: Trigger transcription job')
        // TODO: Call /api/ai/transcribe-call with recording_url
      }

      console.log(`[WEBHOOK VOICESTACK] ✅ Updated activity ${existingActivity.id}`)

      return NextResponse.json({
        success: true,
        activity_id: existingActivity.id,
        status: 'updated'
      })
      
    } else if (!existingActivity) {
      // CREATE new activity for this call
      const { data: activity, error: activityError } = await supabase
        .from('activities')
        .insert({
          tenant_id: contact?.tenant_id || body.tenant_id || request.headers.get('X-Tenant-ID'),
          type: 'call',
          contact_id: contact?.id || null,
          deal_id: null, // TODO: Smart deal linking based on recent interactions
          direction: direction || 'inbound',
          subject: `${direction === 'inbound' ? 'Incoming' : 'Outgoing'} Call`,
          snippet: `Call ${direction === 'inbound' ? 'from' : 'to'} ${from_number}`,
          integration_provider: 'voicestack',
          external_id: `voicestack_${call_id}`,
          call_from: direction === 'inbound' ? from_number : to_number,
          call_to: direction === 'inbound' ? to_number : from_number,
          outcome: status === 'completed' ? 'connected' : (status === 'missed' ? 'no_answer' : status),
          duration_seconds: duration_seconds || null,
          recording_url: recording_url || null,
          message_status: status,
          integration_metadata: {
            call_id,
            transcription_url,
            voicestack_data: body
          },
          occurred_at: started_at || new Date().toISOString(),
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (activityError) {
        console.error('[WEBHOOK VOICESTACK] Error creating activity:', activityError)
        return NextResponse.json({ error: 'Failed to log call' }, { status: 500 })
      }

      console.log(`[WEBHOOK VOICESTACK] ✅ Call logged as activity ${activity.id}`)

      // Trigger transcription if recording is available
      if (recording_url) {
        console.log(`[WEBHOOK VOICESTACK] Recording available, triggering transcription`)
        // TODO: Call /api/ai/transcribe-call
        // Then /api/ai/summarize-call
      }

      return NextResponse.json({
        success: true,
        activity_id: activity.id,
        status: 'created'
      })
    }

    return NextResponse.json({ success: true, message: 'Event received' })

  } catch (error: unknown) {
    console.error('[WEBHOOK VOICESTACK] Error:', error)
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
    endpoint: 'voicestack-webhook',
    message: 'VoiceStack webhook is active and ready to receive call events',
    supported_events: ['call.started', 'call.answered', 'call.completed', 'recording.available']
  })
}


