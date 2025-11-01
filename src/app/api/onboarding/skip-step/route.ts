import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/onboarding/skip-step
 * 
 * Skips an optional onboarding step
 * 
 * Request Body:
 * {
 *   stepId: string,
 *   reason: string (optional)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   skipped: boolean,
 *   nextStep: string | null,
 *   message: string
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
    const { stepId, reason } = body

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // ✅ SIMPLIFIED 4-STEP VALIDATION
    // Required steps: email_verification, profile_setup (cannot be skipped)
    // Optional steps: organization_setup, location_setup (can be skipped)
    const requiredSteps = ['email_verification', 'profile_setup']
    
    if (requiredSteps.includes(stepId)) {
      return NextResponse.json(
        { error: 'This step cannot be skipped as it contains required fields' },
        { status: 400 }
      )
    }

    // Get user data
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, onboarding_flow_type, onboarding_skipped_steps')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    const tenantId = appUser.active_tenant_id || appUser.tenant_id

    // Mark step as skipped AND completed
    // If user has tenant, save to onboarding_progress
    if (tenantId) {
      const { error: progressError } = await supabase
        .from('onboarding_progress')
        .upsert({
          user_id: user.id,
          tenant_id: tenantId,
          step_name: stepId,
          skipped: true,
          completed: true,  // ← Mark as completed so wizard can finish
          completed_at: new Date().toISOString(),
          skipped_at: new Date().toISOString(),
          data: { skip_reason: reason || 'User chose to skip' }
        }, {
          onConflict: 'user_id,step_name'
        })

      if (progressError) {
        console.error('[API] Error marking step as skipped:', progressError)
        return NextResponse.json(
          { error: 'Failed to skip step', details: progressError.message },
          { status: 500 }
        )
      }
    }

    // Add to skipped steps array in app_users
    const skippedSteps = appUser.onboarding_skipped_steps || []
    if (!skippedSteps.includes(stepId)) {
      skippedSteps.push(stepId)
      
      await supabase
        .from('app_users')
        .update({ onboarding_skipped_steps: skippedSteps })
        .eq('id', user.id)
    }

    // ✅ Calculate next step based on simplified 4-step flow
    const stepOrder = ['email_verification', 'profile_setup', 'organization_setup', 'location_setup']
    const availableSteps = stepOrder.filter((s) => {
      if (s === 'organization_setup' || s === 'location_setup') {
        return !!tenantId
      }
      return true
    })

    let nextStep = null
    const currentIndex = availableSteps.findIndex(s => s === stepId)
    if (currentIndex >= 0 && currentIndex < availableSteps.length - 1) {
      nextStep = availableSteps[currentIndex + 1]
      
      // Update current step
      await supabase
        .from('app_users')
        .update({ onboarding_current_step: nextStep })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      skipped: true,
      nextStep,
      message: 'Step skipped successfully'
    })

  } catch (error: any) {
    console.error('[API] Error in POST /api/onboarding/skip-step:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

