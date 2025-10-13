import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Applying comprehensive contact fields migration...')
    
    // Read the SQL migration file
    const migrationPath = join(process.cwd(), 'supabase/sql/13_comprehensive_contact_fields.sql')
    const migrationSQL = readFileSync(migrationPath, 'utf8')
    
    // Execute the migration
    const { error } = await supabase.rpc('exec', { sql: migrationSQL })
    
    if (error) {
      console.error('Migration error:', error)
      return NextResponse.json({ 
        success: false, 
        error: `Migration failed: ${error.message}`,
        details: error
      })
    }
    
    console.log('✅ Migration applied successfully')
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 Comprehensive contact fields added to database!',
      details: {
        newFields: [
          'Personal: preferred_name, title, secondary_phone, secondary_email, date_of_birth, gender, marital_status, occupation, employer',
          'Address: address, city, postal_code, country',
          'Medical: medical_conditions, allergies, medications, emergency contacts',
          'Insurance: insurance_provider, policy_number, group_number',
          'Preferences: appointment_time, communication_preference, language_preference',
          'Dental: previous_dentist, last_visit, anxiety_level, concerns',
          'Consent: marketing_consent, sms_consent, email_consent',
          'Custom: custom_fields (JSONB for unlimited custom fields)'
        ]
      }
    })
    
  } catch (error) {
    console.error('Error in apply-comprehensive-contact-migration:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


