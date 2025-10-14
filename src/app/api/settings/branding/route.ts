import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tenant_id, logo_url, favicon_url, primary_color, secondary_color } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase
      .from('tenants')
      .update({
        logo_url,
        favicon_url,
        primary_color,
        secondary_color,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenant_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating branding:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    console.error('Branding API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


