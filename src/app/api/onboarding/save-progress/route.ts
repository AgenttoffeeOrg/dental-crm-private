import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * POST /api/onboarding/save-progress
 * 
 * Saves user progress for a specific onboarding step
 * 
 * Request Body:
 * {
 *   stepId: string,
 *   fieldData: object,
 *   isComplete: boolean
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   stepId: string,
 *   completed: boolean,
 *   totalCompleted: number,
 *   nextStep: string | null
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
    const { stepId, fieldData, isComplete } = body

    if (!stepId) {
      return NextResponse.json(
        { error: 'stepId is required' },
        { status: 400 }
      )
    }

    // Get user's tenant_id (check active_tenant_id first, fallback to tenant_id)
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id, active_tenant_id, onboarding_flow_type, onboarding_started_at')
      .eq('id', user.id)
      .single()

    if (!appUser) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Set onboarding_started_at if this is the first save
    if (!appUser.onboarding_started_at) {
      await supabase
        .from('app_users')
        .update({ onboarding_started_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // Get tenant_id (use active_tenant_id first, fallback to tenant_id)
    const tenantId = appUser.active_tenant_id || appUser.tenant_id

    // If user has a tenant, use the database function to update progress
    let result: any = null
    if (tenantId) {
      const { data: rpcResult, error: updateError } = await supabase
        .rpc('update_onboarding_progress', {
          p_user_id: user.id,
          p_step_id: stepId,
          p_field_data: fieldData || {},
          p_is_complete: isComplete || false
        })

      if (updateError) {
        console.error('[API] Error updating progress:', updateError)
        return NextResponse.json(
          { error: 'Failed to save progress', details: updateError.message },
          { status: 500 }
        )
      }
      result = rpcResult
    } else {
      // ✅ User doesn't have a tenant yet - store progress in app_users table
      // We'll use a JSONB field or store it in onboarding_current_step
      // For now, just update the current step
      const updateData: any = {
        onboarding_current_step: stepId
      }

      // Store field data in a JSONB column if it exists, or we can create one
      // For now, we'll just track completion via onboarding_completed flag when all steps are done
      
      await supabase
        .from('app_users')
        .update(updateData)
        .eq('id', user.id)

      result = {
        success: true,
        stepId,
        completed: isComplete,
        totalCompleted: isComplete ? 1 : 0
      }
    }

    // Determine account type
    let accountType = appUser.onboarding_flow_type || 'solo'
    if (tenantId) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('account_type')
        .eq('id', tenantId)
        .single()
      
      if (tenant) {
        accountType = tenant.account_type || 'organization'
      }
    }

    // ✅ Calculate next step based on simplified 4-step flow
    // Steps: email_verification → profile_setup → organization_setup → location_setup
    const stepOrder = ['email_verification', 'profile_setup', 'organization_setup', 'location_setup']
    
    // Filter steps based on whether user has organization
    const availableSteps = stepOrder.filter((stepId) => {
      if (stepId === 'organization_setup' || stepId === 'location_setup') {
        return !!tenantId // Only show org/location steps if user has tenant
      }
      return true // Always show email and profile steps
    })

    let nextStep = null
    if (isComplete) {
      const currentIndex = availableSteps.findIndex(s => s === stepId)
      if (currentIndex >= 0 && currentIndex < availableSteps.length - 1) {
        nextStep = availableSteps[currentIndex + 1]
      }
    }

    // ✅ SAVE ACTUAL FIELD DATA TO DATABASE TABLES WHEN STEP IS COMPLETED
    if (isComplete && fieldData) {
      try {
        // STEP: profile_setup - Save to app_users
        if (stepId === 'profile_setup') {
          const profileUpdate: any = {}
          
          if (fieldData.full_name) profileUpdate.full_name = fieldData.full_name
          if (fieldData.professional_title !== undefined) profileUpdate.professional_title = fieldData.professional_title || null
          if (fieldData.phone_mobile !== undefined) profileUpdate.phone_mobile = fieldData.phone_mobile || null
          if (fieldData.phone_office !== undefined) profileUpdate.phone_office = fieldData.phone_office || null
          if (fieldData.bio !== undefined) profileUpdate.bio = fieldData.bio || null
          if (fieldData.profile_photo_url !== undefined) profileUpdate.profile_photo_url = fieldData.profile_photo_url || null

          if (Object.keys(profileUpdate).length > 0) {
            const { error: profileError } = await supabase
              .from('app_users')
              .update(profileUpdate)
              .eq('id', user.id)

            if (profileError) {
              console.error('[API] Error saving profile data:', profileError)
              // Don't fail the request - progress is still saved
            }
          }
        }

        // STEP: organization_setup - Save to tenants (only if user has tenant)
        if (stepId === 'organization_setup' && tenantId) {
          const orgUpdate: any = {}
          
          if (fieldData.name !== undefined) orgUpdate.name = fieldData.name || null
          if (fieldData.description !== undefined) orgUpdate.description = fieldData.description || null
          if (fieldData.specialty !== undefined) orgUpdate.specialty = fieldData.specialty || null

          if (Object.keys(orgUpdate).length > 0) {
            const { error: orgError } = await supabase
              .from('tenants')
              .update(orgUpdate)
              .eq('id', tenantId)

            if (orgError) {
              console.error('[API] Error saving organization data:', orgError)
              // Don't fail the request - progress is still saved
            }
          }
        }

        // STEP: location_setup - Save to locations (only if user has tenant)
        if (stepId === 'location_setup' && tenantId) {
          // Get active location or create/update default location
          const { data: appUserWithLocation } = await supabase
            .from('app_users')
            .select('active_location_id')
            .eq('id', user.id)
            .single()

          const locationUpdate: any = {}
          if (fieldData.name !== undefined) locationUpdate.name = fieldData.name || null
          // Map form field 'address_line1' to database column 'address'
          if (fieldData.address_line1 !== undefined) locationUpdate.address = fieldData.address_line1 || null
          if (fieldData.city !== undefined) locationUpdate.city = fieldData.city || null
          if (fieldData.postal_code !== undefined) locationUpdate.postal_code = fieldData.postal_code || null
          // Map form field 'phone_number' to database column 'phone'
          if (fieldData.phone_number !== undefined) locationUpdate.phone = fieldData.phone_number || null

          if (appUserWithLocation?.active_location_id) {
            // Update existing location
            const { error: locError } = await supabase
              .from('locations')
              .update(locationUpdate)
              .eq('id', appUserWithLocation.active_location_id)

            if (locError) {
              console.error('[API] Error saving location data:', locError)
            }
          } else if (tenantId && Object.keys(locationUpdate).length > 0) {
            // Create new location if none exists
            const { data: newLocation, error: locCreateError } = await supabase
              .from('locations')
              .insert({
                tenant_id: tenantId,
                ...locationUpdate,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('id')
              .single()

            if (!locCreateError && newLocation) {
              // Update app_users with active_location_id
              await supabase
                .from('app_users')
                .update({ active_location_id: newLocation.id })
                .eq('id', user.id)
            } else if (locCreateError) {
              console.error('[API] Error creating location:', locCreateError)
            }
          }
        }
      } catch (dataSaveError: any) {
        console.error('[API] Error saving field data to database:', dataSaveError)
        // Don't fail the request - progress tracking is more important
      }
    }

    // Update current step in app_users if completing
    if (isComplete && nextStep) {
      await supabase
        .from('app_users')
        .update({ onboarding_current_step: nextStep })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      stepId,
      completed: isComplete,
      totalCompleted: result?.totalCompleted || 0,
      nextStep,
      message: isComplete ? 'Step completed' : 'Progress saved'
    })

  } catch (error: any) {
    console.error('[API] Error in POST /api/onboarding/save-progress:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

