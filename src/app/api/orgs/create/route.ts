import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * POST /api/orgs/create
 * 
 * Creates a new organization for a solo user.
 * Sets up tenant, default location, and owner membership.
 * 
 * SECURITY:
 * - Only authenticated users can create orgs
 * - User becomes owner automatically
 * - Validates organization name uniqueness
 * 
 * REQUEST:
 * {
 *   name: string,
 *   location_name?: string  // Default: "Main Office"
 * }
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   organization: {
 *     tenant: { id: string, name: string },
 *     location: { id: string, name: string },
 *     your_role: 'owner'
 *   }
 * }
 */

// =====================================================================================================
// VALIDATION SCHEMA
// =====================================================================================================
const CreateOrgSchema = z.object({
  name: z.string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters')
    .trim()
    .refine(
      name => !/[<>{}[\]\\\/]/.test(name),
      'Organization name contains invalid characters'
    ),
  
  location_name: z.string()
    .min(2, 'Location name must be at least 2 characters')
    .max(100, 'Location name must be less than 100 characters')
    .trim()
    .optional()
    .default('Main Office')
})

type CreateOrgRequest = z.infer<typeof CreateOrgSchema>

// =====================================================================================================
// MAIN HANDLER
// =====================================================================================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // =====================================================================================================
    // 1. AUTHENTICATION
    // =====================================================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // =====================================================================================================
    // 2. GET APP USER
    // =====================================================================================================
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('id, full_name, active_tenant_id')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser) {
      console.error('[ORGS] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }
    
    // =====================================================================================================
    // 3. CHECK IF USER ALREADY HAS AN ORGANIZATION
    // =====================================================================================================
    // Note: We allow users to create multiple orgs (multi-org support)
    // But we'll warn them if they already have one
    let warningMessage: string | undefined
    
    if (appUser.active_tenant_id) {
      warningMessage = 'You already have an active organization. Creating another will allow you to switch between them.'
    }
    
    // =====================================================================================================
    // 4. PARSE & VALIDATE REQUEST BODY
    // =====================================================================================================
    let body: CreateOrgRequest
    
    try {
      const rawBody = await request.json()
      body = CreateOrgSchema.parse(rawBody)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
    
    // =====================================================================================================
    // 5. CREATE TENANT (ORGANIZATION)
    // =====================================================================================================
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: body.name,
        is_multi_location: false,  // Start as single-location
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name')
      .single()
    
    if (tenantError || !tenant) {
      console.error('[ORGS] Error creating tenant:', tenantError)
      
      // Check for duplicate name
      if (tenantError?.code === '23505') {
        return NextResponse.json(
          { 
            error: 'Organization name already exists',
            message: 'Please choose a different name for your organization'
          },
          { status: 409 }
        )
      }
      
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 6. CREATE DEFAULT LOCATION
    // =====================================================================================================
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenant.id,
        name: body.location_name,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, name')
      .single()
    
    if (locationError || !location) {
      console.error('[ORGS] Error creating location:', locationError)
      
      // Rollback: Delete tenant
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return NextResponse.json(
        { error: 'Failed to create default location' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 7. CREATE OWNER MEMBERSHIP
    // =====================================================================================================
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'owner',  // ✅ Creator becomes owner
        all_locations: true,  // ✅ Owner has access to all locations
        status: 'active'
      })
      .select('id, role')
      .single()
    
    if (membershipError || !membership) {
      console.error('[ORGS] Error creating membership:', membershipError)
      
      // Rollback: Delete location and tenant
      await supabase.from('locations').delete().eq('id', location.id)
      await supabase.from('tenants').delete().eq('id', tenant.id)
      
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 8. UPDATE USER'S ACTIVE CONTEXT
    // =====================================================================================================
    const { error: updateUserError } = await supabase
      .from('app_users')
      .update({
        active_tenant_id: tenant.id,
        active_location_id: location.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (updateUserError) {
      console.error('[ORGS] Error updating user context:', updateUserError)
      // Non-fatal - user can switch manually
    }
    
    // =====================================================================================================
    // 9. AUDIT LOG
    // =====================================================================================================
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: tenant.id,
      location_id: location.id,
      action: 'organization.created',
      resource_type: 'tenant',
      resource_id: tenant.id,
      metadata: {
        organization_name: body.name,
        location_name: body.location_name,
        creator_name: appUser.full_name
      },
      severity: 'info'
    }).catch(err => console.error('[AUDIT] Failed to log org creation:', err))
    
    // =====================================================================================================
    // 10. SUCCESS RESPONSE
    // =====================================================================================================
    return NextResponse.json(
      {
        success: true,
        organization: {
          tenant: {
            id: tenant.id,
            name: tenant.name
          },
          location: {
            id: location.id,
            name: location.name
          },
          your_role: 'owner'
        },
        message: `Successfully created ${body.name}`,
        warning: warningMessage
      },
      { status: 201 }
    )
    
  } catch (error: any) {
    console.error('[ORGS] Unexpected error in POST /api/orgs/create:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the organization'
      },
      { status: 500 }
    )
  }
}

