import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueCommunication, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { dispatchSms } from '@/lib/communications/dispatcher'

// AI Helper: Extract SMS purpose from message content
function extractSMSPurpose(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('reminder')) {
    return 'Appointment Reminder'
  }
  if (lower.includes('confirm') || lower.includes('confirmation')) {
    return 'Confirmation'
  }
  if (lower.includes('follow up') || lower.includes('follow-up') || lower.includes('checking')) {
    return 'Follow-up'
  }
  if (lower.includes('thank')) {
    return 'Thank You'
  }
  if (lower.includes('question') || lower.includes('?')) {
    return 'Question'
  }

  return 'Quick Message'
}

const QUEUE_ENABLED = process.env.QUEUE_COMMUNICATIONS === 'true'

if (queueManager.isEnabled() && QUEUE_ENABLED) {
  registerCommunicationQueue()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      to,
      message,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
    } = body

    // Validate required fields
    if (!to || !message || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message, tenant_id' },
        { status: 400 }
      )
    }

    const aiPurpose = extractSMSPurpose(message)

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
    console.error('[SMS] Error sending SMS:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

