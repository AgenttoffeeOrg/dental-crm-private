import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * POST /api/invites/create
 * 
 * Creates a new organization invite with explicit role assignment.
 * 
 * SECURITY:
 * - Only admins/owners can create invites
 * - Role must be explicitly specified (NO defaults)
 * - Rate limited to 10 invites/hour per user
 * - Duplicate invite check (same email + tenant + pending)
 * 
 * REQUEST:
 * {
 *   email: string,
 *   role: 'owner' | 'admin' | 'manager' | 'staff' | 'viewer',  // REQUIRED
 *   personal_message?: string
 * }
 * 
 * RESPONSE:
 * {
 *   success: true,
 *   invite: {
 *     id: string,
 *     invite_code: string,
 *     invited_email: string,
 *     assigned_role: string,
 *     expires_at: string
 *   }
 * }
 */

// =====================================================================================================
// VALIDATION SCHEMA
// =====================================================================================================
const CreateInviteSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .min(3, 'Email too short')
    .max(255, 'Email too long')
    .toLowerCase()
    .trim(),
  
  // ✅ CRITICAL: Role is REQUIRED (no default)
  role: z.enum(['owner', 'admin', 'manager', 'staff', 'viewer'], {
    errorMap: () => ({ message: 'Role must be explicitly specified: owner, admin, manager, staff, or viewer' })
  }),
  
  personal_message: z.string()
    .max(500, 'Personal message too long (max 500 characters)')
    .trim()
    .optional()
})

type CreateInviteRequest = z.infer<typeof CreateInviteSchema>

// =====================================================================================================
// RATE LIMITING (In-Memory - Replace with Redis in production)
// =====================================================================================================
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour in ms
const RATE_LIMIT_MAX = 10 // Max invites per hour

const rateLimitStore = new Map<string, { count: number, resetAt: number }>()

