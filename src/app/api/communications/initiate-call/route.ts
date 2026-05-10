import { NextRequest, NextResponse } from 'next/server'
import { dispatchVoiceCall } from '@/lib/communications/dispatcher'
import {
  AuthApiError,
  requireAuthenticatedTenantUser,
  assertBodyTenantMatches,
  enforceOutboundRateLimit,
  authErrorResponse,
} from '@/lib/auth/api-auth-helpers'

export async function POST(request: NextRequest) {
  try {
    // Phase 2b.5 — auth + tenant scoping + rate limit. Voice is fully
    // deferred per Toffee, but the auth issue is identical so we fix it
    // in the same shape as the messaging routes. Closes D03 §1.
    const auth = await requireAuthenticatedTenantUser(request)
    const body = await request.json()
    assertBodyTenantMatches(body?.tenant_id, auth.tenantId)
    body.tenant_id = auth.tenantId
    body.user_id = body.user_id ?? auth.userId
    await enforceOutboundRateLimit(auth.tenantId, 'voice')

    const {
      to,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
      record: recordCall = true // Auto-record calls by default
    } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required fields: to' },
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
    if (error instanceof AuthApiError) {
      return authErrorResponse(error)
    }
    console.error('[VOICE] Error initiating call:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

