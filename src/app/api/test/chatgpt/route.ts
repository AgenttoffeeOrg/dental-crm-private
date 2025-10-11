import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('Creating persistent test activity for ChatGPT testing...')
    const supabase = createServiceClient()

    // Get existing data for foreign keys
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

    // Create a persistent test activity
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        contact_id: contacts?.[0]?.id || null,
        deal_id: deals?.[0]?.id || null,
        type: 'call',
        subject: 'ChatGPT Test Call',
        snippet: 'Testing ChatGPT integration with mock dental consultation',
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

    console.log('Created persistent test activity:', activity.id)

    // Create a mock audio file with some test content
    const { data: fileRecord, error: fileError } = await supabase
      .from('files')
      .insert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        storage_path: `audio/chatgpt-test-${activity.id}-${Date.now()}.mp3`,
        mime_type: 'audio/mpeg',
        size_bytes: 50000, // 50KB mock file
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

    console.log('Created mock file record:', fileRecord.id)

    // Link file to activity
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

    return NextResponse.json({
      success: true,
      message: 'Persistent test activity created for ChatGPT testing',
      data: {
        activityId: activity.id,
        fileId: fileRecord.id,
        storagePath: fileRecord.storage_path,
        instructions: 'Use this activity ID to test ChatGPT integration. Note: This will fail at audio download since the file doesn\'t actually exist in storage, but you can test the OpenAI API key validation.'
      }
    })

  } catch (error) {
    console.error('Test creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Test creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

