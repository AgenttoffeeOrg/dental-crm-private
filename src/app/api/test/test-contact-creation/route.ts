import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Testing contact creation with exact UI data...')
    
    // Test the exact data structure the UI would send
    const testContactData = {
      tenant_id: tenantId,
      full_name: 'Debug Test Contact',
      primary_email: 'debug@test.com',
      primary_phone: '+44 7700 123456',
      source: 'website',
      tags: ['new_patient', 'consultation']
    }
    
    console.log('Attempting to create contact with data:', testContactData)
    
    const { data: result, error } = await supabase
      .from('contacts')
      .insert([testContactData])
      .select()
    
    if (error) {
      console.error('❌ Contact creation error:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        testData: testContactData
      })
    }
    
    console.log('✅ Contact created successfully:', result[0])
    
    // Clean up
    await supabase.from('contacts').delete().eq('id', result[0].id)
    
    return NextResponse.json({ 
      success: true, 
      message: 'Contact creation test passed!',
      createdContact: result[0]
    })
    
  } catch (error) {
    console.error('Error in test-contact-creation:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


