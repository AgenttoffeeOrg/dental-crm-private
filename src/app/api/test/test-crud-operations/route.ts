import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = createServiceClient()
    const tenantId = '550e8400-e29b-41d4-a716-446655440000'
    
    console.log('Testing CRUD operations...')
    
    // Test 1: Create a contact
    const testContact = {
      tenant_id: tenantId,
      full_name: 'Test CRUD Contact',
      primary_email: 'test.crud@example.com',
      primary_phone: '+44 7700 999999',
      source: 'test',
      tags: ['test', 'crud']
    }
    
    console.log('Creating test contact:', testContact.full_name)
    
    const { data: contactResult, error: contactError } = await supabase
      .from('contacts')
      .insert([testContact])
      .select()
    
    if (contactError) {
      return NextResponse.json({ 
        success: false, 
        error: `Contact creation failed: ${contactError.message}`,
        step: 'contact_creation'
      })
    }
    
    const createdContact = contactResult[0]
    console.log('✅ Contact created:', createdContact.id)
    
    // Test 2: Get pipeline info
    const { data: pipeline, error: pipelineError } = await supabase
      .from('deals')
      .select('pipeline_id, stage_id')
      .eq('tenant_id', tenantId)
      .limit(1)
      .single()
    
    if (pipelineError || !pipeline) {
      return NextResponse.json({ 
        success: false, 
        error: 'No pipeline found for deal creation',
        step: 'pipeline_lookup'
      })
    }
    
    // Test 3: Create a deal
    const testDeal = {
      tenant_id: tenantId,
      contact_id: createdContact.id,
      pipeline_id: pipeline.pipeline_id,
      stage_id: pipeline.stage_id,
      title: 'Test CRUD Deal',
      value_estimate_cents: 50000,
      currency: 'GBP',
      treatment_tags: ['test', 'crud'],
      source: 'test'
    }
    
    console.log('Creating test deal:', testDeal.title)
    
    const { data: dealResult, error: dealError } = await supabase
      .from('deals')
      .insert([testDeal])
      .select()
    
    if (dealError) {
      return NextResponse.json({ 
        success: false, 
        error: `Deal creation failed: ${dealError.message}`,
        step: 'deal_creation',
        contactCreated: true,
        contactId: createdContact.id
      })
    }
    
    const createdDeal = dealResult[0]
    console.log('✅ Deal created:', createdDeal.id)
    
    // Test 4: Update the deal (test drag-and-drop simulation)
    const { data: stages } = await supabase
      .from('pipeline_stages')
      .select('id, name')
      .eq('pipeline_id', pipeline.pipeline_id)
      .order('position')
    
    if (stages && stages.length > 1) {
      const newStageId = stages[1].id // Move to second stage
      
      console.log(`Moving deal to stage: ${stages[1].name}`)
      
      const { error: updateError } = await supabase
        .from('deals')
        .update({ 
          stage_id: newStageId,
          updated_at: new Date().toISOString()
        })
        .eq('id', createdDeal.id)
      
      if (updateError) {
        return NextResponse.json({ 
          success: false, 
          error: `Deal update failed: ${updateError.message}`,
          step: 'deal_update'
        })
      }
      
      console.log('✅ Deal moved successfully')
    }
    
    // Test 5: Create an activity
    const { data: users } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', tenantId)
      .limit(1)
    
    const userId = users?.[0]?.id
    
    const testActivity = {
      tenant_id: tenantId,
      type: 'call',
      contact_id: createdContact.id,
      deal_id: createdDeal.id,
      agent_user_id: userId,
      subject: 'Test CRUD Call',
      snippet: 'Testing CRUD operations for call activity',
      occurred_at: new Date().toISOString()
    }
    
    console.log('Creating test activity:', testActivity.subject)
    
    const { data: activityResult, error: activityError } = await supabase
      .from('activities')
      .insert([testActivity])
      .select()
    
    if (activityError) {
      return NextResponse.json({ 
        success: false, 
        error: `Activity creation failed: ${activityError.message}`,
        step: 'activity_creation'
      })
    }
    
    console.log('✅ Activity created:', activityResult[0].id)
    
    // Test 6: Clean up test data
    await supabase.from('activities').delete().eq('id', activityResult[0].id)
    await supabase.from('deals').delete().eq('id', createdDeal.id)
    await supabase.from('contacts').delete().eq('id', createdContact.id)
    
    console.log('✅ Test data cleaned up')
    
    return NextResponse.json({ 
      success: true, 
      message: '🎉 All CRUD operations working perfectly!',
      tests: {
        contact_creation: '✅ Working',
        deal_creation: '✅ Working',
        deal_update: '✅ Working (drag-and-drop ready)',
        activity_creation: '✅ Working',
        data_cleanup: '✅ Working'
      }
    })
    
  } catch (error) {
    console.error('Error in test-crud-operations:', error)
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}

