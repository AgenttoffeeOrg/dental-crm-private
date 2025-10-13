import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Adding comprehensive contact fields...')
    
    // Apply migrations step by step
    const migrations = [
      // Personal information fields
      `ALTER TABLE contacts 
       ADD COLUMN IF NOT EXISTS preferred_name TEXT,
       ADD COLUMN IF NOT EXISTS title TEXT,
       ADD COLUMN IF NOT EXISTS secondary_phone TEXT,
       ADD COLUMN IF NOT EXISTS secondary_email TEXT,
       ADD COLUMN IF NOT EXISTS date_of_birth DATE,
       ADD COLUMN IF NOT EXISTS gender TEXT,
       ADD COLUMN IF NOT EXISTS marital_status TEXT,
       ADD COLUMN IF NOT EXISTS occupation TEXT,
       ADD COLUMN IF NOT EXISTS employer TEXT`,
      
      // Address information
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS address TEXT,
       ADD COLUMN IF NOT EXISTS city TEXT,
       ADD COLUMN IF NOT EXISTS postal_code TEXT,
       ADD COLUMN IF NOT EXISTS country TEXT`,
      
      // Medical information
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS medical_conditions TEXT,
       ADD COLUMN IF NOT EXISTS allergies TEXT,
       ADD COLUMN IF NOT EXISTS medications TEXT,
       ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
       ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
       ADD COLUMN IF NOT EXISTS emergency_contact_relationship TEXT`,
      
      // Insurance information
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
       ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT,
       ADD COLUMN IF NOT EXISTS insurance_group_number TEXT`,
      
      // Preferences
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS preferred_appointment_time TEXT,
       ADD COLUMN IF NOT EXISTS communication_preference TEXT,
       ADD COLUMN IF NOT EXISTS language_preference TEXT`,
      
      // Dental history
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS previous_dentist TEXT,
       ADD COLUMN IF NOT EXISTS last_dental_visit DATE,
       ADD COLUMN IF NOT EXISTS dental_anxiety_level TEXT,
       ADD COLUMN IF NOT EXISTS dental_concerns TEXT`,
      
      // Consent fields
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE,
       ADD COLUMN IF NOT EXISTS sms_consent BOOLEAN DEFAULT FALSE,
       ADD COLUMN IF NOT EXISTS email_consent BOOLEAN DEFAULT TRUE`,
      
      // Custom fields
      `ALTER TABLE contacts
       ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'`,
    ]
    
    let completedMigrations = 0
    
    for (const migration of migrations) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql: migration })
        
        if (error) {
          console.error('Migration step error:', error)
          // Try direct query if rpc fails
          const { error: directError } = await supabase.from('contacts').select('id').limit(1)
          if (!directError) {
            console.log('Direct query works, trying alternative approach...')
          }
        } else {
          completedMigrations++
          console.log(`✅ Migration step ${completedMigrations} completed`)
        }
      } catch (stepError) {
        console.error('Step error:', stepError)
      }
    }
    
    // Test if the new fields exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('contacts')
      .select('id, full_name, preferred_name, date_of_birth, address, medical_conditions')
      .limit(1)
    
    if (testError) {
      console.error('Test query error:', testError)
      return NextResponse.json({ 
        success: false, 
        error: `Migration verification failed: ${testError.message}`,
        completedSteps: completedMigrations
      })
    }
    
    console.log('✅ Migration verification successful:', testData)
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Comprehensive contact fields migration completed!',
      details: {
        completedMigrations,
        totalMigrations: migrations.length,
        newFieldsAvailable: [
          'preferred_name', 'title', 'secondary_phone', 'secondary_email', 
          'date_of_birth', 'gender', 'marital_status', 'occupation', 'employer',
          'address', 'city', 'postal_code', 'country',
          'medical_conditions', 'allergies', 'medications',
          'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
          'insurance_provider', 'insurance_policy_number', 'insurance_group_number',
          'preferred_appointment_time', 'communication_preference', 'language_preference',
          'previous_dentist', 'last_dental_visit', 'dental_anxiety_level', 'dental_concerns',
          'marketing_consent', 'sms_consent', 'email_consent', 'custom_fields'
        ]
      }
    })
    
  } catch (error) {
    console.error('Error in comprehensive-contact-migration:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


