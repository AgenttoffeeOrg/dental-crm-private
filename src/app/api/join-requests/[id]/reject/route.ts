/**
 * Reject Join Request API
 * 
 * POST /api/join-requests/[id]/reject
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { sendJoinRequestRejected } from '@/lib/services/email-service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createServerSupabaseClient()
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
    const { reason } = body
    
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
    
    // Reject using database function
    const { data, error: rejectError } = await supabase.rpc('reject_join_request', {
      p_request_id: requestId,
      p_rejected_by: user.id,
      p_reason: reason || null,
    })
    
    if (rejectError) {
      console.error('Error rejecting join request:', rejectError)
      return NextResponse.json(
        { error: 'Failed to reject join request' },
        { status: 500 }
      )
    }
    
    if (!data) {
      return NextResponse.json(
        { error: 'Join request not found or already processed' },
        { status: 404 }
      )
    }
    
    // Send rejection email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', joinRequest.tenant_id)
      .single()
    
    if (tenant) {
      await sendJoinRequestRejected(
        {
          email: joinRequest.requester_email,
          name: joinRequest.requester_name || undefined,
        },
        tenant.name,
        reason
      )
    }
    
    return NextResponse.json({
      success: true,
      message: 'Join request rejected',
    })
  } catch (error: any) {
    console.error('Error rejecting join request:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

