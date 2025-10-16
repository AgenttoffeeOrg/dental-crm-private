import { createServiceClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createServiceClient();
  const tenantId = process.env.TEST_TENANT_ID || (await getFirstTenantId());

  try {
    // Check if profile_data column exists more reliably
    let hasProfileDataColumn = false;
    try {
      const { error: checkError } = await supabase
        .from('contacts')
        .select('profile_data')
        .limit(1);
      
      // If no error, column exists
      hasProfileDataColumn = !checkError;
    } catch (e) {
      console.log('profile_data column check failed:', e);
      hasProfileDataColumn = false;
    }

    // Prepare contact data
    const contactData: any = {
      tenant_id: tenantId,
      full_name: 'Test Comprehensive Contact',
      primary_phone: '+44 7700 900123',
      primary_email: 'test.comprehensive@example.com',
      source: 'comprehensive_form',
      tags: ['comprehensive_profile', 'test_data'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Only add profile_data if the column exists
    if (hasProfileDataColumn) {
      contactData.profile_data = {
        personal: {
          preferred_name: 'Test User',
          title: 'Dr.',
          gender: 'prefer_not_to_say',
          occupation: 'Software Engineer',
        },
        address: {
          address: '123 Test Street',
          city: 'London',
          postal_code: 'SW1A 1AA',
          country: 'United Kingdom',
        },
        medical: {
          medical_conditions: 'None reported',
          allergies: 'No known allergies',
        },
        preferences: {
          communication_preference: 'email',
          language_preference: 'English',
        },
        consent: {
          marketing_consent: true,
          sms_consent: false,
          email_consent: true,
        },
      };
    } else {
      // Store some key data in tags for now
      contactData.tags = [
        ...contactData.tags,
        'address:123 Test Street',
        'medical:None reported',
        'occupation:Software Engineer'
      ];
    }

    const { data, error } = await supabase
      .from('contacts')
      .insert(contactData)
      .select()
      .single();

    if (error) {
      console.error('Error creating safe contact:', error);
      return NextResponse.json({ 
        success: false, 
        error: `Contact creation failed: ${error.message}`,
        details: error,
        hasProfileDataColumn
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Safe comprehensive contact created successfully!', 
      data,
      hasProfileDataColumn,
      usedProfileData: hasProfileDataColumn
    }, { status: 200 });

  } catch (e: any) {
    console.error('Unexpected error during safe contact creation:', e);
    return NextResponse.json({ 
      success: false, 
      error: e.message,
      hasProfileDataColumn: false
    }, { status: 500 });
  }
}
