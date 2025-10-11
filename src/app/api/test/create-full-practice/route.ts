import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Creating comprehensive realistic dental practice data...')
    
    // Step 1: Create more realistic patients
    const newPatients = [
      {
        id: '550e8400-e29b-41d4-a716-446655440200',
        full_name: 'Dr. Victoria Sterling',
        primary_email: 'v.sterling@harleystreet.com',
        primary_phone: '+44 7700 900200',
        date_of_birth: '1973-08-12',
        address: '123 Harley Street, London W1G 6AX',
        lead_score: 98,
        tags: ['VIP', 'Dentist', 'High Value', 'Referrer'],
        created_at: '2022-11-10 09:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440201',
        full_name: 'James Wellington III',
        primary_email: 'james@wellington-estates.co.uk',
        primary_phone: '+44 7700 900201',
        date_of_birth: '1965-04-22',
        address: '88 Belgravia Square, London SW1X 8QD',
        lead_score: 94,
        tags: ['Aristocracy', 'High Value', 'Multiple Properties'],
        created_at: '2022-12-05 14:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440202',
        full_name: 'Priya Sharma',
        primary_email: 'priya.sharma@techstartup.io',
        primary_phone: '+44 7700 900202',
        date_of_birth: '1988-09-15',
        address: '45 Silicon Roundabout, London EC2A 3LT',
        lead_score: 82,
        tags: ['Tech CEO', 'Young Executive', 'Busy Schedule'],
        created_at: '2023-08-20 11:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440203',
        full_name: 'Elena Rossi',
        primary_email: 'elena@italianrestaurant.london',
        primary_phone: '+44 7700 900203',
        date_of_birth: '1981-03-08',
        address: '67 Little Italy, London W1D 4PS',
        lead_score: 75,
        tags: ['Restaurant Owner', 'Italian', 'Food Industry'],
        created_at: '2023-09-12 16:20:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440204',
        full_name: 'Mohammed Al-Rashid',
        primary_email: 'm.alrashid@diplomatic.gov',
        primary_phone: '+44 7700 900204',
        date_of_birth: '1975-12-03',
        address: '156 Diplomatic Quarter, London SW7 1NA',
        lead_score: 91,
        tags: ['Diplomat', 'International', 'VIP'],
        created_at: '2023-07-18 10:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440205',
        full_name: 'Charlotte Pemberton',
        primary_email: 'charlotte@pembergallery.com',
        primary_phone: '+44 7700 900205',
        date_of_birth: '1979-06-25',
        address: '234 Bond Street, London W1S 2ND',
        lead_score: 87,
        tags: ['Art Gallery', 'Creative', 'Networking'],
        created_at: '2023-05-30 13:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440206',
        full_name: 'Dr. Samuel Hughes',
        primary_email: 'sam.hughes@nhs.uk',
        primary_phone: '+44 7700 900206',
        date_of_birth: '1982-11-17',
        address: '89 Hospital Road, London SE1 7EH',
        lead_score: 79,
        tags: ['NHS Doctor', 'Healthcare', 'Professional'],
        created_at: '2023-10-08 09:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440207',
        full_name: 'Anastasia Volkov',
        primary_email: 'anastasia@luxuryproperties.com',
        primary_phone: '+44 7700 900207',
        date_of_birth: '1985-02-14',
        address: '78 Knightsbridge, London SW1X 7XL',
        lead_score: 93,
        tags: ['Luxury Real Estate', 'Russian', 'High Net Worth'],
        created_at: '2023-04-22 15:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440208',
        full_name: 'Marcus Thompson',
        primary_email: 'marcus@fitnessempire.co.uk',
        primary_phone: '+44 7700 900208',
        date_of_birth: '1987-07-09',
        address: '123 Gym Street, London E1 6AN',
        lead_score: 71,
        tags: ['Fitness Industry', 'Entrepreneur', 'Active'],
        created_at: '2024-01-05 12:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440209',
        full_name: 'Fatima Al-Zahra',
        primary_email: 'fatima@fashionhouse.ae',
        primary_phone: '+44 7700 900209',
        date_of_birth: '1990-04-18',
        address: '45 Fashion District, London W1K 5AB',
        lead_score: 84,
        tags: ['Fashion Designer', 'Middle Eastern', 'Creative'],
        created_at: '2023-12-01 14:45:00+00'
      }
    ]
    
    let patientsCreated = 0
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
      }
    }
    
    console.log(`✅ Created ${patientsCreated} new patients`)
    
    // Step 2: Get existing pipeline info
    const { data: pipelines } = await supabase
      .from('pipelines')
      .select('id, name')
      .eq('tenant_id', tenantId)
    
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name, pipeline_id')
      .order('order_index')
    
    if (!pipelines || !stages) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pipeline data not found. Please ensure basic setup is complete.' 
      })
    }
    
    const defaultPipeline = pipelines[0]
    const pipelineStages = stages.filter(s => s.pipeline_id === defaultPipeline.id)
    
    // Step 3: Create realistic deals with varying stages
    const dealsToCreate = [
      // High-value VIP patients with multiple deals
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440200', // Dr. Victoria Sterling
        deals: [
          {
            title: 'Executive Smile Reconstruction',
            description: 'Complete smile makeover for fellow dentist',
            value_estimate_cents: 1850000,
            treatment_tags: ['Veneers', 'Crowns', 'Executive'],
            stage: 'Closed Won',
            source: 'Professional Referral',
            created_at: '2022-12-01 10:00:00+00'
          },
          {
            title: 'Annual VIP Maintenance',
            description: 'Comprehensive annual dental health program',
            value_estimate_cents: 250000,
            treatment_tags: ['Preventive', 'VIP', 'Annual'],
            stage: 'Treatment Plan',
            source: 'Existing Patient',
            created_at: '2024-01-15 14:30:00+00'
          }
        ]
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440201', // James Wellington III
        deals: [
          {
            title: 'Aristocrat Dental Suite',
            description: 'Premium dental care for distinguished gentleman',
            value_estimate_cents: 3200000,
            treatment_tags: ['Implants', 'Crowns', 'Premium'],
            stage: 'Closed Won',
            source: 'Word of Mouth',
            created_at: '2023-01-10 11:15:00+00'
          },
          {
            title: 'Family Estate Dental Plan',
            description: 'Comprehensive dental care for entire family',
            value_estimate_cents: 850000,
            treatment_tags: ['Family', 'Preventive', 'Comprehensive'],
            stage: 'Treatment Plan',
            source: 'Existing Patient',
            created_at: '2024-02-01 09:30:00+00'
          }
        ]
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440202', // Priya Sharma (Tech CEO)
        deals: [
          {
            title: 'CEO Express Whitening',
            description: 'Quick professional whitening for busy executive',
            value_estimate_cents: 85000,
            treatment_tags: ['Whitening', 'Express', 'Executive'],
            stage: 'Closed Won',
            source: 'LinkedIn',
            created_at: '2023-09-05 16:45:00+00'
          },
          {
            title: 'Invisalign Executive Package',
            description: 'Discrete orthodontic treatment for CEO',
            value_estimate_cents: 450000,
            treatment_tags: ['Invisalign', 'Executive', 'Discrete'],
            stage: 'Consultation',
            source: 'Existing Patient',
            created_at: '2024-02-20 13:20:00+00'
          }
        ]
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440203', // Elena Rossi (Restaurant Owner)
        deals: [
          {
            title: 'Restaurant Owner Smile',
            description: 'Professional smile for customer-facing business',
            value_estimate_cents: 320000,
            treatment_tags: ['Veneers', 'Professional', 'Customer Service'],
            stage: 'Treatment Plan',
            source: 'Google Ads',
            created_at: '2023-10-15 12:30:00+00'
          }
        ]
      },
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440204', // Mohammed Al-Rashid (Diplomat)
        deals: [
          {
            title: 'Diplomatic VIP Treatment',
            description: 'Discrete high-quality dental care for diplomat',
            value_estimate_cents: 950000,
            treatment_tags: ['VIP', 'Diplomatic', 'Discrete'],
            stage: 'Closed Won',
            source: 'Embassy Referral',
            created_at: '2023-08-01 10:45:00+00'
          },
          {
            title: 'Emergency Diplomatic Care',
            description: 'Priority emergency dental services',
            value_estimate_cents: 180000,
            treatment_tags: ['Emergency', 'VIP', 'Priority'],
            stage: 'Consultation',
            source: 'Emergency',
            created_at: '2024-02-28 19:15:00+00'
          }
        ]
      },
      // Add some leads and prospects
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440205', // Charlotte Pemberton
        deals: [
          {
            title: 'Art Gallery Owner Consultation',
            description: 'Initial consultation for cosmetic improvements',
            value_estimate_cents: 15000,
            treatment_tags: ['Consultation', 'Cosmetic'],
            stage: 'Lead',
            source: 'Instagram',
            created_at: '2024-03-01 14:20:00+00'
          }
        ]
      },
      // Add some closed lost for realism
      {
        contact_id: '550e8400-e29b-41d4-a716-446655440208', // Marcus Thompson
        deals: [
          {
            title: 'Fitness Entrepreneur Whitening',
            description: 'Professional whitening for fitness industry professional',
            value_estimate_cents: 65000,
            treatment_tags: ['Whitening', 'Professional'],
            stage: 'Closed Lost',
            source: 'Facebook Ads',
            created_at: '2024-01-10 11:30:00+00'
          }
        ]
      }
    ]
    
    let dealsCreated = 0
    
    for (const contactDeals of dealsToCreate) {
      for (const dealData of contactDeals.deals) {
        // Find the appropriate stage
        const stage = pipelineStages.find(s => s.name === dealData.stage) || pipelineStages[0]
        
        const { error } = await supabase
          .from('deals')
          .insert([{
            id: `550e8400-e29b-41d4-a716-${Math.random().toString(36).substr(2, 12)}`,
            tenant_id: tenantId,
            contact_id: contactDeals.contact_id,
            pipeline_id: defaultPipeline.id,
            stage_id: stage.id,
            title: dealData.title,
            description: dealData.description,
            value_estimate_cents: dealData.value_estimate_cents,
            currency: 'GBP',
            treatment_tags: dealData.treatment_tags,
            source: dealData.source,
            created_at: dealData.created_at
          }])
        
        if (error && !error.message.includes('duplicate key')) {
          console.error('Error creating deal:', dealData.title, error)
        } else if (!error) {
          dealsCreated++
        }
      }
    }
    
    console.log(`✅ Created ${dealsCreated} realistic deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 Created realistic dental practice data: ${patientsCreated} new patients, ${dealsCreated} deals with various stages and values. Your CRM now looks like a thriving practice!`,
      stats: {
        patientsCreated,
        dealsCreated,
        totalPatients: newPatients.length + patientsCreated,
        totalDeals: dealsCreated
      }
    })
    
  } catch (error) {
    console.error('Error in create-full-practice:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

