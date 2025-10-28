import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { trackEvent } from '@/lib/posthog'

/**
 * POST /api/invites/[id]/resend
 * 
 * Resends an invite email (in a real implementation, this would trigger an email).
 * For now, it just extends the expiration and logs the action.
 * 
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

    // 5. Check if can be resent
    if (invite.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot resend invite with status: ${invite.status}` },
        { status: 400 }
      )
    }

    // 6. Extend expiration by 7 days
    const newExpiresAt = new Date()
    newExpiresAt.setDate(newExpiresAt.getDate() + 7)

    const { error: updateError } = await supabase
      .from('pending_invites')
      .update({
        expires_at: newExpiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', inviteId)

    if (updateError) {
      console.error('[API] Error updating invite:', updateError)
      throw updateError
    }

    // 7. TODO: Send email notification
    // In a production app, you would trigger an email here using:
    // - SendGrid, Mailgun, Postmark, or similar service
    // - Template with personalized message
    // - Invite code and accept link
    
    console.log(`[INVITES] Would send email to ${invite.invitee_email} with code ${invite.invite_code}`)

    // 8. Track event
    await trackEvent(user.id, 'invite_resent', {
      invite_id: inviteId,
      tenant_id: appUser.active_tenant_id,
      invitee_email: invite.invitee_email,
    })

    // 9. Audit log
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: appUser.active_tenant_id,
      action: 'invite.resent',
      resource_type: 'invite',
      resource_id: inviteId,
      metadata: {
        invitee_email: invite.invitee_email,
        invite_code: invite.invite_code,
        new_expires_at: newExpiresAt.toISOString(),
      },
      severity: 'info',
    }).catch(err => console.error('[AUDIT] Failed to log:', err))

    return NextResponse.json({
      success: true,
      message: 'Invite resent successfully',
      expires_at: newExpiresAt.toISOString(),
    })

  } catch (error: any) {
    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

