import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/onboarding/status
 * 
 * Returns the user's current onboarding progress including:
 * - Current step
 * - Completed steps
 * - Progress percentage
 * - Account type
 * 
 * Response:
 * {
 *   currentStep: string,
 *   currentStepNumber: number,
 *   completedSteps: string[],
 *   totalSteps: number,
 *   progressPercentage: number,
 *   accountType: 'organization' | 'solo',
 *   onboardingCompleted: boolean,
 *   onboardingStartedAt: timestamp,
 *   onboardingCompletedAt: timestamp | null
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

    // Get user's onboarding data
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select(`
        tenant_id,
        onboarding_flow_type,
        onboarding_current_step,
        onboarding_completed,
        onboarding_started_at,
        onboarding_completed_at,
        onboarding_skipped_steps,
        profile_completed
      `)
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser) {
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

    // Get completed steps from onboarding_progress
    const { data: progressData, error: progressError } = await supabase
      .from('onboarding_progress')
      .select('step_name, completed')
      .eq('user_id', user.id)
      .eq('completed', true)

    if (progressError) {
      console.error('[API] Error fetching progress:', progressError)
    }

    const completedSteps = progressData?.map(p => p.step_name) || []

    // Get total steps for this account type
    const { data: stepDefinitions } = await supabase
      .from('onboarding_step_definitions')
      .select('id, display_order')
      .contains('account_types', [accountType])
      .order('display_order', { ascending: true })

    const totalSteps = stepDefinitions?.length || 0
    const completedCount = completedSteps.length

    // Calculate progress percentage
    const progressPercentage = totalSteps > 0 
      ? Math.round((completedCount / totalSteps) * 100) 
      : 0

    // Determine current step number
    let currentStepNumber = 1
    if (appUser.onboarding_current_step && stepDefinitions) {
      const currentStepIndex = stepDefinitions.findIndex(
        s => s.id === appUser.onboarding_current_step
      )
      currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1
    }

    // Build response
    const response = {
      currentStep: appUser.onboarding_current_step || 'email_verification',
      currentStepNumber,
      completedSteps,
      skippedSteps: appUser.onboarding_skipped_steps || [],
      totalSteps,
      completedCount,
      progressPercentage,
      accountType,
      onboardingCompleted: appUser.onboarding_completed || false,
      profileCompleted: appUser.profile_completed || false,
      onboardingStartedAt: appUser.onboarding_started_at,
      onboardingCompletedAt: appUser.onboarding_completed_at,
      allSteps: stepDefinitions?.map(s => s.id) || []
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/status:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

