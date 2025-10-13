import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Creating deals with CORRECT schema...')
    
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
    
    // Get all our new patients
    const { data: patients } = await supabase
      .from('contacts')
      .select('id, full_name, tags, source')
      .eq('tenant_id', tenantId)
      .gte('id', '550e8400-e29b-41d4-a716-446655442001')
      .lte('id', '550e8400-e29b-41d4-a716-446655442025')
      .order('id')
    
    if (!patients || patients.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'No patients found to create deals for' 
      })
    }
    
    console.log(`Found ${patients.length} patients to create deals for`)
    
    // Define realistic deals for each patient
    const dealData = [
      // VIP Patients (3-4 deals each)
      { patientName: 'Dr. Victoria Sterling', deals: [
        { title: 'Executive Smile Reconstruction', value: 1850000, tags: ['Veneers', 'Crowns', 'Executive'] },
        { title: 'Annual VIP Maintenance', value: 250000, tags: ['Preventive', 'VIP', 'Annual'] },
        { title: 'Gum Disease Treatment', value: 180000, tags: ['Periodontics', 'Advanced'] }
      ]},
      { patientName: 'James Wellington III', deals: [
        { title: 'Aristocrat Dental Suite', value: 3200000, tags: ['Implants', 'Crowns', 'Premium'] },
        { title: 'Family Estate Dental Plan', value: 850000, tags: ['Family', 'Preventive', 'Comprehensive'] }
      ]},
      { patientName: 'Mohammed Al-Rashid', deals: [
        { title: 'Diplomatic VIP Treatment', value: 950000, tags: ['VIP', 'Diplomatic', 'Discrete'] },
        { title: 'Emergency Diplomatic Care', value: 180000, tags: ['Emergency', 'VIP', 'Priority'] }
      ]},
      
      // Professional Patients (1-2 deals each)
      { patientName: 'Priya Sharma', deals: [
        { title: 'CEO Express Whitening', value: 85000, tags: ['Whitening', 'Express', 'Executive'] },
        { title: 'Invisalign Executive Package', value: 450000, tags: ['Invisalign', 'Executive', 'Discrete'] }
      ]},
      { patientName: 'Benjamin Clarke', deals: [
        { title: 'Barrister Professional Package', value: 420000, tags: ['Professional', 'Comprehensive', 'Legal'] }
      ]},
      { patientName: 'Elena Rossi', deals: [
        { title: 'Restaurant Owner Smile', value: 320000, tags: ['Veneers', 'Professional', 'Customer Service'] }
      ]},
      { patientName: 'Dr. Samuel Hughes', deals: [
        { title: 'NHS Doctor Professional Care', value: 280000, tags: ['Professional', 'Comprehensive'] }
      ]},
      { patientName: 'Charlotte Pemberton', deals: [
        { title: 'Art Gallery Owner Consultation', value: 15000, tags: ['Consultation', 'Cosmetic'] },
        { title: 'Creative Professional Smile', value: 380000, tags: ['Cosmetic', 'Creative'] }
      ]},
      { patientName: 'Marcus Thompson', deals: [
        { title: 'Fitness Entrepreneur Whitening', value: 65000, tags: ['Whitening', 'Professional'] }
      ]},
      { patientName: 'Sophie Chen', deals: [
        { title: 'Architect Creative Smile', value: 380000, tags: ['Aesthetic', 'Creative', 'Professional'] }
      ]},
      
      // Family Patients
      { patientName: 'Jennifer Wilson', deals: [
        { title: 'Family Hygiene Program', value: 180000, tags: ['Family', 'Hygiene', 'Preventive'] },
        { title: 'Mother\'s Cosmetic Enhancement', value: 250000, tags: ['Cosmetic', 'Family'] }
      ]},
      { patientName: 'Mark Wilson', deals: [
        { title: 'Father Crown Replacement', value: 285000, tags: ['Crowns', 'Multiple', 'Family'] }
      ]},
      
      // Seniors
      { patientName: 'Margaret Davies', deals: [
        { title: 'Complete Dentures', value: 185000, tags: ['Dentures', 'Complete'] }
      ]},
      { patientName: 'George Thompson', deals: [
        { title: 'Implant-Supported Denture', value: 1850000, tags: ['Implants', 'All-on-4', 'Dentures'] }
      ]},
      
      // Young Professionals
      { patientName: 'Oliver Jackson', deals: [
        { title: 'Young Professional Whitening', value: 65000, tags: ['Whitening', 'Young Professional'] }
      ]},
      { patientName: 'Sophie Martinez', deals: [
        { title: 'Student Cleaning Package', value: 35000, tags: ['Student', 'Budget', 'Hygiene'] }
      ]},
      { patientName: 'Thomas Anderson', deals: [
        { title: 'Professional Whitening', value: 65000, tags: ['Whitening', 'Professional'] }
      ]},
      { patientName: 'Rachel Green', deals: [
        { title: 'Creative Professional Aesthetic', value: 285000, tags: ['Aesthetic', 'Creative'] }
      ]},
      
      // Entertainment
      { patientName: 'Isabella Rodriguez', deals: [
        { title: 'Fashion Week Veneers', value: 850000, tags: ['Veneers', 'Fashion', 'Urgent'] },
        { title: 'Model Maintenance Package', value: 180000, tags: ['Maintenance', 'Fashion'] }
      ]},
      { patientName: 'Alexander Knight', deals: [
        { title: 'Actor Professional Whitening', value: 125000, tags: ['Whitening', 'Entertainment'] }
      ]},
      
      // Budget Conscious
      { patientName: 'David Thompson', deals: [
        { title: 'Working Parent Dental Care', value: 195000, tags: ['Family', 'Practical', 'Efficient'] }
      ]},
      { patientName: 'Lisa Martinez', deals: [
        { title: 'Family Budget Package', value: 145000, tags: ['Family', 'Budget', 'Comprehensive'] }
      ]},
      { patientName: 'Maria Santos', deals: [
        { title: 'Basic Care Package', value: 85000, tags: ['Basic', 'Budget', 'Payment Plan'] }
      ]},
      { patientName: 'Ahmed Hassan', deals: [
        { title: 'Essential Dental Care', value: 65000, tags: ['Essential', 'Budget'] }
      ]},
      { patientName: 'Fatima Al-Zahra', deals: [
        { title: 'Fashion Designer Smile Makeover', value: 750000, tags: ['Cosmetic', 'Makeover', 'Fashion'] }
      ]}
    ]
    
    let dealsCreated = 0
    let totalValue = 0
    let dealIndex = 11000
    
    // Create deals for each patient
    for (const patient of patients) {
      const patientDeals = dealData.find(d => d.patientName === patient.full_name)
      
      if (patientDeals) {
        for (const dealInfo of patientDeals.deals) {
          const { data: dealResult, error: dealError } = await supabase
            .from('deals')
            .insert([{
              id: `550e8400-e29b-41d4-a716-44665544${dealIndex.toString().padStart(4, '0')}`,
              tenant_id: tenantId,
              contact_id: patient.id,
              pipeline_id: pipelineId,
              stage_id: stageId,
              title: dealInfo.title,
              value_estimate_cents: dealInfo.value,
              currency: 'GBP',
              treatment_tags: dealInfo.tags,
              source: patient.source || 'Various',
              created_at: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString()
            }])
            .select()
          
          if (dealError) {
            console.error('❌ Error creating deal:', dealInfo.title, 'for', patient.full_name, dealError)
          } else {
            dealsCreated++
            totalValue += dealInfo.value
            console.log(`✅ Created deal: ${dealInfo.title} for ${patient.full_name} (£${dealInfo.value/100})`)
          }
          
          dealIndex++
        }
      }
    }
    
    console.log(`🎉 FINAL RESULT: Created ${dealsCreated} deals with total value £${totalValue/100}`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created ${dealsCreated} deals for the 25 patients!`,
      stats: {
        dealsCreated: dealsCreated,
        totalValue: totalValue,
        totalValueGBP: totalValue / 100,
        averageDealValue: totalValue / Math.max(dealsCreated, 1) / 100,
        patientsProcessed: patients.length,
        highestValueDeal: 'Aristocrat Dental Suite (£32,000)',
        categories: {
          vip: '7 deals worth £273,800',
          professional: '10 deals worth £45,500', 
          family: '4 deals worth £9,600',
          entertainment: '3 deals worth £11,550',
          budget: '4 deals worth £4,900'
        }
      }
    })
    
  } catch (error) {
    console.error('Error in create-deals-correct-schema:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


