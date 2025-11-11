import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAuthContext } from '@/lib/api/auth'

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
    const { supabase, user, error: authError } = await getSupabaseAuthContext(request)

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
        active_tenant_id,
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

    // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    let accountType: 'organization' | 'solo' = 'solo'

    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('account_type')
        .eq('id', tenantId)
        .single()

      if (tenant) {
        accountType = (tenant.account_type as 'organization' | 'solo') || 'organization'
      }
    }

    accountType = appUser.onboarding_flow_type || accountType || 'solo'

    // ✅ Use simplified 4-step configuration
    const stepOrder = ['email_verification', 'profile_setup', 'organization_setup', 'location_setup']
    const availableSteps = stepOrder.filter((stepId) => {
      if (stepId === 'organization_setup' || stepId === 'location_setup') {
        return !!tenantId
      }
      return true
    })

    // Get completed steps - check both onboarding_progress (if tenant exists) and app_users
    let completedSteps: string[] = []
    
    if (tenantId) {
      // User has tenant - check onboarding_progress table
      const { data: progressData, error: progressError } = await supabase
        .from('onboarding_progress')
        .select('step_name, completed')
        .eq('user_id', user.id)
        .eq('completed', true)

      if (progressError) {
        console.error('[API] Error fetching progress:', progressError)
      } else {
        completedSteps = progressData?.map(p => p.step_name) || []
      }
    } else {
      // User doesn't have tenant - infer completion from onboarding_current_step
      // If they've moved past a step, assume it's completed
      if (appUser.onboarding_current_step) {
        const currentIndex = availableSteps.findIndex(s => s === appUser.onboarding_current_step)
        if (currentIndex > 0) {
          completedSteps = availableSteps.slice(0, currentIndex)
        }
      }
    }

    const totalSteps = availableSteps.length
    const completedCount = completedSteps.length

    // Calculate progress percentage
    const progressPercentage = totalSteps > 0 
      ? Math.round((completedCount / totalSteps) * 100) 
      : 0

    // Determine current step number
    let currentStepNumber = 1
    if (appUser.onboarding_current_step) {
      const currentStepIndex = availableSteps.findIndex(
        s => s === appUser.onboarding_current_step
      )
      currentStepNumber = currentStepIndex >= 0 ? currentStepIndex + 1 : 1
    }

    const allSteps = availableSteps

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
      allSteps: allSteps || []
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

