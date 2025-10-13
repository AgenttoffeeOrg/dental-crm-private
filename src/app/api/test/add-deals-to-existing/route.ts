import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Adding deals to existing contacts...')
    
    // Get existing contacts
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .limit(10)
    
    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No contacts found' 
      })
    }
    
    console.log(`Found ${contacts.length} existing contacts`)
    
    // Get existing deals to find pipeline structure
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    if (!existingDeals || existingDeals.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No existing deals found to copy pipeline structure' 
      })
    }
    
    const pipelineId = existingDeals[0].pipeline_id
    const stageId = existingDeals[0].stage_id
    
    console.log(`Using pipeline: ${pipelineId}, stage: ${stageId}`)
    
    // Create 2-3 deals for each existing contact
    const dealsToCreate = []
    let dealIndex = 5000 // Start from a high number to avoid conflicts
    
    for (const contact of contacts) {
      // Create 2-3 deals per contact
      const numDeals = Math.floor(Math.random() * 3) + 1 // 1-3 deals
      
      for (let i = 0; i < numDeals; i++) {
        const treatments = ['Implants', 'Veneers', 'Whitening', 'Crowns', 'Invisalign', 'Hygiene', 'Root Canal', 'Extraction']
        const sources = ['Website', 'Google Ads', 'Referral', 'Word of Mouth', 'Social Media', 'Walk-in']
        const values = [25000, 45000, 85000, 125000, 280000, 450000, 650000, 950000, 1250000, 1850000] // In pence
        
        const treatment = treatments[Math.floor(Math.random() * treatments.length)]
        const source = sources[Math.floor(Math.random() * sources.length)]
        const value = values[Math.floor(Math.random() * values.length)]
        
        dealsToCreate.push({
          id: `550e8400-e29b-41d4-a716-44665544${dealIndex.toString().padStart(4, '0')}`,
          tenant_id: tenantId,
          contact_id: contact.id,
          pipeline_id: pipelineId,
          stage_id: stageId,
          title: `${treatment} Treatment - ${contact.full_name}`,
          description: `${treatment} treatment for ${contact.full_name}`,
          value_estimate_cents: value,
          currency: 'GBP',
          treatment_tags: [treatment],
          source: source,
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString() // Random date in last 90 days
        })
        
        dealIndex++
      }
    }
    
    console.log(`Creating ${dealsToCreate.length} deals...`)
    
    // Insert deals one by one to avoid conflicts
    let created = 0
    for (const deal of dealsToCreate) {
      const { error } = await supabase
        .from('deals')
        .insert([deal])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating deal:', deal.title, error)
      } else if (!error) {
        created++
      }
    }
    
    console.log(`✅ Successfully created ${created} deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 Added ${created} deals to existing contacts! Check your pipeline and contacts now.`,
      stats: {
        contactsProcessed: contacts.length,
        dealsCreated: created,
        totalValue: dealsToCreate.reduce((sum, deal) => sum + deal.value_estimate_cents, 0)
      }
    })
    
  } catch (error) {
    console.error('Error in add-deals-to-existing:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


