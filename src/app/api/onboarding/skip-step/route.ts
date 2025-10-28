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

    // Check if step is skippable
    const { data: stepDef, error: stepError } = await supabase
      .from('onboarding_step_definitions')
      .select('is_skippable')
      .eq('id', stepId)
      .single()

    if (stepError || !stepDef) {
      return NextResponse.json(
        { error: 'Step not found' },
        { status: 404 }
      )
    }

    if (!stepDef.is_skippable) {
      return NextResponse.json(
        { error: 'This step cannot be skipped as it contains required fields' },
        { status: 400 }
      )
    }

    // Get user data
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, onboarding_flow_type, onboarding_skipped_steps')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Mark step as skipped AND completed in onboarding_progress
    // Skipped steps count as "completed" to allow wizard completion
    const { error: progressError } = await supabase
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        tenant_id: appUser.tenant_id,
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
        { error: 'Failed to skip step' },
        { status: 500 }
      )
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
    if (allSteps) {
      const currentIndex = allSteps.findIndex(s => s.id === stepId)
      if (currentIndex >= 0 && currentIndex < allSteps.length - 1) {
        nextStep = allSteps[currentIndex + 1].id
        
        // Update current step
        await supabase
          .from('app_users')
          .update({ onboarding_current_step: nextStep })
          .eq('id', user.id)
      }
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

