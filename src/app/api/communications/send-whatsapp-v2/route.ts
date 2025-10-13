import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { whatsappService } from '@/lib/whatsapp-service'

export async function POST(request: NextRequest) {
  try {
    const { tenant_id, to, message, contact_id, deal_id, mediaUrl } = await request.json()

    if (!tenant_id || !to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant WhatsApp config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('whatsapp_api_key, whatsapp_api_secret, whatsapp_phone_number')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.whatsapp_api_key) {
      return NextResponse.json(
        { error: 'WhatsApp not configured. Please configure in Settings → WhatsApp' },
        { status: 400 }
      )
    }

    // Initialize WhatsApp service (using Twilio)
    await whatsappService.initialize(
      tenant.whatsapp_api_key,
      tenant.whatsapp_api_secret!,
      tenant.whatsapp_phone_number!
    )

    // Send WhatsApp
    const result = await whatsappService.send({ to, message, mediaUrl })

    // Log activity
    await supabase.from('activities').insert({
      tenant_id,
      contact_id,
      deal_id,
      activity_type: 'whatsapp',
      title: 'WhatsApp Sent',
      description: message,
      occurred_at: new Date().toISOString(),
      whatsapp_to: to,
      whatsapp_from: tenant.whatsapp_phone_number,
      whatsapp_status: 'sent',
      external_id: result.messageId
    })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: any) {
    console.error('Send WhatsApp error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

