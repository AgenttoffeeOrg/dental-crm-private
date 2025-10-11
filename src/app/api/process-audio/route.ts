import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { activity_id } = await request.json()

    if (!activity_id) {
      return NextResponse.json(
        { error: 'Missing activity_id' },
        { status: 400 }
      )
    }

    console.log('Starting AI processing for activity:', activity_id)

    const supabase = createServiceClient()

    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('process-call-activity', {
      body: { activity_id }
    })

    if (error) {
      console.error('Error calling Edge Function:', error)
      return NextResponse.json(
        { error: 'Failed to start AI processing', details: error.message },
        { status: 500 }
      )
    }

    console.log('AI processing started successfully:', data)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('API route error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
