import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceClient()
    
    // Get all activities with their contact info
    const { data: activities, error } = await supabase
      .from('activities')
      .select(`
        id, 
        type, 
        contact_id, 
        deal_id, 
        subject, 
        occurred_at,
        contacts(id, full_name),
        activity_files(file_id, files(kind)),
        ai_artifacts(id, kind)
      `)
      .order('occurred_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      activities: activities || [],
      count: activities?.length || 0
    })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