function checkRateLimit(userId: string): { allowed: boolean, remaining: number, resetAt: number } {
  const now = Date.now()
  const key = `invite:${userId}`
  const record = rateLimitStore.get(key)
  
  // Clean up expired records
  if (record && now > record.resetAt) {
    rateLimitStore.delete(key)
  }
  
  // Check current limit
  const current = rateLimitStore.get(key)
  
  if (!current) {
    // First invite in window
    const resetAt = now + RATE_LIMIT_WINDOW
    rateLimitStore.set(key, { count: 1, resetAt })
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1, resetAt }
  }
  
  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0, resetAt: current.resetAt }
  }
  
  // Increment count
  current.count++
  return { allowed: true, remaining: RATE_LIMIT_MAX - current.count, resetAt: current.resetAt }
}

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
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // =====================================================================================================
    // 2. GET USER CONTEXT
    // =====================================================================================================
    const { data: appUser, error: appUserError } = await supabase
      .from('app_users')
      .select('active_tenant_id, full_name')
      .eq('id', user.id)
      .single()
    
    if (appUserError || !appUser || !appUser.active_tenant_id) {
      console.error('[INVITES] Error fetching app user:', appUserError)
      return NextResponse.json(
        { error: 'User context not found' },
        { status: 404 }
      )
    }
    
    // =====================================================================================================
    // 3. VERIFY PERMISSIONS (Admin or Owner only)
    // =====================================================================================================
    const { data: membership, error: membershipError } = await supabase
      .from('user_tenant_memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', appUser.active_tenant_id)
      .eq('status', 'active')
      .single()
    
    if (membershipError || !membership) {
      console.error('[INVITES] Error fetching membership:', membershipError)
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }
    
    if (!['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { 
          error: 'Insufficient permissions',
          message: 'Only organization owners and admins can invite new members'
        },
        { status: 403 }
      )
    }
    
    // =====================================================================================================
    // 4. RATE LIMITING
    // =====================================================================================================
    const rateLimit = checkRateLimit(user.id)
    
    if (!rateLimit.allowed) {
      const resetDate = new Date(rateLimit.resetAt)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          message: `Maximum ${RATE_LIMIT_MAX} invites per hour. Try again after ${resetDate.toLocaleTimeString()}`,
          reset_at: resetDate.toISOString()
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimit.resetAt.toString()
          }
        }
      )
    }
    
    // =====================================================================================================
    // 5. PARSE & VALIDATE REQUEST BODY
    // =====================================================================================================
    let body: CreateInviteRequest
    
    try {
      const rawBody = await request.json()
      body = CreateInviteSchema.parse(rawBody)
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
    // 6. CHECK FOR DUPLICATE PENDING INVITE
    // =====================================================================================================
    const { data: existingInvite, error: existingError } = await supabase
      .from('pending_invites')
      .select('id, invite_code, expires_at')
      .eq('invited_email', body.email)
      .eq('tenant_id', appUser.active_tenant_id)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single()
    
    if (existingInvite) {
      return NextResponse.json(
        {
          error: 'Duplicate invite',
          message: `${body.email} already has a pending invite`,
          existing_invite: {
            code: existingInvite.invite_code,
            expires_at: existingInvite.expires_at
          }
        },
        { status: 409 }
      )
    }
    
    // =====================================================================================================
    // 7. CHECK IF USER ALREADY A MEMBER
    // =====================================================================================================
    const { data: existingMember } = await supabase
      .from('user_tenant_memberships')
      .select('id')
      .eq('tenant_id', appUser.active_tenant_id)
      .eq('status', 'active')
      .in('user_id', [
        supabase
          .from('app_users')
          .select('id')
          .eq('email', body.email)
      ])
      .single()
    
    if (existingMember) {
      return NextResponse.json(
        {
          error: 'Already a member',
          message: `${body.email} is already a member of this organization`
        },
        { status: 409 }
      )
    }
    
    // =====================================================================================================
    // 8. GENERATE INVITE CODE
    // =====================================================================================================
    const { data: inviteCode, error: codeError } = await supabase
      .rpc('generate_invite_code')
    
    if (codeError || !inviteCode) {
      console.error('[INVITES] Error generating invite code:', codeError)
      return NextResponse.json(
        { error: 'Failed to generate invite code' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 9. CREATE INVITE
    // =====================================================================================================
    const { data: invite, error: insertError } = await supabase
      .from('pending_invites')
      .insert({
        invite_code: inviteCode,
        invited_email: body.email,
        tenant_id: appUser.active_tenant_id,
        assigned_role: body.role,
        invited_by: user.id,
        personal_message: body.personal_message || null,
        status: 'pending'
      })
      .select(`
        id,
        invite_code,
        invited_email,
        assigned_role,
        expires_at,
        personal_message,
        created_at
      `)
      .single()
    
    if (insertError || !invite) {
      console.error('[INVITES] Error creating invite:', insertError)
      return NextResponse.json(
        { error: 'Failed to create invite' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 10. AUDIT LOG (Non-blocking - failure doesn't affect invite creation)
    // =====================================================================================================
    try {
      const { error: auditError } = await supabase.from('audits').insert({
        user_id: user.id,
        tenant_id: appUser.active_tenant_id,
        action: 'invite.created',
        resource_type: 'invite',
        resource_id: invite.id,
        metadata: {
          invited_email: body.email,
          assigned_role: body.role,
          invite_code: inviteCode,
          expires_at: invite.expires_at
        },
        severity: 'info'
      })
      
      if (auditError) {
        console.error('[AUDIT] Failed to log invite creation:', auditError)
        // Non-fatal - continue with success response
      }
    } catch (auditException: any) {
      console.error('[AUDIT] Exception logging invite creation:', auditException)
      // Non-fatal - continue with success response
    }
    
    // =====================================================================================================
    // 11. SUCCESS RESPONSE
    // =====================================================================================================
    return NextResponse.json(
      {
        success: true,
        invite: {
          id: invite.id,
          invite_code: invite.invite_code,
          invited_email: invite.invited_email,
          assigned_role: invite.assigned_role,
          expires_at: invite.expires_at,
          personal_message: invite.personal_message,
          created_at: invite.created_at
        },
        inviter_name: appUser.full_name
      },
      {
        status: 201,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString()
        }
      }
    )
    
  } catch (error: any) {
    console.error('[INVITES] Unexpected error in POST /api/invites/create:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while creating the invite'
      },
      { status: 500 }
    )
  }
}

