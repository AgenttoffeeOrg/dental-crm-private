import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * EMAIL WEBHOOK ENDPOINT
 * 
 * This endpoint receives incoming emails from your email provider (SendGrid, etc.)
 * Configure this URL in your email provider's webhook settings:
 * https://your-domain.com/api/webhooks/email
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // TODO: Parse email provider's webhook payload
    // Different providers send different formats:
    // - SendGrid: https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
    // - Gmail: Via Pub/Sub
    // - Outlook: Via Microsoft Graph webhooks
    
    console.log('[WEBHOOK] Received email webhook:', JSON.stringify(body, null, 2))

    // Example SendGrid parse webhook format:
    const {
      to,
      from,
      subject,
      text,
      html,
      attachments,
      // ... other fields
    } = body

    if (!from || !subject) {
      return NextResponse.json(
        { error: 'Invalid email webhook payload' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Find contact by email
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('primary_email', from)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK] No contact found for email: ${from}. Creating placeholder contact...`)
      // TODO: Optionally create new contact or log as unmatched
    }

    // 2. Create activity for incoming email
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: contact?.tenant_id || body.tenant_id || request.headers.get('X-Tenant-ID'), // TODO: Better tenant detection
        type: 'email',
        contact_id: contact?.id || null,
        deal_id: null, // TODO: Smart deal detection based on email thread
        direction: 'inbound',
        subject,
        snippet: (text || html || '').substring(0, 200),
        rich_content: html || text,
        integration_provider: 'email_inbound',
        email_from: from,
        email_to: Array.isArray(to) ? to : [to],
        message_status: 'received',
        has_attachments: !!attachments && attachments.length > 0,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[WEBHOOK] Error creating activity:', activityError)
      return NextResponse.json(
        { error: 'Failed to log incoming email', details: activityError },
        { status: 500 }
      )
    }

    // 3. TODO: Process attachments if present
    if (attachments && attachments.length > 0) {
      console.log(`[WEBHOOK] Email has ${attachments.length} attachments. TODO: Save to storage.`)
      // Save to Supabase Storage and link to activity
    }

    // 4. TODO: Trigger AI analysis for sentiment/intent
    // Example: Analyze if this is urgent, what treatment they're asking about, etc.

    console.log(`[WEBHOOK] ✅ Incoming email logged as activity ${activity.id}`)

    return NextResponse.json({
      success: true,
      activity_id: activity.id,
      message: 'Email received and logged'
    })

  } catch (error: unknown) {
    console.error('[WEBHOOK] Email webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Support GET for webhook verification (some providers require this)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ready',
    endpoint: 'email-webhook',
    message: 'Email webhook is active and ready to receive emails'
  })
}


