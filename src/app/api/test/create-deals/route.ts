import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    
    console.log('Creating realistic deals for patients...')
    
    // Get pipeline and stages
    const { data: pipeline } = await supabase
      .from('pipelines')
      .select('id')
      .eq('tenant_id', '550e8400-e29b-41d4-a716-446655440000')
      .eq('is_default', true)
      .single()
    
    if (!pipeline) {
      throw new Error('Default pipeline not found')
    }
    
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.id)
      .order('order_index')
    
    if (!stages || stages.length === 0) {
      throw new Error('Pipeline stages not found')
    }
    
    const stageLead = stages.find(s => s.name === 'Lead')?.id
    const stageConsultation = stages.find(s => s.name === 'Consultation')?.id
    const stageTreatment = stages.find(s => s.name === 'Treatment Plan')?.id
    const stageClosedWon = stages.find(s => s.name === 'Closed Won')?.id
    const stageClosedLost = stages.find(s => s.name === 'Closed Lost')?.id
    
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    const pipelineId = pipeline.id
    
    // Create deals in batches
    const deals = [
      // Dr. James Mitchell (High-value, 4 deals)
      {
        id: '550e8400-e29b-41d4-a716-446655441000',
        contact_id: '550e8400-e29b-41d4-a716-446655440100',
        stage_id: stageClosedWon,
        title: 'Full Mouth Implant Reconstruction',
        description: 'Complete implant-supported restoration for Dr. Mitchell',
        value_estimate_cents: 2500000,
        treatment_tags: ['Implants', 'Full Mouth', 'Complex'],
        source: 'Referral',
        created_at: '2023-01-15 10:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441001',
        contact_id: '550e8400-e29b-41d4-a716-446655440100',
        stage_id: stageClosedWon,
        title: 'Cosmetic Veneers',
        description: 'Porcelain veneers for smile enhancement',
        value_estimate_cents: 800000,
        treatment_tags: ['Veneers', 'Cosmetic'],
        source: 'Existing Patient',
        created_at: '2023-06-20 14:15:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441002',
        contact_id: '550e8400-e29b-41d4-a716-446655440100',
        stage_id: stageTreatment,
        title: 'Gum Disease Treatment',
        description: 'Periodontal therapy and maintenance',
        value_estimate_cents: 350000,
        treatment_tags: ['Periodontics', 'Maintenance'],
        source: 'Routine Check',
        created_at: '2024-01-10 11:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441003',
        contact_id: '550e8400-e29b-41d4-a716-446655440100',
        stage_id: stageConsultation,
        title: 'Bite Adjustment',
        description: 'Occlusal analysis and adjustment',
        value_estimate_cents: 150000,
        treatment_tags: ['Occlusion', 'TMJ'],
        source: 'Follow-up',
        created_at: '2024-02-15 09:30:00+00'
      },
      
      // Sarah Thompson-Clarke (High-value, 3 deals)
      {
        id: '550e8400-e29b-41d4-a716-446655441004',
        contact_id: '550e8400-e29b-41d4-a716-446655440101',
        stage_id: stageClosedWon,
        title: 'Invisalign Treatment',
        description: 'Clear aligner orthodontic treatment',
        value_estimate_cents: 450000,
        treatment_tags: ['Invisalign', 'Orthodontics'],
        source: 'Website',
        created_at: '2023-02-10 15:00:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441005',
        contact_id: '550e8400-e29b-41d4-a716-446655440101',
        stage_id: stageClosedWon,
        title: 'Teeth Whitening',
        description: 'Professional whitening treatment',
        value_estimate_cents: 65000,
        treatment_tags: ['Whitening', 'Cosmetic'],
        source: 'Existing Patient',
        created_at: '2023-08-15 10:45:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441006',
        contact_id: '550e8400-e29b-41d4-a716-446655440101',
        stage_id: stageTreatment,
        title: 'Composite Bonding',
        description: 'Aesthetic bonding for front teeth',
        value_estimate_cents: 180000,
        treatment_tags: ['Bonding', 'Cosmetic'],
        source: 'Consultation',
        created_at: '2024-01-20 14:30:00+00'
      },
      
      // Add more patients with varying deal counts...
      // Emma Richardson (Family, 2 deals)
      {
        id: '550e8400-e29b-41d4-a716-446655441010',
        contact_id: '550e8400-e29b-41d4-a716-446655440103',
        stage_id: stageClosedWon,
        title: 'Family Hygiene Program',
        description: 'Regular cleaning and maintenance',
        value_estimate_cents: 120000,
        treatment_tags: ['Hygiene', 'Family', 'Preventive'],
        source: 'Word of Mouth',
        created_at: '2023-03-10 10:30:00+00'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655441011',
        contact_id: '550e8400-e29b-41d4-a716-446655440103',
        stage_id: stageTreatment,
        title: 'Composite Fillings',
        description: 'White fillings for posterior teeth',
        value_estimate_cents: 85000,
        treatment_tags: ['Fillings', 'Composite'],
        source: 'Routine Check',
        created_at: '2024-01-15 14:45:00+00'
      },
      
      // Oliver Jackson (New patient, 1 deal)
      {
        id: '550e8400-e29b-41d4-a716-446655441021',
        contact_id: '550e8400-e29b-41d4-a716-446655440108',
        stage_id: stageConsultation,
        title: 'New Patient Consultation',
        description: 'Comprehensive exam and treatment plan',
        value_estimate_cents: 15000,
        treatment_tags: ['New Patient', 'Consultation'],
        source: 'Google Search',
        created_at: '2024-01-20 10:45:00+00'
      },
      
      // Sophie Martinez (Student, 1 deal)
      {
        id: '550e8400-e29b-41d4-a716-446655441022',
        contact_id: '550e8400-e29b-41d4-a716-446655440109',
        stage_id: stageLead,
        title: 'Student Cleaning Package',
        description: 'Affordable hygiene treatment',
        value_estimate_cents: 35000,
        treatment_tags: ['Student', 'Budget', 'Hygiene'],
        source: 'University',
        created_at: '2024-02-05 15:30:00+00'
      },
      
      // Add some high-value international patients
      {
        id: '550e8400-e29b-41d4-a716-446655441033',
        contact_id: '550e8400-e29b-41d4-a716-446655440118',
        stage_id: stageClosedWon,
        title: 'Executive Smile Makeover',
        description: 'Complete cosmetic transformation',
        value_estimate_cents: 950000,
        treatment_tags: ['Cosmetic', 'Executive', 'Makeover'],
        source: 'International Referral',
        created_at: '2023-11-20 12:45:00+00'
      },
      
      // Add some closed lost deals for realism
      {
        id: '550e8400-e29b-41d4-a716-446655441038',
        contact_id: '550e8400-e29b-41d4-a716-446655440124',
        stage_id: stageClosedLost,
        title: 'Budget Implant Treatment',
        description: 'Could not afford implant treatment',
        value_estimate_cents: 285000,
        treatment_tags: ['Implants', 'Budget'],
        source: 'Price Comparison',
        created_at: '2024-01-15 10:00:00+00'
      }
    ]
    
    // Insert deals in batches
    for (const deal of deals) {
      const { error } = await supabase
        .from('deals')
        .insert([{
          ...deal,
          tenant_id: tenantId,
          pipeline_id: pipelineId,
          currency: 'GBP'
        }])
      
      if (error && !error.message.includes('duplicate key')) {
        console.error('Error creating deal:', deal.title, error)
      }
    }
    
    console.log(`✅ Created ${deals.length} realistic deals`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Created ${deals.length} realistic deals with various stages and values` 
    })
    
  } catch (error) {
    console.error('Error in create-deals:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}


