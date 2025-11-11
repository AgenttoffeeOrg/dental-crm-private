import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueCommunication, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { dispatchWhatsApp } from '@/lib/communications/dispatcher'

// AI Helper: Extract WhatsApp message purpose
function extractWhatsAppPurpose(message: string): string {
  const lower = message.toLowerCase()

  if (lower.includes('appointment') || lower.includes('schedule') || lower.includes('book')) {
    return 'Appointment Scheduling'
  }
  if (lower.includes('confirm') || lower.includes('confirmation')) {
    return 'Confirmation'
  }
  if (lower.includes('follow up') || lower.includes('follow-up')) {
    return 'Follow-up'
  }
  if (lower.includes('question') || lower.includes('?') || lower.includes('inquiry')) {
    return 'Question'
  }
  if (lower.includes('thank')) {
    return 'Thank You'
  }
  if (lower.includes('information') || lower.includes('details')) {
    return 'Information Sharing'
  }

  return 'General Message'
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
      media_url,
    } = body

    // Validate required fields
    if (!to || !message || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, message, tenant_id' },
        { status: 400 }
      )
    }

    const aiPurpose = extractWhatsAppPurpose(message)

    if (queueManager.isEnabled() && QUEUE_ENABLED) {
      await enqueueCommunication({
        type: 'whatsapp',
        context: {
          tenantId: tenant_id,
          userId: user_id,
          contactId: contact_id,
          dealId: deal_id,
        },
        to,
        message,
        mediaUrl: media_url,
      })

      return NextResponse.json(
        {
          success: true,
          queued: true,
          message: 'WhatsApp message queued for delivery',
          ai_purpose: aiPurpose,
          has_media: Boolean(media_url),
        },
        { status: 202 }
      )
    }

    const result = await dispatchWhatsApp({
      context: {
        tenantId: tenant_id,
        userId: user_id,
        contactId: contact_id,
        dealId: deal_id,
      },
      to,
      message,
      mediaUrl: media_url,
    })

    return NextResponse.json({
      success: true,
      activity_id: result.activityId,
      external_id: result.externalId,
      message: 'WhatsApp message sent successfully!',
      status: result.status,
      ai_purpose: result.aiPurpose,
      ai_outcome: result.aiOutcome,
      ai_summary: result.aiSummary,
      has_media: Boolean(media_url),
    })
  } catch (error: unknown) {
    console.error('[WHATSAPP] Error sending message:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

