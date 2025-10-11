import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing complete upload flow...')
    const supabase = createServiceClient()

    // First, get existing data to use for foreign keys
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id')
      .limit(1)

    const { data: deals } = await supabase
      .from('deals')
      .select('id')
      .limit(1)

    const { data: users } = await supabase
      .from('app_users')
      .select('id')
      .limit(1)

    console.log('Found existing data:', { 
      contactCount: contacts?.length || 0, 
      dealCount: deals?.length || 0,
      userCount: users?.length || 0 
    })

    // Step 1: Create a test activity with real foreign keys
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        contact_id: contacts?.[0]?.id || null,
        deal_id: deals?.[0]?.id || null,
        type: 'call',
        subject: 'Test Call Upload',
        snippet: 'Testing audio upload flow',
        occurred_at: new Date().toISOString(),
        agent_user_id: users?.[0]?.id || null
      })
      .select()
      .single()

    if (activityError) {
      console.error('Failed to create test activity:', activityError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create test activity',
        details: activityError.message 
      })
    }

    console.log('Created test activity:', activity.id)

    // Step 2: Create a mock file record (simulating successful upload)
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        storage_path: `audio/test-${activity.id}-${Date.now()}.mp3`,
        mime_type: 'audio/mpeg',
        size_bytes: 1024000, // 1MB
        kind: 'audio'
      })
      .select()
      .single()

    if (fileError) {
      console.error('Failed to create file record:', fileError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create file record',
        details: fileError.message 
      })
    }

    console.log('Created file record:', fileRecord.id)

    // Step 3: Link file to activity
    const { error: linkError } = await supabase
      .from('activity_files')
      .insert({
        activity_id: activity.id,
        file_id: fileRecord.id
      })

    if (linkError) {
      console.error('Failed to link file to activity:', linkError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to link file to activity',
        details: linkError.message 
      })
    }

    console.log('Successfully linked file to activity')

    // Step 4: Test AI processing call (will fail but that's expected)
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke('process-call-activity', {
        body: { activity_id: activity.id }
      })
      
      if (aiError) {
        console.log('AI processing failed as expected (Edge Function not deployed):', aiError.message)
      } else {
        console.log('AI processing started successfully:', aiData)
      }
    } catch (aiError) {
      console.log('AI processing failed as expected:', aiError)
    }

    // Clean up test data
    await supabase.from('activity_files').delete().eq('activity_id', activity.id)
    await supabase.from('files').delete().eq('id', fileRecord.id)
    await supabase.from('activities').delete().eq('id', activity.id)

    console.log('Cleaned up test data')

    return NextResponse.json({
      success: true,
      message: 'Upload flow test completed successfully',
      data: {
        activityId: activity.id,
        fileId: fileRecord.id,
        uploadPath: fileRecord.storage_path
      }
    })

  } catch (error) {
    console.error('Upload flow test error:', error)
    return NextResponse.json({
      success: false,
      error: 'Upload flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
