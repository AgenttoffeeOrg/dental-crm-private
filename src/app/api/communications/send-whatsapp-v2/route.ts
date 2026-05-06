import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { whatsappService } from '@/lib/whatsapp-service'
import { detectAndFireFirstResponse } from '@/lib/conversions/first-response-detector'

/**
 * Phase 2b.1.b.1 — extracted to keep route handler cyclomatic complexity ≤ 8.
 */
async function maybeFireFirstResponse(
  supabase: ReturnType<typeof createServiceClient>,
  tenantId: string,
  contactId: string | null | undefined,
  dealId: string | null | undefined,
  occurredAt: string
): Promise<void> {
  if (!dealId) return
  await detectAndFireFirstResponse(
    {
      tenant_id: tenantId,
      contact_id: contactId ?? null,
      deal_id: dealId,
      direction: 'outbound',
      occurred_at: occurredAt,
    },
    supabase
  )
}

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

    // Log activity using canonical activities columns: to_number/from_number/
    // message_status. The legacy whatsapp_to/whatsapp_from/whatsapp_status
    // names don't exist on the live table.
    const occurredAt = new Date().toISOString()
    await supabase.from('activities').insert({
      tenant_id,
      contact_id,
      deal_id,
      type: 'whatsapp',
      direction: 'outbound',
      subject: 'WhatsApp Sent',
      description: message,
      occurred_at: occurredAt,
      to_number: to,
      from_number: tenant.whatsapp_phone_number,
      message_status: 'sent',
      external_id: result.messageId
    })

    // Phase 2b.1.b.1: fire FirstResponse Google Ads conversion event if this
    // is the first outbound activity for the deal. Best-effort — the detector
    // never throws. The helper handles deal_id absence and contact_id nullishness.
    await maybeFireFirstResponse(supabase, tenant_id, contact_id, deal_id, occurredAt)

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: unknown) {
    console.error('Send WhatsApp error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}


