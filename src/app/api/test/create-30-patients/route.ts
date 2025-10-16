import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = process.env.TEST_TENANT_ID || (await getFirstTenantId())
    
    console.log('Creating 30 realistic dental patients as requested...')
    
    // Get existing pipeline structure
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
    
    // Create 30 realistic dental patients
    const patients = [
      // VIP/High-Value Patients (5-6 patients, 3-4 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440500',
        full_name: 'Dr. Victoria Sterling',
        primary_email: 'victoria.sterling@harleystreet.com',
        primary_phone: '+44 7700 900500',
        date_of_birth: '1973-08-12',
        address: '123 Harley Street, London W1G 6AX',
        lead_score: 98,
        tags: ['VIP', 'Dentist', 'High Value', 'Referrer'],
        deals: [
          { title: 'Executive Smile Reconstruction', value: 1850000, tags: ['Veneers', 'Crowns', 'Executive'] },
          { title: 'Annual VIP Maintenance', value: 250000, tags: ['Preventive', 'VIP', 'Annual'] },
          { title: 'Gum Disease Treatment', value: 180000, tags: ['Periodontics', 'Advanced'] },
          { title: 'Bite Adjustment Therapy', value: 120000, tags: ['TMJ', 'Occlusion'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440501',
        full_name: 'James Wellington III',
        primary_email: 'james@wellington-estates.co.uk',
        primary_phone: '+44 7700 900501',
        date_of_birth: '1965-04-22',
        address: '88 Belgravia Square, London SW1X 8QD',
        lead_score: 94,
        tags: ['Aristocracy', 'High Value', 'Multiple Properties'],
        deals: [
          { title: 'Aristocrat Dental Suite', value: 3200000, tags: ['Implants', 'Crowns', 'Premium'] },
          { title: 'Family Estate Dental Plan', value: 850000, tags: ['Family', 'Preventive', 'Comprehensive'] },
          { title: 'Emergency Platinum Care', value: 180000, tags: ['Emergency', 'VIP', 'Priority'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440502',
        full_name: 'Mohammed Al-Rashid',
        primary_email: 'm.alrashid@diplomatic.gov',
        primary_phone: '+44 7700 900502',
        date_of_birth: '1975-12-03',
        address: '156 Diplomatic Quarter, London SW7 1NA',
        lead_score: 91,
        tags: ['Diplomat', 'International', 'VIP'],
        deals: [
          { title: 'Diplomatic VIP Treatment', value: 950000, tags: ['VIP', 'Diplomatic', 'Discrete'] },
          { title: 'Emergency Diplomatic Care', value: 180000, tags: ['Emergency', 'VIP', 'Priority'] },
          { title: 'Annual Diplomatic Health', value: 320000, tags: ['Annual', 'Comprehensive'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440503',
        full_name: 'Anastasia Volkov',
        primary_email: 'anastasia@luxuryproperties.com',
        primary_phone: '+44 7700 900503',
        date_of_birth: '1985-02-14',
        address: '78 Knightsbridge, London SW1X 7XL',
        lead_score: 93,
        tags: ['Luxury Real Estate', 'Russian', 'High Net Worth'],
        deals: [
          { title: 'Luxury Property Executive Smile', value: 650000, tags: ['Cosmetic', 'High-end', 'Executive'] },
          { title: 'Platinum Maintenance Program', value: 280000, tags: ['Maintenance', 'Platinum'] },
          { title: 'Aesthetic Enhancement Package', value: 420000, tags: ['Aesthetic', 'Premium'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440504',
        full_name: 'Yuki Tanaka',
        primary_email: 'yuki.tanaka@japanese.co.jp',
        primary_phone: '+44 7700 900504',
        date_of_birth: '1984-08-17',
        address: '67 South Kensington, London SW7 2EU',
        lead_score: 87,
        tags: ['International', 'Executive', 'Cosmetic'],
        deals: [
          { title: 'Executive Smile Makeover', value: 950000, tags: ['Cosmetic', 'Executive', 'Makeover'] },
          { title: 'VIP Maintenance Package', value: 150000, tags: ['VIP', 'Maintenance'] }
        ]
      },
      
      // Professional/Business Patients (8-10 patients, 2-3 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440505',
        full_name: 'Priya Sharma',
        primary_email: 'priya.sharma@techstartup.io',
        primary_phone: '+44 7700 900505',
        date_of_birth: '1988-09-15',
        address: '45 Silicon Roundabout, London EC2A 3LT',
        lead_score: 82,
        tags: ['Tech CEO', 'Young Executive', 'Busy Schedule'],
        deals: [
          { title: 'CEO Express Whitening', value: 85000, tags: ['Whitening', 'Express', 'Executive'] },
          { title: 'Invisalign Executive Package', value: 450000, tags: ['Invisalign', 'Executive', 'Discrete'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440506',
        full_name: 'Benjamin Clarke',
        primary_email: 'ben.clarke@lawchambers.co.uk',
        primary_phone: '+44 7700 900506',
        date_of_birth: '1976-09-30',
        address: '45 Lincoln\'s Inn Fields, London WC2A 3LJ',
        lead_score: 88,
        tags: ['Barrister', 'Legal', 'Professional'],
        deals: [
          { title: 'Barrister Professional Package', value: 420000, tags: ['Professional', 'Comprehensive', 'Legal'] },
          { title: 'Court Appearance Whitening', value: 75000, tags: ['Whitening', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440507',
        full_name: 'Dr. Samuel Hughes',
        primary_email: 'sam.hughes@nhs.uk',
        primary_phone: '+44 7700 900507',
        date_of_birth: '1982-11-17',
        address: '89 Hospital Road, London SE1 7EH',
        lead_score: 79,
        tags: ['NHS Doctor', 'Healthcare', 'Professional'],
        deals: [
          { title: 'NHS Doctor Professional Care', value: 280000, tags: ['Professional', 'Comprehensive'] },
          { title: 'Emergency Professional Priority', value: 120000, tags: ['Emergency', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440508',
        full_name: 'Elena Rossi',
        primary_email: 'elena@italianrestaurant.london',
        primary_phone: '+44 7700 900508',
        date_of_birth: '1981-03-08',
        address: '67 Little Italy, London W1D 4PS',
        lead_score: 75,
        tags: ['Restaurant Owner', 'Italian', 'Food Industry'],
        deals: [
          { title: 'Restaurant Owner Smile', value: 320000, tags: ['Veneers', 'Professional', 'Customer Service'] },
          { title: 'Business Enhancement Package', value: 180000, tags: ['Professional', 'Enhancement'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440509',
        full_name: 'Charlotte Pemberton',
        primary_email: 'charlotte@pembergallery.com',
        primary_phone: '+44 7700 900509',
        date_of_birth: '1979-06-25',
        address: '234 Bond Street, London W1S 2ND',
        lead_score: 87,
        tags: ['Art Gallery', 'Creative', 'Networking'],
        deals: [
          { title: 'Art Gallery Owner Consultation', value: 15000, tags: ['Consultation', 'Cosmetic'] },
          { title: 'Creative Professional Smile', value: 380000, tags: ['Cosmetic', 'Creative'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440510',
        full_name: 'Marcus Thompson',
        primary_email: 'marcus@fitnessempire.co.uk',
        primary_phone: '+44 7700 900510',
        date_of_birth: '1987-07-09',
        address: '123 Gym Street, London E1 6AN',
        lead_score: 71,
        tags: ['Fitness Industry', 'Entrepreneur', 'Active'],
        deals: [
          { title: 'Fitness Entrepreneur Whitening', value: 65000, tags: ['Whitening', 'Professional'] },
          { title: 'Sports Mouthguard Package', value: 85000, tags: ['Sports', 'Protection'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440511',
        full_name: 'Sophie Chen',
        primary_email: 'sophie@architecturestudio.com',
        primary_phone: '+44 7700 900511',
        date_of_birth: '1983-12-07',
        address: '78 Shoreditch High Street, London E1 6JJ',
        lead_score: 76,
        tags: ['Architect', 'Creative', 'Professional'],
        deals: [
          { title: 'Architect Creative Smile', value: 380000, tags: ['Aesthetic', 'Creative', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440512',
        full_name: 'Fatima Al-Zahra',
        primary_email: 'fatima@fashionhouse.ae',
        primary_phone: '+44 7700 900512',
        date_of_birth: '1990-04-18',
        address: '45 Fashion District, London W1K 5AB',
        lead_score: 84,
        tags: ['Fashion Designer', 'Middle Eastern', 'Creative'],
        deals: [
          { title: 'Fashion Designer Smile Makeover', value: 750000, tags: ['Cosmetic', 'Makeover', 'Fashion'] },
          { title: 'Runway Ready Whitening', value: 95000, tags: ['Whitening', 'Fashion'] }
        ]
      },
      
      // Family Patients (4-5 patients, 1-3 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440513',
        full_name: 'Jennifer Wilson',
        primary_email: 'jenny.wilson@family.com',
        primary_phone: '+44 7700 900513',
        date_of_birth: '1979-11-11',
        address: '42 Putney Bridge Road, London SW15 2NQ',
        lead_score: 72,
        tags: ['Family', 'Mother', 'Hygiene'],
        deals: [
          { title: 'Family Hygiene Program', value: 180000, tags: ['Family', 'Hygiene', 'Preventive'] },
          { title: 'Mother\'s Cosmetic Enhancement', value: 250000, tags: ['Cosmetic', 'Family'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440514',
        full_name: 'Mark Wilson',
        primary_email: 'mark.wilson@family.com',
        primary_phone: '+44 7700 900514',
        date_of_birth: '1977-09-05',
        address: '42 Putney Bridge Road, London SW15 2NQ',
        lead_score: 68,
        tags: ['Family', 'Father', 'Crowns'],
        deals: [
          { title: 'Father Crown Replacement', value: 285000, tags: ['Crowns', 'Multiple', 'Family'] },
          { title: 'Family Dental Plan', value: 150000, tags: ['Family', 'Comprehensive'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440515',
        full_name: 'Charlotte Wilson',
        primary_email: 'charlotte.wilson@school.edu',
        primary_phone: '+44 7700 900515',
        date_of_birth: '2008-02-14',
        address: '42 Putney Bridge Road, London SW15 2NQ',
        lead_score: 45,
        tags: ['Family', 'Child', 'Orthodontics'],
        deals: [
          { title: 'Pediatric Orthodontics', value: 320000, tags: ['Orthodontics', 'Pediatric', 'Braces'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440516',
        full_name: 'David Thompson',
        primary_email: 'david@familycare.com',
        primary_phone: '+44 7700 900516',
        date_of_birth: '1985-05-20',
        address: '156 Family Lane, London SW12 8QR',
        lead_score: 74,
        tags: ['Family', 'Working Parent', 'Practical'],
        deals: [
          { title: 'Working Parent Dental Care', value: 195000, tags: ['Family', 'Practical', 'Efficient'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440517',
        full_name: 'Lisa Martinez',
        primary_email: 'lisa@familyhome.co.uk',
        primary_phone: '+44 7700 900517',
        date_of_birth: '1982-09-14',
        address: '89 Suburban Street, London SW19 3AB',
        lead_score: 69,
        tags: ['Family', 'Suburban', 'Budget Conscious'],
        deals: [
          { title: 'Family Budget Package', value: 145000, tags: ['Family', 'Budget', 'Comprehensive'] }
        ]
      },
      
      // Senior Patients (3-4 patients, 1-2 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440518',
        full_name: 'Margaret Davies',
        primary_email: 'margaret.davies@retired.com',
        primary_phone: '+44 7700 900518',
        date_of_birth: '1955-04-30',
        address: '78 Wimbledon Village, London SW19 5AQ',
        lead_score: 83,
        tags: ['Senior', 'Dentures', 'Regular'],
        deals: [
          { title: 'Complete Dentures', value: 185000, tags: ['Dentures', 'Complete'] },
          { title: 'Denture Adjustment', value: 65000, tags: ['Dentures', 'Adjustment'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440519',
        full_name: 'George Thompson',
        primary_email: 'george.thompson@pension.gov',
        primary_phone: '+44 7700 900519',
        date_of_birth: '1952-12-25',
        address: '134 Richmond Park, London SW15 5JR',
        lead_score: 79,
        tags: ['Senior', 'Implants', 'Complex'],
        deals: [
          { title: 'Implant-Supported Denture', value: 1850000, tags: ['Implants', 'All-on-4', 'Dentures'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440520',
        full_name: 'Dorothy Clarke',
        primary_email: 'dorothy@seniorcenter.org',
        primary_phone: '+44 7700 900520',
        date_of_birth: '1948-07-18',
        address: '67 Retirement Village, London SW20 9XY',
        lead_score: 76,
        tags: ['Senior', 'Fixed Income', 'Regular Care'],
        deals: [
          { title: 'Senior Care Package', value: 125000, tags: ['Senior', 'Comprehensive', 'Regular'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440521',
        full_name: 'Harold Bennett',
        primary_email: 'harold@veterancare.uk',
        primary_phone: '+44 7700 900521',
        date_of_birth: '1945-11-02',
        address: '234 Veterans Way, London SE18 4CD',
        lead_score: 72,
        tags: ['Senior', 'Veteran', 'NHS'],
        deals: [
          { title: 'Veteran Dental Care', value: 95000, tags: ['Veteran', 'NHS', 'Basic'] }
        ]
      },
      
      // Young Professionals/Students (4-5 patients, 1-2 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440522',
        full_name: 'Oliver Jackson',
        primary_email: 'oliver.jackson@startup.io',
        primary_phone: '+44 7700 900522',
        date_of_birth: '1992-01-12',
        address: '78 Shoreditch High Street, London E1 6JJ',
        lead_score: 65,
        tags: ['Tech', 'Young Professional', 'Startup'],
        deals: [
          { title: 'New Professional Consultation', value: 15000, tags: ['New Patient', 'Consultation'] },
          { title: 'Young Professional Whitening', value: 65000, tags: ['Whitening', 'Young Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440523',
        full_name: 'Sophie Martinez',
        primary_email: 'sophie.martinez@university.ac.uk',
        primary_phone: '+44 7700 900523',
        date_of_birth: '1995-06-07',
        address: '145 Bloomsbury Way, London WC1A 2TH',
        lead_score: 58,
        tags: ['Student', 'Budget Conscious', 'University'],
        deals: [
          { title: 'Student Cleaning Package', value: 35000, tags: ['Student', 'Budget', 'Hygiene'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440524',
        full_name: 'Thomas Anderson',
        primary_email: 'thomas.anderson@finance.com',
        primary_phone: '+44 7700 900524',
        date_of_birth: '1988-10-14',
        address: '203 City Road, London EC1V 1JN',
        lead_score: 73,
        tags: ['Finance', 'Whitening', 'City Worker'],
        deals: [
          { title: 'Professional Whitening', value: 65000, tags: ['Whitening', 'Professional'] },
          { title: 'Preventive Care Plan', value: 95000, tags: ['Preventive', 'Annual'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440525',
        full_name: 'Rachel Green',
        primary_email: 'rachel.green@design.studio',
        primary_phone: '+44 7700 900525',
        date_of_birth: '1991-03-28',
        address: '56 King\'s Road, Chelsea SW3 4UD',
        lead_score: 69,
        tags: ['Creative', 'Aesthetic', 'Designer'],
        deals: [
          { title: 'Creative Professional Aesthetic', value: 285000, tags: ['Aesthetic', 'Creative'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440526',
        full_name: 'James Park',
        primary_email: 'james.park@consulting.com',
        primary_phone: '+44 7700 900526',
        date_of_birth: '1986-07-19',
        address: '89 Marylebone High Street, London W1U 4QW',
        lead_score: 76,
        tags: ['Consultant', 'Busy Schedule', 'Professional'],
        deals: [
          { title: 'Consultant Express Package', value: 185000, tags: ['Express', 'Professional', 'Efficient'] }
        ]
      },
      
      // Entertainment/Fashion Industry (3-4 patients, 2-3 deals each)
      {
        id: '550e8400-e29b-41d4-a716-446655440527',
        full_name: 'Isabella Rodriguez',
        primary_email: 'isabella.rodriguez@fashion.com',
        primary_phone: '+44 7700 900527',
        date_of_birth: '1993-09-18',
        address: '45 Bond Street, London W1S 4AQ',
        lead_score: 86,
        tags: ['Fashion', 'Cosmetic', 'Veneers'],
        deals: [
          { title: 'Fashion Week Veneers', value: 850000, tags: ['Veneers', 'Fashion', 'Urgent'] },
          { title: 'Model Maintenance Package', value: 180000, tags: ['Maintenance', 'Fashion'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440528',
        full_name: 'Alexander Knight',
        primary_email: 'alex.knight@actor.com',
        primary_phone: '+44 7700 900528',
        date_of_birth: '1985-11-27',
        address: '67 Covent Garden, London WC2E 9JD',
        lead_score: 84,
        tags: ['Entertainment', 'Cosmetic', 'Whitening'],
        deals: [
          { title: 'Actor Professional Whitening', value: 125000, tags: ['Whitening', 'Entertainment'] },
          { title: 'Red Carpet Ready Package', value: 450000, tags: ['Cosmetic', 'Entertainment', 'Urgent'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440529',
        full_name: 'Vivian Cross',
        primary_email: 'vivian@modelagency.co.uk',
        primary_phone: '+44 7700 900529',
        date_of_birth: '1989-08-05',
        address: '123 Fashion Square, London W1F 8AB',
        lead_score: 88,
        tags: ['Model', 'Agency', 'High Maintenance'],
        deals: [
          { title: 'Model Agency VIP Package', value: 650000, tags: ['VIP', 'Model', 'Comprehensive'] }
        ]
      },
      
      // Budget-Conscious/Working Class (2-3 patients, 1 deal each)
      {
        id: '550e8400-e29b-41d4-a716-446655440530',
        full_name: 'Maria Santos',
        primary_email: 'maria.santos@cleaning.com',
        primary_phone: '+44 7700 900530',
        date_of_birth: '1982-03-14',
        address: '156 Peckham Rye, London SE15 4ST',
        lead_score: 52,
        tags: ['Budget', 'Basic Care', 'Payment Plan'],
        deals: [
          { title: 'Basic Care Package', value: 85000, tags: ['Basic', 'Budget', 'Payment Plan'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440531',
        full_name: 'Ahmed Hassan',
        primary_email: 'ahmed.hassan@taxi.com',
        primary_phone: '+44 7700 900531',
        date_of_birth: '1975-08-02',
        address: '78 Whitechapel Road, London E1 1JX',
        lead_score: 48,
        tags: ['Budget', 'Essential', 'Payment Plan'],
        deals: [
          { title: 'Essential Dental Care', value: 65000, tags: ['Essential', 'Budget'] }
        ]
      }
    ]
    
    let contactsCreated = 0
    let dealsCreated = 0
    let totalValue = 0
    
    // Create each patient and their deals
    for (const patient of patients) {
      // Create the contact
      const { error: contactError } = await supabase
        .from('contacts')
        .insert([{
          id: patient.id,
          tenant_id: tenantId,
          full_name: patient.full_name,
          primary_email: patient.primary_email,
          primary_phone: patient.primary_phone,
          date_of_birth: patient.date_of_birth,
          address: patient.address,
          lead_score: patient.lead_score,
          tags: patient.tags,
          status: 'active',
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        }])
      
      if (contactError && !contactError.message.includes('duplicate key')) {
        console.error('Error creating contact:', patient.full_name, contactError)
      } else if (!contactError) {
        contactsCreated++
      }
      
      // Create deals for this patient
      let dealIndex = 7000 + (patients.indexOf(patient) * 10)
      for (const dealData of patient.deals) {
        const { error: dealError } = await supabase
          .from('deals')
          .insert([{
            id: `550e8400-e29b-41d4-a716-44665544${dealIndex.toString().padStart(4, '0')}`,
            tenant_id: tenantId,
            contact_id: patient.id,
            pipeline_id: pipelineId,
            stage_id: stageId,
            title: dealData.title,
            description: `${dealData.title} for ${patient.full_name}`,
            value_estimate_cents: dealData.value,
            currency: 'GBP',
            treatment_tags: dealData.tags,
            source: 'Various',
            created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
          }])
        
        if (dealError && !dealError.message.includes('duplicate key')) {
          console.error('Error creating deal:', dealData.title, dealError)
        } else if (!dealError) {
          dealsCreated++
          totalValue += dealData.value
        }
        
        dealIndex++
      }
    }
    
    console.log(`✅ Created ${contactsCreated} patients and ${dealsCreated} deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created ${contactsCreated} realistic dental patients and ${dealsCreated} deals as requested!`,
      stats: {
        patientsCreated: contactsCreated,
        dealsCreated: dealsCreated,
        totalPatients: patients.length,
        totalDeals: patients.reduce((sum, p) => sum + p.deals.length, 0),
        totalValue: totalValue,
        categories: {
          vip: 5,
          professionals: 8, 
          families: 5,
          seniors: 4,
          youngProfessionals: 5,
          entertainment: 3,
          budgetConscious: 2
        }
      }
    })
    
  } catch (error) {
    console.error('Error in create-30-patients:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


