import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'
import { smsService } from '@/lib/sms-service'

export async function POST(request: NextRequest) {
  try {
    const { tenant_id, to, message, contact_id, deal_id } = await request.json()

    if (!tenant_id || !to || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get tenant SMS config
    const { data: tenant } = await supabase
      .from('tenants')
      .select('sms_provider, sms_api_key, sms_api_secret, sms_from_number')
      .eq('id', tenant_id)
      .single()

    if (!tenant || !tenant.sms_api_key) {
      return NextResponse.json(
        { error: 'SMS not configured. Please configure in Settings → SMS' },
        { status: 400 }
      )
    }

    // Initialize SMS service
    await smsService.initialize(tenant.sms_api_key, tenant.sms_api_secret!, tenant.sms_from_number!)

    // Send SMS
    const result = await smsService.send({ to, message })

    // Log activity
    await supabase.from('activities').insert({
      tenant_id,
      contact_id,
      deal_id,
      type: 'sms',
      title: 'SMS Sent',
      description: message,
      occurred_at: new Date().toISOString(),
      sms_to: to,
      sms_from: tenant.sms_from_number,
      sms_status: 'sent',
      external_id: result.messageId
    })

    return NextResponse.json({ success: true, messageId: result.messageId })
  } catch (error: any) {
    console.error('Send SMS error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


