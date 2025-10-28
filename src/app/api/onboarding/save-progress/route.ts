import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/onboarding/save-progress
 * 
 * Saves user progress for a specific onboarding step
 * 
 * Request Body:
 * {
 *   stepId: string,
 *   fieldData: object,
 *   isComplete: boolean
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   stepId: string,
 *   completed: boolean,
 *   totalCompleted: number,
 *   nextStep: string | null
 * }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { stepId, fieldData, isComplete } = body

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // Get user's tenant_id
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, onboarding_flow_type, onboarding_started_at')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Set onboarding_started_at if this is the first save
    if (!appUser.onboarding_started_at) {
      await supabase
        .from('app_users')
        .update({ onboarding_started_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // Use the database function to update progress
    const { data: result, error: updateError } = await supabase
      .rpc('update_onboarding_progress', {
        p_user_id: user.id,
        p_step_id: stepId,
        p_field_data: fieldData || {},
        p_is_complete: isComplete || false
      })

    if (updateError) {
      console.error('[API] Error updating progress:', updateError)
      return NextResponse.json(
        { error: 'Failed to save progress', details: updateError.message },
        { status: 500 }
      )
    }

    // Get next step
    const { data: tenant } = await supabase
      .from('tenants')
      .select('account_type')
      .eq('id', appUser.tenant_id)
      .single()

    const accountType = appUser.onboarding_flow_type || tenant?.account_type || 'organization'

    const { data: allSteps } = await supabase
      .from('onboarding_step_definitions')
      .select('id')
      .contains('account_types', [accountType])
      .order('display_order', { ascending: true })

    let nextStep = null
    if (allSteps && isComplete) {
      const currentIndex = allSteps.findIndex(s => s.id === stepId)
      if (currentIndex >= 0 && currentIndex < allSteps.length - 1) {
        nextStep = allSteps[currentIndex + 1].id
      }
    }

    // Update current step in app_users if completing
    if (isComplete && nextStep) {
      await supabase
        .from('app_users')
        .update({ onboarding_current_step: nextStep })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      stepId,
      completed: isComplete,
      totalCompleted: result?.totalCompleted || 0,
      nextStep,
      message: isComplete ? 'Step completed' : 'Progress saved'
    })

  } catch (error: any) {
    console.error('[API] Error in POST /api/onboarding/save-progress:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

