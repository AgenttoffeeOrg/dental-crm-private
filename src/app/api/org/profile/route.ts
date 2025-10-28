import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Tenant } from '@/types/database'

/**
 * GET /api/org/profile
 * Fetches the organization profile for the currently active tenant
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's active tenant ID
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (appUserError) {
      console.error('[API] Error fetching app user:', appUserError)
      return NextResponse.json({ error: appUserError.message }, { status: 500 })
    }

    const activeTenantId = appUser.active_tenant_id || appUser.tenant_id

    if (!activeTenantId) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Fetch organization profile
    const { data: organization, error: orgError } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', activeTenantId)
      .single()

    if (orgError) {
      console.error('[API] Error fetching organization:', orgError)
      return NextResponse.json({ error: orgError.message }, { status: 500 })
    }

    return NextResponse.json(organization)
  } catch (error: any) {
    console.error('[API] Unexpected error fetching organization profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * PUT /api/org/profile
 * Updates the organization profile for the currently active tenant
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const updates: Partial<Tenant> = await request.json()

    // Remove id and created_at from updates to prevent unauthorized changes
    delete updates.id
    delete updates.created_at

    // Get user's active tenant ID
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, tenant_id')
      .eq('id', user.id)
      .single()

    if (appUserError) {
      console.error('[API] Error fetching app user:', appUserError)
      return NextResponse.json({ error: appUserError.message }, { status: 500 })
    }

    const activeTenantId = appUser.active_tenant_id || appUser.tenant_id

    if (!activeTenantId) {
      return NextResponse.json({ error: 'No active organization' }, { status: 400 })
    }

    // Verify user has permission to update this organization
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', activeTenantId)
      .eq('status', 'active')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Only owners and admins can update organization profile
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Update organization profile
    const { data, error } = await supabase
      .from('tenants')
      .update(updates)
      .eq('id', activeTenantId)
      .select()
      .single()

    if (error) {
      console.error('[API] Error updating organization profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('[API] Unexpected error updating organization profile:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

