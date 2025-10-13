import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Testing deal creation step by step...')
    
    // Step 1: Get existing pipeline structure
    const { data: existingDeals, error: pipelineError } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    if (pipelineError) {
      return NextResponse.json({ 
        success: false, 
        error: `Pipeline query error: ${pipelineError.message}`,
        details: pipelineError
      })
    }
    
    if (!existingDeals || existingDeals.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No existing deals found to copy pipeline structure' 
      })
    }
    
    const pipelineId = existingDeals[0].pipeline_id
    const stageId = existingDeals[0].stage_id
    
    console.log(`✅ Found pipeline: ${pipelineId}, stage: ${stageId}`)
    
    // Step 2: Get one of our new patients
    const { data: patients, error: patientsError } = await supabase
      .from('contacts')
      .select('id, full_name')
      .eq('tenant_id', tenantId)
      .eq('id', '550e8400-e29b-41d4-a716-446655442001') // Dr. Victoria Sterling
      .limit(1)
    
    if (patientsError) {
      return NextResponse.json({ 
        success: false, 
        error: `Patients query error: ${patientsError.message}`,
        details: patientsError
      })
    }
    
    if (!patients || patients.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Patient Dr. Victoria Sterling not found' 
      })
    }
    
    const patient = patients[0]
    console.log(`✅ Found patient: ${patient.full_name} (${patient.id})`)
    
    // Step 3: Try to create ONE deal
    const testDeal = {
      id: '550e8400-e29b-41d4-a716-446655449999',
      tenant_id: tenantId,
      contact_id: patient.id,
      pipeline_id: pipelineId,
      stage_id: stageId,
      title: 'Test Deal Creation',
      description: `Test deal for ${patient.full_name}`,
      value_estimate_cents: 100000,
      currency: 'GBP',
      treatment_tags: ['Test'],
      source: 'Test',
      created_at: new Date().toISOString()
    }
    
    console.log('Attempting to create test deal with data:', testDeal)
    
    const { data: dealResult, error: dealError } = await supabase
      .from('deals')
      .insert([testDeal])
      .select()
    
    if (dealError) {
      console.error('❌ Deal creation failed:', dealError)
      return NextResponse.json({ 
        success: false, 
        error: `Deal creation failed: ${dealError.message}`,
        details: dealError,
        testData: testDeal
      })
    }
    
    console.log('✅ Test deal created successfully:', dealResult)
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Test deal created successfully!',
      data: {
        patient: patient,
        deal: dealResult[0],
        pipeline: { pipelineId, stageId }
      }
    })
    
  } catch (error) {
    console.error('Error in debug-deal-creation:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


