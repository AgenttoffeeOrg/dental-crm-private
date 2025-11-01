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
        active_tenant_id,
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

    const tenantId = appUser.active_tenant_id || appUser.tenant_id

    // Get all progress data (if user has tenant)
    const savedData: Record<string, any> = {}
    const completedSteps: string[] = []
    const skippedSteps: string[] = []

    if (tenantId) {
      const { data: progressData } = await supabase
        .from('onboarding_progress')
        .select('step_name, completed, skipped, field_data')
        .eq('user_id', user.id)

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
    } else {
      // User doesn't have tenant - load saved data from app_users fields
      // For now, we can infer completion from onboarding_current_step
      const stepOrder = ['email_verification', 'profile_setup']
      if (appUser.onboarding_current_step) {
        const currentIndex = stepOrder.findIndex(s => s === appUser.onboarding_current_step)
        if (currentIndex > 0) {
          completedSteps.push(...stepOrder.slice(0, currentIndex))
        }
      }
    }

    // Add skipped steps from app_users
    if (appUser.onboarding_skipped_steps) {
      skippedSteps.push(...appUser.onboarding_skipped_steps)
    }

    // ✅ Determine resume step using simplified 4-step flow
    const stepOrder = ['email_verification', 'profile_setup', 'organization_setup', 'location_setup']
    const availableSteps = stepOrder.filter((stepId) => {
      if (stepId === 'organization_setup' || stepId === 'location_setup') {
        return !!tenantId
      }
      return true
    })

    let resumeFromStep = appUser.onboarding_current_step || 'email_verification'

    // If current step is already completed, find next uncompleted step
    if (completedSteps.includes(resumeFromStep) || skippedSteps.includes(resumeFromStep)) {
      const nextUncompleted = availableSteps.find(
        step => !completedSteps.includes(step) && !skippedSteps.includes(step)
      )

      if (nextUncompleted) {
        resumeFromStep = nextUncompleted
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

