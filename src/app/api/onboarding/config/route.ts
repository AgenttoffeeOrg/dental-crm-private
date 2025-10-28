import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/onboarding/config
 * 
 * Returns the complete onboarding wizard configuration for the current user
 * based on their account type (organization or solo)
 * 
 * Response:
 * {
 *   accountType: 'organization' | 'solo',
 *   steps: [{
 *     stepId: string,
 *     stepName: string,
 *     stepDescription: string,
 *     stepIcon: string,
 *     stepOrder: number,
 *     stepCategory: string,
 *     isSkippable: boolean,
 *     fields: [{
 *       fieldName: string,
 *       isRequired: boolean,
 *       displayOrder: number,
 *       helpText: string,
 *       validationRules: object
 *     }]
 *   }],
 *   totalSteps: number
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

    // Get user's app_user record to find tenant and account type
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('tenant_id, onboarding_flow_type')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Get tenant to determine account type
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('account_type')
      .eq('id', appUser.tenant_id)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Determine account type (use flow_type if set, otherwise use tenant account_type)
    const accountType = appUser.onboarding_flow_type || tenant.account_type || 'organization'

    // Get onboarding configuration using the database function
    const { data: config, error: configError } = await supabase
      .rpc('get_onboarding_config', {
        p_tenant_id: appUser.tenant_id,
        p_account_type: accountType
      })

    if (configError) {
      console.error('[API] Error fetching onboarding config:', configError)
      return NextResponse.json(
        { error: 'Failed to load configuration', details: configError.message },
        { status: 500 }
      )
    }

    console.log('[API] Raw config from DB:', JSON.stringify(config, null, 2))

    // Transform the data from snake_case to camelCase and parse fields JSONB
    const transformedSteps = (config || []).map((step: any) => ({
      stepId: step.step_id,
      stepName: step.step_name,
      stepDescription: step.step_description,
      stepIcon: step.step_icon,
      stepOrder: step.step_order,
      stepCategory: step.step_category,
      isSkippable: step.is_skippable,
      // Parse fields if it's a JSONB string, otherwise use as-is
      fields: typeof step.fields === 'string' ? JSON.parse(step.fields) : (step.fields || [])
    }))

    console.log('[API] Transformed steps:', JSON.stringify(transformedSteps, null, 2))

    // Format response
    const response = {
      accountType,
      tenantId: appUser.tenant_id,
      userId: user.id,
      steps: transformedSteps,
      totalSteps: transformedSteps.length
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('[API] Error in GET /api/onboarding/config:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

