import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/onboarding/resume
 * 
 * Returns saved progress data to resume the onboarding wizard
 * Includes the last uncompleted step and all saved field data
 * 
 * Response:
 * {
 *   canResume: boolean,
 *   resumeFromStep: string,
 *   savedData: {
 *     [stepId]: { [fieldName]: value }
 *   },
 *   completedSteps: string[],
 *   skippedSteps: string[]
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

    // Get user onboarding state
    const { data: appUser } = await supabase
      .from('app_users')
      .select(`
        tenant_id,
        onboarding_flow_type,
        onboarding_current_step,
        onboarding_completed,
        onboarding_skipped_steps,
        onboarding_started_at
      `)
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // If onboarding is already completed, can't resume
    if (appUser.onboarding_completed) {
      return NextResponse.json({
        canResume: false,
        message: 'Onboarding already completed'
      })
    }

    // If onboarding hasn't started yet
    if (!appUser.onboarding_started_at) {
      return NextResponse.json({
        canResume: false,
        resumeFromStep: 'email_verification',
        savedData: {},
        completedSteps: [],
        skippedSteps: [],
        message: 'Onboarding not started yet'
      })
    }

    // Get all progress data
    const { data: progressData } = await supabase
      .from('onboarding_progress')
      .select('step_name, completed, skipped, field_data')
      .eq('user_id', user.id)

    // Organize data
    const savedData: Record<string, any> = {}
    const completedSteps: string[] = []
    const skippedSteps: string[] = []

    progressData?.forEach(progress => {
      if (progress.field_data) {
        savedData[progress.step_name] = progress.field_data
      }
      if (progress.completed) {
        completedSteps.push(progress.step_name)
      }
      if (progress.skipped) {
        skippedSteps.push(progress.step_name)
      }
    })

    // Determine which step to resume from
    let resumeFromStep = appUser.onboarding_current_step || 'email_verification'

    // If current step is already completed, find next uncompleted step
    if (completedSteps.includes(resumeFromStep)) {
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

      // Find first uncompleted step
      const nextUncompleted = allSteps?.find(
        step => !completedSteps.includes(step.id) && !skippedSteps.includes(step.id)
      )

      if (nextUncompleted) {
        resumeFromStep = nextUncompleted.id
      }
    }

    return NextResponse.json({
      canResume: true,
      resumeFromStep,
      savedData,
      completedSteps,
      skippedSteps,
      startedAt: appUser.onboarding_started_at,
      message: 'Progress loaded successfully'
    })

  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/resume:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

