import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Testing single patient creation with detailed error logging...')
    
    // Test creating just ONE patient first
    const testPatient = {
      id: '550e8400-e29b-41d4-a716-446655442001',
      tenant_id: tenantId,
      full_name: 'Test Patient Smith',
      primary_email: 'test.patient@email.com',
      primary_phone: '+44 7700 999001',
      date_of_birth: '1980-01-01',
      address: '123 Test Street, London',
      lead_score: 75,
      tags: ['Test', 'New Patient'],
      status: 'active',
      created_at: new Date().toISOString()
    }
    
    console.log('Attempting to create test patient:', testPatient.full_name)
    
    const { data: contactData, error: contactError } = await supabase
      .from('contacts')
      .insert([testPatient])
      .select()
    
    if (contactError) {
      console.error('❌ Contact creation failed:', contactError)
      return NextResponse.json({ 
        success: false, 
        error: `Contact creation failed: ${contactError.message}`,
        details: contactError
      })
    }
    
    console.log('✅ Test patient created successfully:', contactData)
    
    // Now try to create a deal for this patient
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
    
    const testDeal = {
      id: '550e8400-e29b-41d4-a716-446655449001',
      tenant_id: tenantId,
      contact_id: testPatient.id,
      pipeline_id: existingDeals[0].pipeline_id,
      stage_id: existingDeals[0].stage_id,
      title: 'Test Deal for Test Patient',
      description: 'Test deal creation',
      value_estimate_cents: 100000,
      currency: 'GBP',
      treatment_tags: ['Test'],
      source: 'Test',
      created_at: new Date().toISOString()
    }
    
    console.log('Attempting to create test deal:', testDeal.title)
    
    const { data: dealData, error: dealError } = await supabase
      .from('deals')
      .insert([testDeal])
      .select()
    
    if (dealError) {
      console.error('❌ Deal creation failed:', dealError)
      return NextResponse.json({ 
        success: false, 
        error: `Deal creation failed: ${dealError.message}`,
        details: dealError,
        patientCreated: true
      })
    }
    
    console.log('✅ Test deal created successfully:', dealData)
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Test patient and deal created successfully!',
      data: {
        patient: contactData,
        deal: dealData
      }
    })
    
  } catch (error) {
    console.error('Error in test-single-patient:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


