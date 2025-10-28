import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * PUT /api/onboarding/complete
 * 
 * Marks the onboarding wizard as complete
 * Validates that all required steps have been completed
 * 
 * Response:
 * {
 *   success: boolean,
 *   completed: boolean,
 *   completedAt: timestamp,
 *   message: string
 * }
 */
export async function PUT(request: NextRequest) {
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

    // Get user data
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, onboarding_flow_type')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get tenant account type
    const { data: tenant } = await supabase
      .from('tenants')
      .select('account_type')
      .eq('id', appUser.tenant_id)
      .single()

    const accountType = appUser.onboarding_flow_type || tenant?.account_type || 'organization'

    // Get all required steps for this account type
    const { data: requiredSteps } = await supabase
      .from('onboarding_step_definitions')
      .select('id')
      .contains('account_types', [accountType])
      .eq('is_skippable', false)

    // Check if all required steps are completed
    const { data: completedSteps } = await supabase
      .from('onboarding_progress')
      .select('step_name')
      .eq('user_id', user.id)
      .eq('completed', true)

    const completedStepIds = completedSteps?.map(s => s.step_name) || []
    const requiredStepIds = requiredSteps?.map(s => s.id) || []

    // Find missing required steps
    const missingRequired = requiredStepIds.filter(
      stepId => !completedStepIds.includes(stepId)
    )

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot complete onboarding',
          message: 'Please complete all required steps first',
          missingSteps: missingRequired
        },
        { status: 400 }
      )
    }

    // Mark onboarding as complete
    const completedAt = new Date().toISOString()
    
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        onboarding_completed: true,
        onboarding_completed_at: completedAt,
        profile_completed: true,
        onboarding_current_step: null
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API] Error completing onboarding:', updateError)
      return NextResponse.json(
        { error: 'Failed to complete onboarding', details: updateError.message },
        { status: 500 }
      )
    }

    // Optional: Send welcome email or trigger other completion actions
    // TODO: Implement welcome email sending if needed

    return NextResponse.json({
      success: true,
      completed: true,
      completedAt,
      message: 'Onboarding completed successfully! Welcome aboard! 🎉'
    })

  } catch (error: any) {
    console.error('[API] Error in PUT /api/onboarding/complete:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

