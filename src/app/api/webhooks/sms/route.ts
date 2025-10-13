import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * SMS WEBHOOK ENDPOINT (Twilio)
 * 
 * This endpoint receives incoming SMS messages from Twilio
 * Configure this URL in Twilio Console → Phone Numbers → Messaging:
 * https://your-domain.com/api/webhooks/sms
 */

export async function POST(request: NextRequest) {
  try {
    // Twilio sends form data, not JSON
    const formData = await request.formData()
    
    // Extract Twilio SMS webhook parameters
    // Full list: https://www.twilio.com/docs/sms/twiml#twilios-request-to-your-application
    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')
    
    console.log('[WEBHOOK SMS] Received SMS:', { from, to, body: body?.substring(0, 50) })

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Invalid SMS webhook payload' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // 1. Find contact by phone number
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('primary_phone', from)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK SMS] No contact found for number: ${from}`)
      // TODO: Optionally create new lead or log as unmatched
    }

    // 2. Create activity for incoming SMS
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: contact?.tenant_id || '550e8400-e29b-41d4-a716-446655440000', // TODO: Better tenant detection
        type: 'sms',
        contact_id: contact?.id || null,
        deal_id: null, // TODO: Smart deal linking
        direction: 'inbound',
        subject: 'SMS Received',
        snippet: body.substring(0, 200),
        integration_provider: 'twilio_sms',
        external_id: messageSid,
        from_number: from,
        to_number: to,
        message_status: 'received',
        has_attachments: numMedia > 0,
        integration_metadata: {
          num_media: numMedia
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[WEBHOOK SMS] Error creating activity:', activityError)
      return NextResponse.json(
        { error: 'Failed to log incoming SMS', details: activityError },
        { status: 500 }
      )
    }

    // 3. TODO: Process media attachments if present
    if (numMedia > 0) {
      console.log(`[WEBHOOK SMS] SMS has ${numMedia} media attachments`)
      // Extract MediaUrl0, MediaUrl1, etc. from formData
      // Save to Supabase Storage
    }

    // 4. TODO: Auto-respond or trigger AI analysis
    // Example: Check if this is a keyword trigger, urgent message, etc.

    console.log(`[WEBHOOK SMS] ✅ Incoming SMS logged as activity ${activity.id}`)

    // Twilio expects TwiML response (or empty 200)
    // If you want to auto-respond, return TwiML:
    // return new NextResponse(
    //   `<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thanks for your message!</Message></Response>`,
    //   { headers: { 'Content-Type': 'text/xml' } }
    // )
    
    return NextResponse.json({
      success: true,
      activity_id: activity.id
    })

  } catch (error: unknown) {
    console.error('[WEBHOOK SMS] Error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// Support GET for webhook verification
export async function GET() {
  return NextResponse.json({ 
    status: 'ready',
    endpoint: 'sms-webhook',
    message: 'SMS webhook is active and ready to receive messages'
  })
}


