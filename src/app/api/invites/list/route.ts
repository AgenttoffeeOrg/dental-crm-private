import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

/**
 * GET /api/invites/list
 * 
 * Returns all pending invites for the current user's active tenant.
 * Only accessible by owners and admins.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

  // 2. Get user's active tenant
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('active_tenant_id')
    .eq('id', user.id)
    .single()

  if (appUserError || !appUser?.active_tenant_id) {
    console.error('[API] Error fetching app user:', appUserError)
    return NextResponse.json({ error: 'User context not found' }, { status: 404 })
  }

  // 3. Get user's role in the active tenant
  const { data: membership, error: membershipError } = await supabase
    .from('user_tenant_memberships')
    .select('role')
    .eq('user_id', user.id)
    .eq('tenant_id', appUser.active_tenant_id)
    .eq('status', 'active')
    .single()

  if (membershipError || !membership) {
    console.error('[API] Error fetching membership:', membershipError)
    return NextResponse.json({ error: 'Membership not found' }, { status: 404 })
  }

  // 4. Check permissions - only owners and admins can view invites
  if (!['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions. Only owners and admins can view invites.' },
      { status: 403 }
    )
  }

  // 5. Fetch all invites for this tenant
  const { data: invites, error: invitesError } = await supabase
    .from('pending_invites')
    .select(`
      id,
      tenant_id,
      invited_email,
      invite_code,
      assigned_role,
      status,
      expires_at,
      created_at,
      invited_by,
      personal_message
    `)
    .eq('tenant_id', appUser.active_tenant_id)
    .order('created_at', { ascending: false })

  if (invitesError) {
    console.error('[API] Error fetching invites:', invitesError)
    return NextResponse.json(
      { error: 'Failed to fetch invites', details: invitesError.message },
      { status: 500 }
    )
  }

  // 6. Return invites (no enrichment needed - frontend can handle it)
  return NextResponse.json({
    invites: invites || [],
    count: (invites || []).length,
  })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

