/**
 * Phase 2b.26.4 — Twilio voice transcription callback.
 *
 * Twilio fires this URL after `<Record transcribe="true"
 * transcribeCallback="/api/webhooks/voice/transcription"/>` finishes
 * processing a call recording (or voicemail). The body carries
 * `CallSid`, `RecordingSid`, `TranscriptionStatus`,
 * `TranscriptionText`.
 *
 * Flow:
 *   1. Verify Twilio signature (same path as the main voice route).
 *   2. Find the existing voice activity by call_sid (the main voice
 *      route already created it on the initial status callback).
 *   3. Hand the transcript + activity to `promoteVoiceActivityToDeal`
 *      which runs the AI judgement and either reuses an open deal in
 *      the matching pipeline, creates a new deal in a different
 *      pipeline, or leaves the activity on the contact (the strict
 *      voice rule: don't pollute deals with admin / billing /
 *      reschedule chatter).
 *
 * Configure in Twilio Console (Studio flow or TwiML bin) by adding
 * `transcribeCallback="https://<host>/api/webhooks/voice/transcription"`
 * to the existing `<Record>` verb.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import {
  verifyTwilioSignature,
  formDataToParams,
  hashPayload,
} from '@/lib/integrations/webhook-security'
import { promoteVoiceActivityToDeal } from '@/lib/voice/promote-to-deal'
import crypto from 'crypto'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const correlationId = crypto.randomUUID()
  const startTime = Date.now()
  const supabase = createServiceClient()

  try {
    const twilioSignature = request.headers.get('x-twilio-signature')
    const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN

    if (!twilioAuthToken) {
      console.error(`[WEBHOOK VOICE-TRANSCRIPT][${correlationId}] TWILIO_AUTH_TOKEN not configured`)
      return NextResponse.json(
        { error: 'Webhook configuration error', correlation_id: correlationId },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const params = formDataToParams(formData)
    if (
      twilioSignature &&
      !verifyTwilioSignature(twilioAuthToken, twilioSignature, request.url, params)
    ) {
      console.error(`[WEBHOOK VOICE-TRANSCRIPT][${correlationId}] Invalid Twilio signature`)
      return NextResponse.json(
        { error: 'Unauthorized', correlation_id: correlationId },
        { status: 401 }
      )
    }

    const callSid = params.CallSid
    const transcriptionStatus = params.TranscriptionStatus // 'completed' | 'failed'
    const transcriptText = params.TranscriptionText
    const recordingSid = params.RecordingSid

    if (!callSid) {
      return NextResponse.json(
        { error: 'Missing CallSid', correlation_id: correlationId },
        { status: 400 }
      )
    }

    // Idempotency — Twilio retries transcription callbacks on 5xx.
    const payloadHash = hashPayload(params)
    const idempotencyKey = `${callSid}_${recordingSid ?? 'no-rec'}_transcript`

    const { data: existingLog } = await supabase
      .from('integration_webhooks_log')
      .select('id, status, result_entity_id')
      .eq('integration_type', 'twilio_voice_transcription')
      .eq('external_id', idempotencyKey)
      .maybeSingle()

    if (existingLog && existingLog.status === 'processed') {
      return NextResponse.json({
        success: true,
        duplicate: true,
        correlation_id: correlationId,
      })
    }

    const { data: webhookLog } = await supabase
      .from('integration_webhooks_log')
      .insert({
        tenant_id: null,
        integration_type: 'twilio_voice_transcription',
        webhook_event: `transcription.${transcriptionStatus ?? 'unknown'}`,
        external_id: idempotencyKey,
        payload_hash: payloadHash,
        status: 'processing',
        signature_verified: !!twilioSignature,
        signature_algorithm: 'hmac-sha1',
        payload: params,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent'),
      })
      .select()
      .single()

    if (transcriptionStatus !== 'completed' || !transcriptText) {
      // Twilio sent a failure or empty result — nothing to promote.
      if (webhookLog) {
        await supabase
          .from('integration_webhooks_log')
          .update({
            status: 'processed',
            processed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
          })
          .eq('id', webhookLog.id)
      }
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'no_transcript',
        correlation_id: correlationId,
      })
    }

    // Find the voice activity created earlier by the main voice route.
    const { data: activity, error: activityErr } = await supabase
      .from('activities')
      .select('id, tenant_id, contact_id')
      .eq('call_sid', callSid)
      .limit(1)
      .maybeSingle()

    if (activityErr || !activity) {
      console.warn(`[WEBHOOK VOICE-TRANSCRIPT][${correlationId}] No matching activity for call_sid`, {
        callSid,
      })
      if (webhookLog) {
        await supabase
          .from('integration_webhooks_log')
          .update({
            status: 'failed',
            error_message: 'No matching voice activity',
            processed_at: new Date().toISOString(),
            processing_duration_ms: Date.now() - startTime,
          })
          .eq('id', webhookLog.id)
      }
      // Return 200 so Twilio doesn't keep retrying for an activity that
      // will never exist — usually means the original status callback
      // failed earlier and we have no record to attach to.
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: 'activity_not_found',
        correlation_id: correlationId,
      })
    }

    const result = await promoteVoiceActivityToDeal({
      supabase,
      tenantId: activity.tenant_id as string,
      contactId: activity.contact_id as string,
      activityId: activity.id as string,
      transcript: transcriptText,
    })

    if (webhookLog) {
      await supabase
        .from('integration_webhooks_log')
        .update({
          tenant_id: activity.tenant_id as string,
          status: result.kind === 'error' ? 'failed' : 'processed',
          error_message: result.kind === 'error' ? result.reason : null,
          processed_at: new Date().toISOString(),
          processing_duration_ms: Date.now() - startTime,
          result_entity_type: 'activity',
          result_entity_id: activity.id as string,
        })
        .eq('id', webhookLog.id)
    }

    return NextResponse.json({
      success: true,
      result,
      correlation_id: correlationId,
    })
  } catch (error: unknown) {
    console.error(`[WEBHOOK VOICE-TRANSCRIPT][${correlationId}] Unexpected error:`, error)
    return NextResponse.json(
      { error: 'Webhook processing failed', correlation_id: correlationId },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    endpoint: 'voice-transcription-webhook',
    message: 'Twilio voice transcription callback handler',
  })
}
