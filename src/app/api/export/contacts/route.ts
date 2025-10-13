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

    const { data: contacts, error } = await supabase
      .from('contacts')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Convert to CSV
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Source', 'Status', 'Created At']
    const rows = contacts.map(c => [
      c.first_name,
      c.last_name,
      c.primary_email || '',
      c.primary_phone || '',
      c.source || '',
      c.status,
      new Date(c.created_at).toLocaleDateString()
    ])

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=contacts_${new Date().toISOString().split('T')[0]}.csv`
      }
    })
  } catch (error: any) {
    console.error('Export error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

