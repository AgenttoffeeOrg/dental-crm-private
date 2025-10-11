import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    // Direct count queries without RLS issues
    const { count: contactsCount } = await supabase
      .from('contacts')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    
    const { count: dealsCount } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
    
    // Get sample contacts
    const { data: sampleContacts } = await supabase
      .from('contacts')
      .select('id, full_name, primary_email, tags, lead_score')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    // Get sample deals
    const { data: sampleDeals } = await supabase
      .from('deals')
      .select('id, title, value_estimate_cents, contact_id')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(10)
    
    return NextResponse.json({
      success: true,
      actualCounts: {
        contacts: contactsCount,
        deals: dealsCount
      },
      sampleData: {
        contacts: sampleContacts || [],
        deals: sampleDeals || []
      },
      message: `Found ${contactsCount} contacts and ${dealsCount} deals in database`
    })
    
  } catch (error) {
    console.error('Error in direct-database-check:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

