import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Testing minimal deal creation...')
    
    // Get one patient
    const { data: patient } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('id', '550e8400-e29b-41d4-a716-446655442001')
      .single()
    
    if (!patient) {
      return NextResponse.json({ success: false, error: 'Patient not found' })
    }
    
    // Get pipeline info
    const { data: pipeline } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()
    
    if (!pipeline) {
      return NextResponse.json({ success: false, error: 'Pipeline not found' })
    }
    
    // Try creating with MINIMAL fields only
    const minimalDeal = {
      tenant_id: tenantId,
      contact_id: patient.id,
      pipeline_id: pipeline.pipeline_id,
      stage_id: pipeline.stage_id,
      title: 'Test Deal - Minimal Fields',
      currency: 'GBP'
    }
    
    console.log('Creating minimal deal:', minimalDeal)
    
    const { data: result, error } = await supabase
      .from('deals')
      .insert([minimalDeal])
      .select()
    
    if (error) {
      console.error('❌ Minimal deal creation failed:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        testData: minimalDeal
      })
    }
    
    console.log('✅ Minimal deal created:', result)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Minimal deal created successfully!',
      data: result[0]
    })
    
  } catch (error) {
    console.error('Error in test-minimal-deal:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

