import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueCommunication, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { dispatchEmail, inferEmailPurpose } from '@/lib/communications/dispatcher'
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
    await enforceOutboundRateLimit(auth.tenantId, 'email')

    const {
      to,
      cc,
      bcc,
      subject,
      body: emailBody,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
    } = body

    // Validate remaining required fields. tenant_id is always set above.
    if (!to || !subject || !emailBody) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body' },
        { status: 400 }
      )
    }

    const toList = Array.isArray(to) ? to : [to]
    const ccList = Array.isArray(cc) ? cc : cc ? [cc] : []
    const bccList = Array.isArray(bcc) ? bcc : bcc ? [bcc] : []
    const aiPurpose = inferEmailPurpose(subject, emailBody)

    if (queueManager.isEnabled() && QUEUE_ENABLED) {
      await enqueueCommunication({
        type: 'email',
        context: {
          tenantId: tenant_id,
          userId: user_id,
          contactId: contact_id,
          dealId: deal_id,
        },
        payload: {
          to: toList,
          cc: ccList,
          bcc: bccList,
          subject,
          html: emailBody,
        },
      })

      return NextResponse.json(
        {
          success: true,
          queued: true,
          message: 'Email queued for delivery',
          ai_purpose: aiPurpose,
        },
        { status: 202 }
      )
    }

    const result = await dispatchEmail({
      context: {
        tenantId: tenant_id,
        userId: user_id,
        contactId: contact_id,
        dealId: deal_id,
      },
      to: toList,
      cc: ccList,
      bcc: bccList,
      subject,
      html: emailBody,
    })

    return NextResponse.json({
      success: true,
      activity_id: result.activityId,
      external_id: result.externalId,
      message: 'Email sent successfully!',
      status: result.status,
      ai_purpose: result.aiPurpose,
      ai_outcome: result.aiOutcome,
      ai_summary: result.aiSummary,
    })
  } catch (error: unknown) {
    // Phase 2b.5 — auth/rate-limit errors use the standard shape; genuine
    // send failures preserve the prior 500-with-details contract.
    if (error instanceof AuthApiError) {
      return authErrorResponse(error)
    }
    console.error('[EMAIL] Error sending email:', error)
    const friendly = getFriendlyErrorMessage(error)
    return NextResponse.json(
      { error: friendly ?? 'Internal server error' },
      { status: 500 }
    )
  }
}

