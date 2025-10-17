import { createServiceClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { checkSeatAvailability, getSeatUsage } from '@/lib/services/billing-service'
import { sendInvitationEmail } from '@/lib/services/email-service'
import { FeatureFlags } from '@/lib/feature-flags'
import { isValidEmail } from '@/lib/domain-utils'

/**
 * POST /api/users/invite
 * 
 * Create a new user invitation with seat limit enforcement.
 * Enhanced with billing integration and comprehensive error handling.
 */
export async function POST(request: Request) {
  try {
    const { email, role, tenant_id, invited_by } = await request.json()

    // ========================================
    // 1. VALIDATION
    // ========================================
    
    if (!email || !role || !tenant_id) {
      return NextResponse.json(
        { error: 'Email, role, and tenant_id are required' },
        { status: 400 }
      )
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate role
    const validRoles = ['owner', 'manager', 'staff', 'viewer']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ' + validRoles.join(', ') },
        { status: 400 }
      )
    }

    const supabase = createServiceClient()

    // ========================================
    // 2. CHECK SEAT AVAILABILITY (CRITICAL)
    // ========================================
    
    if (FeatureFlags.ENABLE_SEAT_ENFORCEMENT) {
      const seatCheck = await checkSeatAvailability(tenant_id, 1)
      
      if (!seatCheck.available) {
        // Get current usage for detailed error
        const usage = await getSeatUsage(tenant_id)
        
        return NextResponse.json(
          { 
            error: seatCheck.reason,
            requires_upgrade: true,
            seat_usage: usage ? {
              active_seats: usage.active_seats,
              seat_limit: usage.seat_limit,
              available_seats: usage.available_seats,
            } : null,
          },
          { status: 400 }
        )
      }
    }

    // ========================================
    // 3. CHECK FOR DUPLICATES
    // ========================================
    
    // Check if user already exists in this tenant
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in this organization' },
        { status: 400 }
      )
    }

    // Check if there's a pending invitation
    const { data: pendingInvitation } = await supabase
      .from('user_invitations')
      .select('id, created_at, expires_at')
      .eq('tenant_id', tenant_id)
      .eq('email', email)
      .eq('status', 'pending')
      .single()

    if (pendingInvitation) {
      return NextResponse.json(
        { 
          error: 'An invitation has already been sent to this email',
          pending_invitation: {
            id: pendingInvitation.id,
            sent_at: pendingInvitation.created_at,
            expires_at: pendingInvitation.expires_at,
          },
        },
        { status: 400 }
      )
    }

    // ========================================
    // 4. GET CONTEXT FOR EMAIL
    // ========================================
    
    // Get inviter name
    const { data: inviterData } = await supabase
      .from('app_users')
      .select('full_name')
      .eq('id', invited_by)
      .single()
    
    // Get organization name
    const { data: tenantData } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single()

    const inviterName = inviterData?.full_name || 'Your colleague'
    const organizationName = tenantData?.name || 'the organization'

    // ========================================
    // 5. CREATE INVITATION
    // ========================================
    
    // Generate cryptographically secure token
    const token = randomBytes(32).toString('hex')

    // Set expiration (7 days from now)
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('user_invitations')
      .insert({
        tenant_id,
        email: email.toLowerCase().trim(), // Normalize email
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
        { error: 'Failed to create invitation: ' + inviteError.message },
        { status: 500 }
      )
    }

    // ========================================
    // 6. SEND INVITATION EMAIL
    // ========================================
    
    const invitationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`
    
    let emailSent = false
    let emailError = null

    try {
      const result = await sendInvitationEmail(
        { email: email.toLowerCase().trim() },
        inviterName,
        organizationName,
        invitationLink,
        role
      )
      
      emailSent = result.success
      
      if (result.success) {
        console.log(`✅ Invitation email sent to ${email}`)
      } else {
        emailError = result.error
        console.error('Failed to send invitation email:', result.error)
      }
    } catch (error: any) {
      emailError = error.message
      console.error('Exception sending invitation email:', error)
    }

    // ========================================
    // 7. LOG SUCCESS
    // ========================================
    
    console.log('📧 ============================================')
    console.log(`📧 Invitation created for ${email}`)
    console.log(`📧 Organization: ${organizationName}`)
    console.log(`📧 Role: ${role}`)
    console.log(`📧 Invited by: ${inviterName}`)
    console.log(`📧 Email sent: ${emailSent ? 'Yes' : 'No'}`)
    if (emailError) {
      console.log(`📧 Email error: ${emailError}`)
    }
    console.log(`📧 Expires: ${expiresAt.toISOString()}`)
    console.log('📧 ============================================')

    // ========================================
    // 8. RETURN SUCCESS
    // ========================================
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expires_at: invitation.expires_at,
        created_at: invitation.created_at,
      },
      invitationLink: FeatureFlags.ENABLE_EMAIL_SENDING 
        ? undefined  // Don't expose link if emails are working
        : invitationLink, // Include for development
      email_sent: emailSent,
      message: emailSent 
        ? 'Invitation created and sent successfully'
        : 'Invitation created (email sending disabled or failed)',
    })

  } catch (error: any) {
    console.error('❌ Error in invite API:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
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

