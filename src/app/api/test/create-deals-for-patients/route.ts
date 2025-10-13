import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Creating deals for the 25 patients...')
    
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
    
    console.log(`Using pipeline: ${pipelineId}, stage: ${stageId}`)
    
    // Get the patients we just created
    const { data: patients } = await supabase
      .from('contacts')
      .select('id, full_name, tags')
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
    
    // Define deals for each patient type
    const dealTemplates = {
      'Dr. Victoria Sterling': [
        { title: 'Executive Smile Reconstruction', value: 1850000, tags: ['Veneers', 'Crowns', 'Executive'] },
        { title: 'Annual VIP Maintenance', value: 250000, tags: ['Preventive', 'VIP', 'Annual'] },
        { title: 'Gum Disease Treatment', value: 180000, tags: ['Periodontics', 'Advanced'] }
      ],
      'James Wellington III': [
        { title: 'Aristocrat Dental Suite', value: 3200000, tags: ['Implants', 'Crowns', 'Premium'] },
        { title: 'Family Estate Dental Plan', value: 850000, tags: ['Family', 'Preventive', 'Comprehensive'] }
      ],
      'Mohammed Al-Rashid': [
        { title: 'Diplomatic VIP Treatment', value: 950000, tags: ['VIP', 'Diplomatic', 'Discrete'] },
        { title: 'Emergency Diplomatic Care', value: 180000, tags: ['Emergency', 'VIP', 'Priority'] }
      ],
      'Priya Sharma': [
        { title: 'CEO Express Whitening', value: 85000, tags: ['Whitening', 'Express', 'Executive'] },
        { title: 'Invisalign Executive Package', value: 450000, tags: ['Invisalign', 'Executive', 'Discrete'] }
      ],
      'Benjamin Clarke': [
        { title: 'Barrister Professional Package', value: 420000, tags: ['Professional', 'Comprehensive', 'Legal'] }
      ],
      'Elena Rossi': [
        { title: 'Restaurant Owner Smile', value: 320000, tags: ['Veneers', 'Professional', 'Customer Service'] }
      ],
      'Dr. Samuel Hughes': [
        { title: 'NHS Doctor Professional Care', value: 280000, tags: ['Professional', 'Comprehensive'] }
      ],
      'Charlotte Pemberton': [
        { title: 'Art Gallery Owner Consultation', value: 15000, tags: ['Consultation', 'Cosmetic'] },
        { title: 'Creative Professional Smile', value: 380000, tags: ['Cosmetic', 'Creative'] }
      ],
      'Marcus Thompson': [
        { title: 'Fitness Entrepreneur Whitening', value: 65000, tags: ['Whitening', 'Professional'] }
      ],
      'Sophie Chen': [
        { title: 'Architect Creative Smile', value: 380000, tags: ['Aesthetic', 'Creative', 'Professional'] }
      ]
    }
    
    // Generic deals for patients not in templates
    const genericDeals = [
      { title: 'Professional Whitening', value: 65000, tags: ['Whitening', 'Professional'] },
      { title: 'Comprehensive Exam', value: 25000, tags: ['Exam', 'Preventive'] },
      { title: 'Cosmetic Consultation', value: 15000, tags: ['Consultation', 'Cosmetic'] },
      { title: 'Family Dental Plan', value: 180000, tags: ['Family', 'Comprehensive'] },
      { title: 'Emergency Treatment', value: 120000, tags: ['Emergency', 'Urgent'] },
      { title: 'Preventive Care Package', value: 95000, tags: ['Preventive', 'Package'] }
    ]
    
    let dealsCreated = 0
    let totalValue = 0
    let dealIndex = 10000
    
    // Create deals for each patient
    for (const patient of patients) {
      const dealsForPatient = dealTemplates[patient.full_name] || [genericDeals[Math.floor(Math.random() * genericDeals.length)]]
      
      for (const dealData of dealsForPatient) {
        const { data: dealResult, error: dealError } = await supabase
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
          .select()
        
        if (dealError) {
          console.error('❌ Error creating deal:', dealData.title, 'for', patient.full_name, dealError)
        } else {
          dealsCreated++
          totalValue += dealData.value
          console.log(`✅ Created deal: ${dealData.title} for ${patient.full_name} (£${dealData.value/100})`)
        }
        
        dealIndex++
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
        patientsProcessed: patients.length
      }
    })
    
  } catch (error) {
    console.error('Error in create-deals-for-patients:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


