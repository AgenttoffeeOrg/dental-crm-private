import { NextRequest, NextResponse } from 'next/server'
import { queueManager } from '@/lib/queues/queue-manager'
import { enqueueCommunication, registerCommunicationQueue } from '@/lib/queues/communication-queue'
import { dispatchEmail } from '@/lib/communications/dispatcher'

// AI Helper: Extract email purpose from subject/body
function extractEmailPurpose(subject: string, body: string): string {
  const combined = `${subject} ${body}`.toLowerCase()

  // Keywords for common purposes
  if (combined.includes('quote') || combined.includes('pricing') || combined.includes('cost') || combined.includes('price')) {
    return 'Quote Request'
  }
  if (combined.includes('appointment') || combined.includes('schedule') || combined.includes('book') || combined.includes('reschedule')) {
    return 'Appointment Scheduling'
  }
  if (combined.includes('follow up') || combined.includes('follow-up') || combined.includes('checking in')) {
    return 'Follow-up'
  }
  if (combined.includes('question') || combined.includes('inquiry') || combined.includes('asking') || combined.includes('wondering')) {
    return 'Question/Inquiry'
  }
  if (combined.includes('thank you') || combined.includes('thanks') || combined.includes('grateful')) {
    return 'Thank You'
  }
  if (combined.includes('confirm') || combined.includes('confirmation')) {
    return 'Confirmation'
  }
  if (combined.includes('consultation') || combined.includes('consult')) {
    return 'Consultation Request'
  }
  if (combined.includes('information') || combined.includes('details') || combined.includes('more about')) {
    return 'Information Request'
  }
  if (combined.includes('treatment') || combined.includes('procedure')) {
    return 'Treatment Discussion'
  }
  if (combined.includes('payment') || combined.includes('invoice') || combined.includes('bill')) {
    return 'Payment/Billing'
  }
  if (combined.includes('reminder')) {
    return 'Reminder'
  }

  // Default
  return 'General Communication'
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
      cc,
      bcc,
      subject,
      body: emailBody,
      contact_id,
      deal_id,
      tenant_id,
      user_id,
    } = body

    // Validate required fields
    if (!to || !subject || !emailBody || !tenant_id) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, body, tenant_id' },
        { status: 400 }
      )
    }

    const toList = Array.isArray(to) ? to : [to]
    const ccList = Array.isArray(cc) ? cc : cc ? [cc] : []
    const bccList = Array.isArray(bcc) ? bcc : bcc ? [bcc] : []
    const aiPurpose = extractEmailPurpose(subject, emailBody)

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
    console.error('[EMAIL] Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

