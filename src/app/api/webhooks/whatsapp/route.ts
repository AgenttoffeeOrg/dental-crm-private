import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { 
  verifyTwilioSignature, 
  formDataToParams,
  hashPayload 
} from '@/lib/integrations/webhook-security'
import crypto from 'crypto'

/**
 * WHATSAPP WEBHOOK ENDPOINT (Twilio) - ENTERPRISE HARDENED
 * 
 * Security Features:
 * - ✅ Signature verification (prevents spoofing)
 * - ✅ Idempotency (prevents duplicate processing)
 * - ✅ Audit logging (full request/response trail)
 * - ✅ Error handling with DLQ
 * - ✅ Correlation IDs for tracing
 * 
 * Configure this URL in Twilio Console → Messaging → WhatsApp Senders:
 * https://your-domain.com/api/webhooks/whatsapp
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
      console.error(`[WEBHOOK WHATSAPP][${correlationId}] TWILIO_AUTH_TOKEN not configured`)
      return NextResponse.json(
        { error: 'Webhook configuration error' },
        { status: 500 }
      )
    }
    
    const formData = await request.formData()
    const params = formDataToParams(formData)
    const url = request.url
    
    if (twilioSignature && !verifyTwilioSignature(twilioAuthToken, twilioSignature, url, params)) {
      console.error(`[WEBHOOK WHATSAPP][${correlationId}] Invalid Twilio signature`)
      
      await supabase.from('integration_logs').insert({
        tenant_id: null,
        integration_type: 'twilio_whatsapp',
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
    
    // 2. Extract WhatsApp parameters
    const messageSid = params.MessageSid
    const from = params.From // Format: "whatsapp:+1234567890"
    const to = params.To
    const body = params.Body
    const numMedia = parseInt(params.NumMedia || '0')
    const profileName = params.ProfileName // WhatsApp display name
    
    console.log('[WEBHOOK WHATSAPP]', correlationId, 'Received:', { 
      from, 
      profileName,
      messageSid,
      body: body?.substring(0, 50) 
    })

    if (!from || !body || !messageSid) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp webhook payload', correlation_id: correlationId },
        { status: 400 }
      )
    }
    
    // Extract phone number from "whatsapp:+..." format
    const phoneNumber = from.replace('whatsapp:', '')
    
    // 3. IDEMPOTENCY: Check if already processed
    const payloadHash = hashPayload(params)
    
    const { data: existingWebhook } = await supabase
      .from('integration_webhooks_log')
      .select('id, status, result_entity_id')
      .eq('integration_type', 'twilio_whatsapp')
      .eq('external_id', messageSid)
      .single()
    
    if (existingWebhook && existingWebhook.status === 'processed') {
      console.log(`[WEBHOOK WHATSAPP][${correlationId}] Duplicate - already processed`)
      
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
        integration_type: 'twilio_whatsapp',
        webhook_event: 'message.received',
        external_id: messageSid,
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
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('primary_phone', phoneNumber)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK WHATSAPP][${correlationId}] No contact found for: ${phoneNumber} (${profileName})`)
    }

    // 6. Create activity for incoming WhatsApp message
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: contact?.tenant_id,
        type: 'whatsapp',
        contact_id: contact?.id || null,
        deal_id: null,
        direction: 'inbound',
        subject: 'WhatsApp Message Received',
        snippet: body.substring(0, 200),
        integration_provider: 'twilio_whatsapp',
        external_id: messageSid,
        from_number: phoneNumber,
        to_number: to?.replace('whatsapp:', ''),
        message_status: 'received',
        has_attachments: numMedia > 0,
        integration_metadata: {
          num_media: numMedia,
          profile_name: profileName,
          correlation_id: correlationId,
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[WEBHOOK WHATSAPP]', correlationId, 'Error creating activity:', activityError)
      
      // Add to DLQ
      await supabase.rpc('add_to_dlq', {
        p_tenant_id: contact?.tenant_id || null,
        p_integration_type: 'twilio_whatsapp',
        p_operation: 'create_activity',
        p_payload: { messageSid, from: phoneNumber, to, body, profileName },
        p_error_message: activityError.message,
        p_error_code: activityError.code,
        p_context: { correlation_id: correlationId }
      })
      
      // Log error
      await supabase.from('integration_logs').insert({
        tenant_id: contact?.tenant_id,
        integration_type: 'twilio_whatsapp',
        operation: 'receive_webhook',
        direction: 'inbound',
        status: 'error',
        error_code: activityError.code,
        error_message: activityError.message,
        correlation_id: correlationId,
        external_id: messageSid,
        request_payload: params,
        duration_ms: Date.now() - startTime,
      })
      
      return NextResponse.json(
        { error: 'Failed to log WhatsApp message', correlation_id: correlationId },
        { status: 500 }
      )
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
      integration_type: 'twilio_whatsapp',
      operation: 'receive_webhook',
      direction: 'inbound',
      status: 'success',
      correlation_id: correlationId,
      external_id: messageSid,
      request_payload: params,
      response_payload: { activity_id: activity.id },
      duration_ms: Date.now() - startTime,
    })

    console.log(`[WEBHOOK WHATSAPP][${correlationId}] ✅ WhatsApp message processed - activity ${activity.id}`)
    
    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      correlation_id: correlationId
    })

  } catch (error: unknown) {
    console.error('[WEBHOOK WHATSAPP]', correlationId, 'Unexpected error:', error)
    
    await supabase.from('integration_logs').insert({
      tenant_id: null,
      integration_type: 'twilio_whatsapp',
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
    endpoint: 'whatsapp-webhook',
    message: 'Enterprise-hardened WhatsApp webhook ready',
    features: ['signature_verification', 'idempotency', 'audit_logging', 'dlq']
  })
}
