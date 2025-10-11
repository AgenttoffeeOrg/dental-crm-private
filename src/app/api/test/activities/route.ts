import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()

    // Get all activities to see what exists
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id,
        type,
        subject,
        created_at,
        activity_files (
          file_id,
          files (
            kind,
            storage_path
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      return NextResponse.json({
        error: 'Failed to fetch activities',
        details: error.message
      }, { status: 500 })
    }

    const summary = {
      totalActivities: activities?.length || 0,
      callActivities: activities?.filter(a => a.type === 'call').length || 0,
      callsWithAudio: activities?.filter(a => 
        a.type === 'call' && 
        a.activity_files && 
        a.activity_files.length > 0
      ).length || 0,
      callsWithoutAudio: activities?.filter(a => 
        a.type === 'call' && 
        (!a.activity_files || a.activity_files.length === 0)
      ).length || 0,
      activities: activities?.map(a => ({
        id: a.id,
        type: a.type,
        subject: a.subject,
        hasAudio: a.activity_files && a.activity_files.length > 0,
        audioFiles: a.activity_files?.length || 0
      })) || []
    }

    return NextResponse.json({
      success: true,
      data: summary
    })

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to analyze activities',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

