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

    // Get user's app_user record
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, onboarding_flow_type, full_name')
      .eq('id', user.id)
      .single()

    if (appUserError || !appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Check if user has a tenant (use active_tenant_id first, fallback to tenant_id)
    const tenantId = appUser.active_tenant_id || appUser.tenant_id
    let tenant = null
    let accountType: 'organization' | 'solo' = 'solo'

    if (tenantId) {
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('account_type')
        .eq('id', tenantId)
        .single()

      if (!tenantError && tenantData) {
        tenant = tenantData
        accountType = (tenant.account_type as 'organization' | 'solo') || 'organization'
      }
    }

    // Determine account type (use flow_type if set, otherwise use tenant account_type or default to solo)
    accountType = appUser.onboarding_flow_type || accountType || 'solo'

    // ✅ SIMPLIFIED 4-STEP CONFIGURATION
    // Step 1: Email Verification (required, always shown)
    // Step 2: Profile Setup (required, always shown)
    // Step 3: Organization Setup (skippable, only shown if user has org or is creating one)
    // Step 4: Location Setup (skippable, only shown if user has org with locations)

    const steps = []

    // STEP 1: Email Verification (always shown)
    steps.push({
      stepId: 'email_verification',
      stepName: 'Email Verification',
      stepDescription: 'Verify your email address to secure your account',
      stepIcon: 'Mail',
      stepOrder: 1,
      stepCategory: 'email',
      isSkippable: false,
      fields: []
    })

    // STEP 2: Profile Setup (always shown)
    steps.push({
      stepId: 'profile_setup',
      stepName: 'Profile Setup',
      stepDescription: 'Complete your personal information',
      stepIcon: 'User',
      stepOrder: 2,
      stepCategory: 'profile',
      isSkippable: false,
      fields: [
        {
          fieldName: 'full_name',
          isRequired: true,
          displayOrder: 1,
          helpText: 'Your full name',
          validationRules: { minLength: 2 }
        },
        {
          fieldName: 'professional_title',
          isRequired: false,
          displayOrder: 2,
          helpText: 'Your professional title (e.g., Dr., DDS, etc.)',
          validationRules: {}
        },
        {
          fieldName: 'phone_mobile',
          isRequired: false,
          displayOrder: 3,
          helpText: 'Your mobile phone number',
          validationRules: {}
        },
        {
          fieldName: 'bio',
          isRequired: false,
          displayOrder: 4,
          helpText: 'A brief bio about yourself',
          validationRules: {}
        }
      ]
    })

    // STEP 3: Organization Setup (skippable, only shown if user has org)
    if (tenantId) {
      steps.push({
        stepId: 'organization_setup',
        stepName: 'Organization Setup',
        stepDescription: 'Configure your organization details',
        stepIcon: 'Building2',
        stepOrder: 3,
        stepCategory: 'organization',
        isSkippable: true,
        fields: [
          {
            fieldName: 'name',
            isRequired: false,
            displayOrder: 1,
            helpText: 'Organization name',
            validationRules: {}
          },
          {
            fieldName: 'description',
            isRequired: false,
            displayOrder: 2,
            helpText: 'Brief description of your organization',
            validationRules: {}
          },
          {
            fieldName: 'specialty',
            isRequired: false,
            displayOrder: 3,
            helpText: 'Your practice specialty',
            validationRules: {}
          }
        ]
      })
    }

    // STEP 4: Location Setup (skippable, only shown if user has org)
    if (tenantId) {
      steps.push({
        stepId: 'location_setup',
        stepName: 'Location Setup',
        stepDescription: 'Set up your primary location',
        stepIcon: 'MapPin',
        stepOrder: 4,
        stepCategory: 'location',
        isSkippable: true,
        fields: [
          {
            fieldName: 'name',
            isRequired: false,
            displayOrder: 1,
            helpText: 'Location name',
            validationRules: {}
          },
          {
            fieldName: 'address_line1',
            isRequired: false,
            displayOrder: 2,
            helpText: 'Street address',
            validationRules: {}
          },
          {
            fieldName: 'city',
            isRequired: false,
            displayOrder: 3,
            helpText: 'City',
            validationRules: {}
          },
          {
            fieldName: 'postal_code',
            isRequired: false,
            displayOrder: 4,
            helpText: 'Postal/ZIP code',
            validationRules: {}
          },
          {
            fieldName: 'phone_number',
            isRequired: false,
            displayOrder: 5,
            helpText: 'Location phone number',
            validationRules: {}
          }
        ]
      })
    }

    // Format response
    const response = {
      accountType,
      tenantId: tenantId || null,
      userId: user.id,
      hasOrganization: !!tenantId,
      steps,
      totalSteps: steps.length
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

