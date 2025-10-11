import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { activity_id } = await request.json()

    if (!activity_id) {
      return NextResponse.json(
        { error: 'activity_id is required' },
        { status: 400 }
      )
    }

    // Get the current user to ensure they have access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the activity belongs to the user's tenant
    const { data: activity, error: activityError } = await supabase
      .from('activities')
      .select('tenant_id')
      .eq('id', activity_id)
      .single()

    if (activityError || !activity) {
      return NextResponse.json(
        { error: 'Activity not found' },
        { status: 404 }
      )
    }

    // Get user's tenant
    const { data: appUser, error: userError } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (userError || !appUser || appUser.tenant_id !== activity.tenant_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Call the Supabase Edge Function
    const functionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-call-activity`
    
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ activity_id }),
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || 'Failed to process activity')
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error calling process-call-activity function:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process call activity',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
