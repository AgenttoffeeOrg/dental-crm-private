import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Testing comprehensive contact profile creation...')
    
    // Test comprehensive contact data
    const comprehensiveContactData = {
      tenant_id: process.env.TEST_TENANT_ID || (await getFirstTenantId()),
      full_name: 'Dr. Comprehensive Test Patient',
      primary_phone: '+44 7700 999111',
      primary_email: 'comprehensive.test@example.com',
      source: 'comprehensive_form',
      tags: ['Dr', 'Dentist', 'anxiety_mild', 'prefers_morning', 'comprehensive_profile'],
      profile_data: {
        personal: {
          preferred_name: 'Dr. Comp',
          title: 'Dr',
          secondary_phone: '+44 7700 999112',
          secondary_email: 'comp.alt@example.com',
          date_of_birth: '1975-06-15',
          gender: 'female',
          marital_status: 'married',
          occupation: 'Dentist',
          employer: 'NHS Dental Practice',
        },
        address: {
          address: '123 Comprehensive Street, Apartment 4B',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom',
        },
        medical: {
          medical_conditions: 'Hypertension (controlled)',
          allergies: 'Penicillin, Latex',
          medications: 'Lisinopril 10mg daily',
          emergency_contact_name: 'John Test',
          emergency_contact_phone: '+44 7700 999113',
          emergency_contact_relationship: 'Spouse',
        },
        insurance: {
          insurance_provider: 'Bupa',
          insurance_policy_number: 'BP123456789',
          insurance_group_number: 'GRP001',
        },
        preferences: {
          preferred_appointment_time: 'morning',
          communication_preference: 'email',
          language_preference: 'English',
        },
        dental: {
          previous_dentist: 'Dr. Smith Dental Practice',
          last_dental_visit: '2024-01-15',
          dental_anxiety_level: 'mild',
          dental_concerns: 'Regular maintenance, interested in whitening options',
        },
        consent: {
          marketing_consent: true,
          sms_consent: false,
          email_consent: true,
        },
        custom_fields: {
          referral_source: 'Professional colleague',
          special_requirements: 'Prefers female dentist',
          vip_status: 'Gold member',
        }
      }
    }
    
    console.log('Creating comprehensive contact profile...')
    
    const { data: result, error } = await supabase
      .from('contacts')
      .insert([comprehensiveContactData])
      .select()
    
    if (error) {
      console.error('❌ Comprehensive contact creation error:', error)
      return NextResponse.json({ 
        success: false, 
        error: `Contact creation failed: ${error.message}`,
        details: error
      })
    }
    
    console.log('✅ Comprehensive contact created successfully!')
    
    // Test reading the data back
    const { data: readBack, error: readError } = await supabase
      .from('contacts')
      .select('*, profile_data')
      .eq('id', result[0].id)
      .single()
    
    if (readError) {
      console.error('❌ Error reading back contact:', readError)
    } else {
      console.log('✅ Contact data read back successfully:', readBack.profile_data)
    }
    
    // Clean up test data
    await supabase.from('contacts').delete().eq('id', result[0].id)
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Comprehensive contact profile system is working!',
      createdContact: {
        id: result[0].id,
        full_name: result[0].full_name,
        profileDataKeys: Object.keys(result[0].profile_data || {}),
        personalDataKeys: Object.keys(result[0].profile_data?.personal || {}),
        medicalDataKeys: Object.keys(result[0].profile_data?.medical || {}),
      }
    })
    
  } catch (error) {
    console.error('Error in test-comprehensive-profile:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


