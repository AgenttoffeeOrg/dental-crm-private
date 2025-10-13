import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    // Get contacts count
    const { data: contacts, count: contactsCount } = await supabase
      .from('contacts')
      .select('id, full_name, primary_email, lead_score, tags', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    // Get deals count
    const { data: deals, count: dealsCount } = await supabase
      .from('deals')
      .select(`
        id, 
        title, 
        value_estimate_cents, 
        contact:contacts(full_name),
        stage:pipeline_stages(name)
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20)
    
    return NextResponse.json({ 
      success: true,
      summary: {
        totalContacts: contactsCount,
        totalDeals: dealsCount,
        totalValue: deals?.reduce((sum, deal) => sum + (deal.value_estimate_cents || 0), 0) || 0
      },
      recentContacts: contacts?.map(c => ({
        name: c.full_name,
        email: c.primary_email,
        score: c.lead_score,
        tags: c.tags
      })) || [],
      recentDeals: deals?.map(d => ({
        title: d.title,
        value: d.value_estimate_cents,
        contact: d.contact?.full_name,
        stage: d.stage?.name
      })) || []
    })
    
  } catch (error) {
    console.error('Error in database-status:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


