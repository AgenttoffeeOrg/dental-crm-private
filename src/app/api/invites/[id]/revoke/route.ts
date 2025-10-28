import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { trackEvent } from '@/lib/posthog'

/**
 * POST /api/invites/[id]/revoke
 * 
 * Revokes a pending invite.
 * Only accessible by owners and admins who own the invite.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerSupabaseClient()
  const inviteId = params.id

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Get user's active tenant and role
  const { data: appUser, error: appUserError } = await supabase
    .from('app_users')
    .select('active_tenant_id, role')
    .eq('id', user.id)
    .single()

  if (appUserError || !appUser?.active_tenant_id) {
    console.error('[API] Error fetching app user:', appUserError)
    return NextResponse.json({ error: 'User context not found' }, { status: 404 })
  }

  // 3. Check permissions
  if (!['owner', 'admin'].includes(appUser.role)) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  try {
    // 4. Fetch the invite
    const { data: invite, error: fetchError } = await supabase
      .from('pending_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('tenant_id', appUser.active_tenant_id)
      .single()

    if (fetchError || !invite) {
      return NextResponse.json(
        { error: 'Invite not found' },
        { status: 404 }
      )
    }

    // 5. Check if already revoked or accepted
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot revoke invite with status: ${invite.status}` },
        { status: 400 }
      )
    }

    // 6. Update invite status
    const { error: updateError } = await supabase
      .from('pending_invites')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId)

    if (updateError) {
      console.error('[API] Error revoking invite:', updateError)
      throw updateError
    }

    // 7. Track event
    await trackEvent(user.id, 'invite_revoked', {
      invite_id: inviteId,
      tenant_id: appUser.active_tenant_id,
      invitee_email: invite.invitee_email,
    })

    // 8. Audit log
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: appUser.active_tenant_id,
      action: 'invite.revoked',
      resource_type: 'invite',
      resource_id: inviteId,
      metadata: {
        invitee_email: invite.invitee_email,
        invite_code: invite.invite_code,
      },
      severity: 'info',
    }).catch(err => console.error('[AUDIT] Failed to log:', err))

    return NextResponse.json({
      success: true,
      message: 'Invite revoked successfully',
    })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

