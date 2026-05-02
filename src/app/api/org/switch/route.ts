/**
 * API Route: Switch Active Organization
 * 
 * Stores the active tenant_id in a cookie so the auth system knows which org to load
 * 
 * AUDIT: Logs organization switching events for compliance and debugging
 */

import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get current active_tenant_id and role for audit trail
    const { data: currentAppUser } = await supabase
      .from('app_users')
      .select('active_tenant_id, role')
      .eq('id', user.id)
      .single()

    // Get request body
    const body = await request.json()
    const { tenant_id } = body

    if (!tenant_id) {
      return NextResponse.json({ error: 'tenant_id is required' }, { status: 400 })
    }

    // Check if user is super admin or owner (they can access any tenant)
    const isSuperAdmin = currentAppUser?.role === 'super_admin' || currentAppUser?.role === 'owner'

    let membership = null
    let membershipRole = 'owner'

    if (!isSuperAdmin) {
      // Verify user has access to this tenant by checking user_tenant_memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('user_tenant_memberships')
        .select('id, tenant_id, role, status')
        .eq('user_id', user.id)
        .eq('tenant_id', tenant_id)
        .eq('status', 'active')
        .single()

      if (membershipError || !membershipData) {
        // ✅ AUDIT: Log failed switch attempt
        await supabase.from('audits').insert({
          user_id: user.id,
          tenant_id: currentAppUser?.active_tenant_id,
          action: 'user.tenant_switch_denied',
          resource_type: 'tenant',
          resource_id: tenant_id,
          metadata: {
            requested_tenant_id: tenant_id,
            reason: 'no_active_membership',
          },
          severity: 'warning',
        })
        // Note: Audit log errors are logged but don't fail the request

        return NextResponse.json(
          { error: 'Access denied: You are not a member of this organization' },
          { status: 403 }
        )
      }

      membership = membershipData
      membershipRole = membership.role
    } else {
      // Super admin/owner: Verify tenant exists (but don't require membership)
      const { data: tenantExists } = await supabase
        .from('tenants')
        .select('id')
        .eq('id', tenant_id)
        .single()

      if (!tenantExists) {
        return NextResponse.json(
          { error: 'Organization not found' },
          { status: 404 }
        )
      }
    }

    // Update app_users.active_tenant_id (server-side state)
    const { error: updateError } = await supabase
      .from('app_users')
      .update({ 
        active_tenant_id: tenant_id,
        last_context_switch_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('[API] Error updating active_tenant_id:', updateError)
      // Don't fail the request - cookie alone will work
    }

    // Also store in cookie as backup/immediate context
    const cookieStore = cookies()
    cookieStore.set('active_tenant_id', tenant_id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    })

    // ✅ AUDIT: Log successful organization switch
    supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: tenant_id, // Log to NEW tenant for visibility
      action: 'user.tenant_switched',
      resource_type: 'tenant',
      resource_id: tenant_id,
      metadata: {
        previous_tenant_id: currentAppUser?.active_tenant_id,
        new_tenant_id: tenant_id,
        user_role: membershipRole,
        is_super_admin: isSuperAdmin,
        switched_at: new Date().toISOString(),
      },
      severity: 'info',
    }).then(() => {
      // Audit logged successfully
    }).catch(err => {
      console.error('[AUDIT] Failed to log switch:', err)
    })

    return NextResponse.json({
      success: true,
      new_tenant: tenant_id,
      message: 'Organization switched successfully',
    })
  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
