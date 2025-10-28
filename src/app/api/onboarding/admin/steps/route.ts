import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/onboarding/admin/steps
 * 
 * Returns all onboarding step definitions for admin configuration
 * 
 * Response:
 * {
 *   steps: [{
 *     id: string,
 *     name: string,
 *     category: string,
 *     display_order: number
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user is admin/super admin
    const { data: appUser } = await supabase
      .from('app_users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!appUser || !['admin', 'super_admin'].includes(appUser.role)) {
      return NextResponse.json(
        { error: 'Unauthorized. Admin access required.' },
        { status: 403 }
      )
    }

    // Get all onboarding steps
    const { data: steps, error: stepsError } = await supabase
      .from('onboarding_step_definitions')
      .select('id, name, category, display_order')
      .order('display_order', { ascending: true })

    if (stepsError) {
      console.error('[API] Error fetching steps:', stepsError)
      return NextResponse.json(
        { error: 'Failed to load steps' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      steps: steps || []
    })

  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/admin/steps:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

