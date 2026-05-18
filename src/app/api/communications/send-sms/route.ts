import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueCommunication, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { dispatchSms, inferSmsPurpose } from '@/lib/communications/dispatcher'
import { getFriendlyErrorMessage } from '@/lib/communications/error-helpers'
import {
  AuthApiError,
  requireAuthenticatedTenantUser,
  assertBodyTenantMatches,
  enforceOutboundRateLimit,
  authErrorResponse,
} from '@/lib/auth/api-auth-helpers'

const QUEUE_ENABLED = process.env.QUEUE_COMMUNICATIONS === 'true'

if (queueManager.isEnabled() && QUEUE_ENABLED) {
  registerCommunicationQueue()
}

export async function POST(request: NextRequest) {
  try {
    // Phase 2b.5 — auth + tenant scoping + rate limit. Closes D03 §1.
    const auth = await requireAuthenticatedTenantUser(request)
    const body = await request.json()
    assertBodyTenantMatches(body?.tenant_id, auth.tenantId)
    body.tenant_id = auth.tenantId
    body.user_id = body.user_id ?? auth.userId
    await enforceOutboundRateLimit(auth.tenantId, 'sms')

    const {
      to,
      message,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
    } = body

    if (!to || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message' },
        { status: 400 }
      )
    }

    const aiPurpose = inferSmsPurpose(message)

    if (queueManager.isEnabled() && QUEUE_ENABLED) {
      await enqueueCommunication({
        type: 'sms',
        context: {
          tenantId: tenant_id,
          userId: user_id,
          contactId: contact_id,
          dealId: deal_id,
        },
        to,
        message,
      })

      return NextResponse.json(
        {
          success: true,
          queued: true,
          message: 'SMS queued for delivery',
          ai_purpose: aiPurpose,
        },
        { status: 202 }
      )
    }

    const result = await dispatchSms({
      context: {
        tenantId: tenant_id,
        userId: user_id,
        contactId: contact_id,
        dealId: deal_id,
      },
      to,
      message,
    })

    return NextResponse.json({
      success: true,
      activity_id: result.activityId,
      external_id: result.externalId,
      message: 'SMS sent successfully!',
      status: result.status,
      ai_purpose: result.aiPurpose,
      ai_outcome: result.aiOutcome,
      ai_summary: result.aiSummary,
      characters: message.length,
      estimated_cost: Math.ceil(message.length / 160) * 0.0075,
    })
  } catch (error: unknown) {
    if (error instanceof AuthApiError) {
      return authErrorResponse(error)
    }
    console.error('[SMS] Error sending SMS:', error)
    const friendly = getFriendlyErrorMessage(error)
    return NextResponse.json(
      { error: friendly ?? 'Internal server error' },
      { status: 500 }
    )
  }
}

