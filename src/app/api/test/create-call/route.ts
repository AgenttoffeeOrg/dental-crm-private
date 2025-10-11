import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    console.log('Creating fresh call activity for audio upload testing...')
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

    // Create a fresh call activity WITHOUT any audio files
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .insert({
        tenant_id: '550e8400-e29b-41d4-a716-446655440000',
        contact_id: contacts?.[0]?.id || null,
        deal_id: deals?.[0]?.id || null,
        type: 'call',
        subject: 'Fresh Call - Ready for Audio Upload',
        snippet: 'This call activity is ready for audio upload and ChatGPT processing',
        occurred_at: new Date().toISOString(),
        agent_user_id: users?.[0]?.id || null
      })
      .select()
      .single()

    if (activityError) {
      console.error('Failed to create call activity:', activityError)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to create call activity',
        details: activityError.message 
      })
    }

    console.log('Created fresh call activity:', activity.id)

    // Verify no audio files are linked
    const { data: existingFiles } = await supabase
      .from('activity_files')
      .select('*')
      .eq('activity_id', activity.id)

    return NextResponse.json({
      success: true,
      message: 'Fresh call activity created - ready for audio upload',
      data: {
        activityId: activity.id,
        contactId: activity.contact_id,
        dealId: activity.deal_id,
        subject: activity.subject,
        hasAudioFiles: existingFiles?.length || 0,
        instructions: 'Go to /contacts or /pipeline, find this activity, and you should see the audio upload component'
      }
    })

  } catch (error) {
    console.error('Fresh activity creation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Fresh activity creation failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

