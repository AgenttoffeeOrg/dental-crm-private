import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      tenant_id, 
      smtp_host, 
      smtp_port, 
      smtp_username, 
      smtp_password,
      smtp_encryption,
      default_from_name,
      default_from_address,
      default_reply_to
    } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        smtp_host,
        smtp_port,
        smtp_username,
        smtp_password,
        smtp_encryption,
        default_email_from_name: default_from_name,
        default_email_from_address: default_from_address,
        default_email_reply_to: default_reply_to,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating email settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Email settings API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

