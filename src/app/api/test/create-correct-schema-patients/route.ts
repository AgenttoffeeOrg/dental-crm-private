import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = process.env.TEST_TENANT_ID || (await getFirstTenantId())
    
    console.log('Creating 25 realistic patients using CORRECT schema...')
    
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
    
    // Create 25 realistic patients with CORRECT schema
    const newPatients = [
      {
        id: '550e8400-e29b-41d4-a716-446655442001',
        full_name: 'Dr. Victoria Sterling',
        primary_email: 'victoria.sterling@harleystreet.com',
        primary_phone: '+44 7700 902001',
        source: 'Professional Referral',
        tags: ['VIP', 'Dentist', 'High Value', 'Referrer'],
        deals: [
          { title: 'Executive Smile Reconstruction', value: 1850000, tags: ['Veneers', 'Crowns', 'Executive'] },
          { title: 'Annual VIP Maintenance', value: 250000, tags: ['Preventive', 'VIP', 'Annual'] },
          { title: 'Gum Disease Treatment', value: 180000, tags: ['Periodontics', 'Advanced'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442002',
        full_name: 'James Wellington III',
        primary_email: 'james@wellington-estates.co.uk',
        primary_phone: '+44 7700 902002',
        source: 'Word of Mouth',
        tags: ['Aristocracy', 'High Value', 'Multiple Properties'],
        deals: [
          { title: 'Aristocrat Dental Suite', value: 3200000, tags: ['Implants', 'Crowns', 'Premium'] },
          { title: 'Family Estate Dental Plan', value: 850000, tags: ['Family', 'Preventive', 'Comprehensive'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442003',
        full_name: 'Mohammed Al-Rashid',
        primary_email: 'm.alrashid@diplomatic.gov',
        primary_phone: '+44 7700 902003',
        source: 'Embassy Referral',
        tags: ['Diplomat', 'International', 'VIP'],
        deals: [
          { title: 'Diplomatic VIP Treatment', value: 950000, tags: ['VIP', 'Diplomatic', 'Discrete'] },
          { title: 'Emergency Diplomatic Care', value: 180000, tags: ['Emergency', 'VIP', 'Priority'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442004',
        full_name: 'Priya Sharma',
        primary_email: 'priya.sharma@techstartup.io',
        primary_phone: '+44 7700 902004',
        source: 'LinkedIn',
        tags: ['Tech CEO', 'Young Executive', 'Busy Schedule'],
        deals: [
          { title: 'CEO Express Whitening', value: 85000, tags: ['Whitening', 'Express', 'Executive'] },
          { title: 'Invisalign Executive Package', value: 450000, tags: ['Invisalign', 'Executive', 'Discrete'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442005',
        full_name: 'Benjamin Clarke',
        primary_email: 'ben.clarke@lawchambers.co.uk',
        primary_phone: '+44 7700 902005',
        source: 'Professional Referral',
        tags: ['Barrister', 'Legal', 'Professional'],
        deals: [
          { title: 'Barrister Professional Package', value: 420000, tags: ['Professional', 'Comprehensive', 'Legal'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442006',
        full_name: 'Elena Rossi',
        primary_email: 'elena@italianrestaurant.london',
        primary_phone: '+44 7700 902006',
        source: 'Google Ads',
        tags: ['Restaurant Owner', 'Italian', 'Food Industry'],
        deals: [
          { title: 'Restaurant Owner Smile', value: 320000, tags: ['Veneers', 'Professional', 'Customer Service'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442007',
        full_name: 'Dr. Samuel Hughes',
        primary_email: 'sam.hughes@nhs.uk',
        primary_phone: '+44 7700 902007',
        source: 'Professional Network',
        tags: ['NHS Doctor', 'Healthcare', 'Professional'],
        deals: [
          { title: 'NHS Doctor Professional Care', value: 280000, tags: ['Professional', 'Comprehensive'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442008',
        full_name: 'Charlotte Pemberton',
        primary_email: 'charlotte@pembergallery.com',
        primary_phone: '+44 7700 902008',
        source: 'Instagram',
        tags: ['Art Gallery', 'Creative', 'Networking'],
        deals: [
          { title: 'Art Gallery Owner Consultation', value: 15000, tags: ['Consultation', 'Cosmetic'] },
          { title: 'Creative Professional Smile', value: 380000, tags: ['Cosmetic', 'Creative'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442009',
        full_name: 'Marcus Thompson',
        primary_email: 'marcus@fitnessempire.co.uk',
        primary_phone: '+44 7700 902009',
        source: 'Facebook Ads',
        tags: ['Fitness Industry', 'Entrepreneur', 'Active'],
        deals: [
          { title: 'Fitness Entrepreneur Whitening', value: 65000, tags: ['Whitening', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442010',
        full_name: 'Sophie Chen',
        primary_email: 'sophie@architecturestudio.com',
        primary_phone: '+44 7700 902010',
        source: 'Design Network',
        tags: ['Architect', 'Creative', 'Professional'],
        deals: [
          { title: 'Architect Creative Smile', value: 380000, tags: ['Aesthetic', 'Creative', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442011',
        full_name: 'Jennifer Wilson',
        primary_email: 'jenny.wilson@family.com',
        primary_phone: '+44 7700 902011',
        source: 'Referral',
        tags: ['Family', 'Mother', 'Hygiene'],
        deals: [
          { title: 'Family Hygiene Program', value: 180000, tags: ['Family', 'Hygiene', 'Preventive'] },
          { title: 'Mother\'s Cosmetic Enhancement', value: 250000, tags: ['Cosmetic', 'Family'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442012',
        full_name: 'Mark Wilson',
        primary_email: 'mark.wilson@family.com',
        primary_phone: '+44 7700 902012',
        source: 'Existing Patient',
        tags: ['Family', 'Father', 'Crowns'],
        deals: [
          { title: 'Father Crown Replacement', value: 285000, tags: ['Crowns', 'Multiple', 'Family'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442013',
        full_name: 'Margaret Davies',
        primary_email: 'margaret.davies@retired.com',
        primary_phone: '+44 7700 902013',
        source: 'Word of Mouth',
        tags: ['Senior', 'Dentures', 'Regular'],
        deals: [
          { title: 'Complete Dentures', value: 185000, tags: ['Dentures', 'Complete'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442014',
        full_name: 'George Thompson',
        primary_email: 'george.thompson@pension.gov',
        primary_phone: '+44 7700 902014',
        source: 'Referral',
        tags: ['Senior', 'Implants', 'Complex'],
        deals: [
          { title: 'Implant-Supported Denture', value: 1850000, tags: ['Implants', 'All-on-4', 'Dentures'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442015',
        full_name: 'Oliver Jackson',
        primary_email: 'oliver.jackson@startup.io',
        primary_phone: '+44 7700 902015',
        source: 'Website',
        tags: ['Tech', 'Young Professional', 'Startup'],
        deals: [
          { title: 'Young Professional Whitening', value: 65000, tags: ['Whitening', 'Young Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442016',
        full_name: 'Sophie Martinez',
        primary_email: 'sophie.martinez@university.ac.uk',
        primary_phone: '+44 7700 902016',
        source: 'Student Referral',
        tags: ['Student', 'Budget Conscious', 'University'],
        deals: [
          { title: 'Student Cleaning Package', value: 35000, tags: ['Student', 'Budget', 'Hygiene'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442017',
        full_name: 'Thomas Anderson',
        primary_email: 'thomas.anderson@finance.com',
        primary_phone: '+44 7700 902017',
        source: 'Corporate Program',
        tags: ['Finance', 'Whitening', 'City Worker'],
        deals: [
          { title: 'Professional Whitening', value: 65000, tags: ['Whitening', 'Professional'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442018',
        full_name: 'Rachel Green',
        primary_email: 'rachel.green@design.studio',
        primary_phone: '+44 7700 902018',
        source: 'Creative Network',
        tags: ['Creative', 'Aesthetic', 'Designer'],
        deals: [
          { title: 'Creative Professional Aesthetic', value: 285000, tags: ['Aesthetic', 'Creative'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442019',
        full_name: 'Isabella Rodriguez',
        primary_email: 'isabella.rodriguez@fashion.com',
        primary_phone: '+44 7700 902019',
        source: 'Instagram',
        tags: ['Fashion', 'Cosmetic', 'Veneers'],
        deals: [
          { title: 'Fashion Week Veneers', value: 850000, tags: ['Veneers', 'Fashion', 'Urgent'] },
          { title: 'Model Maintenance Package', value: 180000, tags: ['Maintenance', 'Fashion'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442020',
        full_name: 'Alexander Knight',
        primary_email: 'alex.knight@actor.com',
        primary_phone: '+44 7700 902020',
        source: 'Entertainment Industry',
        tags: ['Entertainment', 'Cosmetic', 'Whitening'],
        deals: [
          { title: 'Actor Professional Whitening', value: 125000, tags: ['Whitening', 'Entertainment'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442021',
        full_name: 'David Thompson',
        primary_email: 'david@familycare.com',
        primary_phone: '+44 7700 902021',
        source: 'Family Referral',
        tags: ['Family', 'Working Parent', 'Practical'],
        deals: [
          { title: 'Working Parent Dental Care', value: 195000, tags: ['Family', 'Practical', 'Efficient'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442022',
        full_name: 'Lisa Martinez',
        primary_email: 'lisa@familyhome.co.uk',
        primary_phone: '+44 7700 902022',
        source: 'Community',
        tags: ['Family', 'Suburban', 'Budget Conscious'],
        deals: [
          { title: 'Family Budget Package', value: 145000, tags: ['Family', 'Budget', 'Comprehensive'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442023',
        full_name: 'Maria Santos',
        primary_email: 'maria.santos@cleaning.com',
        primary_phone: '+44 7700 902023',
        source: 'Community Health',
        tags: ['Budget', 'Basic Care', 'Payment Plan'],
        deals: [
          { title: 'Basic Care Package', value: 85000, tags: ['Basic', 'Budget', 'Payment Plan'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442024',
        full_name: 'Ahmed Hassan',
        primary_email: 'ahmed.hassan@taxi.com',
        primary_phone: '+44 7700 902024',
        source: 'Walk-in',
        tags: ['Budget', 'Essential', 'Payment Plan'],
        deals: [
          { title: 'Essential Dental Care', value: 65000, tags: ['Essential', 'Budget'] }
        ]
      },
      {
        id: '550e8400-e29b-41d4-a716-446655442025',
        full_name: 'Fatima Al-Zahra',
        primary_email: 'fatima@fashionhouse.ae',
        primary_phone: '+44 7700 902025',
        source: 'Instagram',
        tags: ['Fashion Designer', 'Middle Eastern', 'Creative'],
        deals: [
          { title: 'Fashion Designer Smile Makeover', value: 750000, tags: ['Cosmetic', 'Makeover', 'Fashion'] }
        ]
      }
    ]
    
    let contactsCreated = 0
    let dealsCreated = 0
    let totalValue = 0
    
    // Create each patient and their deals
    for (const patient of newPatients) {
      // Create the contact with CORRECT schema
      const { data: contactData, error: contactError } = await supabase
        .from('contacts')
        .insert([{
          id: patient.id,
          tenant_id: tenantId,
          full_name: patient.full_name,
          primary_email: patient.primary_email,
          primary_phone: patient.primary_phone,
          source: patient.source,
          tags: patient.tags,
          created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
        }])
        .select()
      
      if (contactError) {
        console.error('❌ Error creating contact:', patient.full_name, contactError)
      } else {
        contactsCreated++
        console.log(`✅ Created patient: ${patient.full_name}`)
      }
      
      // Create deals for this patient
      let dealIndex = 9000 + (newPatients.indexOf(patient) * 10)
      for (const dealData of patient.deals) {
        const { data: dealDataResult, error: dealError } = await supabase
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
            source: patient.source,
            created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
          }])
          .select()
        
        if (dealError) {
          console.error('❌ Error creating deal:', dealData.title, dealError)
        } else {
          dealsCreated++
          totalValue += dealData.value
          console.log(`✅ Created deal: ${dealData.title} (£${dealData.value/100})`)
        }
        
        dealIndex++
      }
    }
    
    console.log(`🎉 FINAL RESULT: Created ${contactsCreated} patients and ${dealsCreated} deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created ${contactsCreated} realistic dental patients and ${dealsCreated} deals!`,
      stats: {
        patientsCreated: contactsCreated,
        dealsCreated: dealsCreated,
        totalValue: totalValue,
        totalValueGBP: totalValue / 100,
        averagePatientValue: totalValue / Math.max(contactsCreated, 1) / 100,
        categories: {
          vip: 3,
          professionals: 8,
          families: 5,
          seniors: 2,
          youngProfessionals: 4,
          entertainment: 2,
          budget: 2
        }
      }
    })
    
  } catch (error) {
    console.error('Error in create-correct-schema-patients:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


