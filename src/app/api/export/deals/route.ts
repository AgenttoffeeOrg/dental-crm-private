import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const tenantId = searchParams.get('tenant_id')

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 })
    }

    const supabase = createServiceClient()

    const { data: deals, error } = await supabase
      .from('deals_with_contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const headers = ['Deal Title', 'Contact', 'Stage', 'Value', 'Priority', 'Created At']
    const rows = deals.map(d => [
      d.title,
      d.contact_name || '',
      d.stage_name || '',
      d.value_estimate_cents ? (d.value_estimate_cents / 100).toFixed(2) : '0',
      d.priority,
      new Date(d.created_at).toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=deals_${new Date().toISOString().split('T')[0]}.csv`
      }
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

