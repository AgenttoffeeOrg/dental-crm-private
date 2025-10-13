import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Creating realistic practice data that actually works...')
    
    // Step 1: Get existing pipeline data
    const { data: existingDeals } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    if (!existingDeals || existingDeals.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No existing deals found. Cannot determine pipeline structure.' 
      })
    }
    
    const pipelineId = existingDeals[0].pipeline_id
    const defaultStageId = existingDeals[0].stage_id
    
    // Step 2: Create realistic patients
    const newPatients = [
      {
        id: '550e8400-e29b-41d4-a716-446655440300',
        full_name: 'Dr. Victoria Sterling',
        primary_email: 'v.sterling@harleystreet.com',
        primary_phone: '+44 7700 900300',
        date_of_birth: '1973-08-12',
        address: '123 Harley Street, London W1G 6AX',
        lead_score: 98,
        tags: ['VIP', 'Dentist', 'High Value'],
        created_at: '2022-11-10 09:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440301',
        full_name: 'James Wellington III',
        primary_email: 'james@wellington-estates.co.uk',
        primary_phone: '+44 7700 900301',
        date_of_birth: '1965-04-22',
        address: '88 Belgravia Square, London SW1X 8QD',
        lead_score: 94,
        tags: ['Aristocracy', 'High Value'],
        created_at: '2022-12-05 14:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440302',
        full_name: 'Priya Sharma',
        primary_email: 'priya.sharma@techstartup.io',
        primary_phone: '+44 7700 900302',
        date_of_birth: '1988-09-15',
        address: '45 Silicon Roundabout, London EC2A 3LT',
        lead_score: 82,
        tags: ['Tech CEO', 'Young Executive'],
        created_at: '2023-08-20 11:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440303',
        full_name: 'Elena Rossi',
        primary_email: 'elena@italianrestaurant.london',
        primary_phone: '+44 7700 900303',
        date_of_birth: '1981-03-08',
        address: '67 Little Italy, London W1D 4PS',
        lead_score: 75,
        tags: ['Restaurant Owner', 'Italian'],
        created_at: '2023-09-12 16:20:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440304',
        full_name: 'Mohammed Al-Rashid',
        primary_email: 'm.alrashid@diplomatic.gov',
        primary_phone: '+44 7700 900304',
        date_of_birth: '1975-12-03',
        address: '156 Diplomatic Quarter, London SW7 1NA',
        lead_score: 91,
        tags: ['Diplomat', 'International', 'VIP'],
        created_at: '2023-07-18 10:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440305',
        full_name: 'Charlotte Pemberton',
        primary_email: 'charlotte@pembergallery.com',
        primary_phone: '+44 7700 900305',
        date_of_birth: '1979-06-25',
        address: '234 Bond Street, London W1S 2ND',
        lead_score: 87,
        tags: ['Art Gallery', 'Creative'],
        created_at: '2023-05-30 13:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440306',
        full_name: 'Dr. Samuel Hughes',
        primary_email: 'sam.hughes@nhs.uk',
        primary_phone: '+44 7700 900306',
        date_of_birth: '1982-11-17',
        address: '89 Hospital Road, London SE1 7EH',
        lead_score: 79,
        tags: ['NHS Doctor', 'Healthcare'],
        created_at: '2023-10-08 09:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440307',
        full_name: 'Anastasia Volkov',
        primary_email: 'anastasia@luxuryproperties.com',
        primary_phone: '+44 7700 900307',
        date_of_birth: '1985-02-14',
        address: '78 Knightsbridge, London SW1X 7XL',
        lead_score: 93,
        tags: ['Luxury Real Estate', 'High Net Worth'],
        created_at: '2023-04-22 15:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440308',
        full_name: 'Marcus Thompson',
        primary_email: 'marcus@fitnessempire.co.uk',
        primary_phone: '+44 7700 900308',
        date_of_birth: '1987-07-09',
        address: '123 Gym Street, London E1 6AN',
        lead_score: 71,
        tags: ['Fitness Industry', 'Entrepreneur'],
        created_at: '2024-01-05 12:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440309',
        full_name: 'Fatima Al-Zahra',
        primary_email: 'fatima@fashionhouse.ae',
        primary_phone: '+44 7700 900309',
        date_of_birth: '1990-04-18',
        address: '45 Fashion District, London W1K 5AB',
        lead_score: 84,
        tags: ['Fashion Designer', 'Creative'],
        created_at: '2023-12-01 14:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440310',
        full_name: 'Benjamin Clarke',
        primary_email: 'ben.clarke@lawchambers.co.uk',
        primary_phone: '+44 7700 900310',
        date_of_birth: '1976-09-30',
        address: '45 Lincoln\'s Inn Fields, London WC2A 3LJ',
        lead_score: 88,
        tags: ['Barrister', 'Legal', 'Professional'],
        created_at: '2023-03-18 11:20:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440311',
        full_name: 'Sophie Chen',
        primary_email: 'sophie@architecturestudio.com',
        primary_phone: '+44 7700 900311',
        date_of_birth: '1983-12-07',
        address: '78 Shoreditch High Street, London E1 6JJ',
        lead_score: 76,
        tags: ['Architect', 'Creative', 'Professional'],
        created_at: '2023-11-25 14:30:00+00'
      }
    ]
    
    let patientsCreated = 0
    const patientIds = []
    
    for (const patient of newPatients) {
      const { error } = await supabase
        .from('contacts')
        .insert([{
          ...patient,
          tenant_id: tenantId,
          status: 'active'
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating patient:', patient.full_name, error)
      } else if (!error) {
        patientsCreated++
        patientIds.push(patient.id)
      }
    }
    
    console.log(`✅ Created ${patientsCreated} new patients`)
    
    // Step 3: Create multiple deals for these patients
    const dealsToCreate = [
      // Dr. Victoria Sterling - 3 deals
      {
        id: '550e8400-e29b-41d4-a716-446655443000',
        contact_id: '550e8400-e29b-41d4-a716-446655440300',
        title: 'Executive Smile Reconstruction',
        description: 'Complete smile makeover for fellow dentist',
        value_estimate_cents: 1850000,
        treatment_tags: ['Veneers', 'Crowns', 'Executive'],
        source: 'Professional Referral'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443001',
        contact_id: '550e8400-e29b-41d4-a716-446655440300',
        title: 'Annual VIP Maintenance',
        description: 'Comprehensive annual dental health program',
        value_estimate_cents: 250000,
        treatment_tags: ['Preventive', 'VIP', 'Annual'],
        source: 'Existing Patient'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443002',
        contact_id: '550e8400-e29b-41d4-a716-446655440300',
        title: 'Gum Disease Treatment',
        description: 'Advanced periodontal therapy',
        value_estimate_cents: 180000,
        treatment_tags: ['Periodontics', 'Advanced'],
        source: 'Routine Check'
      },
      
      // James Wellington III - 2 deals
      {
        id: '550e8400-e29b-41d4-a716-446655443003',
        contact_id: '550e8400-e29b-41d4-a716-446655440301',
        title: 'Aristocrat Dental Suite',
        description: 'Premium dental care for distinguished gentleman',
        value_estimate_cents: 3200000,
        treatment_tags: ['Implants', 'Crowns', 'Premium'],
        source: 'Word of Mouth'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443004',
        contact_id: '550e8400-e29b-41d4-a716-446655440301',
        title: 'Family Estate Dental Plan',
        description: 'Comprehensive dental care for entire family',
        value_estimate_cents: 850000,
        treatment_tags: ['Family', 'Preventive', 'Comprehensive'],
        source: 'Existing Patient'
      },
      
      // Priya Sharma - 2 deals
      {
        id: '550e8400-e29b-41d4-a716-446655443005',
        contact_id: '550e8400-e29b-41d4-a716-446655440302',
        title: 'CEO Express Whitening',
        description: 'Quick professional whitening for busy executive',
        value_estimate_cents: 85000,
        treatment_tags: ['Whitening', 'Express', 'Executive'],
        source: 'LinkedIn'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443006',
        contact_id: '550e8400-e29b-41d4-a716-446655440302',
        title: 'Invisalign Executive Package',
        description: 'Discrete orthodontic treatment for CEO',
        value_estimate_cents: 450000,
        treatment_tags: ['Invisalign', 'Executive', 'Discrete'],
        source: 'Existing Patient'
      },
      
      // Elena Rossi - 1 deal
      {
        id: '550e8400-e29b-41d4-a716-446655443007',
        contact_id: '550e8400-e29b-41d4-a716-446655440303',
        title: 'Restaurant Owner Smile',
        description: 'Professional smile for customer-facing business',
        value_estimate_cents: 320000,
        treatment_tags: ['Veneers', 'Professional', 'Customer Service'],
        source: 'Google Ads'
      },
      
      // Mohammed Al-Rashid - 2 deals
      {
        id: '550e8400-e29b-41d4-a716-446655443008',
        contact_id: '550e8400-e29b-41d4-a716-446655440304',
        title: 'Diplomatic VIP Treatment',
        description: 'Discrete high-quality dental care for diplomat',
        value_estimate_cents: 950000,
        treatment_tags: ['VIP', 'Diplomatic', 'Discrete'],
        source: 'Embassy Referral'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443009',
        contact_id: '550e8400-e29b-41d4-a716-446655440304',
        title: 'Emergency Diplomatic Care',
        description: 'Priority emergency dental services',
        value_estimate_cents: 180000,
        treatment_tags: ['Emergency', 'VIP', 'Priority'],
        source: 'Emergency'
      },
      
      // Charlotte Pemberton - 1 deal
      {
        id: '550e8400-e29b-41d4-a716-446655443010',
        contact_id: '550e8400-e29b-41d4-a716-446655440305',
        title: 'Art Gallery Owner Consultation',
        description: 'Initial consultation for cosmetic improvements',
        value_estimate_cents: 15000,
        treatment_tags: ['Consultation', 'Cosmetic'],
        source: 'Instagram'
      },
      
      // Add more single deals for other patients
      {
        id: '550e8400-e29b-41d4-a716-446655443011',
        contact_id: '550e8400-e29b-41d4-a716-446655440306',
        title: 'NHS Doctor Professional Care',
        description: 'Comprehensive dental care for healthcare professional',
        value_estimate_cents: 280000,
        treatment_tags: ['Professional', 'Comprehensive'],
        source: 'Professional Network'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443012',
        contact_id: '550e8400-e29b-41d4-a716-446655440307',
        title: 'Luxury Property Executive Smile',
        description: 'High-end cosmetic dental work',
        value_estimate_cents: 650000,
        treatment_tags: ['Cosmetic', 'High-end', 'Executive'],
        source: 'Referral'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443013',
        contact_id: '550e8400-e29b-41d4-a716-446655440308',
        title: 'Fitness Entrepreneur Whitening',
        description: 'Professional whitening for fitness industry professional',
        value_estimate_cents: 65000,
        treatment_tags: ['Whitening', 'Professional'],
        source: 'Facebook Ads'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443014',
        contact_id: '550e8400-e29b-41d4-a716-446655440309',
        title: 'Fashion Designer Smile Makeover',
        description: 'Complete aesthetic transformation',
        value_estimate_cents: 750000,
        treatment_tags: ['Cosmetic', 'Makeover', 'Fashion'],
        source: 'Instagram'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443015',
        contact_id: '550e8400-e29b-41d4-a716-446655440310',
        title: 'Barrister Professional Package',
        description: 'Comprehensive dental care for legal professional',
        value_estimate_cents: 420000,
        treatment_tags: ['Professional', 'Comprehensive', 'Legal'],
        source: 'Professional Referral'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655443016',
        contact_id: '550e8400-e29b-41d4-a716-446655440311',
        title: 'Architect Creative Smile',
        description: 'Aesthetic dental work for creative professional',
        value_estimate_cents: 380000,
        treatment_tags: ['Aesthetic', 'Creative', 'Professional'],
        source: 'Design Network'
      }
    ]
    
    let dealsCreated = 0
    
    for (const deal of dealsToCreate) {
      const { error } = await supabase
        .from('deals')
        .insert([{
          ...deal,
          tenant_id: tenantId,
          pipeline_id: pipelineId,
          stage_id: defaultStageId,
          currency: 'GBP',
          created_at: new Date().toISOString()
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating deal:', deal.title, error)
      } else if (!error) {
        dealsCreated++
      }
    }
    
    console.log(`✅ Created ${dealsCreated} realistic deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created ${patientsCreated} new patients and ${dealsCreated} deals. Your CRM now has realistic data!`,
      stats: {
        patientsCreated,
        dealsCreated,
        totalValue: dealsToCreate.reduce((sum, deal) => sum + deal.value_estimate_cents, 0)
      }
    })
    
  } catch (error) {
    console.error('Error in create-working-data:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


