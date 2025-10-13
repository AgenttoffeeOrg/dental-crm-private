import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, whatsapp_phone_number, whatsapp_api_key, whatsapp_api_secret } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        whatsapp_phone_number,
        whatsapp_api_key,
        whatsapp_api_secret,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

