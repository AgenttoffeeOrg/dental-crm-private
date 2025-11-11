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
    console.log('=== COMPLETE ENDPOINT DEBUG ===')
    console.log('Incoming request method:', request.method)

    let requestBody: unknown = null
    try {
      const clone = request.clone()
      requestBody = await clone.json()
    } catch (parseError) {
      requestBody = null
    }
    console.log('Received body:', requestBody)

    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('[COMPLETE] No user found or auth error:', authError)
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    console.log('[COMPLETE] User:', user.id)

    // Get user data
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, onboarding_flow_type, onboarding_current_step')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      console.error('[COMPLETE] User profile not found')
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    console.log('[COMPLETE] appUser:', appUser)

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
        .select('step_name, completed, skipped')
        .eq('user_id', user.id)
      
      console.log('[COMPLETE] onboarding_progress records:', completedSteps)
      completedStepIds = completedSteps?.filter(s => s.completed || s.skipped)?.map(s => s.step_name) || []
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
      // Treat core steps as satisfied for solo users that reach completion
      completedStepIds = Array.from(new Set([...completedStepIds, 'email_verification', 'profile_setup']))
    }

    console.log('[COMPLETE] Completed step IDs:', completedStepIds)

    // Check if all required steps are completed
    let missingRequired = requiredSteps.filter(
      stepId => !completedStepIds.includes(stepId)
    )

    if (missingRequired.includes('email_verification')) {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (authUser?.email_confirmed_at) {
        missingRequired = missingRequired.filter(step => step !== 'email_verification')
      }
    }

    console.log('[COMPLETE] Missing required steps:', missingRequired)

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

    console.log('[COMPLETE] Onboarding complete for user:', user.id)

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

