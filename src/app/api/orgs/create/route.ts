import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceClient } from '@/lib/supabase-server'
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
    // Use regular client for auth/user lookup (RLS applies)
    const supabase = await createServerSupabaseClient()
    
    // =====================================================================================================
    // 1. AUTHENTICATION
    // =====================================================================================================
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('[ORGS] Authentication failed:', authError)
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
    // 2.5. CREATE SERVICE CLIENT FOR TENANT CREATION (bypasses RLS)
    // =====================================================================================================
    let serviceClient
    try {
      serviceClient = createServiceClient()
      console.log('[ORGS] ✅ Service client created successfully')
    } catch (serviceError: any) {
      console.error('[ORGS] ❌ Failed to create service client:', serviceError)
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: 'Service client initialization failed. Please check server configuration.',
          details: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service key exists but failed to initialize' : 'Service key missing'
        },
        { status: 500 }
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
    // 5. CREATE TENANT (ORGANIZATION) - Use service client to bypass RLS
    // =====================================================================================================
    console.log('[ORGS] Step 5: Creating tenant with service client')
    console.log('[ORGS] Organization name:', body.name)
    console.log('[ORGS] Service client type:', typeof serviceClient)
    
    let tenant
    try {
      const { data: tenantData, error: tenantError } = await serviceClient
        .from('tenants')
        .insert({
          name: body.name,
          is_multi_location: false,  // Start as single-location
          account_type: 'organization',  // ✅ Required by tenants_account_type_check constraint
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, name')
        .single()
      
      if (tenantError) {
        console.error('[ORGS] ❌ Tenant creation error:', {
          code: tenantError.code,
          message: tenantError.message,
          details: tenantError.details,
          hint: tenantError.hint
        })
        
        // Check for duplicate name
        if (tenantError.code === '23505') {
          return NextResponse.json(
            { 
              error: 'Organization name already exists',
              message: 'Please choose a different name for your organization'
            },
            { status: 409 }
          )
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to create organization',
            message: tenantError.message || 'Unknown error',
            details: tenantError.details || tenantError.hint
          },
          { status: 500 }
        )
      }
      
      if (!tenantData) {
        console.error('[ORGS] ❌ Tenant creation returned no data')
        return NextResponse.json(
          { 
            error: 'Failed to create organization',
            message: 'No tenant data returned from database'
          },
          { status: 500 }
        )
      }
      
      tenant = tenantData
      console.log('[ORGS] ✅ Tenant created successfully:', {
        id: tenant.id,
        name: tenant.name
      })
    } catch (tenantException: any) {
      console.error('[ORGS] ❌ Exception during tenant creation:', tenantException)
      return NextResponse.json(
        { 
          error: 'Failed to create organization',
          message: tenantException.message || 'Exception during tenant creation',
          details: tenantException.stack
        },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 6. CREATE DEFAULT LOCATION - Use service client to bypass RLS
    // =====================================================================================================
    console.log('[ORGS] Step 6: Creating default location')
    console.log('[ORGS] Location name:', body.location_name)
    console.log('[ORGS] Tenant ID:', tenant.id)
    
    let location
    try {
      const { data: locationData, error: locationError } = await serviceClient
        .from('locations')
        .insert({
          tenant_id: tenant.id,
          name: body.location_name,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id, name')
        .single()
      
      if (locationError) {
        console.error('[ORGS] ❌ Location creation error:', {
          code: locationError.code,
          message: locationError.message,
          details: locationError.details,
          hint: locationError.hint
        })
        
        // Rollback: Delete tenant
        console.log('[ORGS] Rolling back tenant creation...')
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        
        return NextResponse.json(
          { 
            error: 'Failed to create default location',
            message: locationError.message || 'Unknown error',
            details: locationError.details || locationError.hint
          },
          { status: 500 }
        )
      }
      
      if (!locationData) {
        console.error('[ORGS] ❌ Location creation returned no data')
        // Rollback tenant
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        return NextResponse.json(
          { 
            error: 'Failed to create default location',
            message: 'No location data returned from database'
          },
          { status: 500 }
        )
      }
      
      location = locationData
      console.log('[ORGS] ✅ Location created successfully:', {
        id: location.id,
        name: location.name
      })
    } catch (locationException: any) {
      console.error('[ORGS] ❌ Exception during location creation:', locationException)
      // Rollback tenant
      await serviceClient.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { 
          error: 'Failed to create default location',
          message: locationException.message || 'Exception during location creation'
        },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 7. CREATE OWNER MEMBERSHIP - Use service client to bypass RLS
    // =====================================================================================================
    console.log('[ORGS] Step 7: Creating owner membership')
    console.log('[ORGS] User ID:', user.id)
    console.log('[ORGS] Tenant ID:', tenant.id)
    
    let membership
    try {
      const { data: membershipData, error: membershipError } = await serviceClient
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
      
      if (membershipError) {
        console.error('[ORGS] ❌ Membership creation error:', {
          code: membershipError.code,
          message: membershipError.message,
          details: membershipError.details,
          hint: membershipError.hint
        })
        
        // Rollback: Delete location and tenant
        console.log('[ORGS] Rolling back location and tenant...')
        await serviceClient.from('locations').delete().eq('id', location.id)
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        
        return NextResponse.json(
          { 
            error: 'Failed to create membership',
            message: membershipError.message || 'Unknown error',
            details: membershipError.details || membershipError.hint
          },
          { status: 500 }
        )
      }
      
      if (!membershipData) {
        console.error('[ORGS] ❌ Membership creation returned no data')
        // Rollback location and tenant
        await serviceClient.from('locations').delete().eq('id', location.id)
        await serviceClient.from('tenants').delete().eq('id', tenant.id)
        return NextResponse.json(
          { 
            error: 'Failed to create membership',
            message: 'No membership data returned from database'
          },
          { status: 500 }
        )
      }
      
      membership = membershipData
      console.log('[ORGS] ✅ Membership created successfully:', {
        id: membership.id,
        role: membership.role
      })
    } catch (membershipException: any) {
      console.error('[ORGS] ❌ Exception during membership creation:', membershipException)
      // Rollback location and tenant
      await serviceClient.from('locations').delete().eq('id', location.id)
      await serviceClient.from('tenants').delete().eq('id', tenant.id)
      return NextResponse.json(
        { 
          error: 'Failed to create membership',
          message: membershipException.message || 'Exception during membership creation'
        },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 8. UPDATE USER'S ACTIVE CONTEXT - Use service client to bypass RLS
    // =====================================================================================================
    console.log('[ORGS] Updating user active context')
    const { error: updateUserError } = await serviceClient
      .from('app_users')
      .update({
        active_tenant_id: tenant.id,
        active_location_id: location.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (updateUserError) {
      console.error('[ORGS] Error updating user context:', updateUserError)
      // Non-fatal - user can switch manually, but log it
    } else {
      console.log('[ORGS] ✅ User context updated')
    }
    
    // =====================================================================================================
    // 9. AUDIT LOG (Non-blocking - failure doesn't affect org creation)
    // =====================================================================================================
    try {
      const { error: auditError } = await supabase.from('audits').insert({
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
      })
      
      if (auditError) {
        console.error('[AUDIT] Failed to log org creation:', auditError)
        // Non-fatal - continue with success response
      }
    } catch (auditException: any) {
      console.error('[AUDIT] Exception logging org creation:', auditException)
      // Non-fatal - continue with success response
    }
    
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
    console.error('[ORGS] ❌ Unexpected error in POST /api/orgs/create:', error)
    console.error('[ORGS] Error stack:', error.stack)
    console.error('[ORGS] Error details:', {
      name: error.name,
      message: error.message,
      code: error.code
    })
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred while creating the organization',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

