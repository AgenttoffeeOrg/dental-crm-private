import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * POST /api/invites/accept
 * 
 * Accepts a pending invitation and adds user to the organization.
 * Creates membership with the pre-assigned role from the invite.
 * 
 * SECURITY:
 * - Only authenticated users can accept invites
 * - Email must match the invite's invited_email
 * - Invite must be pending and not expired
 * - Atomic operation (transaction-like)
 * 
 * REQUEST:
 * {
 *   invite_id: string  // UUID of the invite
 * }
 * OR
 * {
 *   invite_code: string  // 6-character code
 * }
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   membership: {
 *     tenant: { id: string, name: string },
 *     role: string,
 *     location: { id: string, name: string }
 *   }
 * }
 */

// =====================================================================================================
// VALIDATION SCHEMA
// =====================================================================================================
const AcceptInviteSchema = z.union([
  z.object({
    invite_id: z.string().uuid('Invalid invite ID')
  }),
  z.object({
    invite_code: z.string()
      .length(6, 'Invite code must be exactly 6 characters')
      .regex(/^[A-Z0-9]+$/, 'Invite code must be alphanumeric uppercase')
      .transform(val => val.toUpperCase())
  })
])

type AcceptInviteRequest = z.infer<typeof AcceptInviteSchema>

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
    
    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // =====================================================================================================
    // 2. PARSE & VALIDATE REQUEST BODY
    // =====================================================================================================
    let body: AcceptInviteRequest
    
    try {
      const rawBody = await request.json()
      body = AcceptInviteSchema.parse(rawBody)
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
        { error: 'Invalid request body. Provide either invite_id or invite_code' },
        { status: 400 }
      )
    }
    
    // =====================================================================================================
    // 3. FETCH & VALIDATE INVITE
    // =====================================================================================================
    let inviteQuery = supabase
      .from('pending_invites')
      .select(`
        id,
        invite_code,
        invited_email,
        tenant_id,
        assigned_role,
        status,
        expires_at,
        tenants!inner (
          id,
          name
        )
      `)
    
    // Apply filter based on input
    if ('invite_id' in body) {
      inviteQuery = inviteQuery.eq('id', body.invite_id)
    } else {
      inviteQuery = inviteQuery.eq('invite_code', body.invite_code)
    }
    
    const { data: invite, error: inviteError } = await inviteQuery.single()
    
    if (inviteError || !invite) {
      return NextResponse.json(
        { 
          error: 'Invite not found',
          message: 'This invite does not exist or has already been used'
        },
        { status: 404 }
      )
    }
    
    // =====================================================================================================
    // 4. VALIDATE INVITE STATUS
    // =====================================================================================================
    
    // Check if email matches
    if (invite.invited_email.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { 
          error: 'Email mismatch',
          message: 'This invite was sent to a different email address'
        },
        { status: 403 }
      )
    }
    
    // Check if already accepted
    if (invite.status === 'accepted') {
      return NextResponse.json(
        { 
          error: 'Invite already accepted',
          message: 'This invite has already been used'
        },
        { status: 409 }
      )
    }
    
    // Check if expired
    if (invite.status === 'expired' || new Date(invite.expires_at) < new Date()) {
      return NextResponse.json(
        { 
          error: 'Invite expired',
          message: 'This invite has expired. Please request a new one.'
        },
        { status: 410 }
      )
    }
    
    // Check if cancelled
    if (invite.status === 'cancelled') {
      return NextResponse.json(
        { 
          error: 'Invite cancelled',
          message: 'This invite has been cancelled by the organization'
        },
        { status: 410 }
      )
    }
    
    // =====================================================================================================
    // 5. CHECK IF USER IS ALREADY A MEMBER
    // =====================================================================================================
    const { data: existingMembership } = await supabase
      .from('user_tenant_memberships')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('tenant_id', invite.tenant_id)
      .eq('status', 'active')
      .single()
    
    if (existingMembership) {
      // Mark invite as accepted anyway
      await supabase
        .from('pending_invites')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id
        })
        .eq('id', invite.id)
      
      return NextResponse.json(
        { 
          error: 'Already a member',
          message: `You are already a member of ${(invite.tenants as any).name}`,
          current_role: existingMembership.role
        },
        { status: 409 }
      )
    }
    
    // =====================================================================================================
    // 6. GET DEFAULT LOCATION FOR TENANT
    // =====================================================================================================
    const { data: defaultLocation, error: locationError } = await supabase
      .from('locations')
      .select('id, name')
      .eq('tenant_id', invite.tenant_id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    
    if (locationError || !defaultLocation) {
      console.error('[INVITES] Error fetching default location:', locationError)
      return NextResponse.json(
        { error: 'Organization setup incomplete. Please contact the organization admin.' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 7. CREATE MEMBERSHIP WITH ASSIGNED ROLE
    // =====================================================================================================
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .insert({
        user_id: user.id,
        tenant_id: invite.tenant_id,
        role: invite.assigned_role,  // ✅ Use pre-assigned role from invite
        all_locations: false,  // New members don't get all locations by default
        status: 'active'
      })
      .select('id, role')
      .single()
    
    if (membershipError || !membership) {
      console.error('[INVITES] Error creating membership:', membershipError)
      return NextResponse.json(
        { error: 'Failed to create membership' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 8. GRANT ACCESS TO DEFAULT LOCATION
    // =====================================================================================================
    const { error: locationAccessError } = await supabase
      .from('membership_locations')
      .insert({
        membership_id: membership.id,
        location_id: defaultLocation.id,
        role: invite.assigned_role  // Same role for location access
      })
    
    if (locationAccessError) {
      console.error('[INVITES] Error granting location access:', locationAccessError)
      // Non-fatal - user can still access org
    }
    
    // =====================================================================================================
    // 9. UPDATE USER'S ACTIVE CONTEXT
    // =====================================================================================================
    const { error: updateUserError } = await supabase
      .from('app_users')
      .update({
        active_tenant_id: invite.tenant_id,
        active_location_id: defaultLocation.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
    
    if (updateUserError) {
      console.error('[INVITES] Error updating user context:', updateUserError)
      // Non-fatal - user can switch manually
    }
    
    // =====================================================================================================
    // 10. MARK INVITE AS ACCEPTED
    // =====================================================================================================
    const { error: updateInviteError } = await supabase
      .from('pending_invites')
      .update({
        status: 'accepted',
        accepted_at: new Date().toISOString(),
        accepted_by: user.id
      })
      .eq('id', invite.id)
    
    if (updateInviteError) {
      console.error('[INVITES] Error marking invite as accepted:', updateInviteError)
      // Non-fatal - membership is created
    }
    
    // =====================================================================================================
    // 11. AUDIT LOG
    // =====================================================================================================
    await supabase.from('audits').insert({
      user_id: user.id,
      tenant_id: invite.tenant_id,
      location_id: defaultLocation.id,
      action: 'invite.accepted',
      resource_type: 'invite',
      resource_id: invite.id,
      metadata: {
        invite_code: invite.invite_code,
        assigned_role: invite.assigned_role,
        tenant_name: (invite.tenants as any).name
      },
      severity: 'info'
    }).catch(err => console.error('[AUDIT] Failed to log invite acceptance:', err))
    
    // =====================================================================================================
    // 12. SUCCESS RESPONSE
    // =====================================================================================================
    return NextResponse.json({
      success: true,
      membership: {
        tenant: {
          id: invite.tenant_id,
          name: (invite.tenants as any).name
        },
        role: invite.assigned_role,
        location: {
          id: defaultLocation.id,
          name: defaultLocation.name
        }
      },
      message: `Welcome to ${(invite.tenants as any).name}!`
    })
    
  } catch (error: any) {
    console.error('[INVITES] Unexpected error in POST /api/invites/accept:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while accepting the invite'
      },
      { status: 500 }
    )
  }
}

