import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Creating contacts and deals for a realistic practice...')
    
    // Step 1: Create the missing contacts for existing deals
    const existingContacts = [
      {
        id: '550e8400-e29b-41d4-a716-446655440020', // Sarah Johnson
        full_name: 'Sarah Johnson',
        primary_email: 'sarah.johnson@email.com',
        primary_phone: '+44 7700 900001',
        date_of_birth: '1985-06-15',
        address: '123 Main Street, London SW1A 1AA',
        lead_score: 75,
        tags: ['New Patient', 'Cosmetic'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440021', // Michael Brown  
        full_name: 'Michael Brown',
        primary_email: 'michael.brown@email.com',
        primary_phone: '+44 7700 900002',
        date_of_birth: '1978-03-22',
        address: '456 Oak Avenue, London W1K 5AB',
        lead_score: 88,
        tags: ['High Value', 'Implants'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440022', // Emma Wilson
        full_name: 'Emma Wilson',
        primary_email: 'emma.wilson@email.com',
        primary_phone: '+44 7700 900003',
        date_of_birth: '1990-11-08',
        address: '789 Pine Road, London EC1A 1BB',
        lead_score: 82,
        tags: ['Orthodontics', 'Young Professional'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440023', // James Davis
        full_name: 'James Davis',
        primary_email: 'james.davis@email.com',
        primary_phone: '+44 7700 900004',
        date_of_birth: '1975-09-12',
        address: '321 Elm Street, London N1 2CD',
        lead_score: 65,
        tags: ['Emergency', 'Root Canal'],
        status: 'active'
      }
    ]
    
    // Create additional realistic patients
    const newPatients = [
      {
        id: '550e8400-e29b-41d4-a716-446655440400',
        full_name: 'Dr. Victoria Sterling',
        primary_email: 'victoria.sterling@harleystreet.com',
        primary_phone: '+44 7700 900400',
        date_of_birth: '1973-08-12',
        address: '123 Harley Street, London W1G 6AX',
        lead_score: 98,
        tags: ['VIP', 'Dentist', 'High Value', 'Referrer'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440401',
        full_name: 'James Wellington III',
        primary_email: 'james@wellington-estates.co.uk',
        primary_phone: '+44 7700 900401',
        date_of_birth: '1965-04-22',
        address: '88 Belgravia Square, London SW1X 8QD',
        lead_score: 94,
        tags: ['Aristocracy', 'High Value', 'Multiple Properties'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440402',
        full_name: 'Priya Sharma',
        primary_email: 'priya.sharma@techstartup.io',
        primary_phone: '+44 7700 900402',
        date_of_birth: '1988-09-15',
        address: '45 Silicon Roundabout, London EC2A 3LT',
        lead_score: 82,
        tags: ['Tech CEO', 'Young Executive', 'Busy Schedule'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440403',
        full_name: 'Elena Rossi',
        primary_email: 'elena@italianrestaurant.london',
        primary_phone: '+44 7700 900403',
        date_of_birth: '1981-03-08',
        address: '67 Little Italy, London W1D 4PS',
        lead_score: 75,
        tags: ['Restaurant Owner', 'Italian', 'Food Industry'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440404',
        full_name: 'Mohammed Al-Rashid',
        primary_email: 'm.alrashid@diplomatic.gov',
        primary_phone: '+44 7700 900404',
        date_of_birth: '1975-12-03',
        address: '156 Diplomatic Quarter, London SW7 1NA',
        lead_score: 91,
        tags: ['Diplomat', 'International', 'VIP'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440405',
        full_name: 'Charlotte Pemberton',
        primary_email: 'charlotte@pembergallery.com',
        primary_phone: '+44 7700 900405',
        date_of_birth: '1979-06-25',
        address: '234 Bond Street, London W1S 2ND',
        lead_score: 87,
        tags: ['Art Gallery', 'Creative', 'Networking'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440406',
        full_name: 'Dr. Samuel Hughes',
        primary_email: 'sam.hughes@nhs.uk',
        primary_phone: '+44 7700 900406',
        date_of_birth: '1982-11-17',
        address: '89 Hospital Road, London SE1 7EH',
        lead_score: 79,
        tags: ['NHS Doctor', 'Healthcare', 'Professional'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440407',
        full_name: 'Anastasia Volkov',
        primary_email: 'anastasia@luxuryproperties.com',
        primary_phone: '+44 7700 900407',
        date_of_birth: '1985-02-14',
        address: '78 Knightsbridge, London SW1X 7XL',
        lead_score: 93,
        tags: ['Luxury Real Estate', 'Russian', 'High Net Worth'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440408',
        full_name: 'Marcus Thompson',
        primary_email: 'marcus@fitnessempire.co.uk',
        primary_phone: '+44 7700 900408',
        date_of_birth: '1987-07-09',
        address: '123 Gym Street, London E1 6AN',
        lead_score: 71,
        tags: ['Fitness Industry', 'Entrepreneur', 'Active'],
        status: 'active'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440409',
        full_name: 'Fatima Al-Zahra',
        primary_email: 'fatima@fashionhouse.ae',
        primary_phone: '+44 7700 900409',
        date_of_birth: '1990-04-18',
        address: '45 Fashion District, London W1K 5AB',
        lead_score: 84,
        tags: ['Fashion Designer', 'Middle Eastern', 'Creative'],
        status: 'active'
      }
    ]
    
    const allContacts = [...existingContacts, ...newPatients]
    
    let contactsCreated = 0
    for (const contact of allContacts) {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          ...contact,
          tenant_id: tenantId,
          created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating contact:', contact.full_name, error)
      } else if (!error) {
        contactsCreated++
      }
    }
    
    console.log(`✅ Created ${contactsCreated} contacts`)
    
    // Step 2: Create additional deals for the new contacts
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
    
    // Create multiple deals for high-value patients
    const newDeals = [
      // Dr. Victoria Sterling (VIP - 3 deals)
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440400',
        title: 'Executive Smile Reconstruction',
        description: 'Complete smile makeover for fellow dentist',
        value_estimate_cents: 1850000,
        treatment_tags: ['Veneers', 'Crowns', 'Executive'],
        source: 'Professional Referral'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440400',
        title: 'Annual VIP Maintenance',
        description: 'Comprehensive annual dental health program',
        value_estimate_cents: 250000,
        treatment_tags: ['Preventive', 'VIP', 'Annual'],
        source: 'Existing Patient'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440400',
        title: 'Gum Disease Treatment',
        description: 'Advanced periodontal therapy',
        value_estimate_cents: 180000,
        treatment_tags: ['Periodontics', 'Advanced'],
        source: 'Routine Check'
      },
      
      // James Wellington III (Aristocrat - 2 deals)
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440401',
        title: 'Aristocrat Dental Suite',
        description: 'Premium dental care for distinguished gentleman',
        value_estimate_cents: 3200000,
        treatment_tags: ['Implants', 'Crowns', 'Premium'],
        source: 'Word of Mouth'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440401',
        title: 'Family Estate Dental Plan',
        description: 'Comprehensive dental care for entire family',
        value_estimate_cents: 850000,
        treatment_tags: ['Family', 'Preventive', 'Comprehensive'],
        source: 'Existing Patient'
      },
      
      // Priya Sharma (Tech CEO - 2 deals)
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440402',
        title: 'CEO Express Whitening',
        description: 'Quick professional whitening for busy executive',
        value_estimate_cents: 85000,
        treatment_tags: ['Whitening', 'Express', 'Executive'],
        source: 'LinkedIn'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440402',
        title: 'Invisalign Executive Package',
        description: 'Discrete orthodontic treatment for CEO',
        value_estimate_cents: 450000,
        treatment_tags: ['Invisalign', 'Executive', 'Discrete'],
        source: 'Existing Patient'
      },
      
      // Add single deals for other patients
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440403',
        title: 'Restaurant Owner Smile',
        description: 'Professional smile for customer-facing business',
        value_estimate_cents: 320000,
        treatment_tags: ['Veneers', 'Professional'],
        source: 'Google Ads'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440404',
        title: 'Diplomatic VIP Treatment',
        description: 'Discrete high-quality dental care for diplomat',
        value_estimate_cents: 950000,
        treatment_tags: ['VIP', 'Diplomatic', 'Discrete'],
        source: 'Embassy Referral'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440405',
        title: 'Art Gallery Owner Consultation',
        description: 'Initial consultation for cosmetic improvements',
        value_estimate_cents: 15000,
        treatment_tags: ['Consultation', 'Cosmetic'],
        source: 'Instagram'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440406',
        title: 'NHS Doctor Professional Care',
        description: 'Comprehensive dental care for healthcare professional',
        value_estimate_cents: 280000,
        treatment_tags: ['Professional', 'Comprehensive'],
        source: 'Professional Network'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440407',
        title: 'Luxury Property Executive Smile',
        description: 'High-end cosmetic dental work',
        value_estimate_cents: 650000,
        treatment_tags: ['Cosmetic', 'High-end', 'Executive'],
        source: 'Referral'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440408',
        title: 'Fitness Entrepreneur Whitening',
        description: 'Professional whitening for fitness industry professional',
        value_estimate_cents: 65000,
        treatment_tags: ['Whitening', 'Professional'],
        source: 'Facebook Ads'
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440409',
        title: 'Fashion Designer Smile Makeover',
        description: 'Complete aesthetic transformation',
        value_estimate_cents: 750000,
        treatment_tags: ['Cosmetic', 'Makeover', 'Fashion'],
        source: 'Instagram'
      }
    ]
    
    let dealsCreated = 0
    let dealIndex = 6000
    
    for (const dealData of newDeals) {
      const { error } = await supabase
        .from('deals')
        .insert([{
          id: `550e8400-e29b-41d4-a716-44665544${dealIndex.toString().padStart(4, '0')}`,
          tenant_id: tenantId,
          contact_id: dealData.contact_id,
          pipeline_id: pipelineId,
          stage_id: stageId,
          title: dealData.title,
          description: dealData.description,
          value_estimate_cents: dealData.value_estimate_cents,
          currency: 'GBP',
          treatment_tags: dealData.treatment_tags,
          source: dealData.source,
          created_at: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString()
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating deal:', dealData.title, error)
      } else if (!error) {
        dealsCreated++
      }
      
      dealIndex++
    }
    
    console.log(`✅ Created ${dealsCreated} deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created ${contactsCreated} contacts and ${dealsCreated} deals. Your CRM now has realistic practice data!`,
      stats: {
        contactsCreated,
        dealsCreated,
        totalContacts: allContacts.length,
        totalDeals: newDeals.length,
        totalValue: newDeals.reduce((sum, deal) => sum + deal.value_estimate_cents, 0)
      }
    })
    
  } catch (error) {
    console.error('Error in create-realistic-practice:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

