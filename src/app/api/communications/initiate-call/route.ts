import { NextRequest, NextResponse } from 'next/server'
import { dispatchVoiceCall } from '@/lib/communications/dispatcher'

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

    const result = await dispatchVoiceCall({
      context: {
        tenantId: tenant_id,
        userId: user_id,
        contactId: contact_id,
        dealId: deal_id,
      },
      to,
      record: recordCall,
    })

    return NextResponse.json({
      success: result.success,
      activity_id: result.activityId,
      call_sid: result.callSid,
      message: result.success
        ? 'Call initiated successfully! Ringing...'
        : 'Call logged but failed to initiate via Twilio. Check integration credentials.',
      status: result.status,
      ai_purpose: result.aiPurpose,
      ai_summary: result.aiSummary,
      note: 'Call details (duration, recording) will update automatically via webhook.',
    })

  } catch (error: unknown) {
    console.error('[VOICE] Error initiating call:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

