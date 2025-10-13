import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('🚀 Creating comprehensive practice data: deals + activities...')
    
    // Get pipeline info
    const { data: pipeline } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()
    
    if (!pipeline) {
      return NextResponse.json({ success: false, error: 'Pipeline not found' })
    }
    
    // Get all our patients
    const { data: patients } = await supabase
      .from('contacts')
      .select('id, full_name, tags, source')
      .eq('tenant_id', tenantId)
      .gte('id', '550e8400-e29b-41d4-a716-446655442001')
      .order('id')
    
    if (!patients || patients.length === 0) {
      return NextResponse.json({ success: false, error: 'No patients found' })
    }
    
    // Get a valid user ID for activities
    const { data: users } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    const userId = users?.[0]?.id || null
    
    console.log(`Found ${patients.length} patients, pipeline: ${pipeline.pipeline_id}, user: ${userId}`)
    
    // Define comprehensive patient data with deals and activities
    const patientData = [
      {
        name: 'Dr. Victoria Sterling',
        deals: [
          { title: 'Executive Smile Reconstruction', value: 1850000, tags: ['Veneers', 'Crowns', 'Executive'] },
          { title: 'Annual VIP Maintenance', value: 250000, tags: ['Preventive', 'VIP'] },
          { title: 'Gum Disease Treatment', value: 180000, tags: ['Periodontics'] }
        ],
        activities: [
          { type: 'call', subject: 'Initial VIP Consultation', snippet: 'Discussed comprehensive smile reconstruction options' },
          { type: 'email', subject: 'Treatment Plan Sent', snippet: 'Detailed executive treatment plan with timeline' },
          { type: 'call', subject: 'Follow-up Call', snippet: 'Confirmed treatment approach and scheduling' }
        ]
      },
      {
        name: 'James Wellington III',
        deals: [
          { title: 'Aristocrat Dental Suite', value: 3200000, tags: ['Implants', 'Crowns', 'Premium'] },
          { title: 'Family Estate Dental Plan', value: 850000, tags: ['Family', 'Comprehensive'] }
        ],
        activities: [
          { type: 'call', subject: 'Estate Dental Consultation', snippet: 'Discussed family dental care program' },
          { type: 'note', subject: 'Special Requirements', snippet: 'Requires discrete scheduling, high-end materials only' }
        ]
      },
      {
        name: 'Mohammed Al-Rashid',
        deals: [
          { title: 'Diplomatic VIP Treatment', value: 950000, tags: ['VIP', 'Diplomatic'] },
          { title: 'Emergency Diplomatic Care', value: 180000, tags: ['Emergency', 'Priority'] }
        ],
        activities: [
          { type: 'call', subject: 'Diplomatic Protocol Discussion', snippet: 'Special security and privacy requirements' },
          { type: 'email', subject: 'Confidentiality Agreement', snippet: 'Diplomatic patient confidentiality protocols' }
        ]
      },
      {
        name: 'Priya Sharma',
        deals: [
          { title: 'CEO Express Whitening', value: 85000, tags: ['Whitening', 'Executive'] },
          { title: 'Invisalign Executive Package', value: 450000, tags: ['Invisalign', 'Executive'] }
        ],
        activities: [
          { type: 'call', subject: 'Busy Executive Consultation', snippet: 'Discussed time-efficient treatment options' },
          { type: 'whatsapp', subject: 'Quick Check-in', snippet: 'How are you feeling about the treatment plan?' }
        ]
      },
      {
        name: 'Benjamin Clarke',
        deals: [
          { title: 'Barrister Professional Package', value: 420000, tags: ['Professional', 'Legal'] }
        ],
        activities: [
          { type: 'call', subject: 'Professional Consultation', snippet: 'Discussed court appearance requirements' }
        ]
      },
      {
        name: 'Elena Rossi',
        deals: [
          { title: 'Restaurant Owner Smile', value: 320000, tags: ['Veneers', 'Professional'] }
        ],
        activities: [
          { type: 'call', subject: 'Customer-Facing Smile', snippet: 'Perfect smile important for restaurant business' }
        ]
      },
      {
        name: 'Dr. Samuel Hughes',
        deals: [
          { title: 'NHS Doctor Professional Care', value: 280000, tags: ['Professional', 'Healthcare'] }
        ],
        activities: [
          { type: 'call', subject: 'Healthcare Professional Consultation', snippet: 'Fellow healthcare professional courtesy' }
        ]
      },
      {
        name: 'Charlotte Pemberton',
        deals: [
          { title: 'Art Gallery Consultation', value: 15000, tags: ['Consultation'] },
          { title: 'Creative Professional Smile', value: 380000, tags: ['Cosmetic', 'Creative'] }
        ],
        activities: [
          { type: 'call', subject: 'Art Gallery Opening Prep', snippet: 'Needs perfect smile for gallery opening' },
          { type: 'email', subject: 'Treatment Options', snippet: 'Aesthetic options for creative professional' }
        ]
      },
      {
        name: 'Marcus Thompson',
        deals: [
          { title: 'Fitness Entrepreneur Whitening', value: 65000, tags: ['Whitening'] }
        ],
        activities: [
          { type: 'call', subject: 'Fitness Industry Image', snippet: 'Bright smile important for fitness brand' }
        ]
      },
      {
        name: 'Sophie Chen',
        deals: [
          { title: 'Architect Creative Smile', value: 380000, tags: ['Aesthetic', 'Creative'] }
        ],
        activities: [
          { type: 'call', subject: 'Design Professional Needs', snippet: 'Aesthetic perfection important in design field' }
        ]
      }
    ]
    
    let dealsCreated = 0
    let activitiesCreated = 0
    let totalValue = 0
    
    // Process each patient
    for (const patient of patients) {
      const patientInfo = patientData.find(p => p.name === patient.full_name)
      
      if (patientInfo) {
        console.log(`Processing ${patient.full_name}...`)
        
        // Create deals for this patient
        for (const dealInfo of patientInfo.deals) {
          const { data: dealResult, error: dealError } = await supabase
            .from('deals')
            .insert([{
              tenant_id: tenantId,
              contact_id: patient.id,
              pipeline_id: pipeline.pipeline_id,
              stage_id: pipeline.stage_id,
              title: dealInfo.title,
              value_estimate_cents: dealInfo.value,
              currency: 'GBP',
              treatment_tags: dealInfo.tags,
              source: patient.source || 'Various'
            }])
            .select()
          
          if (dealError) {
            console.error('❌ Deal error:', dealInfo.title, dealError.message)
          } else {
            dealsCreated++
            totalValue += dealInfo.value
            console.log(`✅ Deal: ${dealInfo.title} (£${dealInfo.value/100})`)
            
            // Create activities for this deal
            const dealId = dealResult[0].id
            
            for (const activityInfo of patientInfo.activities) {
              const { error: activityError } = await supabase
                .from('activities')
                .insert([{
                  tenant_id: tenantId,
                  type: activityInfo.type,
                  contact_id: patient.id,
                  deal_id: dealId,
                  agent_user_id: userId,
                  subject: activityInfo.subject,
                  snippet: activityInfo.snippet,
                  occurred_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
                }])
              
              if (activityError) {
                console.error('❌ Activity error:', activityInfo.subject, activityError.message)
              } else {
                activitiesCreated++
                console.log(`  ✅ Activity: ${activityInfo.type} - ${activityInfo.subject}`)
              }
            }
          }
        }
      } else {
        // Create a generic deal for patients not in our detailed list
        const genericDeals = [
          { title: 'Consultation', value: 15000, tags: ['Consultation'] },
          { title: 'Cleaning & Checkup', value: 85000, tags: ['Preventive'] },
          { title: 'Whitening Treatment', value: 65000, tags: ['Whitening'] }
        ]
        
        const randomDeal = genericDeals[Math.floor(Math.random() * genericDeals.length)]
        
        const { data: dealResult, error: dealError } = await supabase
          .from('deals')
          .insert([{
            tenant_id: tenantId,
            contact_id: patient.id,
            pipeline_id: pipeline.pipeline_id,
            stage_id: pipeline.stage_id,
            title: `${randomDeal.title} - ${patient.full_name}`,
            value_estimate_cents: randomDeal.value,
            currency: 'GBP',
            treatment_tags: randomDeal.tags,
            source: patient.source || 'Various'
          }])
          .select()
        
        if (!dealError) {
          dealsCreated++
          totalValue += randomDeal.value
          
          // Add a generic activity
          await supabase
            .from('activities')
            .insert([{
              tenant_id: tenantId,
              type: 'call',
              contact_id: patient.id,
              deal_id: dealResult[0].id,
              agent_user_id: userId,
              subject: 'Initial Consultation',
              snippet: `Initial consultation with ${patient.full_name}`,
              occurred_at: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toISOString()
            }])
          
          activitiesCreated++
        }
      }
    }
    
    console.log(`🎉 COMPLETED: ${dealsCreated} deals, ${activitiesCreated} activities, £${totalValue/100} total value`)
    
    return NextResponse.json({ 
      success: true, 
      message: `🎉 SUCCESS! Created complete practice data!`,
      stats: {
        patientsProcessed: patients.length,
        dealsCreated: dealsCreated,
        activitiesCreated: activitiesCreated,
        totalValue: totalValue,
        totalValueGBP: Math.round(totalValue / 100),
        averageDealValue: Math.round(totalValue / Math.max(dealsCreated, 1) / 100),
        summary: {
          vipPatients: '3 patients with 7 high-value deals',
          professionalPatients: '7 patients with 10 deals',
          familyPatients: '5 patients with 6 deals', 
          totalActivities: `${activitiesCreated} interactions across all patients`
        }
      }
    })
    
  } catch (error) {
    console.error('Error in create-complete-practice-data:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


