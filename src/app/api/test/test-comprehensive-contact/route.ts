import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Testing comprehensive contact creation...')
    
    // First, let's test creating a contact with comprehensive data
    const comprehensiveContactData = {
      tenant_id: '550e8400-e29b-41d4-a716-446655440000',
      // Basic fields (existing)
      full_name: 'Comprehensive Test Patient',
      primary_phone: '+44 7700 999888',
      primary_email: 'comprehensive@test.com',
      source: 'test',
      tags: ['comprehensive', 'test'],
      // Additional fields we want to add
      preferred_name: 'Comp',
      title: 'Dr',
      secondary_phone: '+44 7700 999889',
      secondary_email: 'comp.alt@test.com',
      date_of_birth: '1985-06-15',
      gender: 'male',
      marital_status: 'married',
      occupation: 'Doctor',
      employer: 'NHS',
      address: '123 Comprehensive Street',
      city: 'London',
      postal_code: 'SW1A 1AA',
      country: 'United Kingdom',
      medical_conditions: 'None known',
      allergies: 'Penicillin',
      medications: 'Aspirin 75mg daily',
      emergency_contact_name: 'Jane Test',
      emergency_contact_phone: '+44 7700 999890',
      emergency_contact_relationship: 'Spouse',
      insurance_provider: 'Bupa',
      insurance_policy_number: 'BP123456789',
      insurance_group_number: 'GRP001',
      preferred_appointment_time: 'morning',
      communication_preference: 'email',
      language_preference: 'English',
      previous_dentist: 'Dr. Smith Dental',
      last_dental_visit: '2024-01-15',
      dental_anxiety_level: 'mild',
      dental_concerns: 'Regular checkup and cleaning',
      marketing_consent: true,
      sms_consent: false,
      email_consent: true,
      custom_fields: {
        referral_source: 'Google Search',
        special_needs: 'Wheelchair access required',
        preferred_dentist: 'Dr. Johnson'
      }
    }
    
    console.log('Testing contact creation with comprehensive data...')
    
    // Try to create the contact - this will tell us which fields exist
    const { data: result, error } = await supabase
      .from('contacts')
      .insert([comprehensiveContactData])
      .select()
    
    if (error) {
      console.error('❌ Comprehensive contact creation error:', error)
      
      // Try with just basic fields to confirm basic creation works
      const basicContactData = {
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        full_name: 'Basic Test Patient',
        primary_phone: '+44 7700 999777',
        primary_email: 'basic@test.com',
        source: 'test',
        tags: ['basic', 'test']
      }
      
      const { data: basicResult, error: basicError } = await supabase
        .from('contacts')
        .insert([basicContactData])
        .select()
      
      if (basicError) {
        return NextResponse.json({ 
          success: false, 
          error: `Even basic contact creation failed: ${basicError.message}`,
          comprehensiveError: error.message
        })
      }
      
      // Clean up basic test
      await supabase.from('contacts').delete().eq('id', basicResult[0].id)
      
      return NextResponse.json({ 
        success: false, 
        error: `Comprehensive fields not available: ${error.message}`,
        solution: 'Database needs to be extended with comprehensive contact fields',
        missingFields: 'Most comprehensive fields are missing from the database schema'
      })
    }
    
    console.log('✅ Comprehensive contact created successfully:', result[0].id)
    
    // Clean up test data
    await supabase.from('contacts').delete().eq('id', result[0].id)
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Comprehensive contact fields are available!',
      createdContact: result[0]
    })
    
  } catch (error) {
    console.error('Error in test-comprehensive-contact:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

