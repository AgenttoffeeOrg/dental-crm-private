import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

/**
 * WHATSAPP WEBHOOK ENDPOINT (Twilio)
 * 
 * This endpoint receives incoming WhatsApp messages from Twilio
 * Configure this URL in Twilio Console → Messaging → WhatsApp Senders:
 * https://your-domain.com/api/webhooks/whatsapp
 */

export async function POST(request: NextRequest) {
  try {
    // Twilio WhatsApp also sends form data
    const formData = await request.formData()
    
    // Extract Twilio WhatsApp webhook parameters
    const messageSid = formData.get('MessageSid') as string
    const from = formData.get('From') as string // Format: "whatsapp:+1234567890"
    const to = formData.get('To') as string
    const body = formData.get('Body') as string
    const numMedia = parseInt(formData.get('NumMedia') as string || '0')
    const profileName = formData.get('ProfileName') as string // WhatsApp display name
    
    console.log('[WEBHOOK WHATSAPP] Received message:', { from, profileName, body: body?.substring(0, 50) })

    if (!from || !body) {
      return NextResponse.json(
        { error: 'Invalid WhatsApp webhook payload' },
        { status: 400 }
      )
    }

    // Extract phone number from whatsapp: format
    const phoneNumber = from.replace('whatsapp:', '')

    const supabase = createServiceClient()

    // 1. Find contact by phone number
    const { data: contacts } = await supabase
      .from('contacts')
      .select('*')
      .eq('primary_phone', phoneNumber)
      .limit(1)

    const contact = contacts && contacts.length > 0 ? contacts[0] : null

    if (!contact) {
      console.log(`[WEBHOOK WHATSAPP] No contact found for ${phoneNumber}. Profile: ${profileName}`)
      // TODO: Create new contact using WhatsApp profile name
    }

    // 2. Create activity for incoming WhatsApp message
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: contact?.tenant_id || '550e8400-e29b-41d4-a716-446655440000', // TODO: Better tenant detection
        type: 'whatsapp',
        contact_id: contact?.id || null,
        deal_id: null, // TODO: Smart deal linking
        direction: 'inbound',
        subject: 'WhatsApp Message',
        snippet: body.substring(0, 200),
        integration_provider: 'twilio_whatsapp',
        external_id: messageSid,
        from_number: from,
        to_number: to,
        message_status: 'received',
        has_attachments: numMedia > 0,
        integration_metadata: {
          num_media: numMedia,
          profile_name: profileName
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (activityError) {
      console.error('[WEBHOOK WHATSAPP] Error creating activity:', activityError)
      return NextResponse.json(
        { error: 'Failed to log incoming WhatsApp message', details: activityError },
        { status: 500 }
      )
    }

    // 3. TODO: Process media attachments (images, documents, voice messages)
    if (numMedia > 0) {
      console.log(`[WEBHOOK WHATSAPP] Message has ${numMedia} media attachments`)
      // Extract MediaUrl0, MediaContentType0, etc.
      // Save to Supabase Storage and create activity_attachments records
    }

    // 4. TODO: Smart auto-response or AI routing
    // Example: Keyword-based replies, business hours check, etc.

    console.log(`[WEBHOOK WHATSAPP] ✅ Incoming message logged as activity ${activity.id}`)

    return NextResponse.json({
      success: true,
      activity_id: activity.id
    })

  } catch (error: unknown) {
    console.error('[WEBHOOK WHATSAPP] Error:', error)
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
    endpoint: 'whatsapp-webhook',
    message: 'WhatsApp webhook is active and ready to receive messages'
  })
}

