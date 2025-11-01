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
      .select('tenant_id, active_tenant_id, onboarding_flow_type')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // ✅ SIMPLIFIED 4-STEP VALIDATION
    // Required steps: email_verification, profile_setup
    // Optional steps: organization_setup, location_setup (only if user has org)
    
    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    const requiredSteps = ['email_verification', 'profile_setup']
    
    // Get completed steps
    let completedStepIds: string[] = []
    
    if (tenantId) {
      // User has tenant - check onboarding_progress table
      const { data: completedSteps } = await supabase
        .from('onboarding_progress')
        .select('step_name')
        .eq('user_id', user.id)
        .eq('completed', true)
      
      completedStepIds = completedSteps?.map(s => s.step_name) || []
    } else {
      // User doesn't have tenant - check onboarding_current_step
      // If they're past profile_setup, assume email and profile are done
      if (appUser.onboarding_current_step) {
        const stepOrder = ['email_verification', 'profile_setup']
        const currentIndex = stepOrder.findIndex(s => s === appUser.onboarding_current_step)
        if (currentIndex >= 0) {
          completedStepIds = stepOrder.slice(0, currentIndex + 1)
        }
      }
    }

    // Check if all required steps are completed
    const missingRequired = requiredSteps.filter(
      stepId => !completedStepIds.includes(stepId)
    )

    if (missingRequired.length > 0) {
      return NextResponse.json(
        { 
          error: 'Cannot complete onboarding',
          message: 'Please complete all required steps first',
          missingSteps: missingRequired,
          requiredSteps,
          completedSteps: completedStepIds
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

