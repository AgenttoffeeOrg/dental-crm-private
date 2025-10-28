import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

/**
 * POST /api/invites/check-pending
 * 
 * Checks if a user has any pending invitations to organizations.
 * Called during sign-up flow to auto-detect pending invites.
 * 
 * SECURITY:
 * - Only authenticated users can check their own email
 * - Returns invites for the provided email only
 * - Filters out expired invites
 * 
 * REQUEST:
 * {
 *   email: string
 * }
 * 
 * RESPONSE:
 * {
 *   has_invites: boolean,
 *   invites: [
 *     {
 *       id: string,
 *       invite_code: string,
 *       tenant_id: string,
 *       tenant_name: string,
 *       assigned_role: string,
 *       invited_by_name: string,
 *       personal_message: string | null,
 *       expires_at: string,
 *       created_at: string
 *     }
 *   ]
 * }
 */

// =====================================================================================================
// VALIDATION SCHEMA
// =====================================================================================================
const CheckPendingSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .toLowerCase()
    .trim()
})

type CheckPendingRequest = z.infer<typeof CheckPendingSchema>

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
    // 2. PARSE & VALIDATE REQUEST BODY
    // =====================================================================================================
    let body: CheckPendingRequest
    
    try {
      const rawBody = await request.json()
      body = CheckPendingSchema.parse(rawBody)
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
    // 3. SECURITY: Verify email matches authenticated user
    // =====================================================================================================
    if (body.email.toLowerCase() !== user.email?.toLowerCase()) {
      return NextResponse.json(
        { 
          error: 'Forbidden',
          message: 'You can only check invites for your own email address'
        },
        { status: 403 }
      )
    }
    
    // =====================================================================================================
    // 4. FETCH PENDING INVITES
    // =====================================================================================================
    const { data: invites, error: invitesError } = await supabase
      .from('pending_invites')
      .select(`
        id,
        invite_code,
        tenant_id,
        assigned_role,
        personal_message,
        expires_at,
        created_at,
        tenants!inner (
          id,
          name
        ),
        app_users!pending_invites_invited_by_fkey (
          full_name
        )
      `)
      .eq('invited_email', body.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    
    if (invitesError) {
      console.error('[INVITES] Error fetching pending invites:', invitesError)
      return NextResponse.json(
        { error: 'Failed to fetch pending invites' },
        { status: 500 }
      )
    }
    
    // =====================================================================================================
    // 5. FORMAT RESPONSE
    // =====================================================================================================
    const formattedInvites = (invites || []).map(invite => ({
      id: invite.id,
      invite_code: invite.invite_code,
      tenant_id: invite.tenant_id,
      tenant_name: (invite.tenants as any)?.name || 'Unknown Organization',
      assigned_role: invite.assigned_role,
      invited_by_name: (invite.app_users as any)?.full_name || 'Someone',
      personal_message: invite.personal_message,
      expires_at: invite.expires_at,
      created_at: invite.created_at
    }))
    
    // =====================================================================================================
    // 6. SUCCESS RESPONSE
    // =====================================================================================================
    return NextResponse.json({
      has_invites: formattedInvites.length > 0,
      count: formattedInvites.length,
      invites: formattedInvites
    })
    
  } catch (error: any) {
    console.error('[INVITES] Unexpected error in POST /api/invites/check-pending:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'An unexpected error occurred while checking for pending invites'
      },
      { status: 500 }
    )
  }
}

