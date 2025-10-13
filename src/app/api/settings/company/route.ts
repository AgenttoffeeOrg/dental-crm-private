import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, name, timezone, business_hours, phone, email, website, address } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        name,
        timezone,
        business_hours,
        phone,
        email,
        website,
        address,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating company settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Company settings API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

