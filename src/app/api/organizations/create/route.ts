import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  locationName: z.string().min(1).max(100).optional(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.warn('[API][organizations/create] Unauthorized request', {
        hasAuthError: !!authError,
        authError: authError?.message,
        cookiesSent: request.headers.get('cookie')?.split(';').length || 0,
      })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API][organizations/create] Authenticated user:', user.id)

    // Parse and validate request body
    const body = CreateOrganizationSchema.parse(await request.json())

    console.log('[API][organizations/create] Received payload:', body)

    // Check if user already has an organization
    const { data: existingMembership } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existingMembership) {
      return NextResponse.json(
        { error: 'You already belong to an organization. Please leave it first to create a new one.' },
        { status: 400 }
      )
    }

    // Create organization (tenant)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .insert({
        name: body.name,
        company_description: body.description?.trim() || null,
        is_multi_location: false,
        timezone: 'Europe/London',
        marketing_enabled: false,
        marketing_plan: 'none',
        currency_code: 'USD',
        locale: 'en-US',
      })
      .select()
      .single()

    if (tenantError) {
      console.error('[API][organizations/create] Failed to create tenant:', tenantError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    // Create default location
    const { data: location, error: locationError } = await supabase
      .from('locations')
      .insert({
        tenant_id: tenant.id,
        name: body.locationName?.trim() || 'Main Office',
        is_primary: true,
        is_active: true,
      })
      .select()
      .single()

    if (locationError) {
      console.error('[API][organizations/create] Failed to create location:', locationError)
      // TODO: Rollback tenant creation
      return NextResponse.json(
        { error: 'Failed to create default location' },
        { status: 500 }
      )
    }

    // Create membership for the user as owner
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: user.id,
        tenant_id: tenant.id,
        role: 'owner',
        status: 'active',
        all_locations: true,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (membershipError) {
      console.error('[API][organizations/create] Failed to create membership:', membershipError)
      // TODO: Rollback tenant and location creation
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      )
    }

    // Update app_users with the new tenant context
    const { error: updateError } = await supabase
      .from('app_users')
      .update({
        active_tenant_id: tenant.id,
        active_location_id: location.id,
        default_tenant_id: tenant.id,
        default_location_id: location.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API][organizations/create] Failed to update app_users:', updateError)
      // Non-critical, continue
    }

    return NextResponse.json({
      success: true,
      data: {
        tenant,
        location,
        membership,
      },
    })
  } catch (error) {
    console.error('Create organization error:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

