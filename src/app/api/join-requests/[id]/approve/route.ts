/**
 * Approve Join Request API
 * 
 * POST /api/join-requests/[id]/approve
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'
import { checkSeatAvailability, reserveSeats } from '@/lib/services/billing-service'
import { sendJoinRequestApproved } from '@/lib/services/email-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerClient()
    const requestId = params.id
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get request body
    const body = await request.json()
    const { assigned_role } = body
    
    // Get join request
    const { data: joinRequest, error: fetchError } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('id', requestId)
      .single()
    
    if (fetchError || !joinRequest) {
      return NextResponse.json(
        { error: 'Join request not found' },
        { status: 404 }
      )
    }
    
    if (joinRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Join request already processed' },
        { status: 400 }
      )
    }
    
    // Check seat availability
    const seatCheck = await checkSeatAvailability(joinRequest.tenant_id, 1)
    
    if (!seatCheck.available) {
      return NextResponse.json(
        { 
          error: 'Cannot approve: ' + seatCheck.reason,
          requires_upgrade: true,
        },
        { status: 400 }
      )
    }
    
    // Reserve seat
    const reservation = await reserveSeats(joinRequest.tenant_id, 1)
    
    if (!reservation.success) {
      return NextResponse.json(
        { error: 'Failed to reserve seat: ' + reservation.error },
        { status: 500 }
      )
    }
    
    // Approve using database function
    const { data, error: approveError } = await supabase.rpc('approve_join_request', {
      p_request_id: requestId,
      p_approved_by: user.id,
      p_assigned_role: assigned_role || null,
    })
    
    if (approveError) {
      // Rollback seat reservation
      await supabase.rpc('decrement_active_seats', {
        p_tenant_id: joinRequest.tenant_id,
        p_count: 1,
      })
      
      console.error('Error approving join request:', approveError)
      return NextResponse.json(
        { error: 'Failed to approve join request' },
        { status: 500 }
      )
    }
    
    // Send approval email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', joinRequest.tenant_id)
      .single()
    
    if (tenant) {
      await sendJoinRequestApproved(
        {
          email: joinRequest.requester_email,
          name: joinRequest.requester_name || undefined,
        },
        tenant.name,
        assigned_role || joinRequest.requested_role,
        process.env.NEXT_PUBLIC_APP_URL + '/sign-in'
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Join request approved',
      result: data,
    })
  } catch (error: any) {
    console.error('Error approving join request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

