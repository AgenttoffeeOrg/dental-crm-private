/**
 * Join Requests API
 * 
 * POST /api/join-requests - Create a new join request
 * GET /api/join-requests - List join requests (admin only)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { FeatureFlags } from '@/lib/feature-flags'
import { sendJoinRequestNotification } from '@/lib/services/email-service'

/**
 * POST /api/join-requests
 * Create a new join request
 */
export async function POST(request: NextRequest) {
  try {
    if (!FeatureFlags.ENABLE_JOIN_REQUESTS) {
      return NextResponse.json(
        { error: 'Join requests are not enabled' },
        { status: 403 }
      )
    }
    
    const supabase = await createServerSupabaseClient()
    const body = await request.json()
    
    const {
      tenant_id,
      requester_email,
      requester_name,
      message,
      requested_role = 'staff',
    } = body
    
    // Validation
    if (!tenant_id || !requester_email) {
      return NextResponse.json(
        { error: 'tenant_id and requester_email are required' },
        { status: 400 }
      )
    }
    
    // Get current user (if authenticated)
    const { data: { user } } = await supabase.auth.getUser()
    
    // Create join request using database function
    const { data, error } = await supabase.rpc('create_join_request', {
      p_tenant_id: tenant_id,
      p_requester_email: requester_email,
      p_requester_name: requester_name || null,
      p_message: message || null,
      p_requested_role: requested_role,
    })
    
    if (error) {
      console.error('Error creating join request:', error)
      return NextResponse.json(
        { error: 'Failed to create join request' },
        { status: 500 }
      )
    }
    
    // Get organization info for email
    const { data: tenant } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', tenant_id)
      .single()
    
    // Send notification to admins
    if (tenant) {
      // Get Tenant Admins for this organization
      const { data: tenantAdmins } = await supabase
        .from('tenant_admins')
        .select(`
          user_id,
          app_users!inner (
            id,
            email,
            full_name
          )
        `)
        .eq('tenant_id', tenant_id)
        .eq('is_active', true)
      
      // Get admin emails from auth.users
      // TODO: Send emails to all tenant admins
      // For now, just return success
    }
    
    return NextResponse.json({
      success: true,
      request_id: data,
      message: 'Join request submitted successfully',
    })
  } catch (error: any) {
    console.error('Join request error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/join-requests
 * List join requests for current user's organization
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Get user's tenant
    const { data: appUser } = await supabase
      .from('app_users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()
    
    if (!appUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }
    
    // Get status filter from query
    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending'
    
    // Fetch join requests
    const { data: requests, error } = await supabase
      .from('organization_join_requests')
      .select('*')
      .eq('tenant_id', appUser.tenant_id)
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching join requests:', error)
      return NextResponse.json(
        { error: 'Failed to fetch join requests' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      requests: requests || [],
    })
  } catch (error: any) {
    console.error('Error fetching join requests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

