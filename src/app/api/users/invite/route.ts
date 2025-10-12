import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export async function POST(request: Request) {
  try {
    const { email, role, tenant_id, invited_by } = await request.json()

    // Validation
    if (!email || !role || !tenant_id) {
      return NextResponse.json(
        { error: 'Email, role, and tenant_id are required' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['owner', 'manager', 'staff', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id, email')
      .eq('tenant_id', tenant_id)
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in this tenant' },
        { status: 400 }
      )
    }

    // Check if there's a pending invitation
    const { data: pendingInvitation } = await supabase
      .from('user_invitations')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (pendingInvitation) {
      return NextResponse.json(
        { error: 'An invitation has already been sent to this email' },
        { status: 400 }
      )
    }

    // Generate unique invitation token
    const token = randomBytes(32).toString('hex')

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id,
        email,
        role,
        invited_by_user_id: invited_by || null,
        invitation_token: token,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (inviteError) {
      console.error('Error creating invitation:', inviteError)
      return NextResponse.json(
        { error: 'Failed to create invitation' },
        { status: 500 }
      )
    }

    // TODO: Send invitation email
    // For now, we'll just return the invitation link
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`

    console.log(`📧 Invitation created for ${email}`)
    console.log(`🔗 Invitation link: ${invitationLink}`)

    return NextResponse.json({
      success: true,
      invitation,
      invitationLink,
      message: 'Invitation created successfully'
    })

  } catch (error) {
    console.error('Error in invite API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List all invitations for a tenant
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tenant_id = searchParams.get('tenant_id')

    if (!tenant_id) {
      return NextResponse.json(
        { error: 'tenant_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select(`
        *,
        invited_by:app_users!user_invitations_invited_by_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    return NextResponse.json({ invitations })

  } catch (error) {
    console.error('Error in GET invite API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE: Cancel an invitation
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const invitation_id = searchParams.get('id')

    if (!invitation_id) {
      return NextResponse.json(
        { error: 'invitation_id is required' },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    const { error } = await supabase
      .from('user_invitations')
      .update({ 
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', invitation_id)
      .eq('status', 'pending') // Only cancel pending invitations

    if (error) {
      console.error('Error cancelling invitation:', error)
      return NextResponse.json(
        { error: 'Failed to cancel invitation' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation cancelled successfully'
    })

  } catch (error) {
    console.error('Error in DELETE invite API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

