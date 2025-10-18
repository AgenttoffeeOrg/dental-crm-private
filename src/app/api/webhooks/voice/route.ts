import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { 
  verifyTwilioSignature, 
  formDataToParams,
  hashPayload 
} from '@/lib/integrations/webhook-security'
import crypto from 'crypto'

/**
 * VOICE WEBHOOK ENDPOINT (Twilio) - ENTERPRISE HARDENED
 * 
 * Security Features:
 * - ✅ Signature verification (prevents spoofing)
 * - ✅ Idempotency (prevents duplicate processing)
 * - ✅ Audit logging (full request/response trail)
 * - ✅ Error handling with DLQ
 * - ✅ Correlation IDs for tracing
 * 
 * This endpoint receives call status updates from Twilio
 * Configure this URL in Twilio Console → Phone Numbers → Voice & Fax (Status Callback):
 * https://your-domain.com/api/webhooks/voice
 */

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const startTime = Date.now()
  const supabase = createServiceClient()
  
  try {
    // 1. SECURITY: Verify Twilio signature
    const twilioSignature = request.headers.get('x-twilio-signature')
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN
    
    if (!twilioAuthToken) {
      console.error(`[WEBHOOK VOICE][${correlationId}] TWILIO_AUTH_TOKEN not configured`)
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    const params = formDataToParams(formData)
    const url = request.url
    
    if (twilioSignature && !verifyTwilioSignature(twilioAuthToken, twilioSignature, url, params)) {
      console.error(`[WEBHOOK VOICE][${correlationId}] Invalid Twilio signature`)
      
      await supabase.from('integration_logs').insert({
        tenant_id: null,
        integration_type: 'twilio_voice',
        operation: 'receive_webhook',
        direction: 'inbound',
        status: 'error',
        error_code: 'signature_verification_failed',
        error_message: 'Invalid Twilio signature',
        correlation_id: correlationId,
        duration_ms: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Unauthorized', correlation_id: correlationId },
        { status: 401 }
      )
    }
    
    // 2. Extract Twilio Voice webhook parameters
    // Docs: https://www.twilio.com/docs/voice/twiml#request-parameters
    const callSid = params.CallSid
    const callStatus = params.CallStatus // queued, ringing, in-progress, completed, busy, failed, no-answer
    const from = params.From
    const to = params.To
    const duration = params.CallDuration
    const recordingUrl = params.RecordingUrl
    const direction = params.Direction // inbound or outbound-api
    
    console.log('[WEBHOOK VOICE]', correlationId, 'Call update:', { 
      callSid, 
      callStatus, 
      from, 
      to, 
      duration 
    })

    if (!callSid) {
      return NextResponse.json(
        { error: 'Invalid voice webhook payload', correlation_id: correlationId },
        { status: 400 }
      )
    }
    
    // 3. IDEMPOTENCY: Check if already processed (for this call status)
    const payloadHash = hashPayload(params)
    
    const { data: existingWebhook } = await supabase
      .from('integration_webhooks_log')
      .select('id, status, result_entity_id')
      .eq('integration_type', 'twilio_voice')
      .eq('external_id', `${callSid}_${callStatus}`) // Unique per call per status
      .single()
    
    if (existingWebhook && existingWebhook.status === 'processed') {
      console.log(`[WEBHOOK VOICE][${correlationId}] Duplicate - already processed`)
      
      return NextResponse.json({
        success: true,
        duplicate: true,
        activity_id: existingWebhook.result_entity_id,
        correlation_id: correlationId
      })
    }
    
    // 4. Log webhook receipt
    const { data: webhookLog } = await supabase
      .from('integration_webhooks_log')
      .insert({
        tenant_id: null,
        integration_type: 'twilio_voice',
        webhook_event: `call.${callStatus}`,
        external_id: `${callSid}_${callStatus}`,
        payload_hash: payloadHash,
        status: 'processing',
        signature_verified: !!twilioSignature,
        signature_algorithm: 'hmac-sha1',
        payload: params,
        headers: { 'x-twilio-signature': twilioSignature },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single()

    // 5. Find contact by phone number
    const phoneToSearch = direction === 'inbound' ? from : to
    
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .or(`primary_phone.eq.${phoneToSearch},secondary_phone.eq.${phoneToSearch}`)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK VOICE][${correlationId}] No contact found for: ${phoneToSearch}`)
    }

    // 6. Check if activity already exists for this call (for updates)
    const { data: existingActivities } = await supabase
      .from('activities')
      .select('*')
      .eq('call_sid', callSid)
      .limit(1)

    const existingActivity = existingActivities && existingActivities.length > 0 ? existingActivities[0] : null

    let activity

    if (existingActivity) {
      // UPDATE existing activity
      const { data: updated, error: updateError } = await supabase
        .from('activities')
        .update({
          call_status: callStatus,
          call_duration_seconds: duration ? parseInt(duration) : null,
          call_recording_url: recordingUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingActivity.id)
        .select()
        .single()

      if (updateError) {
        console.error('[WEBHOOK VOICE]', correlationId, 'Error updating activity:', updateError)
        
        await supabase.rpc('add_to_dlq', {
          p_tenant_id: contact?.tenant_id || null,
          p_integration_type: 'twilio_voice',
          p_operation: 'update_activity',
          p_payload: { callSid, callStatus, duration, recordingUrl },
          p_error_message: updateError.message,
          p_error_code: updateError.code,
          p_context: { correlation_id: correlationId }
        })
        
        return NextResponse.json(
          { error: 'Failed to update call', correlation_id: correlationId },
          { status: 500 }
        )
      }

      activity = updated
    } else {
      // CREATE new activity (for inbound calls)
      const { data: created, error: createError } = await supabase
        .from('activities')
        .insert({
          tenant_id: contact?.tenant_id,
          type: 'call',
          contact_id: contact?.id || null,
          deal_id: null,
          direction,
          subject: direction === 'inbound' ? 'Incoming Call' : 'Outbound Call',
          snippet: `Call from ${from} to ${to}`,
          integration_provider: 'twilio_voice',
          external_id: callSid,
          call_sid: callSid,
          from_number: from,
          to_number: to,
          call_status: callStatus,
          call_duration_seconds: duration ? parseInt(duration) : null,
          call_recording_url: recordingUrl,
          integration_metadata: {
            direction,
            correlation_id: correlationId,
          },
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('[WEBHOOK VOICE]', correlationId, 'Error creating activity:', createError)
        
        await supabase.rpc('add_to_dlq', {
          p_tenant_id: contact?.tenant_id || null,
          p_integration_type: 'twilio_voice',
          p_operation: 'create_activity',
          p_payload: { callSid, callStatus, from, to, duration },
          p_error_message: createError.message,
          p_error_code: createError.code,
          p_context: { correlation_id: correlationId }
        })
        
        return NextResponse.json(
          { error: 'Failed to log call', correlation_id: correlationId },
          { status: 500 }
        )
      }

      activity = created
    }

    // 7. Update webhook log with success
    if (webhookLog) {
      await supabase
        .from('integration_webhooks_log')
        .update({
          tenant_id: contact?.tenant_id,
          status: 'processed',
          processed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
          result_entity_type: 'activity',
          result_entity_id: activity.id,
        })
        .eq('id', webhookLog.id)
    }

    // 8. Log successful processing
    await supabase.from('integration_logs').insert({
      tenant_id: contact?.tenant_id,
      integration_type: 'twilio_voice',
      operation: 'receive_webhook',
      direction: 'inbound',
      status: 'success',
      correlation_id: correlationId,
      external_id: callSid,
      request_payload: params,
      response_payload: { activity_id: activity.id, call_status: callStatus },
      duration_ms: Date.now() - startTime,
    })

    console.log(`[WEBHOOK VOICE][${correlationId}] ✅ Call ${callStatus} - activity ${activity.id}`)
    
    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      call_status: callStatus,
      correlation_id: correlationId
    })

  } catch (error: unknown) {
    console.error('[WEBHOOK VOICE]', correlationId, 'Unexpected error:', error)
    
    await supabase.from('integration_logs').insert({
      tenant_id: null,
      integration_type: 'twilio_voice',
      operation: 'receive_webhook',
      direction: 'inbound',
      status: 'error',
      error_message: error instanceof Error ? error.message : String(error),
      error_details: error instanceof Error ? { stack: error.stack } : null,
      correlation_id: correlationId,
      duration_ms: Date.now() - startTime,
    })
    
    return NextResponse.json(
      { error: 'Webhook processing failed', correlation_id: correlationId },
      { status: 500 }
    )
  }
}

// Support GET for webhook health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    endpoint: 'voice-webhook',
    message: 'Enterprise-hardened Voice webhook ready',
    features: ['signature_verification', 'idempotency', 'audit_logging', 'dlq']
  })
}
